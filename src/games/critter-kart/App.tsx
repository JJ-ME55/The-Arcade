// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import './ui/ck-styles.css';
import { playStartup, stopStartup } from './audio';
import { Stage } from './ui/Stage';
import { TitleScreen, MainMenu, CharacterSelect, TrackSelect, Results } from './ui/screens';
import { RaceHud, HowToPlay, type HudState } from './ui/hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { MultiplayerMenu, Matching, CustomBrowse, CustomCreate, LobbyScreen } from './ui/multiplayer/screens';
import { MultiplayerProvider, type MultiplayerRace } from './game/multiplayer/context';
import { getNetClient } from './net/client';
import { getArcadeIdentity } from './net/identity';
import GameCanvas, { type GameHud } from './GameCanvas';
import CoverShot from './CoverShot';
import type { Screen, ResultRow } from './ui/data';
import type { Member } from './net/protocol';
import { isTouchDevice } from './game/input/touch';

const TOUCH = isTouchDevice();

function RaceScreen({ racerId, trackId, mpRace, onFinish, onQuit }: {
  racerId: string;
  trackId: string;
  mpRace: MultiplayerRace | null;
  onFinish: (r: ResultRow[]) => void;
  onQuit: () => void;
}) {
  const timeRef = useRef<HTMLDivElement>(null);
  const boostRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudState>({ lap: 1, position: 4, heldItem: null, countdown: 3, order: [], loading: true, loadProgress: 0, lapBanner: null, wrongWay: false, boosting: false, heldItemCount: 0 });
  const gameHud: GameHud = { timeRef, boostRef, miniRef, onState: setHud };
  const inner = (
    <>
      <GameCanvas racerId={racerId} hud={gameHud} onFinish={onFinish} />
      {/* Desktop: the fixed 1280x720 letterboxed stage. Touch: a real full-viewport overlay so the
          HUD + on-screen controls sit at the true screen edges at full size (the scaled stage shrank
          them into a tiny centred box on phones). */}
      {TOUCH ? (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <RaceHud {...hud} racerId={racerId} timeRef={timeRef} boostRef={boostRef} miniRef={miniRef} onQuit={onQuit} />
        </div>
      ) : (
        <Stage transparent>
          <RaceHud {...hud} racerId={racerId} timeRef={timeRef} boostRef={boostRef} miniRef={miniRef} onQuit={onQuit} />
        </Stage>
      )}
      {hud.loading && <LoadingScreen racerId={racerId} trackId={trackId} progress={hud.loadProgress} />}
    </>
  );
  // Wrap with the multiplayer provider only if a network race is in flight;
  // single-player races skip the context entirely so GameCanvas falls through
  // to its existing single-player code path.
  return mpRace ? <MultiplayerProvider value={mpRace}>{inner}</MultiplayerProvider> : inner;
}

