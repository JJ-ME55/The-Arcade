// @ts-nocheck
import * as THREE from 'three';

const LIFE = 0.9; // seconds — total visible duration
const DROPLETS = 16;
const DROPLET_GRAVITY = 28;

export interface Splash {
  group: THREE.Group;
  /** Advance the animation. Returns false when fully expired (caller removes from scene). */
  update(dt: number): boolean;
}

/** A water-burst at (x, waterY, z): a ring spreading along the water surface plus
 *  droplets that arc up + outward and fall back. Designed for the "kart hit the lake"
 *  beat — instant impact spray, then fade. Geometry is disposed by the caller on removal. */
export function makeSplash(x: number, waterY: number, z: number): Splash {
  const group = new THREE.Group();
  group.position.set(x, waterY, z);

  // Expanding ring on the water surface — main visual focus
  const ringGeo = new THREE.RingGeometry(0.8, 1.6, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xd0f0ff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  group.add(ring);

  // Second slower ring for a more energetic burst
  const ring2Geo = new THREE.RingGeometry(0.4, 1.0, 32);
  const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.08;
  group.add(ring2);

  // Droplet particles — small spheres arcing outward
  const dropletMat = new THREE.MeshBasicMaterial({ color: 0xaee0ff, transparent: true, opacity: 0.95, depthWrite: false });
  const droplets: { mesh: THREE.Mesh; vx: number; vy: number; vz: number }[] = [];
  for (let i = 0; i < DROPLETS; i++) {
    const angle = (i / DROPLETS) * Math.PI * 2 + Math.random() * 0.4;
    const horizSpeed = 5 + Math.random() * 5;
    const ySpeed = 7 + Math.random() * 4;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.3, 6, 6), dropletMat.clone());
    group.add(m);
    droplets.push({
      mesh: m,
      vx: Math.cos(angle) * horizSpeed,
      vy: ySpeed,
      vz: Math.sin(angle) * horizSpeed,
    });
  }

  let age = 0;
  return {
    group,
    update(dt) {
      age += dt;
      if (age >= LIFE) return false;
      const t = age / LIFE;

      // Rings expand and fade
      ring.scale.setScalar(1 + t * 6);
      ringMat.opacity = 0.95 * (1 - t);
      ring2.scale.setScalar(1 + t * 9);
      ring2Mat.opacity = 0.8 * (1 - t);

      // Droplets arc ballistically; settle on water at y = 0 (group is already at waterY)
      for (const d of droplets) {
        d.mesh.position.x = d.vx * age;
        d.mesh.position.z = d.vz * age;
        d.mesh.position.y = Math.max(0, d.vy * age - 0.5 * DROPLET_GRAVITY * age * age);
        (d.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - t);
      }
      return true;
    },
  };
}
