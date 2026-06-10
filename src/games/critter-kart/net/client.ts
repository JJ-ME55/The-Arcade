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
    // Race-loop API — added 2026-06-05 so the same client can back both
    // the lobby UI (emit/on) AND GameCanvas's rAF tick (sendInput +
    // getLatestSnapshot). Previously these lived only on CritterKartNet,
    // which the multiplayer context never actually instantiated — App.tsx
    // passed the lobby NetClient instead, and the rAF tick crashed every
    // frame on `ctx.net.sendInput is not a function`, freezing the
    // loading bar at the first onProgress emit (~4%).
    sendInput(frame: RaceInputFrame): void;
    getLatestSnapshot(): RaceSnapshot | null;
    getInterpolatedKart(kartId: string, interpDelayMs?: number): any | null;
    // Server's locked race-start wall-clock. Set when server emits
    // `race:countdownLocked` AFTER all clients are assets-ready —
    // overrides the stale startAtMs from race:start which was set
    // before anyone had finished loading. Returns null if the lock
    // event hasn't arrived yet; caller falls back to mpRace.startAtMs.
    getRaceStartAtMs(): number | null;
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
    // Latest race:snapshot — captured by the proxy listener below and
    // surfaced via getLatestSnapshot() so GameCanvas's rAF tick can pull
    // remote-kart state without subscribing through the listener map.
    let latestSnapshot: RaceSnapshot | null = null;
    // Snapshot ring buffer for interpolation. The previous design tracked
    // only prevSnap + latestSnapshot, but with a 100ms render-delay and
    // snapshots arriving at 30Hz (~33ms apart), `renderTime` was almost
    // always OLDER than prevSnapAt → the lerp `t` clamped to 0, so karts
    // rendered exactly at prevSnap's position and "stepped" every 33ms
    // instead of lerping. That's the "jumpy / not clean" JJ reported
    // 2026-06-09. Fix: keep ~1s of snapshot history and pick the two
    // entries that BRACKET the renderTime — canonical Glenn Fiedler /
    // Source-engine snapshot interpolation.
    const SNAP_BUFFER_MS = 1000;
    type SnapEntry = { snap: RaceSnapshot; at: number };
    const snapBuffer: SnapEntry[] = [];
    // Server's locked race-start wall-clock. Updated when
    // `race:countdownLocked` arrives — that's AFTER all humans have
    // emitted critterkart:ready (or after the 15s fallback fires on
    // server). Once set, GameCanvas uses this in place of the stale
    // mpRace.startAtMs from race:start so both clients agree on the
    // race-time anchor regardless of asset-load asymmetry.
    let raceStartAtMs: number | null = null;
    // Last critterkart:joinRace payload — kept so a RECONNECT can
    // automatically rejoin the race room. Safari App Nap (and other
    // background-tab suspensions) kill the websocket ~2min after the
    // window goes idle; socket.io re-establishes the TRANSPORT when
    // the tab wakes, but socket.io rooms are per-connection server
    // state — without re-emitting joinRace the revived client gets no
    // snapshots and the world looks frozen. JJ's 2026-06-10 test:
    // race 5imikBtO35Y ran clean for ~90s, then the idle Mac Safari
    // died ("transport close") and never recovered. Server-side,
    // joinRace cancels the reconnect grace (kart saved if within 30s)
    // and replays race:countdownLocked (anchor restored) — so this
    // one re-emit makes wake-up recovery fully seamless.
    let lastJoinRacePayload: any = null;
    let hadConnectedOnce = false;

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
            // RECONNECT (not first connect) while a race was active →
            // rejoin the race room. The server cancels reconnect grace
            // and replays race:countdownLocked, so snapshots + anchor
            // resume immediately.
            if (hadConnectedOnce && lastJoinRacePayload) {
                socket.emit('critterkart:joinRace', lastJoinRacePayload);
                console.log(
                    '[critter-kart/diag] socket reconnected → auto re-joined race',
                    lastJoinRacePayload?.raceId,
                );
            }
            hadConnectedOnce = true;
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
            'race:countdownLocked' as any,  // updated startAtMs after all-ready handshake
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
            socket.on(ev as string, (payload: any) => {
                if (ev === ('race:snapshot' as ServerEventKey)) {
                    latestSnapshot = payload as RaceSnapshot;
                    const now = Date.now();
                    snapBuffer.push({ snap: payload as RaceSnapshot, at: now });
                    // Trim entries older than SNAP_BUFFER_MS so we don't
                    // grow unbounded over a 5-minute race.
                    const cutoff = now - SNAP_BUFFER_MS;
                    while (snapBuffer.length > 0 && snapBuffer[0].at < cutoff) {
                        snapBuffer.shift();
                    }
                }
                // Capture the all-clients-ready locked startAtMs so
                // GameCanvas's elapsed anchors to the same wall-clock
                // across all clients regardless of asset-load timing.
                if (ev === ('race:countdownLocked' as any) && payload?.startAtMs) {
                    raceStartAtMs = payload.startAtMs;
                    console.log('[critter-kart/diag] race:countdownLocked → startAtMs', payload.startAtMs);
                }
                // Race over → stop auto-rejoining it on reconnect.
                if (ev === ('critterkart:final' as any) || ev === ('race:final' as ServerEventKey)) {
                    lastJoinRacePayload = null;
                }
                dispatch(ev, payload);
            });
        }
    })();

    return {
        ready: () => ready,
        username: () => usernameValue,
        emit(event, payload) {
            // Remember the joinRace payload for reconnect auto-rejoin
            // (see lastJoinRacePayload above).
            if ((event as string) === 'critterkart:joinRace') {
                lastJoinRacePayload = payload;
            }
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
        sendInput(frame: RaceInputFrame) {
            // Same socket as the lobby — input frames go on race:input.
            // Fire-and-forget; if the socket isn't connected yet, drop
            // (the rAF tick fires 30Hz so the next frame will retry).
            if (socket && socket.connected) {
                try { socket.emit('race:input', frame); } catch { /* ignore */ }
            }
        },
        getLatestSnapshot() {
            return latestSnapshot;
        },
        getRaceStartAtMs() {
            return raceStartAtMs;
        },
        getInterpolatedKart(kartId: string, interpDelayMs: number = 100) {
            // Snapshot-buffered interpolation (Glenn Fiedler pattern).
            // Render renderTime = now - interpDelayMs and pick the two
            // buffered snapshots that bracket it: kart position lerps
            // smoothly between them. At 30Hz snapshots + 100ms delay we
            // typically have ~3 snapshots of buffer on the "past" side
            // and 0 on the "future" side, so jitter is absorbed and the
            // motion stays glassy.
            //
            // Previous design tracked only prevSnap+latest (2 entries),
            // which gave only one snapshot-period of bracket coverage.
            // With 100ms delay, renderTime fell BEFORE prevSnapAt almost
            // always → t clamped to 0 → karts visibly stepped instead of
            // lerping. JJ 2026-06-09 "jumpy / not clean" report.
            //
            // Edge cases handled below:
            //   - No buffered snapshots → null
            //   - renderTime older than oldest sample → use oldest
            //     (race just started, only one snapshot received)
            //   - renderTime newer than newest sample → extrapolate the
            //     last pair, capped at 1.5x to mask brief packet loss
            //     without launching the kart into orbit
            //   - kartId missing in one of the pair → fall back to the
            //     side that has it
            if (snapBuffer.length === 0) return null;

            const findKart = (s: RaceSnapshot | null) =>
                s?.karts.find((k: any) => k.kartId === kartId) ?? null;

            const renderTime = Date.now() - interpDelayMs;

            // Find leftIdx = largest i with snapBuffer[i].at <= renderTime.
            // Walk from newest backward — typical case it's the second-to-last.
            let leftIdx = -1;
            for (let i = snapBuffer.length - 1; i >= 0; i--) {
                if (snapBuffer[i].at <= renderTime) { leftIdx = i; break; }
            }

            if (leftIdx < 0) {
                // renderTime older than every buffered sample (race just
                // started — only one snapshot in buffer, or interpDelayMs
                // is larger than the buffer span). Show oldest.
                return findKart(snapBuffer[0].snap);
            }

            // Pick the bracket pair. If leftIdx is the very last entry,
            // there's no "future" sample — extrapolate against the
            // previous pair so the kart keeps moving while we wait for
            // the next snapshot to land.
            const isLast = leftIdx === snapBuffer.length - 1;
            const ai = isLast ? Math.max(0, leftIdx - 1) : leftIdx;
            const bi = isLast ? leftIdx : leftIdx + 1;

            if (ai === bi) {
                // Only one snapshot in buffer.
                return findKart(snapBuffer[ai].snap);
            }

            const aEntry = snapBuffer[ai];
            const bEntry = snapBuffer[bi];
            const dt = bEntry.at - aEntry.at;
            if (dt <= 0) return findKart(bEntry.snap);

            // Allow extrapolation up to 1.5x past `b` (one extra snap
            // interval) to bridge a single missing packet; cap so a
            // long drop doesn't propel the kart off the track.
            const t = Math.max(0, Math.min(1.5, (renderTime - aEntry.at) / dt));

            const ka: any = findKart(aEntry.snap);
            const kb: any = findKart(bEntry.snap);
            if (!ka || !kb) return kb || ka || null;

            // Heading lerp — handle 2π wrap so karts don't spin the long
            // way around when crossing the discontinuity.
            let dh = kb.heading - ka.heading;
            while (dh > Math.PI) dh -= 2 * Math.PI;
            while (dh < -Math.PI) dh += 2 * Math.PI;

            return {
                ...kb,
                x: ka.x + (kb.x - ka.x) * t,
                z: ka.z + (kb.z - ka.z) * t,
                y: (ka.y ?? 0) + ((kb.y ?? 0) - (ka.y ?? 0)) * t,
                heading: ka.heading + dh * t,
                speed: ka.speed + (kb.speed - ka.speed) * t,
            };
        },
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
