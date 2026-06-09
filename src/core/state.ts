/** Global app state: meta-save (persistent) + current run config. */
import type { GameSettings, MetaState } from './types';
import { kvGet, kvSet } from './save';
import { LOADOUTS } from '../config/loadouts';

export const META_VERSION = 1;
export const SAVE_KEYS = { meta: 'meta', run: 'run' } as const;

export function defaultSettings(): GameSettings {
  return { sfxVolume: 0.7, musicVolume: 0.5, haptics: true, showTutorial: true, reduceShake: false };
}

export function defaultMeta(): MetaState {
  return {
    version: META_VERSION,
    playerName: 'Miner',
    cores: 0,
    totalCash: 0,
    bestScore: 0,
    bestDepth: 0,
    runsPlayed: 0,
    metaUpgrades: {},
    unlockedLoadouts: LOADOUTS.filter((l) => l.unlockedByDefault).map((l) => l.id),
    unlockedPods: ['default'],
    selectedPod: 'default',
    collection: { ores: {}, fossils: [], artifacts: [] },
    seasonPoints: {},
    seasonUnlocks: [],
    achievements: [],
    settings: defaultSettings(),
    stats: { totalDepth: 0, totalDug: 0, deaths: 0, bestCashRun: 0 },
  };
}

/** Forward-compatible migration: merge persisted values onto current defaults. */
function migrate(raw: Partial<MetaState> | null): MetaState {
  const base = defaultMeta();
  if (!raw) return base;
  const m: MetaState = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    collection: {
      ores: { ...(raw.collection?.ores ?? {}) },
      fossils: [...(raw.collection?.fossils ?? [])],
      artifacts: [...(raw.collection?.artifacts ?? [])],
    },
    metaUpgrades: { ...(raw.metaUpgrades ?? {}) },
    seasonPoints: { ...(raw.seasonPoints ?? {}) },
    stats: { ...base.stats, ...(raw.stats ?? {}) },
  };
  // ensure default-unlocked loadouts are always present
  for (const l of LOADOUTS) if (l.unlockedByDefault && !m.unlockedLoadouts.includes(l.id)) m.unlockedLoadouts.push(l.id);
  m.version = META_VERSION;
  return m;
}

export interface RunConfig {
  seed: string;
  mode: 'free' | 'daily' | 'challenge';
  loadout: string;
  modifiers: string[];
  challengeId?: string;
}

class AppState {
  meta: MetaState = defaultMeta();
  runConfig: RunConfig | null = null;
  /** when set, the Game scene resumes this suspended run instead of starting fresh. */
  resumeData: unknown = null;
  loaded = false;
  private saveTimer: number | null = null;

  async load(): Promise<void> {
    const raw = await kvGet<MetaState>(SAVE_KEYS.meta);
    this.meta = migrate(raw);
    this.loaded = true;
  }

  /** Debounced persist. */
  save(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void kvSet(SAVE_KEYS.meta, this.meta);
    }, 250);
  }

  saveNow(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    void kvSet(SAVE_KEYS.meta, this.meta);
  }
}

export const App = new AppState();

// ---- Seed helpers ----
export function dailySeedString(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `DAILY-${y}-${m}-${day}`;
}

const SEED_WORDS = ['IRON', 'CORE', 'DEEP', 'GOLD', 'MAGMA', 'FROST', 'RUBY', 'VOID', 'DRILL', 'ABYSS', 'EMBER', 'QUARTZ'];
export function randomSeedString(): string {
  // Math.random here only PICKS a seed string; world gen from it is fully deterministic.
  const w = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `${w}-${n}`;
}
