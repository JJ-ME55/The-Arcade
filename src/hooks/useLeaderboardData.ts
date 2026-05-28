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
}

interface ServerResponse {
  ok: boolean;
  leaderboard?: ServerRow[];
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

/** Estimate a prize SOL amount per rank — placeholder ladder, brass-deep
 *  tiered. Real prize structure ships once the server supports it. */
function estimatePrize(rank: number): string {
  if (rank === 1) return '0.36 SOL';
  if (rank === 2) return '0.22 SOL';
  if (rank === 3) return '0.14 SOL';
  if (rank <= 10) return '0.05 SOL';
  if (rank <= 50) return '0.02 SOL';
  return '—';
}

export interface UseLeaderboardOptions {
  /** API slug, or null to use placeholder. */
  api?: 'basketball' | 'keepieuppies' | 'freekicks';
  /** Time window — server is all-time-only for now. Other windows fall
   *  back to all-time data with a flag the UI can surface. */
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
}

/**
 * useLeaderboardData — fetches real top-N from the SolShot server's
 * /api/games/<slug>/leaderboard endpoint, maps to the v2 StandingRow
 * shape. Caller falls back to LEADERBOARD_STANDINGS placeholder when
 * `placeholder` returns true (no api slug, or window != 'all', or
 * fetch failed).
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

  const canFetch = Boolean(api && API_BASE && timeWindow === 'all');

  useEffect(() => {
    if (!canFetch) {
      setRows(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/games/${api}/leaderboard?limit=${limit}`)
      .then((r) => r.json() as Promise<ServerResponse>)
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok || !Array.isArray(data.leaderboard)) {
          setError(data?.error || 'fetch_failed');
          setRows(null);
          return;
        }
        const mapped: StandingRow[] = data.leaderboard.map((r, i) => {
          const name =
            r.displayName?.trim() ||
            r.telegramUsername?.trim() ||
            r.firstName?.trim() ||
            'anon';
          const isMe =
            myName && name.toLowerCase() === myName.toLowerCase() ? true : undefined;
          return {
            rank: r.rank ?? i + 1,
            name,
            handle: (name[0] || '?').toUpperCase(),
            color: colorFor(name),
            score: r.bestScore.toLocaleString(),
            plays: r.totalSubmissions ?? 0,
            prize: estimatePrize(r.rank ?? i + 1),
            delta: '—',
            you: isMe,
          };
        });
        setRows(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'network_error');
        setRows(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, timeWindow, myName, limit, canFetch]);

  return {
    rows,
    loading,
    error,
    placeholder: !canFetch || rows === null,
  };
}

export default useLeaderboardData;
