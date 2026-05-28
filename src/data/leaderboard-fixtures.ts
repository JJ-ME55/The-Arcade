/**
 * Leaderboard placeholder data per design handoff ed-leaderboard.jsx.
 *
 * Per JJ's call: all numbers stay placeholder for v1. The existing
 * /api/games/<slug>/leaderboard endpoints can wire in once the real
 * column shape (rank, score, prize, plays, delta) is supported
 * server-side. For now: design fidelity > real data.
 */

export interface StandingRow {
  rank: number;
  name: string;
  handle: string;
  color: string;
  score: string;
  plays: number;
  prize: string;
  delta: string;
  you?: boolean;
}

export const LEADERBOARD_STANDINGS: StandingRow[] = [
  { rank: 1,  name: 'val3ntin0',  handle: 'V', color: 'var(--blue)',       score: '142,089', plays: 84, prize: '0.36 SOL', delta: '—',  you: true },
  { rank: 2,  name: 'mona.sol',   handle: 'M', color: 'var(--brass)',      score: '137,402', plays: 72, prize: '0.22 SOL', delta: '+2' },
  { rank: 3,  name: 'low.eth',    handle: 'L', color: 'var(--win)',        score: '129,815', plays: 91, prize: '0.14 SOL', delta: '+1' },
  { rank: 4,  name: 'cryptopig',  handle: 'C', color: 'var(--lose)',       score: '124,200', plays: 56, prize: '0.08 SOL', delta: '-2' },
  { rank: 5,  name: 'pixie',      handle: 'P', color: '#5A8F4F',           score: '118,775', plays: 64, prize: '0.05 SOL', delta: '—'  },
  { rank: 6,  name: '7z9b…a4',    handle: '7', color: 'var(--blue)',       score: '112,640', plays: 38, prize: '0.03 SOL', delta: '+4' },
  { rank: 7,  name: 'cookie.sol', handle: 'C', color: 'var(--brass-deep)', score: '108,200', plays: 51, prize: '0.02 SOL', delta: '-1' },
  { rank: 8,  name: 'nyx',        handle: 'N', color: 'var(--ink)',        score: '104,917', plays: 47, prize: '0.02 SOL', delta: '+3' },
  { rank: 9,  name: 'wave.eth',   handle: 'W', color: '#1E5B4A',           score: '99,608',  plays: 42, prize: '—',        delta: '-3' },
  { rank: 10, name: 'glassbox',   handle: 'G', color: 'var(--lose)',       score: '94,120',  plays: 33, prize: '—',        delta: '+1' },
];

export interface FriendStanding {
  rank: number;
  name: string;
  handle: string;
  color: string;
  score: string;
  you?: boolean;
}

export const FRIENDS_BOARD: FriendStanding[] = [
  { rank: 1,  name: 'val3ntin0',  handle: 'V', color: 'var(--blue)',       score: '142,089', you: true },
  { rank: 2,  name: 'mona.sol',   handle: 'M', color: 'var(--brass)',      score: '137,402' },
  { rank: 3,  name: 'low.eth',    handle: 'L', color: 'var(--win)',        score: '129,815' },
  { rank: 5,  name: 'pixie',      handle: 'P', color: '#5A8F4F',           score: '118,775' },
  { rank: 14, name: 'cookie.sol', handle: 'C', color: 'var(--brass-deep)', score: '78,200'  },
];

export interface PrizeTier {
  range: string;
  prize: string;
  tone: 'brass' | 'ink' | 'ink-70';
}

export const PRIZE_TIERS: PrizeTier[] = [
  { range: '01',       prize: '0.36 SOL', tone: 'brass' },
  { range: '02',       prize: '0.22 SOL', tone: 'ink'   },
  { range: '03',       prize: '0.14 SOL', tone: 'ink'   },
  { range: '04 – 10',  prize: '0.05 SOL', tone: 'ink-70' },
  { range: '11 – 50',  prize: '0.02 SOL', tone: 'ink-70' },
  { range: '51 – 200', prize: '+200 TKT', tone: 'brass' },
];

export interface CabinetTab {
  id: string;
  label: string;
  to?: string;
}

export const CABINET_TABS: CabinetTab[] = [
  { id: 'overall',     label: 'Overall' },
  { id: 'solshot',     label: 'SolShot' },
  { id: 'basketball',  label: 'Basketball' },
  { id: 'free-kicks',  label: 'Free Kicks' },
  { id: 'keepie-uppies', label: 'Keepie Uppies' },
];

export interface TimeWindow {
  id: '24h' | '7d' | 'all';
  label: string;
}

export const TIME_WINDOWS: TimeWindow[] = [
  { id: '24h', label: '24 Hours' },
  { id: '7d',  label: 'This Week' },
  { id: 'all', label: 'All Time' },
];

/** Leaderboard hero stats — placeholder per JJ. */
export const LEADERBOARD_HEADER_STATS = {
  players: '412',
  prizePot: '3.84 SOL',
  resetsIn: '04:21:18',
};

/** "Your Standing" callout — placeholder. */
export const YOUR_STANDING = {
  rank: '01',
  trend: 'HOLDING ▲',
  trendColor: 'win' as const,
  body: "You're +4,687 ahead of mona.sol.",
  bonus: 'Hold for +0.36 SOL in 4h 21m.',
};
