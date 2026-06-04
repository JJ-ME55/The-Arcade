// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec2 } from '../logic/trackPath';

/**
 * Procedural steam train + its track — low-poly, vertex-coloured, merged into single
 * geometries (same recipe as the trees/bridge). A charming storybook locomotive (boiler with
 * brass bands, flared funnel, steam dome, headlamp, cowcatcher, spoked driving wheels with
 * side-rods, glazed cab), a coal tender, and passenger carriages — in the meadow's warm
 * palette. Built length-along +Z, wheels resting at y≈0 (lifted onto the rails when placed).
 */
function colored(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const m = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  if (!m) throw new Error('proceduralTrain: merge failed');
  m.computeVertexNormals();
  return m;
}
export function trainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2, flatShading: true });
}

// Palette
const RED = 0xc23a2b, RED_DK = 0x8f2a20, BRASS = 0xe6b54a, COAL = 0x1d1d22, IRON = 0x2b2b31,
  WHEEL = 0xb23528, FRAME = 0x36363d, LAMP = 0xffe27a, SMOKE = 0xdfe3e6,
  WIN = 0x2a3a4a, RAIL = 0x5a5e63, SLEEPER = 0x6b4a2a;

const cyl = (rt: number, rb: number, h: number, seg: number, hex: number) => colored(new THREE.CylinderGeometry(rt, rb, h, seg), hex);
const box = (w: number, h: number, d: number, hex: number) => colored(new THREE.BoxGeometry(w, h, d), hex);

/** Append a spoked wheel (axle along X) at (x,y,z) to `parts`. */
function addWheel(parts: THREE.BufferGeometry[], x: number, y: number, z: number, r: number) {
  const tyre = cyl(r, r, 0.55, 14, COAL); tyre.rotateZ(Math.PI / 2); tyre.translate(x, y, z); parts.push(tyre);
  const rim = cyl(r * 0.9, r * 0.9, 0.6, 14, WHEEL); rim.rotateZ(Math.PI / 2); rim.translate(x, y, z); parts.push(rim);
  const hub = cyl(r * 0.3, r * 0.3, 0.7, 8, BRASS); hub.rotateZ(Math.PI / 2); hub.translate(x, y, z); parts.push(hub);
  for (let k = 0; k < 6; k++) {
    const spoke = box(0.22, r * 1.5, 0.22, WHEEL);
    spoke.rotateX(k * Math.PI / 3);
    spoke.translate(x, y, z);
    parts.push(spoke);
  }
}

/** The locomotive. */
export function makeEngineGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // running board / frame
  parts.push(box(4.6, 0.5, 12, FRAME).translate(0, 1.5, 0) as THREE.BufferGeometry);
  // boiler (along Z) + smokebox at the front
  const boiler = cyl(2.0, 2.0, 8, 16, RED); boiler.rotateX(Math.PI / 2); boiler.translate(0, 3.3, 1.2); parts.push(boiler);
  for (const z of [-1.2, 1.2, 3.4]) { const band = cyl(2.06, 2.06, 0.35, 16, BRASS); band.rotateX(Math.PI / 2); band.translate(0, 3.3, z); parts.push(band); }
  const smokebox = cyl(2.1, 2.1, 1.2, 16, IRON); smokebox.rotateX(Math.PI / 2); smokebox.translate(0, 3.3, 5.4); parts.push(smokebox);
  const door = cyl(1.5, 1.5, 0.3, 14, IRON); door.rotateX(Math.PI / 2); door.translate(0, 3.3, 6.05); parts.push(door);
  const doorRing = cyl(1.5, 1.5, 0.2, 14, BRASS); doorRing.rotateX(Math.PI / 2); doorRing.translate(0, 3.3, 6.12); parts.push(doorRing);
  // headlamp
  const lampBox = box(1.0, 1.0, 0.6, BRASS); lampBox.translate(0, 5.0, 5.7); parts.push(lampBox);
  parts.push(box(0.7, 0.7, 0.25, LAMP).translate(0, 5.0, 6.0) as THREE.BufferGeometry);
  // flared funnel (chimney) + cap
  const funnel = cyl(1.25, 0.75, 2.4, 14, IRON); funnel.translate(0, 5.6, 4.2); parts.push(funnel);
  const funnelCap = cyl(1.45, 1.45, 0.4, 14, IRON); funnelCap.translate(0, 6.8, 4.2); parts.push(funnelCap);
  // steam dome + sand dome (brass)
  const dome = cyl(1.1, 1.1, 1.0, 12, BRASS); dome.translate(0, 5.4, 1.4); parts.push(dome);
  const domeTop = colored(new THREE.SphereGeometry(1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), BRASS); domeTop.translate(0, 5.9, 1.4); parts.push(domeTop);
  const sand = cyl(0.85, 0.85, 0.8, 12, BRASS); sand.translate(0, 5.3, 3.2); parts.push(sand);
  // cab with overhanging roof + side windows
  parts.push(box(4.6, 3.6, 3.4, RED).translate(0, 3.8, -3.8) as THREE.BufferGeometry);
  parts.push(box(5.2, 0.5, 3.9, RED_DK).translate(0, 5.85, -3.8) as THREE.BufferGeometry);
  for (const sx of [-1, 1]) parts.push(box(0.3, 1.6, 1.6, WIN).translate(sx * 2.35, 4.5, -3.6) as THREE.BufferGeometry);
  // cowcatcher (pilot) — angled slats at the very front
  for (let s = -2; s <= 2; s++) {
    const slat = box(0.3, 0.25, 2.6, FRAME); slat.rotateX(-0.5); slat.translate(s * 0.85, 1.0, 6.6); parts.push(slat);
  }
  // buffers
  for (const sx of [-1, 1]) { const b = cyl(0.4, 0.4, 0.8, 8, BRASS); b.rotateX(Math.PI / 2); b.translate(sx * 1.5, 1.9, 6.5); parts.push(b); }
  // driving wheels (3/side) + connecting side-rod
  for (const sx of [-1, 1]) {
    for (const z of [-3, 0.2, 3.4]) addWheel(parts, sx * 2.35, 1.5, z, 1.4);
    parts.push(box(0.3, 0.5, 7.0, IRON).translate(sx * 2.7, 1.5, 0.2) as THREE.BufferGeometry); // side rod
  }
  // a little stack of steam puffs above the funnel
  for (const [sy, sr] of [[7.6, 1.0], [8.9, 1.4], [10.4, 1.8]] as const) {
    parts.push(colored(new THREE.IcosahedronGeometry(sr, 0), SMOKE).translate(0.3, sy, 4.0) as THREE.BufferGeometry);
  }
  return merge(parts);
}

