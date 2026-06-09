/** Derives effective gameplay stats from upgrades + loadout + meta perks. */
import type { RunState } from '../core/types';
import { upgradeValue } from '../config/upgrades';
import { LOADOUT_BY_ID } from '../config/loadouts';
import { DIG } from '../config/gameplay';
import { getActiveSeason } from '../config/seasons';
import { App } from '../core/state';
import { META_UPGRADE_BY_ID } from '../config/metaUpgrades';
import { aggregateMods } from '../config/modifiers';

export interface DerivedStats {
  drillPower: number;
  fuelMax: number;
  cargoMax: number;
  hullMax: number;
  enginePower: number;
  heatResist: number; // 0..95 (% damage reduction for heat/lava/gas)
  scannerRange: number; // tiles
  sellMul: number;
  fuelEff: number; // multiplier on fuel drain (<1 = thriftier)
}

export function deriveStats(run: RunState): DerivedStats {
  const l = LOADOUT_BY_ID[run.loadout] ?? LOADOUT_BY_ID['prospector'];
  const m = l?.mods ?? {};
  const u = run.upgrades;

  // permanent Core-bought meta perks
  const mu = App.meta.metaUpgrades;
  const metaMul = (id: string) => 1 + (mu[id] ?? 0) * (META_UPGRADE_BY_ID[id]?.perLevel ?? 0);

  // run modifiers (daily/weekly mutators)
  const mod = aggregateMods(run.modifiers);

  const drillBase = upgradeValue('drill', u.drill ?? 0);
  const drillPower = drillBase * (m.digSpeed ?? 1) * metaMul('sharpDrill') * mod.drillMul;

  const fuelMax = Math.round(upgradeValue('fuel', u.fuel ?? 0) * metaMul('fuelCell') * mod.fuelMul);
  const cargoMax = Math.round(upgradeValue('cargo', u.cargo ?? 0) * (m.cargoMul ?? 1) * metaMul('bigBay'));
  const hullMax = Math.round(upgradeValue('hull', u.hull ?? 0) * (m.hullMul ?? 1) * metaMul('reinforce') * mod.hullMul);
  const enginePower = upgradeValue('engine', u.engine ?? 0) * (m.thrustMul ?? 1) * mod.thrustMul;
  // Active-season perk (shared by all players that day — flavour, not pay-to-win).
  const sp = getActiveSeason()?.perk ?? {};
  const heatResist = Math.min(95, upgradeValue('radiator', u.radiator ?? 0) + (m.heatResist ?? 0) + (sp.heatResist ?? 0));
  const scannerRange = upgradeValue('scanner', u.scanner ?? 0);

  return {
    drillPower: Math.max(DIG.baseDrillPower * 0.5, drillPower),
    fuelMax,
    cargoMax,
    hullMax,
    enginePower,
    heatResist,
    scannerRange,
    sellMul: (m.sellMul ?? 1) * (sp.sellMul ?? 1) * mod.sellMul,
    fuelEff: (m.fuelEff ?? 1) * (sp.fuelEff ?? 1),
  };
}
