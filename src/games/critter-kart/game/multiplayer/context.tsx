// @ts-nocheck
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Member, RaceSnapshot } from '../../net/protocol';
import type { CritterKartNet } from '../../net/client';

/**
 * Multiplayer race context. The race screen reads this to decide whether it's
 * running a single-player race (no provider → null) or a network race (provider
 * present → all the joined humans + slot assignments + the server-driven
 * `startAtMs` that synchronises the 3-2-1 countdown across clients).
 *
 * Updated Session 2c: now also carries the live `net` client + a per-tick
 * helper for GameCanvas to consume snapshots and send inputs in one place.
 *
 * GameCanvas integration (SINGLE ~20-line edit; see
 * docs/CRITTER_KART_MULTIPLAYER_GAMECANVAS_INTEGRATION.md):
 *   - if useMultiplayer() returns null → render solo (no change)
 *   - if non-null → on each rAF tick:
 *       1. Read local input from controller (Fish's existing logic)
 *       2. net.sendInput({ raceId, kartId: selfKartId, ...input })
 *       3. const snap = net.getLatestSnapshot()
 *       4. For each remote kart in snap.karts, replace states[slot]
 *          with snap's authoritative position + heading + speed.
 *       5. Skip Fish's local stepKart for remote slots; local kart
 *          still steps locally (thin client v1: server is authority for
 *          standings but local kart's position is rendered from local
 *          physics. v2 will add prediction + reconciliation.)
 */
export interface MultiplayerRace {
  roomId: string;
  selfSlot: number;          // which slot the local kart occupies (0..5)
  selfKartId: string;        // server-assigned kart id for this player
  startAtMs: number;         // wall-clock the server picked for race start
  members: Member[];         // all human participants; bots fill the rest
  net: CritterKartNet;

  // Map kartId → slot index — used by GameCanvas to apply snapshots to
  // the correct states[] entry.
  kartIdToSlot: Record<string, number>;
}

const Ctx = createContext<MultiplayerRace | null>(null);

