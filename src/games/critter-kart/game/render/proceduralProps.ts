// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Hand-built low-poly props (rock cluster, grassy hill, windmill, waterfall) to replace the
 * heavy Meshy GLBs. Same recipe as proceduralTree/Bridge: primitives → vertex colours → ONE
 * merged geometry per prop, flat-shaded, so each is a single cheap instanced/clone draw call
 * and matches the chunky cartoon look of the procedural trees. All built base-on-ground (y=0).
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
  if (!m) throw new Error('proceduralProps: merge failed');
  m.computeVertexNormals();
  return m;
}
export function propMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
}

const GRASS = 0x5fae46, GRASS_DK = 0x4f9e3a, ROCK = 0x9aa0a6, ROCK_DK = 0x80868c, DIRT = 0x9c7148;

/** A faceted grey boulder cluster on a small grassy patch. Natural footprint ~16, height ~8. */
export function makeRockGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const base = new THREE.CylinderGeometry(7.5, 8, 1.0, 12);
  base.translate(0, 0.5, 0);
  parts.push(colored(base, GRASS));
  const rocks: { r: number; x: number; y: number; z: number; c: number }[] = [
    { r: 4.2, x: 0, y: 3.4, z: 0, c: ROCK },
    { r: 3.0, x: -3.8, y: 2.6, z: 1.4, c: ROCK_DK },
    { r: 3.3, x: 3.6, y: 2.8, z: -1.3, c: ROCK },
    { r: 2.4, x: 0.6, y: 5.4, z: -0.4, c: ROCK_DK },
  ];
  for (const b of rocks) {
    const g = new THREE.IcosahedronGeometry(b.r, 0); // detail 0 = chunky faceted boulder
    g.scale(1, 0.85, 1);
    g.translate(b.x, b.y, b.z);
    parts.push(colored(g, b.c));
  }
  return merge(parts);
}

/** A soft green hill mound with an exposed rocky/dirt face — natural ~46 wide, ~22 tall. */
export function makeHillGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // squashed sphere centred at y=0 → upper half is the dome, lower half buried.
  const dome = new THREE.IcosahedronGeometry(1, 2); // 320 faces — rounder
  dome.scale(23, 22, 20);
  parts.push(colored(dome, GRASS));
  // a smaller offset bump for a less perfectly-round silhouette
  const bump = new THREE.IcosahedronGeometry(1, 1);
  bump.scale(12, 14, 11);
  bump.translate(11, 3, -4);
  parts.push(colored(bump, GRASS_DK));
  // exposed dirt + boulders along one base edge
  for (const b of [{ r: 5, x: -16, z: 8 }, { r: 4, x: -19, z: 1 }, { r: 4.5, x: -14, z: -7 }]) {
    const g = new THREE.IcosahedronGeometry(b.r, 0);
    g.scale(1, 0.8, 1);
    g.translate(b.x, b.r * 0.6, b.z);
    parts.push(colored(g, ROCK));
  }
  const dirt = new THREE.CylinderGeometry(7, 9, 3, 8);
  dirt.translate(-16, 1.5, 1);
  parts.push(colored(dirt, DIRT));
  return merge(parts);
}

/** A toy windmill: tapered cream tower + red conical cap + four cream sail blades + a door.
 *  Natural height ~30. */
export function makeWindmillGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const CREAM = 0xf0e4c8, RED = 0xc0432f, WOOD = 0x8a5a2b;
  const grass = new THREE.CylinderGeometry(9, 10, 1, 12); grass.translate(0, 0.5, 0); parts.push(colored(grass, GRASS));
  const tower = new THREE.CylinderGeometry(4.5, 6.5, 20, 12); tower.translate(0, 11, 0); parts.push(colored(tower, CREAM));
  const cap = new THREE.ConeGeometry(5.5, 6, 12); cap.translate(0, 24, 0); parts.push(colored(cap, RED));
  const door = new THREE.BoxGeometry(2.4, 4.5, 0.6); door.translate(0, 3.2, 6.2); parts.push(colored(door, WOOD));
  // sail hub + 4 blades on the front face (+Z)
  const hub = new THREE.CylinderGeometry(0.9, 0.9, 1.2, 8); hub.rotateX(Math.PI / 2); hub.translate(0, 18, 5.4); parts.push(colored(hub, WOOD));
  for (let k = 0; k < 4; k++) {
    const blade = new THREE.BoxGeometry(1.6, 12, 0.4);
    blade.translate(0, 6.5, 0);          // pivot at hub
    blade.rotateZ(k * Math.PI / 2);      // cross
    blade.translate(0, 18, 5.7);
    parts.push(colored(blade, CREAM));
  }
  return merge(parts);
}

/** A waterfall: stacked grey rocks with glossy blue water ribbons, white foam, and a pool.
 *  Natural footprint ~22, height ~26. */
export function makeWaterfallGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const WATER = 0x2f8fd0, FOAM = 0xdff3ff, POOL = 0x2f9bd4;
  // rock cliff — stacked boulders rising up the back
  for (const b of [{ r: 7, x: -2, y: 5, z: -4 }, { r: 6, x: 5, y: 7, z: -5 }, { r: 6.5, x: -1, y: 12, z: -7 }, { r: 5, x: 4, y: 16, z: -8 }]) {
    const g = new THREE.IcosahedronGeometry(b.r, 0);
    g.translate(b.x, b.y, b.z);
    parts.push(colored(g, b.x < 1 ? ROCK : ROCK_DK));
  }
  // water ribbon cascading down the front (two flat tilted slabs)
  const fall1 = new THREE.BoxGeometry(7, 16, 0.8); fall1.rotateX(-0.18); fall1.translate(0, 9, -1); parts.push(colored(fall1, WATER));
  const fall2 = new THREE.BoxGeometry(5, 9, 0.8); fall2.rotateX(-0.12); fall2.translate(1, 18, -5); parts.push(colored(fall2, WATER));
  // foam where it lands + the pool
  const foam = new THREE.CylinderGeometry(4, 4.5, 1.2, 10); foam.translate(0, 1.2, 2); parts.push(colored(foam, FOAM));
  const pool = new THREE.CylinderGeometry(9, 9.5, 1, 14); pool.translate(0, 0.5, 3); parts.push(colored(pool, POOL));
  // grassy footing
  const grass = new THREE.CylinderGeometry(12, 13, 0.8, 14); grass.translate(0, 0.3, 0); parts.push(colored(grass, GRASS));
  return merge(parts);
}
