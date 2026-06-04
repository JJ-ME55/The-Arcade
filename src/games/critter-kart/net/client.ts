// @ts-nocheck
/**
 * Critter Kart network client — TWO public APIs.
 *
 * (A) Legacy getNetClient() + NetClient interface
 *     Used by Fish's existing lobby/custom-game UI (App.tsx +
 *     ui/multiplayer/screens.tsx). Wraps a stub backend verbatim so the
 *     existing lobby UI keeps building and working with fake seed data.
 *     Real lobby-flow server impl is post-v1 work.
 *
 * (B) New createCritterKartNet() -> CritterKartNet
 *     Used by Session 2c's MultiplayerLayer + GameCanvas integration for
 *     server-authoritative Quick Race. Real socket.io connection to
 *     SolShot, 30Hz input loop, snapshot ring buffer. Requires
 *     `npm install socket.io-client`.
 *
 * Both exports coexist. Existing imports of getNetClient resolve cleanly.
 */

// =============================================================================
// (A) Legacy stub-backed NetClient — preserved from Fish's 0c8ac388b
// =============================================================================

import { getArcadeUsername } from './identity';
import type {
    ClientEvents, ServerEvents, ClientEventKey, ServerEventKey,
    LobbyState, LobbySummary, Member, RaceSnapshot, RaceInputFrame,
} from './protocol';

type Listener<K extends ServerEventKey> = (payload: ServerEvents[K]) => void;
type AnyListener = (payload: unknown) => void;

export interface NetClient {
    ready(): Promise<void>;
    username(): string;
    emit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void;
    on<K extends ServerEventKey>(event: K, handler: Listener<K>): () => void;
    close(): void;
    isStub: boolean;
}

let singleton: NetClient | null = null;

export function getNetClient(): NetClient {
    if (!singleton) singleton = createStubClient();
    return singleton;
}

function createStubClient(): NetClient {
    const listeners = new Map<ServerEventKey, Set<AnyListener>>();
    let usernameValue = '';

    const lobbies = new Map<string, LobbyState>();
    let nextLobbyId = 1;
    let nextRequestId = 1;
    let myLobbyId: string | null = null;
    let fakeFillTimer: any = null;

    const seedFakeLobby = (id: string, name: string, host: string, cap: number, joined: number): LobbyState => ({
        id, name, hostUsername: host, cap,
        members: Array.from({ length: joined }, (_, i) => ({
            username: i === 0 ? host : `fake-${i}`,
            ready: false,
            host: i === 0,
        })),
        pending: [], status: 'open',
    });
    lobbies.set('seed-jj', seedFakeLobby('seed-jj', 'JJ Lobby', 'JJ', 4, 2));
    lobbies.set('seed-fish', seedFakeLobby('seed-fish', 'Fish vs Pip', 'Fish', 2, 1));

    const ready = (async () => {
        usernameValue = await getArcadeUsername();
        setTimeout(() => dispatch('net:connected' as any, { username: usernameValue } as any), 0);
    })();

    function dispatch(type: ServerEventKey, payload: unknown): void {
        const set = listeners.get(type);
        if (!set) return;
        for (const fn of set) fn(payload);
    }

    function lobbySummary(l: LobbyState): LobbySummary {
        return {
            id: l.id, name: l.name, hostUsername: l.hostUsername, cap: l.cap,
            joinedCount: l.members.length,
            status: (l.status === 'closed' ? 'open' : l.status) as any,
        };
    }

    function broadcastLobby(l: LobbyState): void {
        dispatch('lobby:state' as any, { lobby: structuredClone(l) } as any);
    }

    function handleEmit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void {
        switch (event) {
            case 'lobby:list': {
                const list = Array.from(lobbies.values())
                    .filter((l) => l.status === 'open')
                    .map(lobbySummary);
                dispatch('lobby:listing' as any, { lobbies: list } as any);
                return;
            }
            case 'lobby:create': {
                const { name, cap } = payload as ClientEvents['lobby:create'];
                const id = `lobby-${nextLobbyId++}`;
                const lobby: LobbyState = {
                    id,
                    name: name.trim() || `${usernameValue}'s lobby`,
                    cap: Math.max(1, Math.min(6, cap)),
                    hostUsername: usernameValue,
                    members: [{ username: usernameValue, host: true, ready: false }],
                    pending: [], status: 'open',
                };
                lobbies.set(id, lobby);
                myLobbyId = id;
                dispatch('lobby:created' as any, { lobby: structuredClone(lobby) } as any);
                if (fakeFillTimer) clearTimeout(fakeFillTimer);
                fakeFillTimer = setTimeout(() => {
                    if (lobbies.get(id)?.status !== 'open') return;
                    const requestId = `req-${nextRequestId++}`;
                    lobby.pending.push({ requestId, username: 'Pip' });
                    dispatch('lobby:joinRequest' as any, { lobbyId: id, requestId, username: 'Pip' } as any);
                    broadcastLobby(lobby);
                }, 2200);
                return;
            }
            case 'lobby:join': {
                const { lobbyId } = payload as ClientEvents['lobby:join'];
                const lobby = lobbies.get(lobbyId);
                if (!lobby) return;
                lobby.members.push({ username: usernameValue, ready: false });
                myLobbyId = lobbyId;
                dispatch('lobby:joined' as any, { lobby: structuredClone(lobby) } as any);
                broadcastLobby(lobby);
                return;
            }
            case 'lobby:decision': {
                if (!myLobbyId) return;
                const lobby = lobbies.get(myLobbyId);
                if (!lobby) return;
                const { requestId, accept } = payload as ClientEvents['lobby:decision'];
                const idx = lobby.pending.findIndex((p) => p.requestId === requestId);
                if (idx < 0) return;
                const req = lobby.pending.splice(idx, 1)[0];
                if (accept) lobby.members.push({ username: req.username, ready: false });
                broadcastLobby(lobby);
                return;
            }
            case 'lobby:ready': {
                if (!myLobbyId) return;
                const lobby = lobbies.get(myLobbyId);
                if (!lobby) return;
                const { ready: rd } = payload as ClientEvents['lobby:ready'];
                const me = lobby.members.find((m) => m.username === usernameValue);
                if (me) me.ready = !!rd;
                broadcastLobby(lobby);
                return;
            }
            case 'lobby:start':
            case 'lobby:leave': {
                if (myLobbyId) {
                    const lobby = lobbies.get(myLobbyId);
                    if (lobby) {
                        lobby.status = 'closed';
                        broadcastLobby(lobby);
                    }
                    myLobbyId = null;
                }
                return;
            }
            case 'match:enqueue': {
                dispatch('match:queued' as any, { waitMs: 0 } as any);
                return;
            }
            default:
                return;
        }
    }

    return {
        ready: () => ready,
        username: () => usernameValue,
        emit(event, payload) { handleEmit(event, payload); },
        on<K extends ServerEventKey>(event: K, handler: Listener<K>) {
            let set = listeners.get(event);
            if (!set) { set = new Set(); listeners.set(event, set); }
            set.add(handler as AnyListener);
            return () => set!.delete(handler as AnyListener);
        },
        close() { /* stub: nothing to clean */ },
        isStub: true,
    };
}

