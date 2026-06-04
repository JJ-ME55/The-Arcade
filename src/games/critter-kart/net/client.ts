// @ts-nocheck
/**
<<<<<<< Updated upstream
 * Typed network client. Wraps a duplex JSON channel (WebSocket in production,
 * an in-memory echo-bus in dev/stub mode) and exposes `emit<K>(key, payload)`
 * + `on<K>(key, handler)` with full type-safety against `protocol.ts`.
 *
 * The stub backend lives at the bottom of this file: it implements the same
 * surface as the real server but everything is in-process. It fakes other
 * players, auto-fills matchmaking with bots after a short timer, and lets the
 * UI flows be developed end-to-end without JJ's backend being up.
 */

import { getArcadeUsername } from './identity';
import type {
  ClientEvents, ServerEvents, ClientEventKey, ServerEventKey,
  LobbyState, LobbySummary, Member,
} from './protocol';

type Listener<K extends ServerEventKey> = (payload: ServerEvents[K]) => void;
type AnyListener = (payload: unknown) => void;

export interface NetClient {
  /** Resolves once the connection is open AND the server has acknowledged us. */
  ready(): Promise<void>;
  username(): string;
  emit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void;
  on<K extends ServerEventKey>(event: K, handler: Listener<K>): () => void;
  close(): void;
  /** True in dev when the in-process stub server is in use. */
  isStub: boolean;
}

let singleton: NetClient | null = null;

/** Get (or lazily create) the shared connection. There's only one — every
 *  screen subscribes to the same instance via React hooks. */
export function getNetClient(): NetClient {
  if (!singleton) singleton = createClient();
  return singleton;
}

function createClient(): NetClient {
  const url = (import.meta.env.VITE_MP_URL as string | undefined)?.trim();
  // No real URL configured → spin up the in-memory stub server. This is the
  // dev path: JJ's backend isn't up yet, but the screens still need to work.
  if (!url) return createStubClient();
  return createWebSocketClient(url);
}

// =============================================================================
// Real WebSocket transport (used in production once JJ's server is up).
// Shape of the wire frames:  { type: <event key>, payload: <typed payload> }
// =============================================================================

function createWebSocketClient(url: string): NetClient {
  const listeners = new Map<ServerEventKey, Set<AnyListener>>();
  let usernameValue = '';
  let ws: WebSocket | null = null;

  const open = (async () => {
    usernameValue = await getArcadeUsername();
    ws = new WebSocket(`${url}?u=${encodeURIComponent(usernameValue)}`);
    await new Promise<void>((resolve, reject) => {
      ws!.addEventListener('open', () => resolve(), { once: true });
      ws!.addEventListener('error', () => reject(new Error('socket failed')), { once: true });
    });
    ws!.addEventListener('message', (e) => {
      try {
        const frame = JSON.parse(e.data) as { type: ServerEventKey; payload: unknown };
        dispatch(frame.type, frame.payload);
      } catch { /* ignore malformed */ }
    });
    ws!.addEventListener('close', () => dispatch('net:error', { message: 'connection closed' }));
  })();

  function dispatch(type: ServerEventKey, payload: unknown): void {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of set) fn(payload);
  }

  return {
    ready: () => open,
    username: () => usernameValue,
    emit(event, payload) {
      const frame = JSON.stringify({ type: event, payload });
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(frame);
    },
    on<K extends ServerEventKey>(event: K, handler: Listener<K>) {
      let set = listeners.get(event);
      if (!set) { set = new Set(); listeners.set(event, set); }
      set.add(handler as AnyListener);
      return () => set!.delete(handler as AnyListener);
    },
    close() { ws?.close(); },
    isStub: false,
  };
}

// =============================================================================
// Stub server (in-process). Implements just enough of the wire protocol to
// drive the UI: create/join/list lobbies, accept/decline, ready, matchmake.
// Fakes additional members with short timers so flows feel "alive".
// =============================================================================

