/**
 * In-run upgrade tree (bought with Cash; resets each run). Data-driven: id, tiers,
 * cost, effect value. The stats system reads the `value` of the owned tier.
 *
 * Classic cost ladder (scaled to our economy): 0 / 600 / 2k / 6k / 22k / 90k / 400k.
 * Diminishing-returns curves so no single upgrade trivialises the game.
 */

export type UpgradeCategory =
  | 'drill'
  | 'fuel'
  | 'cargo'
  | 'hull'
  | 'engine'
  | 'radiator'
  | 'scanner';

export interface UpgradeTier {
  name: string;
  cost: number;
  value: number;
}

export interface UpgradeDef {
  id: UpgradeCategory;
  name: string;
  blurb: string;
  color: number;
  unit: string;
  tiers: UpgradeTier[];
}

const LADDER = [0, 600, 2000, 6000, 22000, 90000, 400000];

function tiers(names: string[], values: number[]): UpgradeTier[] {
  return names.map((name, i) => ({ name, cost: LADDER[i] ?? 0, value: values[i] }));
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'drill', name: 'Drill', blurb: 'Dig harder tiles faster.', color: 0xffb347, unit: 'pwr',
    tiers: tiers(
      ['Stock', 'Tungsten', 'Diamond-Tip', 'Plasma', 'Resonance', 'Quantum', 'Singularity'],
      [2.6, 3.4, 4.6, 6.2, 8.4, 11, 14],
    ),
  },
  {
    id: 'fuel', name: 'Fuel Tank', blurb: 'Stay down longer before refuelling.', color: 0x6bd66b, unit: 'L',
    tiers: tiers(
      ['Micro', 'Medium', 'Huge', 'Gigantic', 'Titanic', 'Leviathan', 'Compression'],
      [110, 160, 230, 330, 460, 650, 900],
    ),
  },
  {
    id: 'cargo', name: 'Cargo Bay', blurb: 'Carry more ore per trip.', color: 0x7db7ff, unit: 'cu',
    tiers: tiers(
      ['Micro', 'Medium', 'Huge', 'Gigantic', 'Titanic', 'Leviathan', 'Wormhole'],
      [12, 18, 28, 42, 64, 100, 150],
    ),
  },
  {
    id: 'hull', name: 'Hull', blurb: 'Survive more damage.', color: 0xff6b8a, unit: 'HP',
    tiers: tiers(
      ['Stock', 'Ironclad', 'Reinforced', 'Steel', 'Composite', 'Energy', 'Aegis'],
      [22, 32, 48, 70, 100, 145, 200],
    ),
  },
  {
    id: 'engine', name: 'Engine', blurb: 'More lift — fly while heavy.', color: 0xc792ff, unit: 'hp',
    tiers: tiers(
      ['Stock', 'Turbo', 'Twin-Turbo', 'V6', 'V8 SC', 'V12', 'Ion'],
      [100, 122, 148, 178, 214, 258, 312],
    ),
  },
  {
    id: 'radiator', name: 'Radiator', blurb: 'Resist heat, lava & gas.', color: 0xff9d4d, unit: '%',
    tiers: tiers(
      ['Stock', 'Dual Fan', 'Turbine', 'Twin Turbine', 'Cryo', 'Freon', 'Absolute'],
      [0, 12, 25, 40, 58, 75, 90],
    ),
  },
  {
    id: 'scanner', name: 'Scanner', blurb: 'Reveal nearby ore & hazards.', color: 0x5fe0d0, unit: 'm',
    tiers: [
      { name: 'None', cost: 0, value: 0 },
      { name: 'Pulse I', cost: 1500, value: 2 },
      { name: 'Pulse II', cost: 7000, value: 3 },
      { name: 'Pulse III', cost: 30000, value: 5 },
      { name: 'Deep Scan', cost: 120000, value: 7 },
    ],
  },
];

export const UPGRADE_BY_ID: Record<UpgradeCategory, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
) as Record<UpgradeCategory, UpgradeDef>;

/** Value of an upgrade at a given owned tier (clamped). */
export function upgradeValue(id: UpgradeCategory, tier: number): number {
  const def = UPGRADE_BY_ID[id];
  const t = Math.max(0, Math.min(def.tiers.length - 1, tier));
  return def.tiers[t].value;
}

/** Cost to go from current tier to the next, or null if maxed. */
export function nextTierCost(id: UpgradeCategory, currentTier: number): number | null {
  const def = UPGRADE_BY_ID[id];
  if (currentTier >= def.tiers.length - 1) return null;
  return def.tiers[currentTier + 1].cost;
}
