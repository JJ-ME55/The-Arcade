// @ts-nocheck
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * A chunky low-poly stylized tree built from primitives — a tapered trunk + a few
 * overlapping icosphere canopy blobs, baked into ONE geometry with vertex colours so it
 * renders as a single instanced draw call. ~350 triangles vs the 245k Meshy tree (which
 * wouldn't decimate), so we can scatter plenty of them essentially for free. Flat-shaded,
 * cheerful, Mario-Kart-ish. Built at ~25 units tall, base on the ground (y=0).
 */
function withColor(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export function makeTreeGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Trunk — tapered cylinder, warm brown.
  const trunk = new THREE.CylinderGeometry(0.9, 1.6, 9, 7);
  trunk.translate(0, 4.5, 0);
  parts.push(withColor(trunk, 0x8a5a2b));

  // Canopy — a few overlapping rounded blobs in varied greens for a billowy clump.
  const blobs: { r: number; x: number; y: number; z: number; c: number }[] = [
    { r: 7.5, x: 0, y: 16, z: 0, c: 0x57ad44 },
    { r: 6.0, x: -5, y: 13, z: 1.5, c: 0x4f9e3a },
    { r: 6.0, x: 5, y: 13.5, z: -1.5, c: 0x66bd4e },
    { r: 5.5, x: 0.5, y: 20, z: -0.5, c: 0x6ec955 },
  ];
  for (const b of blobs) {
    const g = new THREE.IcosahedronGeometry(b.r, 1); // detail 1 ≈ 80 tris
    g.translate(b.x, b.y, b.z);
    parts.push(withColor(g, b.c));
  }

  // mergeGeometries requires every part to match on indexing — Cylinder is indexed but
  // Icosahedron isn't, so normalise everything to non-indexed first (else it returns null).
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false);
  if (!merged) throw new Error('proceduralTree: geometry merge failed');
  merged.computeVertexNormals();
  return merged;
}

/** Shared flat-ish material that reads the baked vertex colours. */
export function makeTreeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
}