/** Coal tender that trails the engine. */
export function makeTenderGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(box(4.4, 0.5, 7, FRAME).translate(0, 1.5, 0) as THREE.BufferGeometry);
  parts.push(box(4.2, 2.6, 6.4, RED).translate(0, 3.0, 0) as THREE.BufferGeometry);          // bunker walls
  parts.push(box(3.4, 1.0, 5.4, COAL).translate(0, 4.3, 0) as THREE.BufferGeometry);          // coal load
  for (const z of [-1.8, 1.8]) { const band = box(4.3, 0.3, 0.4, BRASS); band.translate(0, 3.6, z); parts.push(band); }
  for (const sx of [-1, 1]) for (const z of [-2, 2]) addWheel(parts, sx * 2.1, 1.5, z, 1.0);
  return merge(parts);
}

/** A passenger carriage. */
export function makeWagonGeometry(hex: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(box(4.2, 0.5, 8, FRAME).translate(0, 1.5, 0) as THREE.BufferGeometry);
  parts.push(box(4.0, 3.2, 7.6, hex).translate(0, 3.4, 0) as THREE.BufferGeometry);           // body
  parts.push(box(4.3, 0.6, 8.0, RED).translate(0, 5.2, 0) as THREE.BufferGeometry);            // roof
  parts.push(box(4.0, 0.4, 7.6, BRASS).translate(0, 1.9, 0) as THREE.BufferGeometry);          // waistline trim
  for (const sx of [-1, 1]) for (const z of [-2.4, 0, 2.4]) parts.push(box(0.25, 1.5, 1.6, WIN).translate(sx * 2.0, 3.8, z) as THREE.BufferGeometry); // windows
  for (const sx of [-1, 1]) for (const z of [-2.6, 2.6]) addWheel(parts, sx * 2.0, 1.5, z, 1.0);
  return merge(parts);
}

const GAUGE = 5;
/** Rails + sleepers along a closed loop of centre-line points, flush near the ground. */
export function makeTrainTrackGeometry(points: Vec2[]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = points.length;
  let sleeperAcc = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[(i + 1) % n];
    let tx = b.x - a.x, tz = b.z - a.z;
    const segLen = Math.hypot(tx, tz) || 1;
    tx /= segLen; tz /= segLen;
    const px = tz, pz = -tx;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const yaw = Math.atan2(tx, tz);
    for (const s of [1, -1]) {
      const rail = box(0.5, 0.5, segLen + 0.5, RAIL); rail.rotateY(yaw); rail.translate(mx + px * s * GAUGE / 2, 0.45, mz + pz * s * GAUGE / 2); parts.push(rail);
    }
    sleeperAcc += segLen;
    while (sleeperAcc >= 3.5) {
      sleeperAcc -= 3.5;
      const t = 1 - sleeperAcc / segLen;
      const sl = box(GAUGE + 2.4, 0.4, 1.3, SLEEPER); sl.rotateY(yaw + Math.PI / 2); sl.translate(a.x + (b.x - a.x) * t, 0.2, a.z + (b.z - a.z) * t); parts.push(sl);
    }
  }
  return merge(parts);
}