function createStubClient(): NetClient {
  const listeners = new Map<ServerEventKey, Set<AnyListener>>();
  let usernameValue = '';

  // Stub state ──────────────────────────────────────────────────────────────
  const lobbies = new Map<string, LobbyState>();
  let nextLobbyId = 1;
  let nextRequestId = 1;
  let myLobbyId: string | null = null;
  let matchTimer: number | null = null;
  let fakeFillTimer: number | null = null;

  // Seed the browse list with a couple of dummy lobbies so the screen isn't
  // empty on first open. They auto-tick their joined count to simulate life.
  const seedFakeLobby = (id: string, name: string, host: string, cap: number, joined: number): LobbyState => ({
    id, name, hostUsername: host, cap,
    members: Array.from({ length: joined }, (_, i) => ({ username: i === 0 ? host : `fake-${i}`, ready: false, host: i === 0 })),
    pending: [], status: 'open',
  });
  lobbies.set('seed-jj', seedFakeLobby('seed-jj', 'JJ Lobby', 'JJ', 4, 2));
  lobbies.set('seed-fish', seedFakeLobby('seed-fish', 'Fish vs Pip', 'Fish', 2, 1));

  const ready = (async () => {
    usernameValue = await getArcadeUsername();
    setTimeout(() => dispatch('net:connected', { username: usernameValue }), 0);
  })();

  function dispatch<K extends ServerEventKey>(type: K, payload: ServerEvents[K]): void {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of set) fn(payload as unknown);
  }

  function lobbySummary(l: LobbyState): LobbySummary {
    return { id: l.id, name: l.name, hostUsername: l.hostUsername, cap: l.cap, joinedCount: l.members.length, status: l.status === 'closed' ? 'open' : l.status };
  }

  function broadcastLobby(l: LobbyState): void {
    dispatch('lobby:state', { lobby: structuredClone(l) });
  }

  // Per-emit handler. Switch is dense but keeps stub logic obvious + auditable.
  function handleEmit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void {
    switch (event) {
      // ── Lobby browsing / creation ──────────────────────────────────────
      case 'lobby:list': {
        const list = Array.from(lobbies.values()).filter((l) => l.status === 'open').map(lobbySummary);
        dispatch('lobby:listing', { lobbies: list });
        return;
      }
      case 'lobby:create': {
        const { name, cap } = payload as ClientEvents['lobby:create'];
        const id = `lobby-${nextLobbyId++}`;
        const lobby: LobbyState = {
          id, name: name.trim() || `${usernameValue}'s lobby`, cap: Math.max(1, Math.min(4, cap)),
          hostUsername: usernameValue,
          members: [{ username: usernameValue, host: true, ready: false }],
          pending: [], status: 'open',
        };
        lobbies.set(id, lobby);
        myLobbyId = id;
        dispatch('lobby:created', { lobby: structuredClone(lobby) });
        // After a beat, fake an incoming join request to test the accept/decline flow.
        if (fakeFillTimer !== null) window.clearTimeout(fakeFillTimer);
        fakeFillTimer = window.setTimeout(() => {
          if (lobbies.get(id)?.status !== 'open') return;
          const requestId = `req-${nextRequestId++}`;
          const requester = 'Pip';
          lobby.pending.push({ requestId, username: requester });
          dispatch('lobby:joinRequest', { lobbyId: id, requestId, username: requester });
          broadcastLobby(lobby);
        }, 3500);
        return;
      }
      case 'lobby:join': {
        const { lobbyId } = payload as ClientEvents['lobby:join'];
        const lobby = lobbies.get(lobbyId);
        if (!lobby) { dispatch('lobby:declined', { lobbyId, reason: 'not found' }); return; }
        if (lobby.members.length >= lobby.cap) { dispatch('lobby:declined', { lobbyId, reason: 'full' }); return; }
        // Fake host auto-accept after a small delay so the flow stays watchable.
        const requestId = `req-${nextRequestId++}`;
        lobby.pending.push({ requestId, username: usernameValue });
        myLobbyId = lobbyId;
        window.setTimeout(() => {
          const idx = lobby.pending.findIndex((p) => p.requestId === requestId);
          if (idx < 0) return;
          lobby.pending.splice(idx, 1);
          lobby.members.push({ username: usernameValue, ready: false });
          dispatch('lobby:joined', { lobby: structuredClone(lobby) });
          broadcastLobby(lobby);
        }, 900);
        return;
      }
      case 'lobby:decision': {
        const { requestId, accept } = payload as ClientEvents['lobby:decision'];
        if (!myLobbyId) return;
        const lobby = lobbies.get(myLobbyId);
        if (!lobby) return;
        const idx = lobby.pending.findIndex((p) => p.requestId === requestId);
        if (idx < 0) return;
        const [request] = lobby.pending.splice(idx, 1);
        if (accept) {
          lobby.members.push({ username: request.username, ready: false });
          // The accepted player is a fake here; flip them ready a moment later.
          window.setTimeout(() => {
            const m = lobby.members.find((mm) => mm.username === request.username);
            if (m) { m.ready = true; broadcastLobby(lobby); }
          }, 1200);
        }
        broadcastLobby(lobby);
        return;
      }
      case 'lobby:ready': {
        const { lobbyId, ready } = payload as ClientEvents['lobby:ready'];
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        const me = lobby.members.find((m) => m.username === usernameValue);
        if (me) me.ready = ready;
        broadcastLobby(lobby);
        return;
      }
      case 'lobby:start': {
        const { lobbyId } = payload as ClientEvents['lobby:start'];
        const lobby = lobbies.get(lobbyId);
        if (!lobby) return;
        lobby.status = 'starting';
        const members: Member[] = lobby.members.map((m, i) => ({ username: m.username, slot: i }));
        // Tiny grace window so the host's UI can animate the start press.
        window.setTimeout(() => dispatch('race:start', { roomId: lobbyId, startAtMs: Date.now() + 1200, members }), 250);
        return;
      }
      case 'lobby:leave': {
        const { lobbyId } = payload as ClientEvents['lobby:leave'];
        const lobby = lobbies.get(lobbyId);
        if (lobby) {
          lobby.members = lobby.members.filter((m) => m.username !== usernameValue);
          if (lobby.hostUsername === usernameValue || lobby.members.length === 0) {
            lobby.status = 'closed';
            dispatch('lobby:closed', { lobbyId });
            lobbies.delete(lobbyId);
          } else {
            broadcastLobby(lobby);
          }
        }
        myLobbyId = null;
        return;
      }
      // ── Matchmaking ────────────────────────────────────────────────────
      case 'match:enqueue': {
        dispatch('match:queued', { eta: 8 });
        if (matchTimer !== null) window.clearTimeout(matchTimer);
        // Auto-fill flow: pretend we found 1 other human after 4 s, then start
        // with bots filling slots 2-3 after the full 8 s window.
        matchTimer = window.setTimeout(() => {
          const members: Member[] = [
            { username: usernameValue, slot: 0 },
            { username: 'Pip',          slot: 1 },
          ];
          dispatch('match:found', { roomId: 'qm-stub', members });
          // After the lobby ready-up beat, fire race:start.
          window.setTimeout(() => dispatch('race:start', { roomId: 'qm-stub', startAtMs: Date.now() + 1200, members }), 3500);
        }, 4000);
        return;
      }
      case 'match:cancel': {
        if (matchTimer !== null) { window.clearTimeout(matchTimer); matchTimer = null; }
        return;
      }
      // ── In-race events (no-op in stub) ────────────────────────────────
      default:
        return;
    }
  }

  return {
    ready: () => ready,
    username: () => usernameValue,
    emit: handleEmit,
    on<K extends ServerEventKey>(event: K, handler: Listener<K>) {
      let set = listeners.get(event);
      if (!set) { set = new Set(); listeners.set(event, set); }
      set.add(handler as AnyListener);
      return () => set!.delete(handler as AnyListener);
    },
    close() { if (matchTimer !== null) window.clearTimeout(matchTimer); if (fakeFillTimer !== null) window.clearTimeout(fakeFillTimer); },
    isStub: true,
  };
