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
  /** SolShot-only fields. Populated by useLeaderboardData when api='solshot'.
   *  When present, the Standings table swaps Score/Prize column headers
   *  for K/D and W% and renders these values. */
  kdRatio?: number;
  winRate?: number;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
  prestigeTier?: number;
}

// Empty for V1. The Leaderboard page wires real data per cabinet from
// the SolShot server (basketball / free-kicks / keepie-uppies / solshot
// K/D / overall). For the "Overall" placeholder mode pre-wire, the
// Standings component renders an empty state with the "Pick a cabinet
// to see live rankings" framing.
export const LEADERBOARD_STANDINGS: StandingRow[] = [];

export interface FriendStanding {
  rank: number;
  name: string;
  handle: string;
  color: string;
  score: string;
  you?: boolean;
}

// Empty until a social graph ships (V2). Component renders an empty
// state with "Sign in + add friends · V2" framing.
export const FRIENDS_BOARD: FriendStanding[] = [];

export interface PrizeTier {
  range: string;
  prize: string;
  tone: 'brass' | 'ink' | 'ink-70';
}

// Empty for V1. The Prize Pot rail renders an empty state with
// "Prize ladder · V3 economy" framing. The visual stays; numbers
// don't appear until the real prize ledger ships.
export const PRIZE_TIERS: PrizeTier[] = [];

export interface CabinetTab {
  id: string;
  label: string;
  /** API slug for the leaderboard hook. `overall` hits the cross-game
   *  aggregator endpoint (`/api/games/leaderboard`). Per-game slugs map
   *  to `/api/games/<slug>/leaderboard`. SolShot uses K/D + W% (PvP
   *  artillery, no single-score model) — same hook handles the wire. */
  api?: 'basketball' | 'keepieuppies' | 'freekicks' | 'overall' | 'solshot';
  to?: string;
}

export const CABINET_TABS: CabinetTab[] = [
  { id: 'overall',       label: 'Overall',       api: 'overall' },
  { id: 'solshot',       label: 'SolShot',       api: 'solshot' },
  { id: 'basketball',    label: 'Basketball',    api: 'basketball' },
  { id: 'free-kicks',    label: 'Free Kicks',    api: 'freekicks' },
  { id: 'keepie-uppies', label: 'Keepie Uppies', api: 'keepieuppies' },
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

/** Leaderboard hero stats. Player count is live (server-driven); the
 *  prize pot + resets-in clock are V3 economy items. Em-dashes when
 *  not real. */
export const LEADERBOARD_HEADER_STATS = {
  players: '—',
  prizePot: 'V3',
  resetsIn: 'V3',
};

/** "Your Standing" empty state when no live identity. Component shows
 *  this prompt until Privy is re-enabled (V2) or a bot session JWT
 *  resolves identity. */
export const YOUR_STANDING = {
  rank: '—',
  trend: 'SIGN IN · V2',
  trendColor: 'ink' as const,
  body: 'Sign in to track your standing.',
  bonus: '',
};
