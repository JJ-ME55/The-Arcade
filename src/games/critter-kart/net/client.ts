// @ts-nocheck
/**
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
    socket.on('connect', () => {
        if (!isReady) {
            isReady = true;
            readyResolve();
        }
    });

    const snapshotRing: RaceSnapshot[] = [];
    let latestSnapshot: RaceSnapshot | null = null;
    socket.on('race:snapshot', (snap: RaceSnapshot) => {
        latestSnapshot = snap;
        snapshotRing.push(snap);
        if (snapshotRing.length > SNAPSHOT_BUFFER) snapshotRing.shift();
    });

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
}
