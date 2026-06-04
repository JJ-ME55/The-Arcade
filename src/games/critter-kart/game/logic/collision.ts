// @ts-nocheck
import { KartState } from './kartPhysics';
import type { Tuning } from '../config/tuning';

/**
 * Kart-to-kart contact: a weight-scaled SHOVE, not a spin-out (spin-outs are for
 * item hits). Circle-circle: if two karts overlap, push them apart along the
 * contact normal (shared by inverse mass = weight) and exchange a little momentum.
 * Heavier karts barely budge; lighter karts get flung. See docs/research/collisions.md.
 * Pure + framework-free; only touches {x, z, velHeading, speed} (heading is left
 * alone so you keep aiming where you steer).
 */
// Tightened so two karts only collide when their bodies actually touch (wheels brushing,
// not a wide invisible pillow). Kart length is 5.6 and they're roughly 0.65 as wide as
// long → ~3.6 wide → half-width ≈ 1.8. Set 2.0 for a hair of slack so contacts feel
// solid but not magnetic — karts can lean into each other and trade bumps without the
// physics shoving them apart from a kart-length away (the old radius of 4 = 8-unit
// diameter, larger than a kart itself).
export const KART_RADIUS = 2;
const RESTITUTION = 0.25; // a definite shove — enough to bash a rival off-line

export interface KartHit {
  x: number;
  z: number;
  velHeading: number;
  speed: number;
}

function toXZ(s: { velHeading: number; speed: number }) {
  return { vx: Math.sin(s.velHeading) * s.speed, vz: Math.cos(s.velHeading) * s.speed };
}

function toVel(vx: number, vz: number, fallbackHeading: number) {
  const speed = Math.hypot(vx, vz);
  return { speed, velHeading: speed > 1e-4 ? Math.atan2(vx, vz) : fallbackHeading };
}

/** Returns separated/bumped {a,b} states, or null if the karts aren't touching. */
export function resolveKartCollision(
  a: KartState,
  b: KartState,
  weightA: number,
  weightB: number,
): { a: KartHit; b: KartHit } | null {
  const minDist = KART_RADIUS * 2;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let dist = Math.hypot(dx, dz);
  if (dist >= minDist) return null;

  let nx: number;
  let nz: number;
  if (dist < 1e-6) {
    nx = 1; // exactly overlapping: pick an arbitrary normal
    nz = 0;
    dist = 0;
  } else {
    nx = dx / dist;
    nz = dz / dist;
  }

  const invA = 1 / weightA;
  const invB = 1 / weightB;
  const invSum = invA + invB;

  // positional separation along the normal, shared by inverse mass
  const overlap = minDist - dist;
  const ax = a.x - nx * overlap * (invA / invSum);
  const az = a.z - nz * overlap * (invA / invSum);
  const bx = b.x + nx * overlap * (invB / invSum);
  const bz = b.z + nz * overlap * (invB / invSum);

  // velocity impulse (only if approaching)
  const va = toXZ(a);
  const vb = toXZ(b);
  let aVx = va.vx;
  let aVz = va.vz;
  let bVx = vb.vx;
  let bVz = vb.vz;
  const relN = (vb.vx - va.vx) * nx + (vb.vz - va.vz) * nz;
  if (relN < 0) {
    const j = (-(1 + RESTITUTION) * relN) / invSum;
    aVx -= j * invA * nx;
    aVz -= j * invA * nz;
    bVx += j * invB * nx;
    bVz += j * invB * nz;
  }

  const na = toVel(aVx, aVz, a.velHeading);
  const nb = toVel(bVx, bVz, b.velHeading);
  return {
    a: { x: ax, z: az, speed: na.speed, velHeading: na.velHeading },
    b: { x: bx, z: bz, speed: nb.speed, velHeading: nb.velHeading },
  };
}

/** A solid, immovable scenery prop the kart can bump into — a simple footprint circle. */
export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/**
 * Resolve the kart (circle of radius `kartRadius`) against solid scenery props (each a
 * circle). Pushes the kart out of the deepest overlap and bounces using the same
 * glance/restitution feel as the barriers, so hitting a rock/tree/hay bale stops you
 * head-on but lets you scrape past. Pure; returns null if not touching anything.
 */
export function resolveObstacles(
  s: KartState,
  obstacles: Obstacle[],
  kartRadius: number,
  t: Tuning,
): Partial<KartState> | null {
  let nx = 0, nz = 0, depth = 0;
  let found = false;
  for (const o of obstacles) {
    const reach = kartRadius + o.r;
    const dx = s.x - o.x;
    const dz = s.z - o.z;
    const d2 = dx * dx + dz * dz;
    if (d2 >= reach * reach) continue;
    const dist = Math.sqrt(d2) || 1e-6;
    const pen = reach - dist;
    if (pen > depth) {
      depth = pen;
      nx = dx / dist;
      nz = dz / dist;
      found = true;
    }
  }
  if (!found) return null;

  const x = s.x + nx * depth;
  const z = s.z + nz * depth;
  let vx = Math.sin(s.velHeading) * s.speed;
  let vz = Math.cos(s.velHeading) * s.speed;
  const vn = vx * nx + vz * nz; // <0 means driving into the prop
  if (vn < 0) {
    const tanx = vx - vn * nx;
    const tanz = vz - vn * nz;
    vx = tanx * t.barrierGlanceKeep - nx * vn * t.barrierRestitution;
    vz = tanz * t.barrierGlanceKeep - nz * vn * t.barrierRestitution;
  }
  const speed = Math.hypot(vx, vz);
  const velHeading = speed > 1e-4 ? Math.atan2(vx, vz) : s.velHeading;
  return { x, z, velHeading, speed };
}
