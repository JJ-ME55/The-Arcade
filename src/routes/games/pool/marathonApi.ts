/**
 * Side Pocket Marathon — API client.
 *
 * Wraps the 5 marathon endpoints on the SolShot server:
 *   POST /api/games/pool/marathon/start
 *   POST /api/games/pool/marathon/setup-outcome
 *   POST /api/games/pool/marathon/cashout
 *   POST /api/games/pool/marathon/abandon
 *   GET  /api/games/pool/marathon/leaderboard
 *
 * All mutating calls take a `session` JWT in the body (same JWT the
 * arcade bot mints, or that the hub mints via /api/arcade/mint-session-…).
 * The hook `useArcadeSession` (companion file) sources the JWT from
 * sessionStorage (set by Pool.tsx / MatchHUD.tsx when a `?session=` query
 * is present on a bot-launched URL).
 */

const SERVER = import.meta.env.VITE_SOLSHOT_SERVER_URL
    || 'https://solshot.onrender.com';

export interface MarathonSetup {
    id: string;
    name: string;
    tier: number;
    goldReward: number;
    timeLimitMs: number;
    hint?: string;
    balls?: Array<{ id: number; color: string; x: number; y: number }>;
    useStandardRack?: boolean;
    winCondition?: { type: string; [k: string]: unknown };
}

export interface MarathonRun {
    runId: string;
    callsign?: string;
    livesAtStart: number;
    livesRemaining: number;
    setupsCompleted: number;
    setupsAttempted: number;
    currentStreak: number;
    longestStreak: number;
    perfectRun: boolean;
    totalScore: number;
    highestTierReached: number;
    earnedGold: number;
    earnedTickets: number;
    status: 'active' | 'ended_lives_exhausted' | 'ended_cashout' | 'ended_disconnect';
    startedAt: string;
    endedAt: string | null;
    durationMs: number;
}

export interface MarathonLeaderboardEntry {
    rank: number;
    displayName: string;
    totalScore: number;
    longestStreak: number;
    perfectRun: boolean;
    endedAt: string;
}

export type MarathonOutcome = 'completed' | 'lives_exhausted' | 'skipped';

// ─── Mutating calls (require session) ───────────────────────────────

export async function startRun(session: string): Promise<{
    ok: boolean;
    runId?: string;
    run?: MarathonRun;
    firstSetup?: MarathonSetup;
    error?: string;
}> {
    const r = await fetch(`${SERVER}/api/games/pool/marathon/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session }),
    });
    return await r.json();
}

export async function recordSetupOutcome(
    session: string,
    runId: string,
    params: {
        setupId: string;
        outcome: MarathonOutcome;
        livesUsedThisRound?: number;
        shotCount?: number;
        durationMs?: number;
    }
): Promise<{
    ok: boolean;
    run?: MarathonRun;
    nextSetup?: MarathonSetup | null;
    runEnded?: boolean;
    gold?: number;
    milestoneTickets?: number;
    error?: string;
}> {
    const r = await fetch(`${SERVER}/api/games/pool/marathon/setup-outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, runId, ...params }),
    });
    return await r.json();
}

export async function cashOutRun(
    session: string,
    runId: string,
): Promise<{ ok: boolean; run?: MarathonRun; perfectBonusApplied?: boolean; error?: string }> {
    const r = await fetch(`${SERVER}/api/games/pool/marathon/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, runId }),
    });
    return await r.json();
}

export async function abandonRun(
    session: string,
    runId: string,
): Promise<{ ok: boolean; run?: MarathonRun; error?: string }> {
    const r = await fetch(`${SERVER}/api/games/pool/marathon/abandon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, runId }),
    });
    return await r.json();
}

// ─── Public leaderboard fetch (no auth) ─────────────────────────────

export async function getMarathonLeaderboard(
    scope: 'daily' | 'weekly' | 'all-time' = 'weekly',
    limit = 10,
): Promise<{ ok: boolean; scope?: string; leaderboard?: MarathonLeaderboardEntry[]; error?: string }> {
    const r = await fetch(
        `${SERVER}/api/games/pool/marathon/leaderboard?scope=${scope}&limit=${limit}`,
    );
    return await r.json();
}

// ─── Dev-mode guest session minter ──────────────────────────────────
//
// Until production auth is wired (bot or hub Privy), this lets early
// testers grab a guest JWT so they can play. Server endpoint is guarded
// by the ENABLE_POOL_GUEST_SESSIONS env var — in prod-locked deploys
// this returns 404.

export async function mintDevGuestSession(handle?: string): Promise<{
    ok: boolean;
    session?: string;
    identity?: { telegramUserId: number; handle: string };
    error?: string;
}> {
    const r = await fetch(`${SERVER}/api/games/pool/dev-mint-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
    });
    return await r.json();
}

// ─── Session helper ─────────────────────────────────────────────────

/**
 * Read the arcade-session JWT from sessionStorage. Set by Pool.tsx /
 * MatchHUD.tsx on first load when a `?session=…` query is present (from
 * a bot deep-link). Returns null if no session — caller must surface a
 * "sign in / open from Telegram" prompt.
 */
export function getArcadeSession(): string | null {
    try {
        return sessionStorage.getItem('arcade_session');
    } catch {
        return null;
    }
}
