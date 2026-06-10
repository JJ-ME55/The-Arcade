/**
 * Underground darkness + pod light. A screen-space dark overlay whose opacity grows with
 * depth; each frame we "erase" a soft circle around the pod, a headlight pool in the facing
 * direction, and small pulsing glints at every visible ore / special / lava cell — treasure
 * literally shines through the dark, pulling the player deeper. Cheap: one RenderTexture,
 * a fill + a few dozen erase stamps per frame.
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

export class Darkness {
  private scene: Phaser.Scene;
  private rt: Phaser.GameObjects.RenderTexture;
  private brush: Phaser.GameObjects.Image;
  private flicker = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.rt = scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900);
    // brush is only used as an erase stamp; never rendered itself
    this.brush = scene.add.image(0, 0, 'lightmask').setVisible(false);
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
   * @param facing   -1 | 1 — pod facing, throws a headlight pool ahead.
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
      return;
    }
    this.rt.setVisible(true);
    this.flicker += dt * 9;
    const flick = 1 + Math.sin(this.flicker) * 0.04 + Math.sin(this.flicker * 2.3) * 0.02;
    const r = radiusPx * flick;

    this.rt.clear();
    this.rt.fill(0x04050a, Math.min(0.94, amount));
    // main lamp: wide soft pool + tighter bright core
    this.stamp(sx, sy, r);
    this.stamp(sx, sy, r * 0.5);
    // headlight pool thrown in the facing direction
    this.stamp(sx + facing * r * 0.62, sy, r * 0.5);

    if (glints) {
      const t = this.flicker;
      for (const gl of glints) {
        const pulse = 1 + 0.22 * Math.sin(t * 1.8 + gl.phase);
        const base = gl.kind === 'lava' ? 34 : gl.kind === 'special' ? 24 : 15;
        this.stamp(gl.sx, gl.sy, base * pulse);
      }
    }
  }

  /** Reveal a transient glow at a screen point (e.g. an explosion). */
  flash(sx: number, sy: number, radiusPx: number): void {
    if (!this.rt.visible) return;
    this.stamp(sx, sy, radiusPx);
  }

  destroy(): void {
    this.rt.destroy();
    this.brush.destroy();
  }
}
