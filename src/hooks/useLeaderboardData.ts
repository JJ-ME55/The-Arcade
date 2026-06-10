import { useEffect, useState } from 'react';
import type { StandingRow } from '@/data/leaderboard-fixtures';

const API_BASE = import.meta.env.VITE_SOLSHOT_API_BASE;

interface ServerRow {
  rank: number;
  displayName?: string;
  telegramUsername?: string | null;
  firstName?: string | null;
  bestScore: number;
  totalSubmissions?: number;
  telegramUserId?: number;
  // SolShot-only fields (present on /api/games/solshot/leaderboard rows).
  // The service file emits them; absence is normal for all other games.
  kdRatio?: number;
  winRate?: number;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  prestigeTier?: number;
}

interface ServerResponse {
  ok: boolean;
  leaderboard?: ServerRow[];
  /** Count of players in the (optionally windowed) cabinet — drives the
   *  /leaderboard hero "Players" stat. */
  totalPlayers?: number;
  error?: string;
}

/** Deterministic colour per player name — same name → same colour. */
function colorFor(name: string): string {
  const palette = [
    'var(--blue)',
    'var(--brass)',
    'var(--win)',
    'var(--lose)',
    '#5A8F4F',
    'var(--brass-deep)',
    'var(--ink)',
    '#1E5B4A',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

/** Per-rank prize. There is NO per-rank prize ladder — the only real
 *  prize is the single 1 SOL competition (top score, paid once). The old
 *  version fabricated "0.36 SOL / 0.22 SOL…" per rank and rendered it
 *  next to real player names, implying payouts that don't exist. Honest
 *  default is '—'; wire real values here if/when a prize ledger ships. */
function estimatePrize(_rank: number): string {
  return '—';
}

export interface UseLeaderboardOptions {
  /** API slug, or null to use placeholder.
   *  `overall` hits the cross-game aggregator endpoint. `solshot` hits
   *  the K/D + W% scorecard endpoint (PvP, not single-score).
   *  `critter-kart` keeps its hyphen (its endpoint does too). */
  api?: 'basketball' | 'keepieuppies' | 'freekicks' | 'critter-kart' | 'overall' | 'solshot';
  /** Time window. `24h` / `7d` send a `?since=<iso>` param; the server
   *  filters to users whose all-time best was achieved in that window
   *  (semantic note documented in standaloneLeaderboard.js). */
  window?: '24h' | '7d' | 'all';
  /** Current user's name (for `you` flag highlight). */
  myName?: string | null;
  /** Limit on rows returned. */
  limit?: number;
}

export interface UseLeaderboardResult {
  rows: StandingRow[] | null;
  loading: boolean;
  error: string | null;
  /** True when displaying placeholder data (not the real server feed). */
  placeholder: boolean;
  /** Server-reported player count for the current cabinet/window. Null
   *  while loading or when the request hasn't been issued yet. */
  totalPlayers: number | null;
}

const WINDOW_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  all: 0,
} as const;

/**
 * useLeaderboardData — fetches real top-N from the SolShot server's
 * leaderboard endpoints:
 *   - api = 'overall'        → /api/games/leaderboard
 *   - api = per-game slug    → /api/games/<slug>/leaderboard
 *
 * `window` of 24h/7d adds `?since=<iso>`. Maps the server response to
 * the v2 StandingRow shape. Caller falls back to placeholder when
 * `placeholder` is true (no api slug, fetch failed, or empty result).
 */
export function useLeaderboardData({
  api,
  window: timeWindow = 'all',
  myName,
  limit = 10,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const [rows, setRows] = useState<StandingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);

  const canFetch = Boolean(api && API_BASE);

  useEffect(() => {
    if (!canFetch) {
      setRows(null);
      setError(null);
      setTotalPlayers(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const path =
      api === 'overall'
        ? '/api/games/leaderboard'
        : `/api/games/${api}/leaderboard`;

    const windowMs = WINDOW_MS[timeWindow] ?? 0;
    const sinceParam =
      windowMs > 0
        ? `&since=${encodeURIComponent(new Date(Date.now() - windowMs).toISOString())}`
        : '';

    // Render (free tier) can cold-start for 30-60s. Without a timeout the
    // UI hangs on "Loading standings" indefinitely. Abort at 15s and
    // surface an honest error so the caller can show a retry/empty state.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(`${API_BASE}${path}?limit=${limit}${sinceParam}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<ServerResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !Array.isArray(data.leaderboard)) {
          setError(data?.error || 'fetch_failed');
          setRows(null);
          setTotalPlayers(null);
          return;
        }
        setTotalPlayers(typeof data.totalPlayers === 'number' ? data.totalPlayers : null);
        const isSolShot = api === 'solshot';
        const mapped: StandingRow[] = data.leaderboard.map((r, i) => {
          const name =
            r.displayName?.trim() ||
            r.telegramUsername?.trim() ||
            r.firstName?.trim() ||
            'anon';
          const isMe =
            myName && name.toLowerCase() === myName.toLowerCase() ? true : undefined;
          // For SolShot the headline "score" is the K/D ratio formatted to 2dp.
          // For everything else it's the best score with thousands separators.
          const scoreDisplay = isSolShot && typeof r.kdRatio === 'number'
            ? r.kdRatio.toFixed(2)
            : r.bestScore.toLocaleString();
          return {
            rank: r.rank ?? i + 1,
            name,
            handle: (name[0] || '?').toUpperCase(),
            color: colorFor(name),
            score: scoreDisplay,
            plays: r.totalSubmissions ?? 0,
            prize: estimatePrize(r.rank ?? i + 1),
            delta: '—',
            you: isMe,
            // SolShot rows carry the structured stats so the Standings
            // table can render K/D + W% as labelled columns.
            ...(isSolShot
              ? {
                  kdRatio: r.kdRatio,
                  winRate: r.winRate,
                  matchesPlayed: r.matchesPlayed,
                  wins: r.wins,
                  losses: r.losses,
                  prestigeTier: r.prestigeTier,
                }
              : {}),
          };
        });
        setRows(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        // AbortError = our 15s timeout fired (cold start / dead server).
        setError(err?.name === 'AbortError' ? 'timeout' : err?.message || 'network_error');
        setRows(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [api, timeWindow, myName, limit, canFetch]);

  return {
    rows,
    loading,
    error,
    placeholder: !canFetch || rows === null,
    totalPlayers,
  };
}

export default useLeaderboardData;
