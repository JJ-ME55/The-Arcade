/**
 * Hit-testing for FIXED (scrollFactor-0) UI.
 *
 * Phaser's built-in hit test converts the pointer to WORLD space via the camera, but
 * scrollFactor-0 objects render in SCREEN space — so their clickable zones drift by
 * exactly the camera scroll (hundreds of px mid-game). These callbacks ignore Phaser's
 * world-space local point and re-derive the true local point from the raw screen pointer
 * and the object's own transform (valid while the gameplay camera zoom is 1, which it is).
 */
import Phaser from 'phaser';

const tmp = new Phaser.Math.Vector2();

/** Hit callback for screen-anchored interactive objects (use with a local-space Rectangle). */
export function uiHit(
  hitArea: Phaser.Geom.Rectangle,
  _x: number,
  _y: number,
  go: Phaser.GameObjects.GameObject,
): boolean {
  const obj = go as unknown as Phaser.GameObjects.Components.Transform & {
    scene: Phaser.Scene;
  };
  const p = obj.scene.input.activePointer;
  obj.getWorldTransformMatrix().applyInverse(p.x, p.y, tmp);
  return hitArea.contains(tmp.x, tmp.y);
}

/** Always-hit callback for full-screen click blockers (dim layers). */
export function swallowHit(): boolean {
  return true;
}
