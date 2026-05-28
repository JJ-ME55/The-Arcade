import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

/**
 * Decode the TG user id from the arcade session JWT stored in
 * sessionStorage. The JWT was minted by the SolShot server when the bot
 * generated the `/play/<game>/launch?session=<jwt>` URL — payload carries
 * `tg`, `un`, `fn`. Each game has its own signing secret so we can't
 * verify cross-game, but the *payload* is identical and the standing
 * endpoint is public (rank is already visible on the leaderboard), so
 * decoding client-side without verification is fine.
 *
 * Storage-key history: basketball + keepie-uppies write to `arcade_session`,
 * free-kicks (forked from a separate repo) writes to `arcadeSession`. We
 * read both — whichever the most-recently-played game wrote.
 */
const SESSION_KEYS = ['arcade_session', 'arcadeSession'] as const;

function readTelegramUserIdFromSession(): number | null {
  try {
    let token: string | null = null;
    for (const key of SESSION_KEYS) {
      const candidate = sessionStorage.getItem(key);
      if (candidate) {
        token = candidate;
        break;
      }
    }
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return typeof payload?.tg === 'number' ? payload.tg : null;
  } catch {
    return null;
  }
}

export interface MyStanding {
  rank: number;
  bestScore: number;
  totalSubmissions: number;
  displayName: string;
  bestAchievedAt?: string;
  /** Overall standing only — how many cabinets the player has touched. */
  gamesPlayed?: number;
}

interface ServerResponse {
  ok: boolean;
  standing?: MyStanding | null;
  error?: string;
}

export interface UseMyStandingOptions {
  /** Which cabinet to look up — same slug union as `useLeaderboardData`. */
  api?: 'basketball' | 'keepieuppies' | 'freekicks' | 'overall';
}

export interface UseMyStandingResult {
  standing: MyStanding | null;
  loading: boolean;
  /** True when there's no identified user (no session JWT in storage) —
   *  caller should fall back to placeholder. */
  unidentified: boolean;
  error: string | null;
}

/**
 * useMyStanding — fetches the logged-in user's rank/score for a cabinet.
 *
 *   - api = per-game   → /api/games/<slug>/standing/<telegramUserId>
 *   - api = 'overall'  → /api/games/standing/<telegramUserId>
 *
 * Identity comes from the `arcade_session` JWT placed in sessionStorage
 * by the game-launch route when a bot user arrives with `?session=<jwt>`.
 * Direct web visitors have no JWT → `unidentified: true`, no fetch.
 * (When Privy comes back, swap the source to Privy's user metadata.)
 */
export function useMyStanding({ api }: UseMyStandingOptions): UseMyStandingResult {
  const [standing, setStanding] = useState<MyStanding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tgId, setTgId] = useState<number | null>(() => readTelegramUserIdFromSession());

  // Re-read identity once on mount — game-launch screens may write the
  // session AFTER /leaderboard renders if the user navigates back.
  useEffect(() => {
    setTgId(readTelegramUserIdFromSession());
  }, []);

  const canFetch = Boolean(api && API_BASE && tgId !== null);

  useEffect(() => {
    if (!canFetch) {
      setStanding(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const path =
      api === 'overall'
        ? `/api/games/standing/${tgId}`
        : `/api/games/${api}/standing/${tgId}`;

    fetch(`${API_BASE}${path}`)
      .then((r) => r.json() as Promise<ServerResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setError(data?.error || 'fetch_failed');
          setStanding(null);
          return;
        }
        setStanding(data.standing ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'network_error');
        setStanding(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, tgId, canFetch]);

  return {
    standing,
    loading,
    unidentified: tgId === null,
    error,
  };
}

export default useMyStanding;
