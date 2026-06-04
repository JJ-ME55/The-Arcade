/**
 * Game catalogue + placeholder feeds for the dashboard.
 * Sourced from design handoff portal.jsx PORTAL_GAMES et al.
 *
 * Per JJ's call: all TKT figures + live counts stay as static
 * placeholders until the real backend lands. Numbers below match
 * the prototype exactly for design fidelity.
 */

export interface ArcadeGame {
  slug: 'solshot' | 'basketball' | 'free-kicks' | 'keepie-uppies' | 'pool';
  name: string;
  tag: '' | 'FEATURED' | 'HOT' | 'NEW' | 'TOP';
  genre: string;
  tagline: string;
  players: number;
  stake: string;
  yield: number;
  hi: string;
  /** Wide hero illustration (16:7, ~2400×1050 target). Featured Cabinet
   *  + Game Detail Marquee. Always required. */
  heroSrc: string;
  /** Tile crop (16:10, ~1280×800 target). The Floor grid tiles. Falls
   *  back to `heroSrc` with `object-fit: cover` when missing. */
  tileSrc?: string;
  /** Vertical splash (9:16, ~1080×1920 target). Mobile launch / TG
   *  webview takeover / OG share / future trophy card. Stored ready;
   *  not all surfaces consume it yet. */
  splashSrc?: string;
  /** Where to bias the cropped focal area. Defaults to center. */
  heroFocus?: string;
}

export const PORTAL_GAMES: ArcadeGame[] = [
  {
    slug: 'solshot',
    name: 'SolShot',
    tag: 'FEATURED',
    genre: 'Artillery',
    tagline: 'On-chain artillery duels.',
    players: 248,
    stake: '0.01+',
    yield: 50,
    hi: '142,089',
    heroSrc: '/assets/games/hero/solshot.webp',
    tileSrc: '/assets/games/hero/solshot-tile.webp',
    splashSrc: '/assets/games/hero/solshot-splash.webp',
    heroFocus: 'center',
  },
  {
    slug: 'basketball',
    name: 'Basketball',
    tag: 'HOT',
    genre: 'Sports',
    tagline: '30 seconds. Drain it.',
    players: 412,
    stake: '0.01+',
    yield: 30,
    hi: '38',
    heroSrc: '/assets/games/hero/basketball.webp',
    tileSrc: '/assets/games/hero/basketball-tile.webp',
    splashSrc: '/assets/games/hero/basketball-splash.webp',
    heroFocus: 'center',
  },
  {
    slug: 'free-kicks',
    name: 'Free Kicks',
    tag: 'NEW',
    genre: 'Sports',
    tagline: 'Bend it past the wall.',
    players: 96,
    stake: '0.01+',
    yield: 25,
    hi: '11',
    heroSrc: '/assets/games/hero/free-kicks.webp',
    tileSrc: '/assets/games/hero/free-kicks-tile.webp',
    splashSrc: '/assets/games/hero/free-kicks-splash.webp',
    heroFocus: 'center',
  },
  {
    slug: 'keepie-uppies',
    name: 'Keepie Uppies',
    tag: '',
    genre: 'Skill',
    tagline: 'Endless juggling.',
    players: 178,
    stake: '0.01+',
    yield: 20,
    hi: '208',
    heroSrc: '/assets/games/hero/keepie-uppies.webp',
    tileSrc: '/assets/games/hero/keepie-uppies-tile.webp',
    splashSrc: '/assets/games/hero/keepie-uppies-splash.webp',
    heroFocus: 'center',
  },
  // 8-Ball Pool removed from the public PORTAL_GAMES floor 2026-06-04.
  // The canvas lift from arcade/8-ball-pool isn't done; tile would
  // route to a stub MatchHUD wrapper with no playable game inside.
  // /play/pool/* routes stay in App.tsx (direct URLs still resolve)
  // but pool is no longer in the Featured Cabinet rotation or the
  // Floor grid. Pool returns when Fish lifts the canvas into
  // src/games/pool/. Placeholder art still on disk under
  // public/assets/games/hero/pool{,-tile,-splash}.webp.
];

export interface LiveWager {
  name: string;
  game: ArcadeGame['slug'];
  stake: string;
  payout: string;
  outcome: 'win' | 'loss';
  ago: string;
}

// Empty for V1 — wagering only ships V1-mainnet for SolShot, and the
// live feed wires when the wagering event stream lands. Component
// renders an empty state with the "Wager mode · V1 mainnet · SolShot"
// framing.
export const LIVE_WAGERS: LiveWager[] = [];

export interface TopScore {
  rank: number;
  name: string;
  score: string;
  delta: string;
}

// Empty for V1. The dashboard TopScores widget pulls real data per
// active cabinet (basketball, free-kicks, keepie-uppies, solshot K/D)
// from the SolShot server. SolShot's tab is now real K/D scorecard;
// no static fallback needed. Component renders an empty state when
// neither real data nor this fixture is available.
export const TOP_SCORES: TopScore[] = [];

export interface OnlineFriend {
  name: string;
  playing: string;
  color: string;
}

// Empty until a social graph lands (V2). Component renders an empty
// state with "Sign in + add friends · V2" framing.
export const FRIENDS_ONLINE: OnlineFriend[] = [];

export interface MiniPrize {
  kind: 'hull' | 'ball' | 'cue';
  name: string;
  game: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legend';
  soon?: boolean;
}

// Empty until the V3 economy ships with real inventory + Ticket pricing.
// The prize counter renders an empty state with "Inventory drops V3"
// framing rather than mocked items.
export const PRIZES_MINI: MiniPrize[] = [];

export interface ComingUpItem {
  label: string;
  when: string;
}

export const COMING_UP: ComingUpItem[] = [
  { label: '8-Ball Pool',   when: 'Q3 2026' },
  { label: 'Critter Kart',  when: 'Q3 2026' },
  { label: 'Shootout',      when: 'Q3 2026' },
  { label: 'Tournaments',   when: 'Q3 2026' },
  { label: 'Trophy Case',   when: 'Q3 2026' },
  { label: 'Loadout',       when: 'Q4 2026' },
  { label: 'Prize Counter', when: 'V3' },
];

/** Browse categories for the dashboard left rail. */
export interface BrowseCategory {
  id: string;
  label: string;
  count: number;
  soon?: boolean;
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  { id: 'all',     label: 'All',          count: 4 },
  { id: 'sports',  label: 'Sports',       count: 2 },
  { id: 'skill',   label: 'Skill',        count: 1 },
  { id: 'action',  label: 'Action',       count: 1 },
  { id: 'multi',   label: 'Multiplayer',  count: 0, soon: true },
  { id: 'tourny',  label: 'Tournaments',  count: 0, soon: true },
];