// =============================================================================
// (B) New server-authoritative CritterKartNet — Session 2c
// =============================================================================

const SERVER_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLSHOT_API_BASE) ||
    'https://solshot.onrender.com';

const SNAPSHOT_BUFFER = 20;
const INPUT_HZ = 30;
const INPUT_INTERVAL_MS = Math.round(1000 / INPUT_HZ);

export interface CritterKartNet {
    ready(): Promise<void>;
    isConnected(): boolean;
    on<K extends ServerEventKey>(event: K, handler: (payload: ServerEvents[K]) => void): () => void;
    emit<K extends ClientEventKey>(event: K, payload: ClientEvents[K]): void;
    sendInput(frame: Omit<RaceInputFrame, 'seq'> & { seq?: number }): void;
    getLatestSnapshot(): RaceSnapshot | null;
    disconnect(): void;
}

export interface NetOptions {
    telegramUserId: number;
    sessionJwt: string;
    serverBase?: string;
}

async function loadSocketIo() {
    try {
        // @ts-ignore — optional dep
        const mod = await import('socket.io-client');
        return mod.io;
    } catch (e: any) {
        throw new Error(
            'socket.io-client not installed. Run `npm install socket.io-client` ' +
            'in The-Arcade repo to enable Critter Kart multiplayer. ' +
            `(${e?.message || e})`
        );
    }
}

export async function createCritterKartNet(opts: NetOptions): Promise<CritterKartNet> {
    if (!opts?.telegramUserId) throw new Error('telegramUserId required');
    if (!opts?.sessionJwt) throw new Error('sessionJwt required');

    const io = await loadSocketIo();
    const base = opts.serverBase || SERVER_BASE;

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

    let readyResolve: () => void;
    const readyPromise = new Promise<void>((res) => { readyResolve = res; });
    let isReady = false;
    socket.on('connect', () => { if (!isReady) { isReady = true; readyResolve(); } });

    let latestSnapshot: RaceSnapshot | null = null;
    const snapshotRing: RaceSnapshot[] = [];
    socket.on('race:snapshot', (snap: RaceSnapshot) => {
        latestSnapshot = snap;
        snapshotRing.push(snap);
        if (snapshotRing.length > SNAPSHOT_BUFFER) snapshotRing.shift();
    });

    let pendingInput: RaceInputFrame | null = null;
    let inputSeq = 0;
    const inputTimer = setInterval(() => {
        if (!socket.connected || !pendingInput) return;
        socket.emit('race:input', pendingInput);
        pendingInput = null;
    }, INPUT_INTERVAL_MS);

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
            clearInterval(inputTimer);
            try { socket.disconnect(); } catch { /* ignore */ }
        },
    };
}
