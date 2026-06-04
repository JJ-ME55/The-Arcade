// @ts-nocheck
/**
 * Wire protocol — the typed contract between the Critter Kart client and JJ's
 * multiplayer backend. All payloads are plain JSON; event names are strings of
 * the form `<area>:<verb>` (e.g. `lobby:create`).
 *
 * Direction key in comments:
 *   C → S   client emits, server receives
 *   S → C   server emits, client receives
 *   *      can flow either way (mostly client-emitted, server relays as-is)
 *
 * Two maps below — `ClientEvents` (what the client can EMIT) and `ServerEvents`
 * (what the client can SUBSCRIBE to) — let `NetClient.emit()` and `.on()` be
 * fully type-safe end to end.
 */

// =============================================================================
// Shared shapes
// =============================================================================

/** A racer in a lobby or race. `slot` is assigned by the server on race start. */
export interface Member {
  username: string;
  slot?: number;     // 0..3, present once race has been allocated
  racerId?: string;  // chosen Rusty/Fish/etc; final value sent in race:start
  ready?: boolean;   // lobby-only: did this member tap Ready?
  host?: boolean;    // lobby-only: is this member the lobby creator (custom matches)?
}

export interface LobbyState {
  id: string;
  name: string;
  cap: number;                 // 1..4 — chosen by host on create
  hostUsername: string;
  members: Member[];           // does NOT include pending join requests
  pending: { requestId: string; username: string }[]; // host-side only
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
}

// =============================================================================
// Client → Server events
// =============================================================================

export interface ClientEvents {
  // ── Lobby (custom matches) ────────────────────────────────────────────────
  'lobby:list':       Record<string, never>;
  'lobby:create':     { name: string; cap: number };
  'lobby:join':       { lobbyId: string };
  'lobby:decision':   { requestId: string; accept: boolean };
  'lobby:ready':      { lobbyId: string; ready: boolean };
  'lobby:start':      { lobbyId: string };
  'lobby:leave':      { lobbyId: string };

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
}

// =============================================================================
// Server → Client events
// =============================================================================

export interface ServerEvents {
  // ── Connection ────────────────────────────────────────────────────────────
  'net:connected':       { username: string };
  'net:error':           { message: string };

  // ── Lobby ─────────────────────────────────────────────────────────────────
  'lobby:listing':       { lobbies: LobbySummary[] };
  'lobby:created':       { lobby: LobbyState };
  'lobby:state':         { lobby: LobbyState };
  'lobby:joinRequest':   { lobbyId: string; requestId: string; username: string };
  'lobby:joined':        { lobby: LobbyState };
  'lobby:declined':      { lobbyId: string; reason?: string };
  'lobby:closed':        { lobbyId: string; reason?: string };

  // ── Matchmaking ───────────────────────────────────────────────────────────
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
}

export type ClientEventKey = keyof ClientEvents;
export type ServerEventKey = keyof ServerEvents;
