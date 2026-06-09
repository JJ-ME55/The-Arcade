/**
 * The world: a pure function of (seed, x, y) plus a sparse map of overrides for tiles
 * the player has changed (dug out, dislodged boulders). This determinism is the spine —
 * same seed = byte-identical world on every device (daily seeds, replay anti-cheat).
 */
import { Terrain, SOLID, DIGGABLE, type Tile } from '../core/types';
import { hash2, fbm2, weightedIndex } from '../core/rng';
import { WORLD_WIDTH, SURFACE_ROW, SKY_ROWS, DEPTH_PER_ROW, TILE } from '../config/gameplay';
import { biomeAt, type BiomeDef } from '../config/biomes';
import { ORES, oreSpawnWeight } from '../config/ores';
import { SPECIAL_KINDS, specialKindWeight, pickFossil, pickArtifact } from '../config/specials';

// salts: independent hash channels per concern
const S_CAVE = 11;
const S_KIND = 23;
const S_BOULDER = 37;
const S_LAVA = 53;
const S_GAS = 67;
const S_ORE = 83;
const S_OREPICK = 97;
const S_SPECIAL = 113;
const S_SPECIALPICK = 131;
const S_SEASON = 151;

export interface SeasonFind {
  id: string;
  rarity: number;
  minDepth: number;
}

const BASE_HARDNESS: Record<number, number> = {
  [Terrain.Dirt]: 1.0,
  [Terrain.Stone]: 2.4,
  [Terrain.HardStone]: 4.4,
};

export class World {
  readonly seed: number;
  readonly overrides = new Map<string, Tile>();
  season: SeasonFind | null;

  constructor(seedNum: number, season: SeasonFind | null = null, overrides?: Record<string, Tile>) {
    this.seed = seedNum >>> 0;
    this.season = season;
    if (overrides) for (const k in overrides) this.overrides.set(k, overrides[k]);
  }

  key(x: number, y: number): string {
    return x + ',' + y;
  }

  depthMeters(y: number): number {
    return Math.max(0, (y - SURFACE_ROW) * DEPTH_PER_ROW);
  }

  /** Fast terrain-only lookup (no allocation) — used by collision & dig checks. */
  terrainAt(x: number, y: number): Terrain {
    const o = this.overrides.get(this.key(x, y));
    if (o) return o.t;
    return this.genTerrain(x, y);
  }

  solidAt(x: number, y: number): boolean {
    return SOLID[this.terrainAt(x, y)];
  }

  diggableAt(x: number, y: number): boolean {
    return DIGGABLE[this.terrainAt(x, y)];
  }

  /** Full tile (terrain + ore + special). Allocates — use sparingly (render/dig). */
  getTile(x: number, y: number): Tile {
    const o = this.overrides.get(this.key(x, y));
    if (o) return o;
    return this.genTile(x, y);
  }

  setTile(x: number, y: number, tile: Tile): void {
    this.overrides.set(this.key(x, y), tile);
  }

  clearTile(x: number, y: number): void {
    this.overrides.set(this.key(x, y), { t: Terrain.Empty });
  }

  hardnessAt(x: number, y: number): number {
    const t = this.terrainAt(x, y);
    const base = BASE_HARDNESS[t] ?? 1;
    const depth = this.depthMeters(y);
    return base * biomeAt(depth).hardnessMul;
  }

  // ---- generation ----

  private genTerrain(x: number, y: number): Terrain {
    if (y < SKY_ROWS) return Terrain.Sky;
    if (x < 0 || x >= WORLD_WIDTH) return Terrain.Bedrock;
    const depth = this.depthMeters(y);
    const b = biomeAt(depth);

    // The surface row + a couple below are guaranteed solid clean dirt (good start).
    if (y <= SURFACE_ROW + 1) return Terrain.Dirt;

    // Caves: smooth field, suppressed near the surface.
    const caveField = fbm2(this.seed, x * 0.09, y * 0.07, 4, 2, 0.5, S_CAVE);
    const caveThresh = 1 - Math.min(0.42, b.caveDensity * 2.2) * Math.min(1, (depth - 12) / 60);
    if (depth > 14 && caveField > caveThresh) return Terrain.Empty;

    // Hazard pockets (non-solid, embedded in the strata).
    if (b.lavaDensity > 0 && hash2(this.seed, x, y, S_LAVA) < b.lavaDensity) return Terrain.Lava;
    if (b.gasDensity > 0 && hash2(this.seed, x, y, S_GAS) < b.gasDensity) return Terrain.Gas;

    // Boulders (solid, fall when unsupported).
    if (hash2(this.seed, x, y, S_BOULDER) < b.boulderDensity) return Terrain.Boulder;

    // Solid kind.
    const kindRoll = hash2(this.seed, x, y, S_KIND);
    if (kindRoll < b.hardChance) return Terrain.HardStone;
    if (kindRoll < b.hardChance + b.stoneChance) return Terrain.Stone;
    return Terrain.Dirt;
  }

  private genTile(x: number, y: number): Tile {
    const t = this.genTerrain(x, y);
    // ore/special only embed in solid, diggable rock
    if (t !== Terrain.Dirt && t !== Terrain.Stone && t !== Terrain.HardStone) return { t };

    const depth = this.depthMeters(y);
    const b = biomeAt(depth);

    // Seasonal find — highest priority so the signature find is reliably visible.
    if (this.season && depth >= this.season.minDepth && hash2(this.seed, x, y, S_SEASON) < this.season.rarity) {
      return { t, special: 'season:' + this.season.id };
    }

    // Specials are rare; checked first (they outrank plain ore on a tile).
    if (depth > 30 && hash2(this.seed, x, y, S_SPECIAL) < 0.014) {
      const weights = SPECIAL_KINDS.map((sk) => specialKindWeight(sk, depth));
      const idx = weightedIndex(hash2(this.seed, x, y, S_SPECIALPICK), weights);
      if (idx >= 0) {
        const kind = SPECIAL_KINDS[idx].kind;
        const pickRoll = hash2(this.seed, x + 7, y + 3, S_SPECIALPICK);
        if (kind === 'fossil') return { t, special: 'fossil:' + pickFossil(depth, pickRoll).id };
        if (kind === 'artifact') return { t, special: 'artifact:' + pickArtifact(depth, pickRoll).id };
        return { t, special: kind };
      }
    }

    // Ore.
    if (hash2(this.seed, x, y, S_ORE) < b.oreRichness) {
      const weights = ORES.map((o) => oreSpawnWeight(o, depth));
      const idx = weightedIndex(hash2(this.seed, x, y, S_OREPICK), weights);
      if (idx >= 0) return { t, ore: ORES[idx].id };
    }

    return { t };
  }

  /** Biome at a pixel-Y (used by camera/audio/visuals). */
  biomeAtY(py: number): BiomeDef {
    return biomeAt(this.depthMeters(Math.floor(py / TILE)));
  }

  /** Serialize overrides for saving. */
  serializeOverrides(): Record<string, Tile> {
    const out: Record<string, Tile> = {};
    this.overrides.forEach((v, k) => (out[k] = v));
    return out;
  }
}
