/**
 * Leaderboard — LOCAL-FIRST. Scores persist to IndexedDB so the game is fully playable
 * offline/locally. A cloud backend (Supabase Edge Function + HMAC, per the build plan's
 * Phase D) can be layered on by implementing `submitRemote` / `fetchRemote` below; the
 * UI already reads through this module, so wiring the server later needs no UI changes.
 */
import { kvGet, kvSet } from '../core/save';
import type { LeaderboardEntry } from '../core/types';

const KEY = 'leaderboard.v1';
const MAX_PER_MODE = 100;

let cache: LeaderboardEntry[] | null = null;

const GHOST_NAMES = [
  'CoreDriller', 'RustBucket', 'DeepDahl', 'MagmaMags', 'Prospector_7', 'IronWill',
  'VeinSeeker', 'Bedrock Bob', 'Gigadrill', 'AbyssAnnie', 'TheMole', 'Sediment Sam',
  'QuartzQueen', 'Pitfall', 'DiamondHands', 'StrataSteve',
];

function ghostScores(): LeaderboardEntry[] {
  // deterministic-ish ghosts so a fresh board isn't empty (single-player feel).
  const out: LeaderboardEntry[] = [];
  let s = 1337;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (const mode of ['free', 'daily']) {
    for (let i = 0; i < 12; i++) {
      const depth = 200 + Math.floor(rnd() * 2400);
      const cash = Math.floor(depth * (40 + rnd() * 260));
      out.push({
        id: 'ghost-' + mode + '-' + i,
        name: GHOST_NAMES[Math.floor(rnd() * GHOST_NAMES.length)],
        score: cash + depth * 120 + Math.floor(rnd() * 40000),
        depth,
        cash,
        mode,
        seed: mode === 'daily' ? 'DAILY' : 'GHOST',
        date: 0,
      });
    }
  }
  return out;
}

async function load(): Promise<LeaderboardEntry[]> {
  if (cache) return cache;
  let data = await kvGet<LeaderboardEntry[]>(KEY);
  if (!data || data.length === 0) {
    data = ghostScores();
    await kvSet(KEY, data);
  }
  cache = data;
  return cache;
}

function rankWithin(list: LeaderboardEntry[], mode: string, score: number): number {
  const better = list.filter((e) => e.mode === mode && e.score > score).length;
  return better + 1;
}

export async function submitScore(entry: LeaderboardEntry): Promise<number> {
  const all = await load();
  all.push(entry);
  // keep only the top MAX_PER_MODE per mode
  const byMode: Record<string, LeaderboardEntry[]> = {};
  for (const e of all) (byMode[e.mode] ??= []).push(e);
  const trimmed: LeaderboardEntry[] = [];
  for (const mode in byMode) {
    byMode[mode].sort((a, b) => b.score - a.score);
    trimmed.push(...byMode[mode].slice(0, MAX_PER_MODE));
  }
  cache = trimmed;
  await kvSet(KEY, trimmed);
  void submitRemote(entry); // fire-and-forget if a backend is configured
  return rankWithin(trimmed, entry.mode, entry.score);
}

export async function getTop(mode: string, n = 50): Promise<LeaderboardEntry[]> {
  const remote = await fetchRemote(mode, n);
  if (remote) return remote;
  const all = await load();
  return all
    .filter((e) => e.mode === mode)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

export async function getRank(mode: string, score: number): Promise<number> {
  const all = await load();
  return rankWithin(all, mode, score);
}

export function makeEntry(
  name: string,
  score: number,
  depth: number,
  cash: number,
  mode: string,
  seed: string,
): LeaderboardEntry {
  return {
    id: 'me-' + Date.now() + '-' + Math.floor(Math.random() * 1e6),
    name,
    score,
    depth: Math.floor(depth),
    cash: Math.floor(cash),
    mode,
    seed,
    date: Date.now(),
  };
}

// ---- Cloud scaffold (Phase D). Disabled until configured. ----
// To enable: set VITE_SUPABASE_URL + a deployed Edge Function that verifies an HMAC of
// the payload server-side, then implement these two functions.
export const REMOTE_ENABLED = false;

async function submitRemote(_entry: LeaderboardEntry): Promise<void> {
  if (!REMOTE_ENABLED) return;
  // await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-score`, {...})
}

async function fetchRemote(_mode: string, _n: number): Promise<LeaderboardEntry[] | null> {
  if (!REMOTE_ENABLED) return null;
  return null;
}
