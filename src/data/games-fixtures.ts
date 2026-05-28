/**
 * Game catalogue + placeholder feeds for the dashboard.
 * Sourced from design handoff portal.jsx PORTAL_GAMES et al.
 *
 * Per JJ's call: all TKT figures + live counts stay as static
 * placeholders until the real backend lands. Numbers below match
 * the prototype exactly for design fidelity.
 */

export interface ArcadeGame {
  slug: 'solshot' | 'basketball' | 'free-kicks' | 'keepie-uppies';
  name: string;
  tag: '' | 'FEATURED' | 'HOT' | 'NEW' | 'TOP';
  genre: string;
  tagline: string;
  players: number;
  stake: string;
  yield: number;
  hi: string;
  /** Hero illustration (studio-provided art). Vite serves from /public. */
  heroSrc: string;
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
    heroSrc: '/assets/games/hero/solshot.jpg',
    // square image, tank+fire centered slightly low
    heroFocus: 'center 60%',
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
    heroSrc: '/assets/games/hero/basketball.jpg',
    // portrait — bias to lower half (player + court action)
    heroFocus: 'center 70%',
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
    heroSrc: '/assets/games/hero/free-kicks.jpg',
    // portrait — wall + ball is mid-image
    heroFocus: 'center 60%',
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
    heroSrc: '/assets/games/hero/keepie-uppies.jpg',
    // portrait — player + ball mid-image
    heroFocus: 'center 60%',
  },
];

export interface LiveWager {
  name: string;
  game: ArcadeGame['slug'];
  stake: string;
  payout: string;
  outcome: 'win' | 'loss';
  ago: string;
}

export const LIVE_WAGERS: LiveWager[] = [
  { name: 'val3ntin0', game: 'solshot',       stake: '0.05', payout: '+0.12', outcome: 'win',  ago: '14s' },
  { name: 'mona.sol',  game: 'basketball',    stake: '0.02', payout: '+0.04', outcome: 'win',  ago: '38s' },
  { name: '7z9b…',     game: 'keepie-uppies', stake: '0.01', payout: '-0.01', outcome: 'loss', ago: '1m'  },
  { name: 'low.eth',   game: 'solshot',       stake: '0.05', payout: '+0.12', outcome: 'win',  ago: '2m'  },
  { name: 'pixie',     game: 'free-kicks',    stake: '0.04', payout: '+0.10', outcome: 'win',  ago: '3m'  },
];

export interface TopScore {
  rank: number;
  name: string;
  score: string;
  delta: string;
}

export const TOP_SCORES: TopScore[] = [
  { rank: 1, name: 'val3ntin0', score: '142,089', delta: '—' },
  { rank: 2, name: 'mona.sol',  score: '137,402', delta: '+2' },
  { rank: 3, name: 'low.eth',   score: '129,815', delta: '+1' },
  { rank: 4, name: 'cryptopig', score: '124,200', delta: '-2' },
  { rank: 5, name: 'pixie',     score: '118,775', delta: '—' },
];

export interface OnlineFriend {
  name: string;
  playing: string;
  color: string;
}

export const FRIENDS_ONLINE: OnlineFriend[] = [
  { name: 'mona.sol', playing: 'Basketball', color: 'var(--blue)' },
  { name: 'low.eth',  playing: 'SolShot',    color: 'var(--brass)' },
  { name: 'pixie',    playing: 'Free Kicks', color: 'var(--win)' },
];

export interface MiniPrize {
  kind: 'hull' | 'ball' | 'cue';
  name: string;
  game: string;
  price: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legend';
  soon?: boolean;
}

export const PRIZES_MINI: MiniPrize[] = [
  { kind: 'hull', name: 'Tank Hull · Bramble',      game: 'SolShot',    price: 480,  rarity: 'common'    },
  { kind: 'ball', name: 'Basketball · Sunset',      game: 'Basketball', price: 960,  rarity: 'uncommon'  },
  { kind: 'cue',  name: 'Cue · Mahogany',           game: '8-Ball',     price: 1800, rarity: 'rare',   soon: true },
  { kind: 'hull', name: 'Tank Hull · Crimson Ridge',game: 'SolShot',    price: 4800, rarity: 'legend'   },
];

export interface ComingUpItem {
  label: string;
  when: string;
}

export const COMING_UP: ComingUpItem[] = [
  { label: 'Tournaments',   when: 'Q3 2026' },
  { label: 'Trophy Case',   when: 'Q3 2026' },
  { label: '8-Ball',        when: 'Q4 2026' },
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
