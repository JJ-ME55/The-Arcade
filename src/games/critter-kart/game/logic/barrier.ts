// @ts-nocheck
import { Tuning } from '../config/tuning';
import { KartState } from './kartPhysics';
import { TrackPath } from './trackPath';
import { KART_RADIUS } from './collision';

/**
 * Barriers as REAL objects, not a distance-from-centreline rule. Each barrier is a
 * short wall segment sitting just off the road edge. Collision is the kart's circle
 * vs each segment — so what you see is exactly what you hit, and it works regardless
 * of how close the track passes to itself (the old centreline model "merged" the two
 * arms at a pinch and the wall vanished — this can't).
 */

// Barrier model (Kenney, measured from the GLB): native (x,y,z)=(0.25,0.131,0.123).
// Rendered at SCALE with local +X along the track tangent, so:
export const BARRIER_SCALE = 22;
export const BARRIER_LEN = 0.25 * BARRIER_SCALE; // 5.5 — length along the tangent
export const BARRIER_HALF_DEPTH = (0.123 * BARRIER_SCALE) / 2; // ~1.35 — half-thickness across the track
// Distance from road centre to the barrier centre. The track's arms stay ~68 units
// apart (measured genuine self-approach), so this can be a generous F1-style run-off:
// road edge is at 18, the barrier face sits ~13 units out in the grass, and the kart
// can run several units onto the grass before its body meets the wall. Verified: at
// this offset no barrier intrudes on any road.
export const BARRIER_OFFSET = 32;
export const BARRIER_SPACING = BARRIER_LEN; // place one every length so segments tile into a continuous wall

export interface Barrier {
  x: number;
  z: number;
  tx: number; // unit tangent (the wall runs along this)
  tz: number;
}

/**
 * Place barriers down both road edges. A barrier is skipped unless it's far enough
 * from the NEAREST road that a kart driving on the road can't reach it — otherwise an
 * inside-of-a-curve barrier (whose 32-unit offset wraps back toward the road) clips
 * the kart mid-road and feels like dragging on nothing. The keep-distance is
 * hw + kartRadius + halfDepth: a kart at the road edge just touches such a barrier, so
 * nothing closer than the run-off can be hit.
 */
export function buildBarriers(track: TrackPath, offset = BARRIER_OFFSET, spacing = BARRIER_SPACING): Barrier[] {
  const out: Barrier[] = [];
  const total = track.totalLength;
  const hw = track.halfWidth;
  const minClear = hw + KART_RADIUS + BARRIER_HALF_DEPTH; // closest a kept barrier may sit to any centre-line
  const jz = track.jumpZone;
  for (let d = 0; d < total; d += spacing) {
    const progress = d / total;
    // Skip the lake — no road, no barriers, no run-off there. Just grass into the water.
    if (jz && progress >= jz.startProgress && progress <= jz.endProgress) continue;
    const a = track.pointAtProgress(progress);
    const b = track.pointAtProgress((d + 1) / total);
    let tx = b.x - a.x;
    let tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    tx /= l;
    tz /= l;
    const px = tz; // perpendicular in the xz plane
    const pz = -tx;
    for (const side of [1, -1]) {
      const x = a.x + px * side * offset;
      const z = a.z + pz * side * offset;
      // skip if a road-driving kart could reach this barrier (it wrapped toward the road)
      if (track.nearest(x, z).distance < minClear) continue;
      out.push({ x, z, tx, tz });
    }
  }
  return out;
}

/**
 * Resolve the kart (a circle of radius `kartRadius`) against the barrier segments.
 * Pushes out of the deepest overlap and bounces: a head-on hit is mostly killed
 * (you stop), a glancing hit keeps most of its speed (you scrape along). Pure.
 */
export function resolveBarriers(s: KartState, barriers: Barrier[], kartRadius: number, t: Tuning): Partial<KartState> | null {
  const reach = kartRadius + BARRIER_HALF_DEPTH;
  const half = BARRIER_LEN / 2;
  const far = (reach + half + 2) ** 2;
  let nx = 0, nz = 0, depth = 0;
  let found = false;
  for (const bar of barriers) {
    const dx = s.x - bar.x;
    const dz = s.z - bar.z;
    if (dx * dx + dz * dz > far) continue;
    // closest point on the segment to the kart centre
    const along = Math.max(-half, Math.min(half, dx * bar.tx + dz * bar.tz));
    const cx = bar.x + bar.tx * along;
    const cz = bar.z + bar.tz * along;
    let ox = s.x - cx;
    let oz = s.z - cz;
    const dist = Math.hypot(ox, oz) || 1e-6;
    if (dist < reach) {
      const pen = reach - dist;
      if (pen > depth) {
        depth = pen;
        nx = ox / dist;
        nz = oz / dist;
        found = true;
      }
    }
  }
  if (!found) return null;

  // push out of the wall along the contact normal (points from wall to kart)
  const x = s.x + nx * depth;
  const z = s.z + nz * depth;
  let vx = Math.sin(s.velHeading) * s.speed;
  let vz = Math.cos(s.velHeading) * s.speed;
  const vn = vx * nx + vz * nz; // <0 means moving into the wall
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
