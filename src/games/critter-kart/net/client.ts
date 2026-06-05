// @ts-nocheck
/**
 * Critter Kart network client — REAL socket.io connection to SolShot.
 *
 * SESSION 2d (2026-06-04): replaces the in-process stub with a real
 * socket that talks to JJ's SolShot server-side lobby + race
 * implementation. The lobby browser actually shows other players'
 * rooms; Fish can join JJ's lobby; both ready up; host starts; race
 * begins for both.
 *
 * PREREQ: `npm install socket.io-client@^4.7.0` in this repo.
 *
 * TWO public exports:
 *
 *  (A) getNetClient() / NetClient
 *      Singleton used by Fish's lobby + custom-game UI
 *      (App.tsx + ui/multiplayer/screens.tsx). Wraps a socket.io
 *      connection in the NetClient interface so existing imports work
 *      unchanged.
 *
 *  (B) createCritterKartNet() / CritterKartNet
 *      Used by MultiplayerLayer for Quick Race / per-race input loops.
 *      Same socket connection style but exposes sendInput + getLatestSnapshot.
 *
 * Both authenticate via the arcade session JWT (decoded by identity.ts
 * into telegramUserId + JWT string, passed in socket handshake.auth).
 */

import { getArcadeIdentity, getArcadeUsername } from './identity';
import type {
    ClientEvents, ServerEvents, ClientEventKey, ServerEventKey,
    RaceSnapshot, RaceInputFrame,
} from './protocol';

type Listener<K extends ServerEventKey> = (payload: ServerEvents[K]) => void;
type AnyListener = (payload: unknown) => void;

const SERVER_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLSHOT_API_BASE) ||
    'https://solshot.onrender.com';

// ─── socket.io loader ───────────────────────────────────────────────────
let _socketIo: any = null;
async function loadSocketIo() {
    if (_socketIo) return _socketIo;
    try {
        // @ts-ignore — optional dep
        const mod = await import('socket.io-client');
        _socketIo = mod.io;
        return _socketIo;
    } catch (e: any) {
        throw new Error(
            'socket.io-client not installed. Run `npm install socket.io-client` ' +
            `in The-Arcade repo. (${e?.message || e})`
        );
    }
}

// ───────────────────────────────────────────────────────────────────────
// (A) Legacy-compatible NetClient — backs Fish's lobby UI with REAL server
// ───────────────────────────────────────────────────────────────────────

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
    if (!singleton) singleton = createRealClient();
    return singleton;
}

/**
 * Build the NetClient with a real socket.io connection. Identity comes
 * from the arcade JWT via identity.ts.
 */
function createRealClient(): NetClient {
    const listeners = new Map<ServerEventKey, Set<AnyListener>>();
    let usernameValue = '';
    let socket: any = null;
    const pendingEmits: Array<{ event: string; payload: any }> = [];

    function dispatch(type: ServerEventKey, payload: unknown): void {
        const set = listeners.get(type);
        if (!set) return;
        for (const fn of set) fn(payload);
    }

    const ready = (async () => {
        let identity;
        try {
            identity = await getArcadeIdentity();
        } catch (e) {
            console.warn('[critter-kart/net] identity resolve failed', e);
            // Continue with empty identity — server will reject auth
            // but at least the client doesn't crash
            identity = { telegramUserId: null, telegramUsername: null, firstName: null, sessionJwt: null, username: '' };
        }
        usernameValue = identity.username || '';

        // No JWT → can't authenticate. Surface this clearly but don't
        // throw — lobby UI just won't get any server events.
        if (!identity.sessionJwt || !identity.telegramUserId) {
            console.warn('[critter-kart/net] no session JWT — lobby/multiplayer disabled');
            setTimeout(() => dispatch('net:error' as any, { message: 'no_session', code: 'no_session' } as any), 0);
            return;
        }

        const io = await loadSocketIo();
        socket = io(SERVER_BASE, {
            transports: ['websocket'],
            auth: {
                telegramUserId: identity.telegramUserId,
                telegramUsername: identity.telegramUsername,
                firstName: identity.firstName,
                sessionJwt: identity.sessionJwt,
                game: 'critter-kart',
            },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 500,
            reconnectionDelayMax: 4000,
        });

        socket.on('connect', () => {
            dispatch('net:connected' as any, { telegramUserId: identity.telegramUserId, username: usernameValue } as any);
            // Flush queued emits
            while (pendingEmits.length > 0) {
                const ev = pendingEmits.shift()!;
                socket.emit(ev.event, ev.payload);
            }
        });
        socket.on('disconnect', () => {
            dispatch('net:error' as any, { message: 'disconnected' } as any);
        });
        socket.on('connect_error', (err: any) => {
            dispatch('net:error' as any, { message: String(err?.message || err) } as any);
        });

        // Forward EVERY server event to the listener map.
        const proxyEvents: ServerEventKey[] = [
            'net:connected', 'net:error',
            'lobby:listing', 'lobby:created', 'lobby:state',
            'lobby:joinRequest', 'lobby:joined', 'lobby:declined', 'lobby:closed',
            'match:queued', 'match:found',
            'race:start', 'race:state', 'race:countdown', 'race:snapshot', 'race:final', 'race:error',
            // Backwards-compat: server still emits critterkart:* names for
            // some events that pre-date the lobby rewrite. Listen for both
            // so Fish's UI components see what they expect.
            'critterkart:matched' as any,
            'critterkart:state' as any,
            'critterkart:countdown' as any,
            'critterkart:final' as any,
            'critterkart:error' as any,
        ];
        for (const ev of proxyEvents) {
            socket.on(ev as string, (payload: any) => dispatch(ev, payload));
        }
    })();

    return {
        ready: () => ready,
        username: () => usernameValue,
        emit(event, payload) {
            if (socket && socket.connected) {
                socket.emit(event as string, payload);
            } else {
                pendingEmits.push({ event: event as string, payload });
            }
        },
        on<K extends ServerEventKey>(event: K, handler: Listener<K>) {
            let set = listeners.get(event);
            if (!set) { set = new Set(); listeners.set(event, set); }
            set.add(handler as AnyListener);
            return () => set!.delete(handler as AnyListener);
        },
        close() {
            try { socket?.disconnect(); } catch { /* ignore */ }
        },
        isStub: false,
    };
}

// ───────────────────────────────────────────────────────────────────────
// (B) CritterKartNet — race-focused API (sendInput + snapshots)
// ───────────────────────────────────────────────────────────────────────

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
