/**
 * Seasonal system — time-boxed themes (Christmas, Easter, etc.) bringing a signature find,
 * an accent reskin, and a battle-pass-lite track of earnable seasonal gear. All data.
 *
 * Determinism note: the active season is shared by everyone on a given calendar day, so
 * daily-seed runs stay fair (world = f(seed, activeSeason) and activeSeason is global today).
 */

export interface SeasonReward {
  points: number;
  kind: 'pod' | 'cores' | 'item' | 'title';
  id: string;
  name: string;
  /** for pod skins: tint colour. */
  tint?: number;
  /** for items: how many. */
  count?: number;
}

export interface SeasonDef {
  id: string;
  name: string;
  blurb: string;
  /** active window as [month(1-12), day]. Inclusive. Wraps year if start > end. */
  start: [number, number];
  end: [number, number];
  accent: number;
  /** signature seasonal find embedded in the world during the season. */
  find: {
    id: string;
    name: string;
    color: number;
    glow: number;
    cash: number; // instant cash
    points: number; // season points
    rarity: number; // spawn probability per eligible tile
    minDepth: number;
  };
  /** mild gameplay perk granted to everyone during the season (flavour, not pay-to-win). */
  perk?: { heatResist?: number; fuelEff?: number; sellMul?: number };
  track: SeasonReward[];
}

export const SEASONS: SeasonDef[] = [
  {
    id: 'winterfest', name: 'Winterfest', blurb: 'Snow on the surface, gifts in the deep.',
    start: [12, 1], end: [1, 5], accent: 0xff4d4d,
    find: { id: 'gift', name: 'Buried Gift', color: 0xe23b5a, glow: 0x9dffc6, cash: 6000, points: 10, rarity: 0.02, minDepth: 60 },
    perk: { heatResist: 6 },
    track: [
      { points: 30, kind: 'item', id: 'reserveFuel', name: 'Stocking: x3 Fuel', count: 3 },
      { points: 80, kind: 'cores', id: 'cores', name: '5 Cores', count: 5 },
      { points: 160, kind: 'pod', id: 'pod_sleigh', name: 'Sleigh Pod', tint: 0xff5a5a },
      { points: 300, kind: 'title', id: 'title_frost', name: 'Title: Frostbreaker' },
    ],
  },
  {
    id: 'eastertide', name: 'Eastertide', blurb: 'Fossilised spores sprout into hidden eggs.',
    start: [3, 15], end: [4, 25], accent: 0x7df2a0,
    find: { id: 'egg', name: 'Painted Egg', color: 0x7df2ff, glow: 0xffd2f0, cash: 4500, points: 8, rarity: 0.022, minDepth: 40 },
    perk: { fuelEff: 0.95 },
    track: [
      { points: 30, kind: 'item', id: 'nanobots', name: 'Basket: x2 Nanobots', count: 2 },
      { points: 80, kind: 'cores', id: 'cores', name: '5 Cores', count: 5 },
      { points: 160, kind: 'pod', id: 'pod_pastel', name: 'Pastel Pod', tint: 0x9df2c0 },
      { points: 300, kind: 'title', id: 'title_hatch', name: 'Title: The Hatcher' },
    ],
  },
  {
    id: 'midsummer', name: 'Midsummer', blurb: 'The deep glows hot — sun crystals everywhere.',
    start: [6, 1], end: [7, 7], accent: 0xffd24d,
    find: { id: 'suncrystal', name: 'Sun Crystal', color: 0xffd24d, glow: 0xfff2a0, cash: 5000, points: 9, rarity: 0.022, minDepth: 50 },
    perk: { sellMul: 1.05 },
    track: [
      { points: 30, kind: 'item', id: 'c4', name: 'Cache: x2 Plastic Explosive', count: 2 },
      { points: 80, kind: 'cores', id: 'cores', name: '5 Cores', count: 5 },
      { points: 160, kind: 'pod', id: 'pod_solar', name: 'Solar Pod', tint: 0xffd24d },
      { points: 300, kind: 'title', id: 'title_sun', name: 'Title: Sun-Diver' },
    ],
  },
  {
    id: 'hallowdeep', name: 'Hallowdeep', blurb: 'Cursed skulls haunt the strata.',
    start: [10, 18], end: [11, 2], accent: 0xff7a2a,
    find: { id: 'skull', name: 'Cursed Skull', color: 0xc792ff, glow: 0xff7a2a, cash: 6660, points: 11, rarity: 0.02, minDepth: 80 },
    perk: { heatResist: 6 },
    track: [
      { points: 30, kind: 'item', id: 'teleporter', name: 'Trick: x2 Teleporter', count: 2 },
      { points: 80, kind: 'cores', id: 'cores', name: '6 Cores', count: 6 },
      { points: 160, kind: 'pod', id: 'pod_phantom', name: 'Phantom Pod', tint: 0xc792ff },
      { points: 300, kind: 'title', id: 'title_haunt', name: 'Title: Gravewalker' },
    ],
  },
];

function inWindow(month: number, day: number, s: SeasonDef): boolean {
  const v = month * 100 + day;
  const a = s.start[0] * 100 + s.start[1];
  const b = s.end[0] * 100 + s.end[1];
  if (a <= b) return v >= a && v <= b;
  return v >= a || v <= b; // wraps year (e.g. Dec→Jan)
}

export function getActiveSeason(d = new Date()): SeasonDef | null {
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const s of SEASONS) if (inWindow(month, day, s)) return s;
  return null;
}

export const SEASON_BY_ID: Record<string, SeasonDef> = Object.fromEntries(SEASONS.map((s) => [s.id, s]));
