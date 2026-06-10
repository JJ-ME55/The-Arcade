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

// 2026-06-05: Prizes swapped out of primary nav for Competitions.
// Prizes route stays at /prizes (Wallet's "Browse Prizes" CTA links there,
// shared TG/X links keep working) — it just renders a coming-soon panel
// until V3 ships the economy. Competitions is the actionable surface for
// users with prize energy (1 SOL Free Kicks comp live).
export const NAV_CATEGORIES: NavCategory[] = [
  { id: 'home',   label: 'Home',         count: 0, active: true, to: '/play' },
  { id: 'play',   label: 'Play',         count: 5,                to: '/play' },
  { id: 'comps',  label: 'Competitions', count: 1,                to: '/competitions' },
  { id: 'wallet', label: 'Wallet',       count: 0,                to: '/wallet' },
  { id: 'board',  label: 'Leaderboard',  count: 0,                to: '/leaderboard' },
];

export interface FloorStat {
  label: string;
  value: string;
  tone: 'ink' | 'blue' | 'brass' | 'win';
}

// Honest, player-facing stats only — no internal version jargon
// (was "Wager V2 · Q3" / "Tickets V3", which meant nothing to a
// visitor and signalled "not finished"). Leads with the live prize.
export const FLOOR_STATS: FloorStat[] = [
  { label: 'Cabinets', value: '5 live',          tone: 'ink' },
  { label: 'Prize',    value: '1 SOL live',      tone: 'win' },
  { label: 'Entry',    value: 'Free to play',    tone: 'blue' },
  { label: 'Soon',     value: 'Pool · Shootout', tone: 'ink' },
];

export const FLOOR_STATS_MOBILE: FloorStat[] = [
  { label: 'Cabinets', value: '5 live',     tone: 'ink' },
  { label: 'Prize',    value: '1 SOL live', tone: 'win' },
  { label: 'Entry',    value: 'Free',       tone: 'blue' },
];

export interface TickerItem {
  /** Dot color (CSS color string or var() reference). */
  dot: string;
  text: string;
}

// Player-facing only. Dropped the stale "Privy login returns shortly"
// line (login works) and "V1/Beta" jargon. Leads with the live prize.
// No hard date baked in (caption/ comp page own the deadline) so the
// strip stays evergreen across competitions.
export const TICKER_ITEMS: TickerItem[] = [
  { dot: 'var(--win)',   text: 'Competition live · Win 1 SOL · Top the Free Kicks board' },
  { dot: 'var(--blue)',  text: 'Five cabinets open · Basketball · Free Kicks · Keepie Uppies · Critter Kart · SolShot' },
  { dot: 'var(--brass)', text: 'SolShot · Real SOL wagering · 1v1 on Solana' },
  { dot: 'var(--ink)',   text: 'Free to play · Climb the leaderboards' },
  { dot: 'var(--ink)',   text: 'Coming soon · 8-Ball Pool · Shootout' },
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
