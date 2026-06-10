// @ts-nocheck
/**
 * Wire protocol — typed contract between Critter Kart client and the
 * SolShot server's server-authoritative race layer.
 *
 * SESSION 2c REWRITE (2026-06-04):
 *   - Client emits INPUTS (steer/throttle/brake/drift) at 30Hz
 *   - Server runs authoritative 60Hz physics
 *   - Server emits SNAPSHOTS at 20Hz back to all clients in the race room
 *   - Client predicts local kart from local input (Fish's existing 60Hz
 *     physics runs unchanged); v1 ships without reconciliation (thin
 *     client — local input drives local render; server is leaderboard
 *     authority). v2 will add input rewind-and-replay reconciliation.
 *
 * Lobby/matchmaking events PRESERVED from the original spec because the
 * hub's pre-race UI was built against them.
 *
 * Direction key in comments:
 *   C → S   client emits, server receives
 *   S → C   server emits, client receives
 */

// =============================================================================
// Shared shapes
// =============================================================================

/** A racer in a lobby or race. `slot` is assigned by the server on race start. */
export interface Member {
  username: string;
  telegramUserId?: number | null;  // bulletproof self-identification (added 2026-06-08)
  slot?: number;     // 0..5 (6-kart races as of 2026-06-04 — was 0..3)
  racerId?: string;  // chosen Rusty/Fish/etc; final value sent in race:start
  ready?: boolean;   // lobby-only: did this member tap Ready?
  host?: boolean;    // lobby-only: is this member the lobby creator?
  isBot?: boolean;   // bot-fill slot (no human behind it)
  kartId?: string;   // server-assigned kart id, present once race created
}

export interface LobbyState {
  id: string;
  name: string;
  cap: number;                 // 1..6 (was 1..4 — bumped 2026-06-04)
  hostUsername: string;
  members: Member[];
  pending: { requestId: string; username: string }[];
  status: 'open' | 'starting' | 'closed';
}

export interface LobbySummary {
  id: string;
  name: string;
  hostUsername: string;
  cap: number;
  joinedCount: number;
  status: 'open' | 'starting';
}

/**
 * Client-emitted input frame. Server buffers latest-per-kart, applies
 * at next 60Hz tick. ~30 bytes per send.
 */
export interface RaceInputFrame {
  raceId: string;
  kartId: string;
  seq: number;
  steer: number;        // -1..1 (server clamps)
  throttle: number;     // 0..1
  brake: number;        // 0..1
  drift: boolean;
}

/**
 * Server-emitted kart snapshot — one entry per kart per race-room
 * broadcast. ~80 bytes per kart.
 */
export interface KartSnapshot {
  kartId: string;
  ackSeq: number;
  x: number;
  z: number;
  y: number;
  vy: number;
  heading: number;
  velHeading: number;
  speed: number;
  driftDir: number;
  boostTimer: number;
  stunTimer: number;
  slowTimer: number;
  shield: boolean;
  lap: number;
  progress: number;
  finished: boolean;
}

/**
 * Full snapshot broadcast — fires from server at 20Hz to every socket
 * in the race room. Includes all karts (humans + bots) at once.
 */
export interface RaceSnapshot {
  raceId: string;
  tick: number;
  tMs: number;
  karts: KartSnapshot[];
}

// =============================================================================
// Client → Server events
// =============================================================================

export interface ClientEvents {
  // ── Lobby (custom matches — UI under construction) ────────────────────────
  'lobby:list':       Record<string, never>;
  'lobby:create':     { name: string; cap: number };
  'lobby:join':       { lobbyId: string };
  'lobby:decision':   { requestId: string; accept: boolean };
  'lobby:ready':      { lobbyId: string; ready: boolean };
  'lobby:start':      { lobbyId: string };
  'lobby:leave':      { lobbyId: string };

  // ── Quick-match queue ─────────────────────────────────────────────────────
  'match:enqueue':    { telegramUserId: number; telegramUsername?: string; firstName?: string };
  'match:cancel':     { telegramUserId: number };

  // ── Race-room handshake ───────────────────────────────────────────────────
  'race:join':        { raceId: string; telegramUserId: number };
  'race:ready':       { raceId: string; telegramUserId: number };
  'race:leave':       { raceId: string; telegramUserId: number };

  // ── In-race input — 30Hz fire-and-forget ──────────────────────────────────
  'race:input':       RaceInputFrame;
}

// =============================================================================
// Server → Client events
// =============================================================================

export interface ServerEvents {
  'net:connected':       { telegramUserId: number; username?: string };
  'net:error':           { message: string; code?: string };

  'lobby:listing':       { lobbies: LobbySummary[] };
  'lobby:created':       { lobby: LobbyState };
  'lobby:state':         { lobby: LobbyState };
  'lobby:joinRequest':   { lobbyId: string; requestId: string; username: string };
  'lobby:joined':        { lobby: LobbyState };
  'lobby:declined':      { lobbyId: string; reason?: string };
  'lobby:closed':        { lobbyId: string; reason?: string };

  'match:queued':        { ticketId?: string; waitMs: number; positionInQueue?: number; totalInQueue?: number };
  'match:found':         { raceId: string; launchUrl: string; players: Member[]; format: { laps: number } };

  'race:state':          { raceId: string; state: 'matched' | 'loading' | 'countdown' | 'racing' | 'finished' | 'settled' | 'cancelled'; players?: Member[]; format?: { laps: number }; reconnected?: number; disconnected?: number; graceMs?: number };
  'race:countdown':      { seconds: 3 | 2 | 1 | 0 };
  'race:snapshot':       RaceSnapshot;
  'race:final':          {
    raceId: string;
    reason: 'all_finished' | 'timeout' | string;
    positions: Array<{
      kartId: string;
      displayName: string;
      isBot: boolean;
      pos: number;
      totalTimeMs: number | null;
      bestLapMs: number | null;
      points: number;
    }>;
    careerUpdates?: Array<{
      telegramUserId: number;
      displayName: string;
      careerUpdate: {
        newRecord: boolean;
        totalPoints: number;
        races: number;
        wins: number;
        podiums: number;
        bestLapTimeMs: number | null;
        rank: number;
        totalPlayers: number;
      };
    }>;
  };
  'race:error':          { event: string; reason: string; detail?: string };
}

export type ClientEventKey = keyof ClientEvents;
export type ServerEventKey = keyof ServerEvents;
