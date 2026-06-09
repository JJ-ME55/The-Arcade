/** Pre-run loadouts (characters). Change run feel + give leaderboard build-diversity. */
import type { UpgradeCategory } from './upgrades';
import type { ItemId } from '../core/types';

export interface LoadoutMods {
  fuelEff?: number; // <1 = uses less fuel
  digSpeed?: number; // dig power multiplier
  cargoMul?: number; // cargo capacity multiplier
  hullMul?: number; // hull max multiplier
  sellMul?: number; // ore sells for more
  thrustMul?: number; // lift multiplier
  heatResist?: number; // flat % heat/lava resistance added
}

export interface LoadoutDef {
  id: string;
  name: string;
  blurb: string;
  color: number;
  unlockedByDefault: boolean;
  coreCost?: number;
  startUpgrades: Partial<Record<UpgradeCategory, number>>;
  startItems: Partial<Record<ItemId, number>>;
  startCash?: number;
  mods: LoadoutMods;
}

export const LOADOUTS: LoadoutDef[] = [
  {
    id: 'prospector', name: 'Prospector', color: 0x7db7ff,
    blurb: 'Bigger bay, better prices. Haul more, sell higher.',
    unlockedByDefault: true,
    startUpgrades: { cargo: 1 },
    startItems: { reserveFuel: 1 },
    mods: { cargoMul: 1.15, sellMul: 1.1 },
  },
  {
    id: 'driller', name: 'Driller', color: 0xffb347,
    blurb: 'Born to dig. Faster drill, eats hard stone.',
    unlockedByDefault: true,
    startUpgrades: { drill: 1 },
    startItems: { dynamite: 2 },
    mods: { digSpeed: 1.2 },
  },
  {
    id: 'daredevil', name: 'Daredevil', color: 0xff6b8a,
    blurb: 'Lean & thirsty for depth. More lift, frugal fuel, fragile hull.',
    unlockedByDefault: false, coreCost: 8,
    startUpgrades: { engine: 1, fuel: 1 },
    startItems: { reserveFuel: 2, nanobots: 1 },
    mods: { thrustMul: 1.12, fuelEff: 0.85, hullMul: 0.85 },
  },
  {
    id: 'surveyor', name: 'Surveyor', color: 0x5fe0d0,
    blurb: 'Sees in the dark. Starts with a scanner & heat shielding.',
    unlockedByDefault: false, coreCost: 12,
    startUpgrades: { scanner: 1, radiator: 1 },
    startItems: { teleporter: 1 },
    mods: { heatResist: 10 },
  },
  {
    id: 'tycoon', name: 'Tycoon', color: 0xffd24d,
    blurb: 'Old money. Extra starting cash and premium sell prices.',
    unlockedByDefault: false, coreCost: 20,
    startUpgrades: {},
    startItems: {},
    startCash: 2500,
    mods: { sellMul: 1.2 },
  },
];

export const LOADOUT_BY_ID: Record<string, LoadoutDef> = Object.fromEntries(
  LOADOUTS.map((l) => [l.id, l]),
);
