/**
 * Biome bands at depth — one deep shaft, but its character changes every few hundred
 * metres. Data-driven: add/retune a band here and gen + render + audio follow.
 */

export interface BiomePalette {
  /** background gradient top & bottom (behind tiles). */
  bgTop: number;
  bgBottom: number;
  /** dirt fill + edge highlight. */
  dirt: number;
  dirtEdge: number;
  /** stone fill + edge. */
  stone: number;
  stoneEdge: number;
  /** hard-stone fill + edge. */
  hard: number;
  hardEdge: number;
  /** accent used for crystal glints / cracks. */
  accent: number;
}

export interface BiomeDef {
  id: string;
  name: string;
  depthStart: number; // metres
  palette: BiomePalette;
  /** base hardness multiplier for tiles in this band. */
  hardnessMul: number;
  /** 0..1 probability a solid tile is upgraded to Stone instead of Dirt. */
  stoneChance: number;
  /** 0..1 probability of HardStone. */
  hardChance: number;
  /** density of pre-carved caves (higher = more open space). */
  caveDensity: number;
  /** density of fallable boulders. */
  boulderDensity: number;
  /** density of lava pockets. */
  lavaDensity: number;
  /** density of gas pockets. */
  gasDensity: number;
  /** ambient heat pressure (0 none, 1 hot). negative = cold (heat drains faster). */
  heatPressure: number;
  /** ore richness multiplier (chance a solid tile contains ore). */
  oreRichness: number;
  /** music / ambience tag. */
  ambience: string;
}

export const BIOMES: BiomeDef[] = [
  {
    id: 'topsoil', name: 'Topsoil', depthStart: 0,
    palette: { bgTop: 0x3a2918, bgBottom: 0x21160d, dirt: 0x553a1c, dirtEdge: 0x6e4a26, stone: 0x6a6258, stoneEdge: 0x847b6e, hard: 0x555049, hardEdge: 0x6e685f, accent: 0x9be36b },
    hardnessMul: 1.0, stoneChance: 0.02, hardChance: 0.0, caveDensity: 0.04,
    boulderDensity: 0.015, lavaDensity: 0, gasDensity: 0, heatPressure: 0,
    oreRichness: 0.1, ambience: 'calm',
  },
  {
    id: 'sediment', name: 'Clay Sediment', depthStart: 130,
    palette: { bgTop: 0x432619, bgBottom: 0x281610, dirt: 0x6e3a22, dirtEdge: 0x8a4c30, stone: 0x7a5246, stoneEdge: 0x96675a, hard: 0x5e463c, hardEdge: 0x77584c, accent: 0xe0a060 },
    hardnessMul: 1.25, stoneChance: 0.05, hardChance: 0.01, caveDensity: 0.05,
    boulderDensity: 0.03, lavaDensity: 0, gasDensity: 0.006, heatPressure: 0.05,
    oreRichness: 0.13, ambience: 'calm',
  },
  {
    id: 'rock', name: 'Bedrock Strata', depthStart: 330,
    palette: { bgTop: 0x2c2c38, bgBottom: 0x18181f, dirt: 0x5c5c6a, dirtEdge: 0x73738a, stone: 0x4a4a5a, stoneEdge: 0x62627a, hard: 0x3a3a48, hardEdge: 0x52525f, accent: 0x8fa0c0 },
    hardnessMul: 1.6, stoneChance: 0.12, hardChance: 0.03, caveDensity: 0.07,
    boulderDensity: 0.05, lavaDensity: 0.004, gasDensity: 0.012, heatPressure: 0.1,
    oreRichness: 0.2, ambience: 'deep',
  },
  {
    id: 'crystal', name: 'Crystal Caverns', depthStart: 650,
    palette: { bgTop: 0x241a44, bgBottom: 0x120c26, dirt: 0x453a6e, dirtEdge: 0x5d4f92, stone: 0x382e5c, stoneEdge: 0x4c3f7a, hard: 0x2a2348, hardEdge: 0x3d3266, accent: 0x7df2ff },
    hardnessMul: 2.0, stoneChance: 0.16, hardChance: 0.05, caveDensity: 0.12,
    boulderDensity: 0.05, lavaDensity: 0.01, gasDensity: 0.02, heatPressure: 0.12,
    oreRichness: 0.24, ambience: 'crystal',
  },
  {
    id: 'magma', name: 'Magma Shelf', depthStart: 1050,
    palette: { bgTop: 0x40140c, bgBottom: 0x1f0805, dirt: 0x6e2e22, dirtEdge: 0x8f3c2c, stone: 0x55241c, stoneEdge: 0x733024, hard: 0x401a14, hardEdge: 0x5a251c, accent: 0xff7a2a },
    hardnessMul: 2.5, stoneChance: 0.2, hardChance: 0.08, caveDensity: 0.1,
    boulderDensity: 0.06, lavaDensity: 0.05, gasDensity: 0.03, heatPressure: 1.0,
    oreRichness: 0.26, ambience: 'magma',
  },
  {
    id: 'frozen', name: 'Frozen Deep', depthStart: 1550,
    palette: { bgTop: 0x0e2630, bgBottom: 0x06141c, dirt: 0x2f5e72, dirtEdge: 0x3f7c94, stone: 0x274e60, stoneEdge: 0x356a80, hard: 0x1d3a48, hardEdge: 0x2b5163, accent: 0xb6f0ff },
    hardnessMul: 3.0, stoneChance: 0.24, hardChance: 0.1, caveDensity: 0.14,
    boulderDensity: 0.07, lavaDensity: 0.008, gasDensity: 0.04, heatPressure: -0.6,
    oreRichness: 0.28, ambience: 'frozen',
  },
  {
    id: 'core', name: 'The Core', depthStart: 2150,
    palette: { bgTop: 0x1a1208, bgBottom: 0x080502, dirt: 0x322414, dirtEdge: 0x4a3620, stone: 0x281d10, stoneEdge: 0x3e2d18, hard: 0x1c140a, hardEdge: 0x322414, accent: 0xffd24d },
    hardnessMul: 3.8, stoneChance: 0.28, hardChance: 0.14, caveDensity: 0.16,
    boulderDensity: 0.08, lavaDensity: 0.06, gasDensity: 0.05, heatPressure: 0.85,
    oreRichness: 0.32, ambience: 'core',
  },
];

/** Index of the band containing this depth. */
export function biomeIndexAt(depth: number): number {
  let idx = 0;
  for (let i = 0; i < BIOMES.length; i++) {
    if (depth >= BIOMES[i].depthStart) idx = i;
    else break;
  }
  return idx;
}

export function biomeAt(depth: number): BiomeDef {
  return BIOMES[biomeIndexAt(depth)];
}

/** Smooth 0..1 blend factor between the current band and the next (overlap zones). */
export function biomeBlend(depth: number): { from: number; to: number; t: number } {
  const i = biomeIndexAt(depth);
  const next = Math.min(BIOMES.length - 1, i + 1);
  if (i === next) return { from: i, to: next, t: 0 };
  const start = BIOMES[i].depthStart;
  const end = BIOMES[next].depthStart;
  const overlap = Math.min(120, (end - start) * 0.4);
  const blendStart = end - overlap;
  if (depth < blendStart) return { from: i, to: next, t: 0 };
  return { from: i, to: next, t: (depth - blendStart) / overlap };
}
