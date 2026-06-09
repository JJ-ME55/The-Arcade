/** Run lifecycle: build a fresh RunState, cargo math. */
import type { ItemId, RunState } from '../core/types';
import type { RunConfig } from '../core/state';
import { App } from '../core/state';
import { LOADOUT_BY_ID } from '../config/loadouts';
import { ORE_BY_ID } from '../config/ores';
import { hashSeed } from '../core/rng';
import { ECON } from '../config/gameplay';
import { deriveStats } from './stats';

export const KG_PER_CUBIC = 70;

const EMPTY_ITEMS: Record<ItemId, number> = {
  dynamite: 0, c4: 0, teleporter: 0, transmitter: 0, nanobots: 0, reserveFuel: 0, gasVent: 0,
};

export function createRun(config: RunConfig): RunState {
  const loadout = LOADOUT_BY_ID[config.loadout] ?? LOADOUT_BY_ID['prospector'];

  const upgrades: Record<string, number> = {};
  for (const k in loadout.startUpgrades) upgrades[k] = loadout.startUpgrades[k as never] as number;

  const items: Record<ItemId, number> = { ...EMPTY_ITEMS };
  for (const k in loadout.startItems) items[k as ItemId] = loadout.startItems[k as ItemId] ?? 0;

  const run: RunState = {
    seed: config.seed,
    seedNum: hashSeed(config.seed),
    mode: config.mode,
    loadout: config.loadout,
    modifiers: [...config.modifiers],
    startedAt: Date.now(),
    cash: ECON.startingCash + (loadout.startCash ?? 0),
    fuel: 0,
    fuelMax: 0,
    hull: 0,
    hullMax: 0,
    heat: 0,
    cargo: {},
    cargoUsed: 0,
    cargoMax: 0,
    oresCollected: {},
    items,
    upgrades,
    depthMax: 0,
    ticketsEarned: 0,
    transmissionIdx: 0,
    cashBanked: 0,
    oreMinedValue: 0,
    fossilsFound: [],
    artifactsFound: [],
    bountiesClaimed: [],
    overrides: {},
    elapsedMs: 0,
  };

  // Apply meta permanent perks to starting cash (small bump per metaUpgrade level).
  run.cash += (App.meta.metaUpgrades['startCash'] ?? 0) * 250;

  const s = deriveStats(run);
  run.fuelMax = s.fuelMax;
  run.fuel = s.fuelMax;
  run.hullMax = s.hullMax;
  run.hull = s.hullMax;
  run.cargoMax = s.cargoMax;
  return run;
}

export function cargoMassKg(run: RunState): number {
  return run.cargoUsed * KG_PER_CUBIC;
}

/** Try to add one unit of ore to cargo. Returns false if it doesn't fit. */
export function addOre(run: RunState, oreId: string): boolean {
  const ore = ORE_BY_ID[oreId];
  if (!ore) return false;
  if (run.cargoUsed + ore.weight > run.cargoMax) return false;
  run.cargo[oreId] = (run.cargo[oreId] ?? 0) + 1;
  run.cargoUsed += ore.weight;
  run.oreMinedValue += ore.value;
  run.oresCollected[oreId] = (run.oresCollected[oreId] ?? 0) + 1;
  return true;
}

export function cargoValue(run: RunState, sellMul: number): number {
  let total = 0;
  for (const id in run.cargo) total += (ORE_BY_ID[id]?.value ?? 0) * run.cargo[id];
  return Math.round(total * sellMul);
}

export function cargoIsEmpty(run: RunState): boolean {
  return run.cargoUsed <= 0;
}

/** Sell entire cargo; returns cash gained. */
export function sellCargo(run: RunState, sellMul: number): number {
  const gained = cargoValue(run, sellMul);
  run.cash += gained;
  run.cashBanked += gained;
  // lifetime collection counts
  for (const id in run.cargo) App.meta.collection.ores[id] = (App.meta.collection.ores[id] ?? 0) + run.cargo[id];
  run.cargo = {};
  run.cargoUsed = 0;
  return gained;
}

/** Dump cargo without selling (anti-softlock safety valve). */
export function dumpCargo(run: RunState): void {
  run.cargo = {};
  run.cargoUsed = 0;
}
