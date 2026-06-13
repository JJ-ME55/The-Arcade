/**
 * Underground darkness + pod light. A screen-space dark overlay whose opacity grows with depth;
 * each frame we "erase" a soft symmetric lamp pool around the pod. Treasure glints (ore / special
 * / lava shining through the dark) are drawn as cheap ADDITIVE sprites on top — NOT as
 * RenderTexture erases. (Erase is an unbatched draw call; doing one per glint tanked the frame
 * rate the instant the overlay switched on ~50 m. Additive sprites batch into ~one draw.)
 */
import Phaser from 'phaser';
import type { GlowCell } from '../world/tileRenderer';

export interface GlintPoint {
  sx: number;
  sy: number;
  kind: GlowCell['kind'];
  /** stable per-cell phase so each glint pulses on its own beat. */
  phase: number;
}

const GLINT_POOL = 56;

export class Darkness {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private brush: Phaser.GameObjects.Image;
  private glints: Phaser.GameObjects.Image[] = [];
  private flicker = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.rt = scene.add.renderTexture(0, 0, w, h).setOrigin(0).setScrollFactor(0).setDepth(900);
    // brush is only used as an erase stamp; never rendered itself
    this.brush = scene.add.image(0, 0, 'lightmask').setVisible(false);
    // pre-built additive glint pool (avoids a creation spike when the overlay first switches on)
    for (let i = 0; i < GLINT_POOL; i++) {
      this.glints.push(
        scene.add
          .image(0, 0, 'lightmask')
          .setScrollFactor(0)
          .setDepth(901)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
      );
    }
    // Warm up the fill/erase GL paths NOW (during the load screen) so the first frame the overlay
    // switches on (~50 m) doesn't pay a one-time shader-compile / framebuffer-alloc spike (the old
    // "freeze at 50 m"). Exercise the same calls update() uses, then reset to the off state.
    this.rt.fill(0x070402, 0.5);
    this.stamp(w / 2, h / 2, 200);
    this.rt.clear();
    this.rt.setVisible(false);
  }

  resize(): void {
    this.rt.setSize(this.scene.scale.width, this.scene.scale.height);
  }

  /** Erase a soft circle of the given radius (in px) at screen point. */
  private stamp(sx: number, sy: number, radiusPx: number): void {
    this.brush.setScale(radiusPx / 256);
    this.rt.erase(this.brush, sx, sy);
  }

  /**
   * @param amount   0..1 darkness opacity (0 = off near surface).
   * @param sx,sy    pod position in screen space.
   * @param radiusPx soft light radius around the pod.
   * @param dt       delta seconds (for lamp flicker).
   * @param facing   -1 | 1 — kept for API compatibility (lamp is symmetric now).
   * @param glints   visible treasure cells (screen space) to shine through the dark.
   */
  update(
    amount: number,
    sx: number,
    sy: number,
    radiusPx: number,
    dt: number,
    facing: 1 | -1 = 1,
    glints?: GlintPoint[],
  ): void {
    if (amount <= 0.01) {
      this.rt.setVisible(false);
      for (const g of this.glints) if (g.visible) g.setVisible(false);
      return;
    }
    this.rt.setVisible(true);
    this.flicker += dt * 9;
    const flick = 1 + Math.sin(this.flicker) * 0.04 + Math.sin(this.flicker * 2.3) * 0.02;
    const r = radiusPx * flick;
    void facing;

    // warm near-black fill + a soft symmetric lamp pool (only ~2 erases — cheap)
    this.rt.clear();
    this.rt.fill(0x070402, Math.min(0.94, amount));
    this.stamp(sx, sy, r * 1.08);
    this.stamp(sx, sy, r * 0.58);

    // treasure glints — additive sprites (batched, cheap), layered over the dark
    const t = this.flicker;
    const n = glints ? Math.min(glints.length, GLINT_POOL) : 0;
    for (let i = 0; i < n; i++) {
      const gl = glints![i];
      const pulse = 1 + 0.25 * Math.sin(t * 1.8 + gl.phase);
      const tint = gl.kind === 'lava' ? 0xff7a2a : gl.kind === 'special' ? 0xffd24d : 0xffe9a8;
      const base = gl.kind === 'lava' ? 30 : gl.kind === 'special' ? 22 : 14;
      this.glints[i]
        .setVisible(true)
        .setPosition(gl.sx, gl.sy)
        .setTint(tint)
        .setScale((base * pulse) / 256)
        // tie brightness to how dark it actually is, so glints emerge with depth (not in daylight)
        .setAlpha(Math.min(0.85, amount * 1.5));
    }
    for (let i = n; i < GLINT_POOL; i++) if (this.glints[i].visible) this.glints[i].setVisible(false);
  }

  /** Reveal a transient glow at a screen point (e.g. an explosion). */
  flash(sx: number, sy: number, radiusPx: number): void {
    if (!this.rt.visible) return;
    this.stamp(sx, sy, radiusPx);
  }

  destroy(): void {
    this.rt.destroy();
    this.brush.destroy();
    for (const g of this.glints) g.destroy();
    this.glints.length = 0;
  }
}
