// @ts-nocheck
/**
<<<<<<< Updated upstream
 * Wire protocol — the typed contract between the Critter Kart client and JJ's
 * multiplayer backend. All payloads are plain JSON; event names are strings of
 * the form `<area>:<verb>` (e.g. `lobby:create`).
=======
 * Wire protocol — typed contract between Critter Kart client and the
 * SolShot server's server-authoritative race layer.
 *
 * SESSION 2c REWRITE (2026-06-04):
 *   This file was originally a relay protocol — client emitted full
 *   kart state, server relayed to other clients. Path A's server-auth
 *   architecture instead has:
 *     - Client emits INPUTS (steer/throttle/brake/drift) at 30Hz
 *     - Server runs authoritative 60Hz physics
 *     - Server emits SNAPSHOTS (per-kart {pos, heading, speed, ...})
 *       at 20Hz back to all clients in the race room
 *     - Client interpolates between snapshots for remote karts
 *     - Client predicts local kart from local input (Fish's existing
 *       60Hz physics runs unchanged), reconciles to server snapshots
 *       (a thin-client v1 ships without reconciliation — local input
 *       drives local render; server is the leaderboard authority)
 *
 * The lobby/matchmaking events are PRESERVED from the original spec
 * because the hub's pre-race UI was built against them.
>>>>>>> Stashed changes
 *
 * Direction key in comments:
 *   C → S   client emits, server receives
 *   S → C   server emits, client receives
<<<<<<< Updated upstream
 *   *      can flow either way (mostly client-emitted, server relays as-is)
 *
 * Two maps below — `ClientEvents` (what the client can EMIT) and `ServerEvents`
 * (what the client can SUBSCRIBE to) — let `NetClient.emit()` and `.on()` be
 * fully type-safe end to end.
=======
>>>>>>> Stashed changes
 */

// =============================================================================
// Shared shapes
// =============================================================================

/** A racer in a lobby or race. `slot` is assigned by the server on race start. */
export interface Member {
  username: string;
<<<<<<< Updated upstream
  slot?: number;     // 0..3, present once race has been allocated
  racerId?: string;  // chosen Rusty/Fish/etc; final value sent in race:start
  ready?: boolean;   // lobby-only: did this member tap Ready?
  host?: boolean;    // lobby-only: is this member the lobby creator (custom matches)?
=======
  slot?: number;     // 0..5 (6-kart races as of 2026-06-04 — was 0..3)
  racerId?: string;  // chosen Rusty/Fish/etc; final value sent in race:start
  ready?: boolean;   // lobby-only: did this member tap Ready?
  host?: boolean;    // lobby-only: is this member the lobby creator?
  isBot?: boolean;   // bot-fill slot (no human behind it)
  kartId?: string;   // server-assigned kart id, present once race created
>>>>>>> Stashed changes
}

export interface LobbyState {
  id: string;
  name: string;
<<<<<<< Updated upstream
  cap: number;                 // 1..4 — chosen by host on create
  hostUsername: string;
  members: Member[];           // does NOT include pending join requests
  pending: { requestId: string; username: string }[]; // host-side only
=======
  cap: number;                 // 1..6 (was 1..4 — bumped 2026-06-04)
  hostUsername: string;
  members: Member[];
  pending: { requestId: string; username: string }[];
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
/** Per-frame replication payload for a remote kart. Subset of KartState — only
 *  the fields the renderer needs from someone else's kart. ~50 bytes per send. */
export interface KartSnapshot {
  slot: number;
  x: number; z: number;
  y?: number; vy?: number;
  heading: number;
  velHeading: number;
  speed: number;
  driftDir: number;
  boostTimer: number;
  stunTimer?: number;
  slowTimer?: number;
  shield?: boolean;
  falling?: boolean;
=======
/**
 * Client-emitted input frame — what a human kart's local controller
 * produces each frame. Server buffers latest-per-kart, applies at
 * next 60Hz tick. ~30 bytes per send.
 */
export interface RaceInputFrame {
  raceId: string;
  kartId: string;       // server-assigned at race:start
  seq: number;          // monotonic per-client; server replies via ackSeq
  steer: number;        // -1..1 (server clamps)
  throttle: number;     // 0..1
  brake: number;        // 0..1
  drift: boolean;
}

/**
 * Server-emitted kart snapshot — one entry per kart in a race-room
 * broadcast. ~80 bytes per kart. Client uses these to render remote
 * karts (interpolated) and validate local kart prediction.
 */
export interface KartSnapshot {
  kartId: string;
  ackSeq: number;       // highest input seq the server has processed FOR THIS KART
  // Position + facing
  x: number;
  z: number;
  y: number;
  vy: number;
  heading: number;
  velHeading: number;
  speed: number;
  // FX-relevant state
  driftDir: number;
  boostTimer: number;
  stunTimer: number;
  slowTimer: number;
  shield: boolean;
  // Race standing
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
  tMs: number;          // ms since race start (server clock)
  karts: KartSnapshot[];
>>>>>>> Stashed changes
}

// =============================================================================
// Client → Server events
// =============================================================================

export interface ClientEvents {
<<<<<<< Updated upstream
  // ── Lobby (custom matches) ────────────────────────────────────────────────
=======
  // ── Lobby (custom matches — UI still under construction) ──────────────────
>>>>>>> Stashed changes
  'lobby:list':       Record<string, never>;
  'lobby:create':     { name: string; cap: number };
  'lobby:join':       { lobbyId: string };
  'lobby:decision':   { requestId: string; accept: boolean };
  'lobby:ready':      { lobbyId: string; ready: boolean };
  'lobby:start':      { lobbyId: string };
  'lobby:leave':      { lobbyId: string };

<<<<<<< Updated upstream
  // ── Matchmaking (quick race) ──────────────────────────────────────────────
  'match:enqueue':    Record<string, never>;
  'match:cancel':     Record<string, never>;

