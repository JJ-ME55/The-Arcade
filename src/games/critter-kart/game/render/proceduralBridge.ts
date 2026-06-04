// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * A chunky low-poly wooden bridge built from boxes — plank deck + side rails (posts + top
 * rail) + support legs that drop into the water below. Baked into ONE vertex-coloured
 * geometry → a single draw call (same trick as the procedural tree), so it's cheap.
 *
 * Built along local +Z (direction of travel) × +X (width), with the DECK TOP at y = 0 so it
 * lines up with the road surface and karts drive straight across. Legs extend down to ~ -20.
 */
function withColor(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

// `openSide` (local-X sign, -1/+1) drops the railing on that edge so a kart can drive off there;
// the other edge keeps its rail (and gets a solid collision wall in GameCanvas). 0 = rails both sides.
export function makeBridgeGeometry(length: number, width: number, openSide = 0): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const LIGHT = 0xbb8a4e, LIGHT2 = 0xa9763c, MID = 0x99672f, DARK = 0x7a5326;
  const hl = length / 2, hw = width / 2;

  // Deck — alternating-shade planks running across the width, top flush at y = 0.
  const plankD = 1.8, gap = 0.25, thick = 1.0;
  let idx = 0;
  for (let z = -hl + plankD / 2; z < hl; z += plankD + gap, idx++) {
    const p = new THREE.BoxGeometry(width, thick, plankD);
    p.translate(0, -thick / 2, z);
    parts.push(withColor(p, idx % 2 ? LIGHT : LIGHT2));
  }
  // Stringer beams running the length under each deck edge (what the planks rest on).
  for (const sx of [-1, 1]) {
    const s = new THREE.BoxGeometry(1.4, 1.4, length);
    s.translate(sx * (hw - 1), -1.5, 0);
    parts.push(withColor(s, DARK));
  }

  // Side railings — top rail + mid rail + frequent posts. The `openSide` edge is left bare.
  for (const sx of [-1, 1]) {
    if (sx === openSide) continue;
    const railX = sx * (hw - 0.5);
    for (const ry of [3.6, 2.0]) {
      const rail = new THREE.BoxGeometry(0.55, 0.55, length);
      rail.translate(railX, ry, 0);
      parts.push(withColor(rail, MID));
    }
    for (let z = -hl + 2.5; z <= hl - 1; z += 4.5) {
      const post = new THREE.BoxGeometry(0.85, 4.4, 0.85);
      post.translate(railX, 1.9, z);
      parts.push(withColor(post, MID));
    }
  }

  // Cross-beams under the deck.
  for (let z = -hl + 4; z < hl; z += 7) {
    const beam = new THREE.BoxGeometry(width + 1.2, 1.2, 1.5);
    beam.translate(0, -2.4, z);
    parts.push(withColor(beam, DARK));
  }

  // Support legs (6: both edges × 3 along the length) with diagonal cross-braces between them.
  const legZ = [-hl + 3, 0, hl - 3];
  for (const sx of [-1, 1]) {
    for (const z of legZ) {
      const leg = new THREE.BoxGeometry(1.7, 22, 1.7);
      leg.translate(sx * (hw - 1.3), -11, z);
      parts.push(withColor(leg, DARK));
    }
    // X-braces between consecutive legs on this side
    for (let l = 0; l < legZ.length - 1; l++) {
      const z0 = legZ[l], z1 = legZ[l + 1];
      for (const dir of [1, -1]) {
        const brace = new THREE.BoxGeometry(1.0, 1.0, Math.hypot(z1 - z0, 12) + 1);
        brace.rotateX(dir * Math.atan2(z1 - z0, 12));
        brace.translate(sx * (hw - 1.3), -8, (z0 + z1) / 2);
        parts.push(withColor(brace, MID));
      }
    }
  }

  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  if (!merged) throw new Error('proceduralBridge: geometry merge failed');
  merged.computeVertexNormals();
  return merged;
}

export function makeBridgeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
}

/** Peak height (world units) of the arched bridge — shared so the deck mesh and the kart's
 *  Y-follow physics use the SAME arch. Eased from 13 → 9: a gentler hump reads far better and
 *  the kart no longer feels "swallowed" on the steep descent (playtest). */
export const ARCH_PEAK = 9;

/** Arch height (0 at the ends, ARCH_PEAK at mid) for a normalised position t∈[0,1] along the span. */
export function archHeightAt(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return ARCH_PEAK * 4 * c * (1 - c); // parabola
}

/** Humpback bridge: the deck follows archHeightAt, but unlike a naive stack of flat planks
 *  (which reads as STAIR-STEPS and lets the kart's parabola dip "into" the deck on the way
 *  down), every plank is TILTED to the local slope so the surface is one smooth ramp, and a
 *  solid fascia skirts both edges so you never see under/through it. Deck ends sit at y≈0;
 *  mid rises to ARCH_PEAK; legs reach the water. */
