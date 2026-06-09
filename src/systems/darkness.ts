/**
 * Underground darkness + pod light. A screen-space dark overlay whose opacity grows with
 * depth; each frame we "erase" a soft circle around the pod (and a faint glow at lava), so
 * the pod lights its surroundings. Surface = fully lit; the Core = near-black but for your
 * lamp. Cheap (one RenderTexture, fill + a couple of erases per frame).
 */
import Phaser from 'phaser';

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

  /**
   * @param amount   0..1 darkness opacity (0 = off near surface).
   * @param sx,sy    pod position in screen space.
   * @param radiusPx soft light radius around the pod.
   * @param dt       delta seconds (for lamp flicker).
   */
  update(amount: number, sx: number, sy: number, radiusPx: number, dt: number): void {
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
    // 256 = half the 512px brush; scale so the brush covers the desired radius
    const scale = r / 256;
    this.brush.setScale(scale * 1.0);
    this.rt.erase(this.brush, sx, sy);
    // a second, tighter pass for a brighter core
    this.brush.setScale(scale * 0.5);
    this.rt.erase(this.brush, sx, sy);
  }

  /** Reveal a transient glow at a world->screen point (e.g. an explosion). */
  flash(sx: number, sy: number, radiusPx: number): void {
    if (!this.rt.visible) return;
    this.brush.setScale(radiusPx / 256);
    this.rt.erase(this.brush, sx, sy);
  }

  destroy(): void {
    this.rt.destroy();
    this.brush.destroy();
  }
}
