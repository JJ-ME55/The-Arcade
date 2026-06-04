// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KartState } from '../logic/kartPhysics';
import { makeBoostFlame } from '../render/itemVisuals';
import { makeKartBodyTexture, makeTopper, colorAsFox } from '../render/kartStyle';

const TARGET_LEN = 5.6; // world units the kart's longest dimension is scaled to
const YAW_OFFSET = 0; // Kenney karts face +Z; heading 0 = +Z, so no offset needed

export type PatternKind = 'dots' | 'hex' | 'chevrons' | 'patches';
export type TopperKind = 'foxEars' | 'turtleShell' | 'birdCrest' | 'bearEars';

export interface Racer {
  id: string;
  name: string;
  model: string; // path under /public — the kart GLB
  color: number; // primary team colour (kart body base)
  accent: number; // secondary colour used by the body pattern + topper details
  pattern: PatternKind; // patterned body texture — gives each racer a signature look
  topper: TopperKind; // animal-identity accessory perched on the driver's head
  weight: number; // collision mass (heavier shoves lighter)
  /** Full Meshy kart+driver combo GLB. When set, replaces the Kenney kart entirely and
   * skips ALL procedural decoration (no body pattern, no character swap, no topper) —
   * Meshy designed the whole vehicle, so we just drop it in. Falls back to the Kenney
   * kart + procedural decoration if not provided. */
  kartGLB?: string;
  /** Yaw rotation (radians) for the kart GLB. Math.PI to flip if Meshy faced it backward. */
  kartYaw?: number;
  /** Multiplier on the auto-fit scale. Default 1.0. Use to compensate for Meshy combos
   * whose bounding box includes extra empty space so they end up looking smaller. */
  kartScale?: number;
  /** Legacy: driver-only GLB swapped INTO the Kenney kart (left for backward compat). */
  character?: string;
  characterKind?: 'fox';
  characterScale?: number;
  characterY?: number;
  characterYaw?: number;
  /** Player-pick only: bots never select this racer (used for the Founder characters). */
  playerOnly?: boolean;
}

/**
 * Four racers, each with a distinct kart model, primary + accent colour, a body
 * pattern, and an animal topper on the driver — built procedurally (no external art).
 */
export const ROSTER: Racer[] = [
  { id: 'rusty', name: 'Rusty', model: '/critter-kart/models/kart-oobi.glb', color: 0xc92f23, accent: 0xfff1d6, pattern: 'dots', topper: 'foxEars', weight: 1.0, kartGLB: '/critter-kart/models/characters/Fox in kart 2.glb' },
  { id: 'shelly', name: 'Shelly', model: '/critter-kart/models/kart-oodi.glb', color: 0x2f9e44, accent: 0x186d2a, pattern: 'hex', topper: 'turtleShell', weight: 1.3, kartGLB: '/critter-kart/models/characters/Turtle in kart.glb' },
  { id: 'pip', name: 'Pip', model: '/critter-kart/models/kart-ooli.glb', color: 0x1c9bd6, accent: 0xff7eb6, pattern: 'chevrons', topper: 'birdCrest', weight: 0.8, kartGLB: '/critter-kart/models/characters/Sparrow in kart.glb' },
  { id: 'bruno', name: 'Bruno', model: '/critter-kart/models/kart-oopi.glb', color: 0x9c6b3f, accent: 0xefdcb5, pattern: 'patches', topper: 'bearEars', weight: 1.3, kartGLB: '/critter-kart/models/characters/Bear in kart.glb' },
  // Founders — player-pick only; bots never choose these.
  { id: 'jj', name: 'JJ', model: '/critter-kart/models/kart-oobi.glb', color: 0xe8a82e, accent: 0xfff1d6, pattern: 'dots', topper: 'foxEars', weight: 1.0, kartGLB: '/critter-kart/models/characters/Founder JJ in kart (2).glb', kartYaw: Math.PI / 2, kartScale: 1.2, playerOnly: true },
  { id: 'fish', name: 'Fish', model: '/critter-kart/models/kart-oobi.glb', color: 0x8e4cd9, accent: 0xfff1d6, pattern: 'dots', topper: 'foxEars', weight: 0.95, kartGLB: '/critter-kart/models/characters/Founder Fish in kart.glb', kartYaw: Math.PI / 2, kartScale: 1.2, playerOnly: true },
];

/**
 * A 3D kart (Kenney CC0 low-poly model). The model group YAWS to face the kart's
 * `heading`; the chase camera trails the travel direction, so a drift still reads
 * as a visible slide. Loads async — the group is added to the scene immediately
 * and the model pops in when ready.
 */
export class Kart {
  readonly mesh: THREE.Group;
  readonly flame: THREE.Group; // boost exhaust, shown while boosting
  private body: THREE.Object3D | null = null; // the loaded model (for flashing)
  private topper: THREE.Group | null = null; // the per-racer animal accessory (flashes with body)
  private sparks: THREE.Mesh[] = []; // drift mini-turbo sparks at the rear wheels (colour = charge tier)

