// @ts-nocheck
import * as THREE from 'three';
import { KartState } from '../logic/kartPhysics';
import { Tuning } from '../config/tuning';

const target = new THREE.Vector3();

/** Smoothly trail the kart from behind and aim ahead of it. `kartY` is the kart's
 *  current visual ground level (0 normally; >0 on a bridge or mid-jump) — the camera's
 *  height and aim point are offset by it, so going up a bridge / jump keeps the same
 *  third-person framing instead of the camera staying low while the kart lifts away. */
export function updateChaseCamera(
  camera: THREE.PerspectiveCamera,
  s: KartState,
  t: Tuning,
  kartY: number = 0,
  dt: number = 1 / 60,
): void {
  // trail the direction the kart is actually MOVING, so a drift (facing != moving) reads visually
  const fx = Math.sin(s.velHeading);
  const fz = Math.cos(s.velHeading);
  target.set(s.x - fx * t.camDistance, kartY + t.camHeight, s.z - fz * t.camDistance);
  // Frame-rate-INDEPENDENT smoothing: a fixed per-frame lerp factor converges faster at high
  // refresh rates (and wobbles when frame time varies), which reads as camera jitter. Convert
  // camLerp (calibrated at 60fps) to the equivalent factor for this frame's dt.
  const k = 1 - Math.pow(1 - t.camLerp, dt * 60);
  camera.position.lerp(target, k);
  camera.lookAt(s.x + fx * t.camLookAhead, kartY + 2, s.z + fz * t.camLookAhead);
}

/** Snap the camera directly behind the kart (use once, before the first frame). */
export function placeChaseCamera(
  camera: THREE.PerspectiveCamera,
  s: KartState,
  t: Tuning,
  kartY: number = 0,
): void {
  const fx = Math.sin(s.velHeading);
  const fz = Math.cos(s.velHeading);
  camera.position.set(s.x - fx * t.camDistance, kartY + t.camHeight, s.z - fz * t.camDistance);
  camera.lookAt(s.x + fx * t.camLookAhead, kartY + 2, s.z + fz * t.camLookAhead);
}
