// @ts-nocheck
/**
 * MultiplayerLayer — entry point for Critter Kart multiplayer.
 *
 * Bridges URL params + arcade session JWT to the socket-based multiplayer
 * backend on the SolShot server. Wraps children in MultiplayerProvider
 * once a race is ready, so GameCanvas can consume it.
 *
 * Behaviour:
 *   - No `?queue=1` or `?race=<id>` in URL → just renders children
 *     (single-player path, unchanged behaviour).
 *   - `?queue=1` → connects, sends critterkart:joinQueue, shows a
 *     "Looking for racers…" overlay until `critterkart:matched` arrives.
 *     On match, navigates the URL to `?race=<id>` and re-enters the
 *     race-join branch below.
 *   - `?race=<id>` → connects, sends `race:join`, waits for `race:state`
 *     with 'countdown' or 'racing'. Builds the MultiplayerRace context
 *     and wraps children.
 *
 * Fails open: if the socket can't connect (server down, dep missing,
 * etc.) the overlay shows the error and falls back to single-player
 * after a short timeout so the user isn't stuck.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MultiplayerProvider,
  buildMultiplayerRaceValue,
  type MultiplayerRace,
} from './game/multiplayer/context';
import { createCritterKartNet, type CritterKartNet } from './net/client';
import type { Member } from './net/protocol';

type Phase =
  | 'idle'         // single-player, nothing to do
  | 'connecting'   // socket opening
  | 'queuing'      // in matchmaking queue waiting for match
  | 'joining'      // socket connected, sending race:join
  | 'ready'        // race ready, children rendered with provider
  | 'error';       // connection / handshake failed → fallback after timeout

export function MultiplayerLayer({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [race, setRace] = useState<MultiplayerRace | null>(null);
  const netRef = useRef<CritterKartNet | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queueFlag = params.get('queue') === '1';
    const raceId = params.get('race');

    if (!queueFlag && !raceId) {
      setPhase('idle');
      return;
    }

    let cancelled = false;

    const session = (() => {
      try {
        return sessionStorage.getItem('arcade_session')
          || sessionStorage.getItem('arcadeSession');
      } catch { return null; }
    })();
    if (!session) {
      setPhase('error');
      setErrorMsg('No session — re-launch from the bot');
      return;
    }

    // Pull telegramUserId from JWT payload (base64-decode body w/o
    // verifying — we trust the server side to enforce integrity).
    let telegramUserId: number | null = null;
    try {
      const body = JSON.parse(atob(session.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof body?.tg === 'number') telegramUserId = body.tg;
    } catch (e) {
      console.warn('[critter-kart/mp] could not decode session JWT', e);
    }
    if (!telegramUserId) {
      setPhase('error');
      setErrorMsg('Session token malformed');
      return;
    }

    setPhase('connecting');
    setStatusText('Connecting…');

    let unsubscribers: Array<() => void> = [];

    (async () => {
      let net: CritterKartNet;
      try {
        net = await createCritterKartNet({
          telegramUserId,
          sessionJwt: session,
        });
        await Promise.race([
          net.ready(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('connect_timeout')), 8000)),
        ]);
      } catch (e: any) {
        if (cancelled) return;
        setPhase('error');
        setErrorMsg(String(e?.message || e || 'Connection failed'));
        return;
      }
      if (cancelled) { net.disconnect(); return; }
      netRef.current = net;

      // Handle match:found regardless of entry path — if queue or race
      // already-known, we still subscribe so AnArrival updates the UI.
      unsubscribers.push(net.on('critterkart:matched' as any, (m: any) => {
        if (cancelled) return;
        // Server emits this AFTER critterkart:joinQueue → matched. Now
        // we have a raceId; transition into race:join.
        joinRace(m.raceId, m.players ?? [], net);
      }));
      unsubscribers.push(net.on('race:error' as any, (err: any) => {
        if (cancelled) return;
        console.warn('[critter-kart/mp] race:error', err);
      }));

      if (queueFlag) {
        setPhase('queuing');
        setStatusText('Finding racers…');
        net.emit('critterkart:joinQueue' as any, {
          telegramUserId,
        });
      } else if (raceId) {
        joinRace(raceId, [], net);
      }
    })();

    const joinRace = (raceId: string, knownMembers: Member[], net: CritterKartNet) => {
      if (cancelled) return;
      setPhase('joining');
      setStatusText('Joining race…');

      // Subscribe to state-changes for this race
      unsubscribers.push(net.on('critterkart:state' as any, (s: any) => {
        if (cancelled) return;
        if (s.state === 'countdown' || s.state === 'racing' || s.state === 'matched') {
          // Build the multiplayer context value with whichever members
          // list arrived. If state push didn't include members, fall
          // back to what we had from match:found.
          const members: Member[] = (s.players ?? knownMembers).map((p: any, idx: number) => ({
            username: p.displayName ?? `Player ${idx + 1}`,
            slot: idx,
            kartId: p.kartId ?? `kart-${idx}`,
            isBot: !!p.isBot,
          }));
          const built = buildMultiplayerRaceValue({
            roomId: raceId,
            members,
            selfTelegramUserId: telegramUserId!,
            startAtMs: Date.now(),  // refined by countdown event
            net,
          });
          if (built && phase !== 'ready') {
            setRace(built);
            setPhase('ready');
            setStatusText('');
            // Send ready signal — countdown begins when all are ready
            net.emit('critterkart:ready' as any, {
              raceId,
              telegramUserId,
            });
          }
        }
      }));

      // race:join is sent to bind the socket to the race room
      net.emit('critterkart:joinRace' as any, {
        raceId,
        telegramUserId,
      });
    };

    return () => {
      cancelled = true;
      for (const u of unsubscribers) u();
      if (netRef.current) {
        netRef.current.disconnect();
        netRef.current = null;
      }
    };
  // Only run once on mount; URL params don't change during a game
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fallback to single-player after error
  useEffect(() => {
    if (phase !== 'error') return;
    const t = setTimeout(() => setPhase('idle'), 3500);
    return () => clearTimeout(t);
  }, [phase]);

  // Render: overlay during connect/queue/join; provider once ready;
  // bare children for single-player.
  if (phase === 'ready' && race) {
    return <MultiplayerProvider value={race}>{children}</MultiplayerProvider>;
  }

  return (
    <>
      {children}
      {phase !== 'idle' && (
        <Overlay
          phase={phase}
          statusText={statusText}
          errorMsg={errorMsg}
        />
      )}
    </>
  );
}

function Overlay({
  phase,
  statusText,
  errorMsg,
}: {
  phase: Phase;
  statusText: string;
  errorMsg: string | null;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,10,20,0.78)',
        backdropFilter: 'blur(4px)',
        color: '#fff',
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360, padding: 20 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          {phase === 'error' ? 'Multiplayer unavailable' : 'Critter Kart'}
        </div>
        <div style={{ fontSize: 14, opacity: 0.88, marginBottom: 16 }}>
          {phase === 'error' ? errorMsg : statusText}
        </div>
        {phase === 'queuing' && (
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Race starts when 2-6 humans join. Bots fill after 30s.
          </div>
        )}
        {phase === 'error' && (
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            Falling back to single-player…
          </div>
        )}
      </div>
    </div>
  );
}
