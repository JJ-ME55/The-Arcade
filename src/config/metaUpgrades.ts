/**
 * Permanent meta-upgrades bought with Cores (the persistent currency). Small, capped
 * stat bumps so dying still feels like progress (Hades Mirror / Rogue Legacy model).
 */
export interface MetaUpgradeDef {
  id: string;
  name: string;
  blurb: string;
  color: number;
  maxLevel: number;
  /** core cost per level (index = level being purchased). */
  costs: number[];
  /** fractional bonus per level applied to the matching stat (e.g. 0.06 = +6%). */
  perLevel: number;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'fuelCell', name: 'Fuel Cells', blurb: '+6% fuel capacity per level.', color: 0x6bd66b, maxLevel: 5, costs: [3, 5, 8, 12, 18], perLevel: 0.06 },
  { id: 'reinforce', name: 'Reinforcement', blurb: '+6% hull per level.', color: 0xff6b8a, maxLevel: 5, costs: [3, 5, 8, 12, 18], perLevel: 0.06 },
  { id: 'sharpDrill', name: 'Honed Drill', blurb: '+5% drill power per level.', color: 0xffb347, maxLevel: 5, costs: [4, 6, 9, 14, 20], perLevel: 0.05 },
  { id: 'bigBay', name: 'Expanded Bay', blurb: '+6% cargo per level.', color: 0x7db7ff, maxLevel: 5, costs: [3, 5, 8, 12, 18], perLevel: 0.06 },
  { id: 'startCash', name: 'Nest Egg', blurb: '+$250 starting cash per level.', color: 0xffcf4d, maxLevel: 5, costs: [2, 4, 6, 9, 13], perLevel: 250 },
];

export const META_UPGRADE_BY_ID: Record<string, MetaUpgradeDef> = Object.fromEntries(
  META_UPGRADES.map((m) => [m.id, m]),
);

export function metaNextCost(id: string, currentLevel: number): number | null {
  const def = META_UPGRADE_BY_ID[id];
  if (!def || currentLevel >= def.maxLevel) return null;
  return def.costs[currentLevel];
}