  constructor(racer: Racer, loader: GLTFLoader, private castsShadow = false) {
    this.mesh = new THREE.Group();
    this.flame = makeBoostFlame();
    this.flame.position.set(0, 0.8, -2.6); // out the back of the kart
    this.mesh.add(this.flame);
    // Drift sparks — two little additive blobs by the back wheels. Hidden until drifting; their
    // colour reads the mini-turbo tier (blue → orange → purple) so the charge is legible.
    const sparkGeo = new THREE.IcosahedronGeometry(0.34, 0);
    for (const sx of [-1, 1]) {
      const spark = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      spark.position.set(sx * 1.05, 0.4, -2.2);
      spark.visible = false;
      this.sparks.push(spark);
      this.mesh.add(spark);
    }

    // FULL Meshy kart+driver combo path — load the GLB as-is, scale + sit on ground, done.
    // No procedural patterns, no topper, no character swap (Meshy already designed it all).
    if (racer.kartGLB) {
      loader.load(racer.kartGLB, (gltf) => {
        const model = gltf.scene;
        model.rotation.y = racer.kartYaw ?? 0;
        const size = new THREE.Vector3();
        new THREE.Box3().setFromObject(model).getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        model.scale.setScalar((TARGET_LEN / maxDim) * (racer.kartScale ?? 1));
        const box = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box.min.y;
        model.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.castShadow = this.castsShadow; });
        this.body = model;
        this.mesh.add(model);
      });
      return;
    }

    // Legacy Kenney-kart path with procedural body texture + character/topper handling.
    loader.load(racer.model, (gltf) => {
      const model = gltf.scene;
      const tint = new THREE.Color(racer.color);
      const character = model.getObjectByName('character');
      const bodyTex = makeKartBodyTexture(racer); // patterned livery (e.g. dots, hex, chevrons, patches)

      // colour the kart BODY with the racer's patterned livery (wheels + driver handled separately)
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const name = mesh.name.toLowerCase();
        if (name.startsWith('wheel')) return; // leave wheels dark/original
        if (character && (mesh === character || character.getObjectById(mesh.id))) return; // driver done below
        const recolor = (m: THREE.Material) => {
          const c = m.clone() as THREE.MeshStandardMaterial;
          c.map = bodyTex; // patterned livery in racer colour + accent
          if (c.color) c.color = new THREE.Color(0xffffff); // let the texture's colours show pure
          return c;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material);
      });

      // give the driver a GENTLE team tint (keeps its detail, not a solid blob) + shrink it
      const driverTint = tint.clone().lerp(new THREE.Color(0xffffff), 0.5);
      character?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const recolor = (m: THREE.Material) => {
          const c = m.clone() as THREE.MeshStandardMaterial;
          if (c.color) c.color = driverTint.clone(); // multiply over the texture (keep map)
          return c;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolor) : recolor(mesh.material);
      });
      if (character) character.scale.multiplyScalar(0.62);

      // scale to a consistent size
      const size = new THREE.Vector3();
      new THREE.Box3().setFromObject(model).getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(TARGET_LEN / maxDim);
      // recenter horizontally and sit it on the ground
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box.min.y;
      model.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) mm.castShadow = this.castsShadow; });
      this.body = model;
      this.mesh.add(model);

      // either drop in a custom-character GLB (e.g. Meshy.ai fox) in the seat,
      // or perch the procedural topper above the placeholder driver.
      if (character) {
        character.updateMatrixWorld(true);
        const cbox = new THREE.Box3().setFromObject(character);
        const cc = cbox.getCenter(new THREE.Vector3());
        const cBottom = cbox.min.y;
        if (racer.character) {
          // swap the placeholder driver for a Meshy character (textured by Meshy, no recolour)
          character.removeFromParent();
          loader.load(racer.character, (gl) => {
            const fig = gl.scene;
            if (racer.characterKind === 'fox') colorAsFox(fig);
            // scale by the model's LONGEST dimension to a target world size — robust
            // regardless of whether Meshy gave us a seated or standing pose
            fig.rotation.y = racer.characterYaw ?? 0;
            fig.updateMatrixWorld(true);
            const fb = new THREE.Box3().setFromObject(fig);
            const fSize = fb.getSize(new THREE.Vector3());
            const TARGET_LARGEST = 2.6; // world units — about half a kart length
            const baseScale = TARGET_LARGEST / Math.max(0.001, Math.max(fSize.x, fSize.y, fSize.z));
            fig.scale.setScalar(baseScale * (racer.characterScale ?? 1));
            fig.updateMatrixWorld(true);
            const fb2 = new THREE.Box3().setFromObject(fig);
            const fc = fb2.getCenter(new THREE.Vector3());
            fig.position.set(cc.x - fc.x, cBottom - fb2.min.y + (racer.characterY ?? 0), cc.z - fc.z);
            this.topper = fig; // flash() also blinks the custom driver
            this.mesh.add(fig);
          });
        } else {
          const topper = makeTopper(racer);
          topper.position.set(cc.x, cbox.max.y + 0.04, cc.z);
          this.topper = topper;
          this.mesh.add(topper);
        }
      }
    });
  }

  syncTo(state: KartState): void {
    this.mesh.position.set(state.x, state.y ?? 0, state.z);
    this.mesh.rotation.y = state.heading + YAW_OFFSET;
  }

  /** Show/animate the boost exhaust flames. */
  setBoosting(on: boolean, t = 0): void {
    this.flame.visible = on;
    if (on) this.flame.scale.setScalar(0.85 + Math.sin(t * 34) * 0.18); // flicker
  }

  /** Drift mini-turbo sparks. tier 0 = off; 1 blue, 2 orange, 3 purple (matches the boost award). */
  setDriftSparks(tier: number, t = 0): void {
    const on = tier > 0;
    const col = tier >= 3 ? 0xc56bff : tier === 2 ? 0xffa12e : 0x66ccff;
    const s = 0.6 + tier * 0.18 + Math.sin(t * 42) * 0.35; // flicker, larger at higher tiers
    for (const spark of this.sparks) {
      spark.visible = on;
      if (!on) continue;
      (spark.material as THREE.MeshBasicMaterial).color.setHex(col);
      spark.scale.setScalar(Math.max(0.2, s));
    }
  }

  /** Flash the kart body + topper (used while storm-slowed). True to show, false to blink. */
  flash(visible: boolean): void {
    if (this.body) this.body.visible = visible;
    if (this.topper) this.topper.visible = visible;
  }
}