  // ── Race-room (during the actual race) ────────────────────────────────────
  'race:state':       KartSnapshot;
  'race:itemSpawn':   { boxId: number; item: number };
  'race:itemPickup':  { boxId: number; slot: number };
  'race:fireProjectile': { slot: number; kind: 'acorn' | 'bee'; x: number; z: number; heading: number; speed: number; target: number };
  'race:dropTrap':    { slot: number; x: number; z: number };
  'race:hit':         { victimSlot: number; kind: 'projectile' | 'trap' | 'storm' };
  'race:finish':      { slot: number; time: number; lap: number };
=======
  // ── Quick-match queue ─────────────────────────────────────────────────────
  // Maps to server's critterkart:joinQueue / leaveQueue. Renamed at the
  // client layer for clarity ('matchmaking' = what the user sees).
  'match:enqueue':    { telegramUserId: number; telegramUsername?: string; firstName?: string };
  'match:cancel':     { telegramUserId: number };

  // ── Race-room handshake ───────────────────────────────────────────────────
  // Sent after the client navigates to /play/critter-kart/launch?race=<id>
  // and has parsed the race id + JWT. Server validates membership and
  // joins the socket to the race room.
  'race:join':        { raceId: string; telegramUserId: number };
  'race:ready':       { raceId: string; telegramUserId: number };
  'race:leave':       { raceId: string; telegramUserId: number };

  // ── In-race input ─────────────────────────────────────────────────────────
  // Sent at ~30Hz by the local kart's input controller. Server applies
  // to its 60Hz physics tick. Fire-and-forget — no ack (snapshots carry
  // ackSeq so client can validate).
  'race:input':       RaceInputFrame;
>>>>>>> Stashed changes
}

// =============================================================================
// Server → Client events
// =============================================================================

export interface ServerEvents {
  // ── Connection ────────────────────────────────────────────────────────────
<<<<<<< Updated upstream
  'net:connected':       { username: string };
  'net:error':           { message: string };
=======
  'net:connected':       { telegramUserId: number; username?: string };
  'net:error':           { message: string; code?: string };
>>>>>>> Stashed changes

  // ── Lobby ─────────────────────────────────────────────────────────────────
  'lobby:listing':       { lobbies: LobbySummary[] };
  'lobby:created':       { lobby: LobbyState };
  'lobby:state':         { lobby: LobbyState };
  'lobby:joinRequest':   { lobbyId: string; requestId: string; username: string };
  'lobby:joined':        { lobby: LobbyState };
  'lobby:declined':      { lobbyId: string; reason?: string };
  'lobby:closed':        { lobbyId: string; reason?: string };

  // ── Matchmaking ───────────────────────────────────────────────────────────
<<<<<<< Updated upstream
  'match:queued':        { eta?: number };
  'match:found':         { roomId: string; members: Member[] };

  // ── Race-room ─────────────────────────────────────────────────────────────
  'race:start':          { roomId: string; startAtMs: number; members: Member[] };
  'race:remoteState':    KartSnapshot & { receivedAtMs: number };
  'race:itemSpawn':      { boxId: number; item: number };
  'race:itemPickup':     { boxId: number; slot: number };
  'race:fireProjectile': { slot: number; kind: 'acorn' | 'bee'; x: number; z: number; heading: number; speed: number; target: number };
  'race:dropTrap':       { slot: number; x: number; z: number };
  'race:hit':            { victimSlot: number; kind: 'projectile' | 'trap' | 'storm' };
  'race:disconnect':     { slot: number };
  'race:finish':         { slot: number; time: number; lap: number };
=======
  // 'match:queued' replaces the old 'match:queued' shape — adds ticketId.
  'match:queued':        { ticketId?: string; waitMs: number; positionInQueue?: number; totalInQueue?: number };
  // 'match:found' fires when the queue ticker matches you into a race.
  // Client should immediately navigate to /play/critter-kart/launch
  // with the launchUrl which already includes session=<jwt>&race=<id>.
  'match:found':         { raceId: string; launchUrl: string; players: Member[]; format: { laps: number } };

  // ── Race-room ─────────────────────────────────────────────────────────────
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
>>>>>>> Stashed changes
}

export type ClientEventKey = keyof ClientEvents;
export type ServerEventKey = keyof ServerEvents;