=======
 * Critter Kart network client — socket.io connection to the SolShot
 * server-authoritative race backend.
 *
 * SESSION 2c REWRITE (2026-06-04):
 *   Replaces the previous stub-backend client. The dev in-process stub
 *   is gone — multiplayer requires a real server. For local development
 *   point VITE_SOLSHOT_API_BASE at a local SolShot dev server.
 *
 * PREREQ:
 *   The Arcade repo needs `socket.io-client` in dependencies. Run:
 *     npm install socket.io-client@^4.7.0
 *   Without it the dynamic import below throws and multiplayer is
 *   silently disabled (caller falls back to single-player mode).
 *
 * Usage:
 *   const net = await createCritterKartNet({
 *     telegramUserId: 12345,
 *     sessionJwt: 'eyJhbGc...',
 *   });
 *   net.on('match:found', m => console.log('matched', m));
 *   net.emit('match:enqueue', { telegramUserId: 12345 });
 *   ...
 *   net.sendInput({ raceId, kartId, seq, steer, throttle, brake, drift });
 *   ...
 *   net.disconnect();
 */

import type {
    ClientEvents, ServerEvents, ClientEventKey, ServerEventKey,
    RaceSnapshot, RaceInputFrame,
} from './protocol';

const SERVER_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLSHOT_API_BASE) ||
    'https://solshot.onrender.com';

/** Snapshot ring buffer size — ~1 second at 20Hz */
const SNAPSHOT_BUFFER = 20;

/** Input send rate — 30Hz (server ticks at 60Hz but accepts latest-wins faster) */
const INPUT_HZ = 30;
const INPUT_INTERVAL_MS = Math.round(1000 / INPUT_HZ);