export function MultiplayerProvider({ value, children }: { value: MultiplayerRace; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMultiplayer(): MultiplayerRace | null {
  return useContext(Ctx);
}

/**
 * Helper: build a multiplayer race context value from match:found +
 * race:join handshake data. CritterKartScreen calls this once the
 * server-side race has been allocated and the socket has joined the
 * race room.
 */
export function buildMultiplayerRaceValue(args: {
  roomId: string;
  members: Member[];
  selfTelegramUserId: number;
  startAtMs: number;
  net: CritterKartNet;
}): MultiplayerRace | null {
  // Server assigns kart ids in match:found order. Map kartId → slot.
  const kartIdToSlot: Record<string, number> = {};
  args.members.forEach((m, idx) => {
    if (m.kartId) kartIdToSlot[m.kartId] = idx;
    else if (m.slot != null) {
      kartIdToSlot[`kart-${m.slot}`] = idx;
    }
  });

  // Find self — first non-bot member is treated as self because the
  // server validates identity via the handshake JWT. Order is preserved
  // through match:found so position-based self-detection is reliable.
  // TODO 2c-followup: server include telegramUserId on Member for exact
  // self-match.
  let selfIdx = -1;
  for (let i = 0; i < args.members.length; i++) {
    if (!args.members[i].isBot) { selfIdx = i; break; }
  }
  if (selfIdx < 0) return null;
  const selfMember = args.members[selfIdx];

  return {
    roomId: args.roomId,
    selfSlot: selfMember.slot ?? selfIdx,
    selfKartId: selfMember.kartId ?? `kart-${selfIdx}`,
    startAtMs: args.startAtMs,
    members: args.members,
    net: args.net,
    kartIdToSlot,
  };
}

/**
 * GameCanvas helper: pull the latest authoritative state for a given
 * kart slot, or null if no snapshot is available yet.
 *
 * Used by the per-frame loop to overwrite states[slot] for REMOTE karts
 * (every slot that isn't self). Local kart in v1 continues to run on
 * local physics — server-side state is logged for the leaderboard but
 * the visual rendering is local-predicted (no rubber-banding for the
 * player's own kart). Wager-grade rebuild adds full reconciliation.
 */
export function useMultiplayerSync() {
  const ctx = useMultiplayer();
  return useMemo(() => {
    if (!ctx) return null;
    return {
      get latestSnapshot(): RaceSnapshot | null { return ctx.net.getLatestSnapshot(); },
      applyToSlot(slot: number) {
        // Resolve the kartId mapped to this slot (server's
        // canonical kart-N id) and pull the *interpolated* kart state.
        // Without interpolation, remote karts teleport every 33ms (30Hz
        // snapshot rate) — JJ's "needs seamless NFS-style tightening"
        // feedback 2026-06-08. With it, motion lerps smoothly between
        // snapshots at 60fps render rate, render-time 100ms behind
        // real-time so we always have a "future" snapshot to lerp toward.
        const kartId = Object.keys(ctx.kartIdToSlot)
          .find(kid => ctx.kartIdToSlot[kid] === slot);
        if (!kartId) return null;
        // @ts-ignore — getInterpolatedKart added to NetClient 2026-06-08
        if (ctx.net.getInterpolatedKart) {
          return ctx.net.getInterpolatedKart(kartId, 100);
        }
        // Defensive fallback: if NetClient ever loses the interp method,
        // fall through to raw latest-snapshot lookup so MP still works
        // (just janky), rather than null and silent solo-render.
        const snap = ctx.net.getLatestSnapshot();
        if (!snap) return null;
        return snap.karts.find(k => k.kartId === kartId) ?? null;
      },
      selfSlot: ctx.selfSlot,
      selfKartId: ctx.selfKartId,
      // V2 (2026-06-06): expose members so GameCanvas can construct
      // gridRacers from the server's per-slot racerId assignments —
      // otherwise non-host clients see the wrong character mesh at
      // every remote slot (Peralta sees JJ as Pip, etc).
      members: ctx.members,
      // V2 (2026-06-10): server's race-start-anchor lock from
      // race:countdownLocked. Returns null if the lock hasn't arrived
      // yet — caller MUST hold at countdown until then, never fall back
      // to the optimistic ctx.startAtMs from race:start. That fallback
      // is what produced JJ's "rusty started way before shelly" desync
      // 2026-06-10. The lock arrives via either the broadcast at race
      // start (normal joiner) or the joinRace replay (late joiner /
      // reconnect / slow asset load).
      getStartAtMs(): number | null {
        // @ts-ignore — getRaceStartAtMs added 2026-06-08
        return ctx.net.getRaceStartAtMs?.() ?? null;
      },
      // V2 (2026-06-08): emit critterkart:ready when assets load.
      // Server's lobby:start fallback is 15s — clients should signal
      // ready ASAP so the race countdown locks at the right moment.
      // Uses the local NetClient's emit directly (same socket).
      signalReady(telegramUserId: number) {
        // @ts-ignore — emit is on the underlying NetClient
        ctx.net.emit?.('critterkart:ready', {
          raceId: ctx.roomId,
          telegramUserId,
        });
      },
      sendInput(frame: { steer: number; throttle: number; brake: number; drift: boolean }) {
        ctx.net.sendInput({
          raceId: ctx.roomId,
          kartId: ctx.selfKartId,
          steer: frame.steer,
          throttle: frame.throttle,
          brake: frame.brake,
          drift: frame.drift,
        });
      },
      // V2 (2026-06-10): fire the local player's held item. Server resolves
      // the use + any hits authoritatively; effects + projectiles/traps come
      // back via the snapshot. Solo mode never calls this (mp is null).
      useItem() {
        // @ts-ignore — emit is on the underlying NetClient
        ctx.net.emit?.('race:useItem', {
          raceId: ctx.roomId,
          kartId: ctx.selfKartId,
        });
      },
    };
  }, [ctx]);
}
