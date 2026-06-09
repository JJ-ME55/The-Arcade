/**
 * Ore / mineral content table — data-driven (Principle #5: content is data).
 * Add a new ore by appending here; world gen and UI pick it up automatically.
 *
 * Value scales FASTER than weight (the Motherload secret): deep ore is space-efficient,
 * so digging deep stays mathematically attractive.
 */

export interface OreDef {
  id: string;
  name: string;
  /** sell value per unit, level 1. */
  value: number;
  /** cargo cubic units consumed per unit. */
  weight: number;
  /** tier 0..5, used for grouping/visuals. */
  tier: number;
  /** base fill / core colour. */
  color: number;
  /** brighter speckle / glow colour. */
  glow: number;
  /** metres where this ore first appears. */
  appearDepth: number;
  /** metres where this ore is most common. */
  peakDepth: number;
  /** relative spawn weight at its peak. */
  weightAtPeak: number;
  /** how quickly it fades out below its peak (metres). */
  falloff: number;
}

export const ORES: OreDef[] = [
  // --- tier 0: the economy floor (surface ~ 400m) ---
  { id: 'coal',     name: 'Coal',      value: 9,      weight: 1, tier: 0, color: 0x2b2b33, glow: 0x55555f, appearDepth: 0,    peakDepth: 60,   weightAtPeak: 26, falloff: 600 },
  { id: 'copper',   name: 'Copper',    value: 20,     weight: 1, tier: 0, color: 0xb5651d, glow: 0xff9d4d, appearDepth: 0,    peakDepth: 120,  weightAtPeak: 24, falloff: 700 },
  { id: 'iron',     name: 'Iron',      value: 38,     weight: 1, tier: 0, color: 0x8a6a5a, glow: 0xc99a86, appearDepth: 40,   peakDepth: 220,  weightAtPeak: 22, falloff: 800 },
  { id: 'aluminium',name: 'Aluminium', value: 70,     weight: 1, tier: 0, color: 0xc7ccd1, glow: 0xeef2f6, appearDepth: 90,   peakDepth: 320,  weightAtPeak: 18, falloff: 800 },

  // --- tier 1: mid (200 ~ 900m) ---
  { id: 'silver',   name: 'Silver',    value: 165,    weight: 1, tier: 1, color: 0xd8d8e0, glow: 0xffffff, appearDepth: 220,  peakDepth: 480,  weightAtPeak: 16, falloff: 900 },
  { id: 'gold',     name: 'Gold',      value: 420,    weight: 2, tier: 1, color: 0xffcf3a, glow: 0xfff2a0, appearDepth: 320,  peakDepth: 620,  weightAtPeak: 13, falloff: 900 },

  // --- tier 2: deep-mid (600 ~ 1400m) ---
  { id: 'platinum', name: 'Platinum',  value: 980,    weight: 2, tier: 2, color: 0x9fd6e6, glow: 0xe3fbff, appearDepth: 600,  peakDepth: 900,  weightAtPeak: 11, falloff: 1000 },
  { id: 'titanium', name: 'Titanium',  value: 1850,   weight: 2, tier: 2, color: 0x8f9bb3, glow: 0xd4ddf2, appearDepth: 760,  peakDepth: 1100, weightAtPeak: 9,  falloff: 1000 },

  // --- tier 3: gems (1000 ~ 1900m) ---
  { id: 'emerald',  name: 'Emerald',   value: 4400,   weight: 3, tier: 3, color: 0x2fbf6b, glow: 0x9dffc6, appearDepth: 1000, peakDepth: 1350, weightAtPeak: 7,  falloff: 1100 },
  { id: 'sapphire', name: 'Sapphire',  value: 9200,   weight: 3, tier: 3, color: 0x2f6bff, glow: 0x9dc6ff, appearDepth: 1200, peakDepth: 1550, weightAtPeak: 6,  falloff: 1100 },
  { id: 'ruby',     name: 'Ruby',      value: 19500,  weight: 3, tier: 3, color: 0xe23b5a, glow: 0xff9db0, appearDepth: 1400, peakDepth: 1750, weightAtPeak: 5,  falloff: 1100 },

  // --- tier 4: diamond (1700 ~ 2400m) ---
  { id: 'diamond',  name: 'Diamond',   value: 58000,  weight: 4, tier: 4, color: 0xa9f4ff, glow: 0xffffff, appearDepth: 1700, peakDepth: 2100, weightAtPeak: 3.4, falloff: 1200 },

  // --- tier 5: the fictional capstone jackpot ore ("the Motherlode") ---
  { id: 'aurelium', name: 'Aurelium',  value: 200000, weight: 5, tier: 5, color: 0xffe14d, glow: 0xfffae0, appearDepth: 2100, peakDepth: 2600, weightAtPeak: 1.8, falloff: 1400 },
];

export const ORE_BY_ID: Record<string, OreDef> = Object.fromEntries(
  ORES.map((o) => [o.id, o]),
);

/** Triangular-ish window: 0 before appear, ramps to peak, gently decays after. */
export function oreSpawnWeight(ore: OreDef, depth: number): number {
  if (depth < ore.appearDepth) return 0;
  const ramp = Math.min(1, (depth - ore.appearDepth) / Math.max(1, ore.peakDepth - ore.appearDepth));
  if (depth <= ore.peakDepth) return ore.weightAtPeak * ramp;
  const decay = Math.max(0, 1 - (depth - ore.peakDepth) / ore.falloff);
  return ore.weightAtPeak * decay;
}