export interface CritterKartNet {
    /** Resolves once the socket has connected. */
    ready(): Promise<void>;
    /** Is the socket connected? */
    isConnected(): boolean;
    /** Subscribe to a server event. Returns an unsubscribe fn. */
    on<K extends ServerEventKey>(event: K, handler: (payload: ServerEvents[K]) => void): () => void;
    /** Emit a client event to the server. */
    emit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void;
    /**
     * Push a new input frame to the outbound buffer. The actual wire
     * send happens at INPUT_HZ — pushing faster just overwrites the
     * latest. This matches the "latest input wins" server contract.
     */
    sendInput(frame: Omit<RaceInputFrame, 'seq'> & { seq?: number }): void;
    /** Return the most recent snapshot for the active race, or null. */
    getLatestSnapshot(): RaceSnapshot | null;
    /** Disconnect + clean up. */
    disconnect(): void;
}

export interface NetOptions {
    telegramUserId: number;
    sessionJwt: string;
    serverBase?: string;
}

/**
 * Lazy-load socket.io-client. If the dep isn't installed, throws —
 * callers should catch and fall back to single-player mode gracefully.
 */
async function loadSocketIo() {
    try {
        // @ts-ignore — dep may not be installed yet
        const mod = await import('socket.io-client');
        return mod.io;
    } catch (e) {
        throw new Error(
            'socket.io-client not installed. Run `npm install socket.io-client` ' +
            'in The-Arcade repo to enable Critter Kart multiplayer. ' +
            `(underlying error: ${e?.message || e})`
        );
    }
}

export async function createCritterKartNet(opts: NetOptions): Promise<CritterKartNet> {
    if (!opts?.telegramUserId) throw new Error('telegramUserId required');
    if (!opts?.sessionJwt) throw new Error('sessionJwt required');

    const io = await loadSocketIo();
    const base = opts.serverBase || SERVER_BASE;

    // Socket.io connection. Pass the session JWT in the handshake auth
    // so the server can validate identity once instead of on every
    // event. The SolShot server's connection handler reads this.
    const socket = io(base, {
        transports: ['websocket'],
        auth: {
            telegramUserId: opts.telegramUserId,
            sessionJwt: opts.sessionJwt,
            game: 'critter-kart',
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4000,
    });

    // Ready promise — resolves on first connect
    let readyResolve: () => void;
    const readyPromise = new Promise<void>((res) => { readyResolve = res; });
    let isReady = false;
    socket.on('connect', () => {
        if (!isReady) {
            isReady = true;
            readyResolve();
        }
    });

    // ─── Snapshot ring buffer ───────────────────────────────────────────
    // 20Hz inbound. Keep last N for client-side interpolation between
    // snapshots (smoother remote-kart rendering). v1 only uses the
    // latest; ring buffer is here for future-me when interpolation lands.
    const snapshotRing: RaceSnapshot[] = [];
    let latestSnapshot: RaceSnapshot | null = null;
    socket.on('race:snapshot', (snap: RaceSnapshot) => {
        latestSnapshot = snap;
        snapshotRing.push(snap);
        if (snapshotRing.length > SNAPSHOT_BUFFER) snapshotRing.shift();
    });

    // ─── Outbound input loop ────────────────────────────────────────────
    // Push latest input every INPUT_INTERVAL_MS. Server applies at its
    // 60Hz physics tick. If sendInput hasn't been called since the last
    // send, we skip — no point spamming idle frames.
    let pendingInput: RaceInputFrame | null = null;
    let inputSeq = 0;
    let inputTimer: ReturnType<typeof setInterval> | null = null;

    const startInputLoop = () => {
        if (inputTimer) return;
        inputTimer = setInterval(() => {
            if (!socket.connected) return;
            if (!pendingInput) return;
            socket.emit('race:input', pendingInput);
            pendingInput = null;
        }, INPUT_INTERVAL_MS);
    };

    const stopInputLoop = () => {
        if (inputTimer) { clearInterval(inputTimer); inputTimer = null; }
    };

    startInputLoop();

    // ─── Public API ─────────────────────────────────────────────────────

    return {
        ready() { return readyPromise; },
        isConnected() { return socket.connected; },

        on<K extends ServerEventKey>(event: K, handler: (payload: ServerEvents[K]) => void) {
            socket.on(event as string, handler as any);
            return () => socket.off(event as string, handler as any);
        },

        emit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]) {
            socket.emit(event as string, payload);
        },

        sendInput(frame) {
            const seq = frame.seq ?? ++inputSeq;
            if (typeof frame.seq !== 'number') inputSeq = seq;
            pendingInput = { ...frame, seq } as RaceInputFrame;
        },

        getLatestSnapshot() { return latestSnapshot; },

        disconnect() {
            stopInputLoop();
            try { socket.disconnect(); } catch { /* ignore */ }
        },
    };
>>>>>>> Stashed changes
}