export default function App({ onRaceFinish }: { onRaceFinish?: (r: ResultRow[], playerId: string) => void } = {}) {
  // Cover studio: open the site with ?cover to pose all six karts and export the cover art.
  if (typeof window !== 'undefined' && window.location.search.includes('cover')) return <CoverShot />;

  const [screen, setScreen] = useState<Screen>('title');
  const [racer, setRacer] = useState('rusty');
  const [track, setTrack] = useState('meadow');
  const [results, setResults] = useState<ResultRow[]>([]);
  // Multiplayer state — set when a lobby is entered / a race starts, cleared on leave.
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [mpRace, setMpRace] = useState<MultiplayerRace | null>(null);
  const go = (s: Screen) => setScreen(s);

  // startup music plays on every non-race screen; the race screen stops it (and the
  // in-race music starts on GO). play() is also armed on the first user gesture in
  // case the browser blocked the initial autoplay.
  useEffect(() => {
    if (screen === 'race') stopStartup();
    else playStartup();
  }, [screen]);
  useEffect(() => {
    const unlock = () => {
      playStartup();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Shared handler — both Matching and LobbyScreen route through this when the
  // server emits race:start. Builds the MultiplayerRace context and flips the
  // app onto the race screen.
  const startMpRace = async (roomId: string, startAtMs: number, members: Member[], serverSelfKartId?: string) => {
    const net = getNetClient();
    // V2 (2026-06-08): identify self by telegramUserId, NOT username.
    // Username collisions are real — if two players share a TG first
    // name (or share an account during dev testing), `.find(m => m.username
    // === me)` returns the SAME member for both clients, both get
    // selfSlot=0, and the "non-host has no controls" bug returns
    // because PLAYER=0 ≠ the joiner's actual slot. telegramUserId is
    // unique per TG account. Server-side memberWire now includes it
    // on all 3 race:start emit sites (commit pairs with this one).
    const ident = await getArcadeIdentity();
    const myTgId = ident?.telegramUserId ?? null;
    const me = net.username();
    // AUTHORITATIVE first: the server now tells THIS socket its own kart on
    // race:start (selfKartId). That removes the client guessing that caused
    // both players to fall back to slot 0 (→ "different races"). The tgId /
    // username matches stay as fallbacks for any path that omits selfKartId.
    const selfMember =
      (serverSelfKartId && members.find((m: any) => (m.kartId || `kart-${m.slot}`) === serverSelfKartId)) ||
      (myTgId != null && members.find((m: any) => Number(m.telegramUserId) === Number(myTgId))) ||
      members.find((m) => m.username === me) ||
      undefined;
    if (!selfMember) {
      console.warn('[critter-kart/mp] could NOT resolve self in members — defaulting slot 0',
        { serverSelfKartId, myTgId, me, members });
    }
    const selfSlot = selfMember?.slot ?? 0;
    // Server assigns racerId per slot from the regular roster
    // (rusty/shelly/pip/bruno cycled). Pick up self's choice so the
    // player sees themselves as the right character instead of the
    // single-player default.
    if (selfMember?.racerId) setRacer(selfMember.racerId);
    // Build kartId → slot map and pull self's kartId.
    const kartIdToSlot: Record<string, number> = {};
    members.forEach((m, idx) => {
      const k = m.kartId || `kart-${m.slot ?? idx}`;
      kartIdToSlot[k] = m.slot ?? idx;
    });
    const selfKartId = selfMember?.kartId || `kart-${selfSlot}`;

    // CRITICAL — bind this socket to the race broadcast room so
    // `broadcastToRace(io, raceId, 'race:snapshot', snap)` from the
    // server's RaceRunner reaches us. Without this emit, server still
    // ticks the race and emits snapshots, but they never arrive at this
    // socket → each client falls back to running Fish's local 6-kart
    // sim independently → "they're in different races." The
    // matchmaking-based MultiplayerLayer.tsx flow already did this; the
    // lobby-based flow added in this session bypassed it.
    try {
      if (myTgId != null) {
        net.emit('critterkart:joinRace' as any, {
          raceId: roomId,
          telegramUserId: myTgId,
        } as any);
      } else {
        // No JWT identity available — multiplayer can't authenticate.
        // Race screen will still mount but no snapshots will flow.
        console.warn('[critter-kart/mp] no telegramUserId — race join skipped');
      }
    } catch (e) {
      console.warn('[critter-kart/mp] joinRace emit failed:', e);
    }

    setMpRace({ roomId, selfSlot, selfKartId, startAtMs, members, net, kartIdToSlot });
    setActiveLobbyId(roomId);
    go('race');
  };

  // Centralised quit-from-race — clears multiplayer context (if any) and routes
  // back to the menu in network mode, or to the track screen in singleplayer.
  const quitRace = () => {
    if (mpRace) {
      getNetClient().emit('lobby:leave', { lobbyId: mpRace.roomId });
      setMpRace(null);
      setActiveLobbyId(null);
      go('menu');
    } else {
      go('track');
    }
  };

  if (screen === 'race') {
    return (
      <RaceScreen
        racerId={racer}
        trackId={track}
        mpRace={mpRace}
        onFinish={(r) => { setResults(r); setMpRace(null); setActiveLobbyId(null); go('results'); onRaceFinish?.(r, racer); }}
        onQuit={quitRace}
      />
    );
  }
  return (
    <>
      {screen === 'title' && <TitleScreen go={go} />}
      {screen === 'menu' && <MainMenu go={go} />}
      {screen === 'select' && <CharacterSelect go={go} selected={racer} setSelected={setRacer} />}
      {screen === 'track' && <TrackSelect go={go} track={track} setTrack={setTrack} />}
      {screen === 'howto' && <HowToPlay go={go} />}
      {screen === 'results' && <Results go={go} results={results} playerId={racer} />}
      {screen === 'mp-menu' && <MultiplayerMenu go={go} />}
      {screen === 'mp-matching' && (
        <Matching
          go={go}
          onMatched={(roomId) => { setActiveLobbyId(roomId); go('mp-lobby'); }}
        />
      )}
      {screen === 'mp-custom-browse' && (
        <CustomBrowse
          go={go}
          onJoined={(lobby) => { setActiveLobbyId(lobby.id); go('mp-lobby'); }}
        />
      )}
      {screen === 'mp-custom-create' && (
        <CustomCreate
          go={go}
          onCreated={(lobby) => { setActiveLobbyId(lobby.id); go('mp-lobby'); }}
        />
      )}
      {screen === 'mp-lobby' && activeLobbyId && (
        <LobbyScreen
          lobbyId={activeLobbyId}
          onLeave={() => { setActiveLobbyId(null); go('mp-menu'); }}
          onRaceStart={startMpRace}
        />
      )}
    </>
  );
}
