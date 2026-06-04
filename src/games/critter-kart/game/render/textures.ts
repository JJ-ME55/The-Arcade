// @ts-nocheck
import * as THREE from 'three';

/** Draw onto an offscreen canvas and return a NearestFilter texture (crisp pixels). */
export function pixTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

/** Like pixTex but smooth (linear + mipmaps + anisotropy) — for higher-res painted
 *  surfaces (e.g. the dirt road) that should look soft, not pixelated, especially at
 *  the low/grazing camera angle. */
export function smoothTex(
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8; // sharpens the road where it recedes toward the horizon
  return t;
}