export function makeArchedBridgeGeometry(length: number, width: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const PLANK = 0xb5824a, PLANK2 = 0xa9763c, BEAM = 0x7d5527, RAIL = 0x8a5e2c, POST = 0x744e22;
  const L = length, hw = width / 2;
  const yAt = (z: number) => archHeightAt((z + L / 2) / L);
  const slopeAt = (z: number) => (yAt(z + 0.6) - yAt(z - 0.6)) / 1.2; // local gradient dz→dy

  // Deck: tilted, overlapping planks → one continuous smooth ramp (no steps), plus a solid
  // fascia board down each edge so the bridge has a clean curved silhouette and no see-through.
  const thick = 0.9, step = 1.7, plankD = step + 0.9; // overlap so tilted planks leave no gaps
  let idx = 0;
  for (let z = -L / 2 + step / 2; z < L / 2; z += step, idx++) {
    const y = yAt(z), ang = Math.atan(slopeAt(z));
    const p = new THREE.BoxGeometry(width, thick, plankD);
    p.rotateX(-ang);
    p.translate(0, y - thick / 2, z);
    parts.push(withColor(p, idx % 2 ? PLANK : PLANK2));
    for (const sx of [-1, 1]) {
      const fascia = new THREE.BoxGeometry(0.6, 2.6, plankD);
      fascia.rotateX(-ang);
      fascia.translate(sx * (hw - 0.3), y - 1.5, z);
      parts.push(withColor(fascia, BEAM));
    }
  }
  // Side rails following the hump: short tilted segments + periodic posts.
  for (const sx of [-1, 1]) {
    const railX = sx * (hw - 0.5);
    for (let z = -L / 2 + 1.5; z < L / 2; z += 2.4) {
      const y = yAt(z), ang = Math.atan(slopeAt(z));
      const seg = new THREE.BoxGeometry(0.55, 0.55, 2.6);
      seg.rotateX(-ang);
      seg.translate(railX, y + 3.0, z);
      parts.push(withColor(seg, RAIL));
    }
    for (let z = -L / 2 + 3; z < L / 2; z += 6) {
      const post = new THREE.BoxGeometry(0.7, 3.2, 0.7);
      post.translate(railX, yAt(z) + 1.5, z);
      parts.push(withColor(post, POST));
    }
  }
  // support legs into the water at the four corners (down from the deck ends, which are ~y0)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.BoxGeometry(1.6, 22, 1.6);
      leg.translate(sx * (hw - 1.4), -11, sz * (L / 2 - 2.5));
      parts.push(withColor(leg, BEAM));
    }
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  if (!merged) throw new Error('proceduralBridge(arched): merge failed');
  merged.computeVertexNormals();
  return merged;
}

/** One centre-line sample for the upper deck: a point + its unit perpendicular, the deck height
 *  there, and whether it's part of the booster strip. */
export interface DeckSample { x: number; z: number; nx: number; nz: number; y: number; boost: boolean; }

/** An optional raised deck running along one side of the track (see TrackDef.upperDeckZone).
 *  Built from tilted planks following the sampled centre-line + side offset, so it climbs, runs
 *  flat (booster strip glows orange), then descends — with an outer rail and support posts. */
export function makeUpperDeckGeometry(samples: DeckSample[], innerOff: number, outerOff: number, side: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const WOOD = 0xb5824a, WOOD2 = 0xa9763c, BOOST = 0xff8a2b, RAIL = 0x8a5e2c, POST = 0x6f4a24;
  const midOff = side * (innerOff + outerOff) / 2;
  const deckW = outerOff - innerOff;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    const ax = a.x + a.nx * midOff, az = a.z + a.nz * midOff;
    const bx = b.x + b.nx * midOff, bz = b.z + b.nz * midOff;
    const segLen = Math.hypot(bx - ax, bz - az) || 1;
    const yaw = Math.atan2(bx - ax, bz - az);
    const slope = Math.atan2(b.y - a.y, segLen);
    const my = (a.y + b.y) / 2;
    const plank = new THREE.BoxGeometry(deckW, 0.7, segLen + 0.4);
    plank.rotateX(-slope); plank.rotateY(yaw); plank.translate((ax + bx) / 2, my - 0.35, (az + bz) / 2);
    parts.push(withColor(plank, a.boost ? BOOST : (i % 2 ? WOOD : WOOD2)));
    // rail bar down ONLY the OUTER edge (the far/left side). The INNER edge (toward the road) is
    // left OPEN on purpose so you can drop back down off the deck if you misjudge the line.
    {
      const ox = a.x + a.nx * side * outerOff, oz = a.z + a.nz * side * outerOff;
      const obx = b.x + b.nx * side * outerOff, obz = b.z + b.nz * side * outerOff;
      const rail = new THREE.BoxGeometry(0.5, 1.6, (Math.hypot(obx - ox, obz - oz) || 1) + 0.3);
      rail.rotateX(-slope); rail.rotateY(Math.atan2(obx - ox, obz - oz)); rail.translate((ox + obx) / 2, my + 1.4, (oz + obz) / 2);
      parts.push(withColor(rail, RAIL));
    }
    // support posts down to the ground, every few samples where the deck is meaningfully raised
    if (i % 6 === 0 && a.y > 1.5) {
      for (const off of [innerOff, outerOff]) {
        const px = a.x + a.nx * side * off, pz = a.z + a.nz * side * off;
        const post = new THREE.BoxGeometry(0.8, a.y + 1, 0.8);
        post.translate(px, (a.y + 1) / 2 - 0.5, pz);
        parts.push(withColor(post, POST));
      }
    }
  }
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  if (!merged) throw new Error('proceduralBridge(upperDeck): merge failed');
  merged.computeVertexNormals();
  return merged;
}
