/**
 * Special finds — the "what else can they find?" answer. Each is a flagged tile resolved
 * when dug. Stored on the tile as a string id like "geode", "fossil:ammonite",
 * "artifact:martian_skull", "lockbox", "cache".
 */

export type SpecialKind = 'geode' | 'fossil' | 'artifact' | 'lockbox' | 'cache' | 'wreck' | 'goody';

export interface SpecialKindDef {
  kind: SpecialKind;
  appearDepth: number;
  weightAtPeak: number;
  peakDepth: number;
  falloff: number;
  color: number;
  glow: number;
}

/** Relative spawn weights for each special KIND, by depth (like ores). */
export const SPECIAL_KINDS: SpecialKindDef[] = [
  { kind: 'geode',   appearDepth: 80,   peakDepth: 700,  weightAtPeak: 6,   falloff: 2000, color: 0x6b5a7a, glow: 0xd7a0ff },
  { kind: 'fossil',  appearDepth: 60,   peakDepth: 500,  weightAtPeak: 4,   falloff: 2200, color: 0xcdb892, glow: 0xfff0c0 },
  { kind: 'lockbox', appearDepth: 250,  peakDepth: 900,  weightAtPeak: 2.2, falloff: 2200, color: 0x8a6a3a, glow: 0xffd27a },
  { kind: 'cache',   appearDepth: 600,  peakDepth: 1400, weightAtPeak: 1.6, falloff: 2000, color: 0x5a7a8a, glow: 0xa0e0ff },
  { kind: 'artifact',appearDepth: 850,  peakDepth: 1800, weightAtPeak: 1.4, falloff: 2200, color: 0xb59cff, glow: 0xeaddff },
  { kind: 'wreck',   appearDepth: 380,  peakDepth: 1600, weightAtPeak: 1.0, falloff: 2400, color: 0x8a93a0, glow: 0xff6b8a },
  // surprise goody boxes — the "what did I find?!" moment, regular delight from shallow on
  { kind: 'goody',   appearDepth: 40,   peakDepth: 1200, weightAtPeak: 4.5, falloff: 2600, color: 0xff8ad6, glow: 0xffe14d },
];

export function specialKindWeight(def: SpecialKindDef, depth: number): number {
  if (depth < def.appearDepth) return 0;
  const ramp = Math.min(1, (depth - def.appearDepth) / Math.max(1, def.peakDepth - def.appearDepth));
  if (depth <= def.peakDepth) return def.weightAtPeak * ramp;
  return def.weightAtPeak * Math.max(0, 1 - (depth - def.peakDepth) / def.falloff);
}

// ---- Fossils (collection + score, museum meta) ----
export interface FossilDef { id: string; name: string; minDepth: number; }
export const FOSSILS: FossilDef[] = [
  { id: 'ammonite', name: 'Ammonite', minDepth: 0 },
  { id: 'trilobite', name: 'Trilobite', minDepth: 120 },
  { id: 'fern', name: 'Fossil Fern', minDepth: 200 },
  { id: 'dino_tooth', name: 'Dino Tooth', minDepth: 400 },
  { id: 'dino_rib', name: 'Dino Rib', minDepth: 650 },
  { id: 'dino_skull', name: 'Dino Skull', minDepth: 950 },
  { id: 'mammoth_tusk', name: 'Mammoth Tusk', minDepth: 1600 }, // frozen deep
  { id: 'leviathan_vert', name: 'Leviathan Vertebra', minDepth: 2000 },
];

// ---- Artifacts (instant cash + lore, no cargo space) ----
export interface ArtifactDef { id: string; name: string; value: number; minDepth: number; }
export const ARTIFACTS: ArtifactDef[] = [
  { id: 'pottery', name: 'Ancient Pottery', value: 2500, minDepth: 850 },
  { id: 'idol', name: 'Stone Idol', value: 8000, minDepth: 1100 },
  { id: 'martian_skull', name: 'Martian Skull', value: 20000, minDepth: 1400 },
  { id: 'relic_core', name: 'Glowing Relic', value: 60000, minDepth: 1800 },
  { id: 'natas_sigil', name: "Natas' Sigil", value: 200000, minDepth: 2200 },
  { id: 'motherlode', name: 'The Motherlode', value: 500000, minDepth: 2150 },
];

export function pickFossil(depth: number, roll: number): FossilDef {
  const elig = FOSSILS.filter((f) => depth >= f.minDepth);
  return elig[Math.floor(roll * elig.length)] ?? FOSSILS[0];
}
export function pickArtifact(depth: number, roll: number): ArtifactDef {
  const elig = ARTIFACTS.filter((a) => depth >= a.minDepth);
  return elig[Math.floor(roll * elig.length)] ?? ARTIFACTS[0];
}
