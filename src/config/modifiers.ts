/**
 * Run modifiers / mutators — composable run-feel changes the daily & (future) weekly
 * challenges stack like Lego. Applied via stats + physics multipliers.
 */
export interface ModifierDef {
  id: string;
  name: string;
  blurb: string;
  color: number;
  gravityMul?: number;
  thrustMul?: number;
  hullMul?: number;
  fuelMul?: number;
  drillMul?: number;
  sellMul?: number;
}

export interface ModEffect {
  gravityMul: number;
  thrustMul: number;
  hullMul: number;
  fuelMul: number;
  drillMul: number;
  sellMul: number;
}

export const MODIFIERS: ModifierDef[] = [
  { id: 'lowGrav', name: 'Low Gravity', blurb: 'Floaty descent — gravity is gentle.', color: 0x9df2c0, gravityMul: 0.62 },
  { id: 'heavyWorld', name: 'Heavy World', blurb: 'Crushing pull. Bring lift.', color: 0xff6b8a, gravityMul: 1.45, thrustMul: 1.08 },
  { id: 'fragile', name: 'Fragile Hull', blurb: 'Half hull — every hit counts.', color: 0xff7a2a, hullMul: 0.5 },
  { id: 'fuelRich', name: 'Fuel Rich', blurb: 'Overflowing tanks. Go far.', color: 0x6bd66b, fuelMul: 1.6 },
  { id: 'glassCannon', name: 'Glass Cannon', blurb: 'Drill like fury, but you’re made of glass.', color: 0xffd24d, drillMul: 1.6, hullMul: 0.5 },
  { id: 'boomMarket', name: 'Boom Market', blurb: 'Ore sells high — but fuel is tight.', color: 0xffcf4d, sellMul: 1.5, fuelMul: 0.82 },
  { id: 'ironPod', name: 'Iron Pod', blurb: 'Tanky but sluggish.', color: 0x7db7ff, hullMul: 1.5, thrustMul: 0.9 },
];

export const MODIFIER_BY_ID: Record<string, ModifierDef> = Object.fromEntries(MODIFIERS.map((m) => [m.id, m]));

export function aggregateMods(ids: string[]): ModEffect {
  const e: ModEffect = { gravityMul: 1, thrustMul: 1, hullMul: 1, fuelMul: 1, drillMul: 1, sellMul: 1 };
  for (const id of ids) {
    const m = MODIFIER_BY_ID[id];
    if (!m) continue;
    e.gravityMul *= m.gravityMul ?? 1;
    e.thrustMul *= m.thrustMul ?? 1;
    e.hullMul *= m.hullMul ?? 1;
    e.fuelMul *= m.fuelMul ?? 1;
    e.drillMul *= m.drillMul ?? 1;
    e.sellMul *= m.sellMul ?? 1;
  }
  return e;
}

/** Deterministic daily mutator from a YYYY-MM-DD-ish string. */
export function dailyModifier(seedStr: string): string {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return MODIFIERS[h % MODIFIERS.length].id;
}
