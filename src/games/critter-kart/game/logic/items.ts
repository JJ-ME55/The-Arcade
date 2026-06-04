// @ts-nocheck
import { KartState } from './kartPhysics';
import { Tuning } from '../config/tuning';

/**
 * Power-up items + hit reactions. Item distribution is position-weighted (leaders
 * get weak items, back-markers get strong/catch-up ones) like Mario Kart. Hit
 * reactions follow the spin-out/stun model from docs/research/collisions.md.
 * rollItem + applyHit are pure + framework-free so they're unit-tested.
 */
export const ITEM = { TURBO: 0, ACORN: 1, BEE: 2, MUD: 3, SHIELD: 4, STORM: 5 } as const;
export const NO_ITEM = -1;
export const ITEM_NAMES = ['Turbo Berry', 'Acorn Cannon', 'Homing Bee', 'Mud Puddle', 'Leaf Shield', 'Storm Cloud'];
/** Balloon colour per item so players learn which to grab (matches the HUD icons). */
export const ITEM_COLORS = [0xff4136, 0xff851b, 0xffdc00, 0x8a5a2b, 0x2ecc40, 0x0074d9];

/** Balloon categories: the player picks a coloured lane (semi-choosable), the exact item is
 *  still rolled. RED = attack, BLUE = speed, YELLOW = defence. */
export const CATEGORY = { ATTACK: 0, SPEED: 1, DEFENSE: 2 } as const;

/** Roll an item WITHIN a chosen category. Speed/Defence have one item each (deterministic);
 *  Attack rolls weighted by position (back-markers more likely to get the bee / catch-up storm).
 *  Pure + framework-free so it's unit-tested. `position` is 1-based; `r` is 0..1. */
export function rollCategoryItem(category: number, position: number, numKarts: number, r: number): number {
  if (category === CATEGORY.SPEED) return ITEM.TURBO;
  if (category === CATEGORY.DEFENSE) return ITEM.SHIELD;
  // ATTACK — weighted by position over [ACORN, BEE, MUD, STORM]
  const frac = numKarts > 1 ? (position - 1) / (numKarts - 1) : 0; // 0 = leader, 1 = last
  const items = [ITEM.ACORN, ITEM.BEE, ITEM.MUD, ITEM.STORM];
  const w = [
    0.42 - 0.14 * frac,                         // ACORN — common, a bit less when far back
    0.18 + 0.20 * frac,                         // BEE    — more likely behind (hunts the kart ahead)
    0.34 - 0.16 * frac,                         // MUD    — front-favoured (drop it behind you)
    frac > 0.4 ? 0.34 * (frac - 0.4) / 0.6 : 0, // STORM  — back-half catch-up nuke only
  ];
  const total = w.reduce((a, b) => a + b, 0);
  const pick = r * total;
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += w[i];
    if (pick < acc) return items[i];
  }
  return ITEM.ACORN;
}

/** Weighted item roll (legacy full-table roll; kept for reference/tests). `position` is 1-based. */
export function rollItem(position: number, numKarts: number, r: number): number {
  const frac = numKarts > 1 ? (position - 1) / (numKarts - 1) : 0; // 0 = leader, 1 = last
  const w = [
    0.08 + 0.42 * frac, // TURBO  — rare in front, common behind
    0.28 - 0.10 * frac, // ACORN  — common all round
    0.06 + 0.24 * frac, // BEE    — more likely behind
    0.30 - 0.22 * frac, // MUD    — front-favoured (defensive)
    0.18 - 0.04 * frac, // SHIELD — fairly even
    frac > 0.5 ? 0.22 * (frac - 0.5) * 2 : 0, // STORM — back half only, the catch-up nuke
  ];
  const total = w.reduce((a, b) => a + b, 0);
  const pick = r * total;
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += w[i];
    if (pick < acc) return i;
  }
  return ITEM.ACORN;
}

/** Apply a spin-out hit to a kart: shield blocks it, i-frames ignore it, else spin out. */
export function applyHit(s: KartState, t: Tuning): KartState {
  if ((s.invulnTimer ?? 0) > 0) return s; // i-frames: no chain hits
  if (s.shield) return { ...s, shield: false, invulnTimer: t.hitInvuln }; // shield absorbs one hit
  return {
    ...s,
    stunTimer: t.spinTime,
    stunHeading: s.velHeading, // remember the way it was going — it'll recover facing this way
    invulnTimer: t.spinTime + t.hitInvuln,
    speed: s.speed * t.hitSpeedKeep,
  };
}
