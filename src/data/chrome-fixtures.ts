/**
 * Static data for the chrome (nav categories, floor stats, ticker
 * items, balances, guest identity).
 *
 * Beta-honest pass (2026-06-03): every fictional name + fictional
 * stat stripped. The ticker + floor stats now broadcast V1 truths
 * (cabinet count, V2/V3 ETAs, beta status) so users arriving from
 * Cryo / X / Discord aren't shown fake liquidity. When real-time
 * data sources land (wager events, Tickets emission, prize restocks)
 * they can replace the static V1-truth items here.
 *
 * Sources:
 *  - PORTAL_CATEGORIES from portal.jsx
 *  - Floor stats / ticker structure from portal-dashboard-v3.jsx
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
  { label: 'Cabinets',   value: '4 live',      tone: 'ink' },
  { label: 'Soon',       value: 'Pool · Kart · Shootout', tone: 'ink' },
  { label: 'Wager',      value: 'V1 · SolShot',          tone: 'brass' },
  { label: 'Tickets',    value: 'V3',                    tone: 'brass' },
  { label: 'Status',     value: 'Beta',                  tone: 'blue' },
];

export const FLOOR_STATS_MOBILE: FloorStat[] = [
  { label: 'Cabinets', value: '4 live',         tone: 'ink' },
  { label: 'Wager',    value: 'V1 SolShot',     tone: 'brass' },
  { label: 'Tickets',  value: 'V3',             tone: 'brass' },
  { label: 'Status',   value: 'Beta',           tone: 'blue' },
];

export interface TickerItem {
  /** Dot color (CSS color string or var() reference). */
  dot: string;
  text: string;
}

export const TICKER_ITEMS: TickerItem[] = [
  { dot: 'var(--blue)',  text: 'Beta · The Arcade · The Floor is open' },
  { dot: 'var(--brass)', text: 'Wager Mainnet · SolShot · V1' },
  { dot: 'var(--ink)',   text: 'Solo skill mode · Basketball · Free Kicks · Keepie Uppies' },
  { dot: 'var(--brass)', text: 'Tickets economy · V3 · no tradeable token, closed in-game currency' },
  { dot: 'var(--ink)',   text: 'Coming soon · 8-Ball Pool · Critter Kart · Shootout' },
  { dot: 'var(--blue)',  text: 'Sign in · V2 · Privy login returns shortly' },
];

/** Placeholder balances. Render "—" until a real wallet is connected. */
export const PLACEHOLDER_BALANCES = {
  sol: { value: '—', delta: '' },
  tkt: { value: '—', delta: '' },
};

/** Guest-mode identity. Replaced by real Privy session data when login
 *  is re-enabled (V2). Until then, the masthead signet reads "guest". */
export const PLACEHOLDER_IDENTITY = {
  callsign: 'guest',
  tier: 'Sign in · V2',
  initial: 'G',
};
