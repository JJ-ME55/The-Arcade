/**
 * The Arcade / SolShot backend integration (Tier-1 leaderboard + per-user cloud save).
 *
 * Flow (per the Arcade playbook §B): the bot launches the game at
 *   thearcade.gg/play/drilldeep/launch?session=<JWT>
 * The JWT (signed server-side with DRILLDEEP_LEADERBOARD_SECRET) carries the player's
 * Telegram identity. We stash it, then use it to POST scores, sync the save blob, and read
 * the shared leaderboard from the SolShot server. Everything degrades gracefully to the
 * local-first behaviour when there's no session / no API base (e.g. playing the bare URL).
 */
import type { LeaderboardEntry, MetaState } from '../core/types';

export const GAME_SLUG = 'drilldeep';
const SESSION_KEY = 'arcade_session';
const UNSENT_KEY = 'drilldeep_unsent_score';

function apiBase(): string | null {
  const b = (import.meta.env.VITE_SOLSHOT_API_BASE as string | undefined)?.replace(/\/$/, '');
  return b && b.length > 0 ? b : null;
}

/** Capture the launch session JWT (?session=…) into sessionStorage; return it if present. */
export function captureSession(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('session');
    if (fromUrl) sessionStorage.setItem(SESSION_KEY, fromUrl);
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Is the cloud reachable? (a launch session AND a configured backend). */
export function isOnline(): boolean {
  return !!apiBase() && !!getSession();
}

/** Decode (NOT verify) the JWT payload to read display name / tg id for UI. */
export function sessionIdentity(): { tg?: number; name?: string } | null {
  const t = getSession();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { tg: payload.tg, name: payload.un || payload.fn || undefined };
  } catch {
    return null;
  }
}

async function post(path: string, body: unknown): Promise<Response | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    return await fetch(`${base}/api/games/${GAME_SLUG}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

// ---- Scores ----
export interface ScorePayload {
  score: number;
  depth: number;
  cash: number;
  mode: string;
  seed: string;
}

/** Submit a score; on failure stash it to retry next boot. Returns true if accepted.
 *  The SolShot server reads the bot JWT from `body.session` (or an Authorization: Bearer
 *  Privy token for web users). Extra fields (depth/cash/mode/seed) are stored by the
 *  drilldeep leaderboard service. */
export async function submitScore(p: ScorePayload): Promise<boolean> {
  const jwt = getSession();
  if (!jwt || !apiBase()) return false;
  const body = JSON.stringify({ session: jwt, ...p });
  try {
    const r = await fetch(`${apiBase()}/api/games/${GAME_SLUG}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (r.ok) return true;
  } catch {
    /* fall through to stash */
  }
  try {
    localStorage.setItem(UNSENT_KEY, body);
  } catch {
    /* ignore */
  }
  return false;
}

/** Retry any score that failed to send on a previous session. */
export async function flushUnsentScore(): Promise<void> {
  if (!apiBase() || !getSession()) return;
  let stash: string | null = null;
  try {
    stash = localStorage.getItem(UNSENT_KEY);
  } catch {
    return;
  }
  if (!stash) return;
  try {
    const r = await fetch(`${apiBase()}/api/games/${GAME_SLUG}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: stash,
    });
    if (r.ok) localStorage.removeItem(UNSENT_KEY);
  } catch {
    /* try next boot */
  }
}

/** Fetch the shared leaderboard, mapped to the game's LeaderboardEntry shape. */
export async function fetchLeaderboard(mode: string, limit: number): Promise<LeaderboardEntry[] | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const r = await fetch(`${base}/api/games/${GAME_SLUG}/leaderboard?mode=${encodeURIComponent(mode)}&limit=${limit}`);
    if (!r.ok) return null;
    const json = (await r.json()) as { leaderboard?: Array<Record<string, unknown>> };
    if (!json.leaderboard) return null;
    return json.leaderboard.map((e, i) => ({
      id: String(e.id ?? e.telegramUserId ?? i),
      name: String(e.displayName ?? e.name ?? 'Player'),
      score: Number(e.bestScore ?? e.score ?? 0),
      depth: Number(e.depth ?? 0),
      cash: Number(e.cash ?? 0),
      mode,
      seed: String(e.seed ?? ''),
      date: Number(e.date ?? 0),
    }));
  } catch {
    return null;
  }
}

// ---- Per-user cloud save ----
export async function loadCloudSave(): Promise<MetaState | null> {
  const base = apiBase();
  const jwt = getSession();
  if (!base || !jwt) return null;
  try {
    const r = await fetch(`${base}/api/games/${GAME_SLUG}/save?session=${encodeURIComponent(jwt)}`);
    if (!r.ok) return null;
    const json = (await r.json()) as { data?: MetaState | null };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function pushCloudSave(meta: MetaState): Promise<boolean> {
  const r = await post('/save', { session: getSession(), data: meta });
  return !!r && r.ok;
}
