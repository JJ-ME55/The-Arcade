/** Shared cross-cutting types. Content-table types live with their config files. */

/** Terrain kind of a tile. Numeric for compact storage in override maps. */
export const Terrain = {
  Sky: 0, // above the surface; non-solid, non-diggable
  Empty: 1, // dug out / natural cave; non-solid
  Dirt: 2, // soft, diggable
  Stone: 3, // medium, diggable (slower)
  HardStone: 4, // hard, diggable (slowest)
  Boulder: 5, // solid, falls when unsupported (Boulder Dash)
  Bedrock: 6, // indestructible (world walls / floor of a band gate)
  Lava: 7, // hazard fluid — damages hull
  Gas: 8, // gas pocket — explodes when disturbed
} as const;
export type Terrain = (typeof Terrain)[keyof typeof Terrain];

/** Is this terrain solid (blocks the pod & must be dug/destroyed to pass)? */
export const SOLID: Record<Terrain, boolean> = {
  [Terrain.Sky]: false,
  [Terrain.Empty]: false,
  [Terrain.Dirt]: true,
  [Terrain.Stone]: true,
  [Terrain.HardStone]: true,
  [Terrain.Boulder]: true,
  [Terrain.Bedrock]: true,
  [Terrain.Lava]: false, // you fall/fly through lava (it hurts), like a fluid
  [Terrain.Gas]: false,
};

/** Is this terrain diggable by the drill (given enough drill power)? */
export const DIGGABLE: Record<Terrain, boolean> = {
  [Terrain.Sky]: false,
  [Terrain.Empty]: false,
  [Terrain.Dirt]: true,
  [Terrain.Stone]: true,
  [Terrain.HardStone]: true,
  [Terrain.Boulder]: false, // must be blasted or dislodged, not drilled
  [Terrain.Bedrock]: false,
  [Terrain.Lava]: false,
  [Terrain.Gas]: false,
};

/** A single generated/overridden tile. Kept tiny — most are plain dirt. */
export interface Tile {
  t: Terrain;
  /** ore id embedded in this tile (collected when dug), if any. */
  ore?: string;
  /** special find id (geode / lockbox / artifact / fossil), if any. */
  special?: string;
}

/** Item / consumable identifiers. */
export type ItemId =
  | 'dynamite'
  | 'c4'
  | 'teleporter'
  | 'transmitter'
  | 'nanobots'
  | 'reserveFuel'
  | 'gasVent';

/** The mutable state of one run (resets each new run; can be suspended/resumed). */
export interface RunState {
  seed: string;
  seedNum: number;
  mode: 'free' | 'daily' | 'challenge';
  loadout: string;
  modifiers: string[];
  startedAt: number;

  cash: number;
  fuel: number;
  fuelMax: number;
  hull: number;
  hullMax: number;
  heat: number;

  /** cargo: ore id -> count (cleared on sell). */
  cargo: Record<string, number>;
  cargoUsed: number; // cubic units used
  cargoMax: number;
  /** lifetime-of-run ore totals (never cleared) — for score variety + results. */
  oresCollected: Record<string, number>;

  items: Record<ItemId, number>;

  /** upgrade id -> tier index owned (0 = stock). */
  upgrades: Record<string, number>;

  depthMax: number; // deepest metres reached this run
  transmissionIdx: number; // index of next transmission to surface
  cashBanked: number; // total cash ever sold this run (for score)
  oreMinedValue: number; // raw value of everything mined
  fossilsFound: string[];
  artifactsFound: string[];
  bountiesClaimed: number[]; // depth bounties already paid out

  /** sparse world overrides: "x,y" -> Terrain (or -1 for "deleted->empty"). */
  overrides: Record<string, Tile>;

  elapsedMs: number;
}

/** Persistent meta state (survives across runs). */
export interface MetaState {
  version: number;
  playerName: string;
  cores: number; // rare persistent meta-currency
  totalCash: number;
  bestScore: number;
  bestDepth: number;
  runsPlayed: number;
  metaUpgrades: Record<string, number>; // permanent stat bumps
  unlockedLoadouts: string[];
  unlockedPods: string[];
  selectedPod: string;
  collection: {
    ores: Record<string, number>; // lifetime counts
    fossils: string[];
    artifacts: string[];
  };
  seasonPoints: Record<string, number>; // seasonId -> points
  seasonUnlocks: string[];
  achievements: string[];
  settings: GameSettings;
  stats: {
    totalDepth: number;
    totalDug: number;
    deaths: number;
    bestCashRun: number;
  };
}

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  haptics: boolean;
  showTutorial: boolean;
  reduceShake: boolean;
}

/** Score breakdown for the Game Over screen + leaderboard. */
export interface ScoreBreakdown {
  cashScore: number;
  depthScore: number;
  collectionScore: number;
  fossilScore: number;
  bonusScore: number;
  total: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  depth: number;
  cash: number;
  mode: string;
  seed: string;
  date: number;
}

export type DeathCause =
  | 'fuel'
  | 'hull'
  | 'crushed'
  | 'lava'
  | 'gas'
  | 'quit'
  | 'victory';
