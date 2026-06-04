// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

/**
 * Returns a GLTFLoader configured with the Meshopt decoder, so we can load the
 * mesh-compressed character GLBs produced by scripts/compress-characters.mjs.
 * Use this everywhere instead of `new GLTFLoader()` directly.
 *
 * Pass a LoadingManager to track aggregate progress across many GLB loads — the race
 * loader sets one up so it can hold the countdown until every asset is in.
 */
export function createGLTFLoader(manager?: THREE.LoadingManager): GLTFLoader {
  const l = new GLTFLoader(manager);
  l.setMeshoptDecoder(MeshoptDecoder);
  return l;
}
