// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { PREMIUM_RENDER } from './scene';

/**
 * Returns a GLTFLoader configured with the Meshopt decoder, so we can load the
 * mesh-compressed character GLBs produced by scripts/compress-characters.mjs.
 * Use this everywhere instead of `new GLTFLoader()` directly.
 *
 * Pass a LoadingManager to track aggregate progress across many GLB loads — the race
 * loader sets one up so it can hold the countdown until every asset is in.
 *
 * LITE-RENDER FIX (iPad "everything is black shadow" 2026-06-12): the Meshy
 * GLBs export METALLIC PBR materials. Metals take their colour from the
 * environment map — which only exists on the premium path (PMREM is part of
 * what blew the iPad's GPU budget). Without it, metalness≈1 renders BLACK
 * under plain lights. On lite devices, clamp metalness so the albedo shows.
 */
export function createGLTFLoader(manager?: THREE.LoadingManager): GLTFLoader {
  const l = new GLTFLoader(manager);
  l.setMeshoptDecoder(MeshoptDecoder);
  if (!PREMIUM_RENDER) {
    const origLoad = l.load.bind(l);
    l.load = (url, onLoad, onProgress, onError) =>
      origLoad(url, (gltf) => {
        gltf.scene?.traverse((o) => {
          const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
          for (const m of mats) {
            if (typeof m.metalness === 'number' && m.metalness > 0.2) { m.metalness = 0.2; m.needsUpdate = true; }
          }
        });
        onLoad?.(gltf);
      }, onProgress, onError);
  }
  return l;
}
