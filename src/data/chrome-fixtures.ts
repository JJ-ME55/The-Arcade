/**
 * Static placeholder data for the chrome (nav categories, floor
 * stats, ticker items, balances). Per JJ's call: TKT + stats stay
 * as placeholder numbers for v1 until real economy backend lands.
 *
 * Sources:
 *  - PORTAL_CATEGORIES from portal.jsx
 *  - Floor stats from portal-dashboard-v3.jsx TAFloorStats
 *  - Ticker items from portal-dashboard-v3.jsx TATicker2
 */

export interface NavCategory {
  id: string;
  label: string;
  count: number;
  active?: boolean;
  soon?: boolean;
  /** Optional react-router path. If absent, item is non-clickable. */
  to?: string;
}

export const NAV_CATEGORIES: NavCategory[] = [
  { id: 'home',   label: 'Home',         count: 0, active: true, to: '/play' },
  { id: 'play',   label: 'Play',         count: 4,                to: '/play' },
  { id: 'prizes', label: 'Prizes',       count: 0,                to: '/prizes' },
  { id: 'wallet', label: 'Wallet',       count: 0,                to: '/wallet' },
  { id: 'board',  label: 'Leaderboard',  count: 0,                to: '/leaderboard' },
];

export interface FloorStat {
  label: string;
  value: string;
  tone: 'ink' | 'blue' | 'brass' | 'win';
}

export const FLOOR_STATS: FloorStat[] = [
  { label: 'Online',             value: '412',       tone: 'ink' },
  { label: 'In wagered match',   value: '38',        tone: 'blue' },
  { label: 'Floor pot · 24h',    value: '12.4 SOL',  tone: 'brass' },
  { label: 'Biggest win · 24h',  value: '1.84 SOL',  tone: 'win' },
  { label: 'Tickets paid · wk',  value: '184,210',   tone: 'brass' },
];

export const FLOOR_STATS_MOBILE: FloorStat[] = [
  { label: 'Online',    value: '412',       tone: 'ink' },
  { label: 'In match',  value: '38',        tone: 'blue' },
  { label: 'Pot 24h',   value: '12.4 SOL',  tone: 'brass' },
  { label: 'Biggest',   value: '1.84 SOL',  tone: 'win' },
];

export interface TickerItem {
  /** Dot color (CSS color string or var() reference). */
  dot: string;
  text: string;
}

export const TICKER_ITEMS: TickerItem[] = [
  { dot: 'var(--win)',        text: 'val3ntin0 won 0.12 SOL on SolShot' },
  { dot: 'var(--brass)',      text: '+220 Tickets earned across the floor this hour' },
  { dot: 'var(--win)',        text: 'mona.sol won 0.04 SOL on Basketball' },
  { dot: 'var(--blue)',       text: '412 players online · 38 in wagered matches' },
  { dot: 'var(--brass)',      text: 'Prize Counter restocked: Tank Hull · Crimson Ridge' },
  { dot: 'var(--win)',        text: 'low.eth won 0.12 SOL on SolShot' },
];

/** Placeholder balances. Wired to real data when the TKT economy ships. */
export const PLACEHOLDER_BALANCES = {
  sol: { value: '4.21', delta: '+0.34' },
  tkt: { value: '1,840', delta: '+220' },
};

/** Placeholder user identity. Replaced by real Privy session data. */
export const PLACEHOLDER_IDENTITY = {
  callsign: 'val3ntin0',
  tier: 'Tier 02 · Floor Member',
  initial: 'V',
};
