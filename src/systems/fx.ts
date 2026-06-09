/** Juice: particle bursts, floating text, screen shake. Restraint per "Art of Screen Shake". */
import Phaser from 'phaser';
import { COL, textStyle } from '../ui/theme';
import { App } from '../core/state';

export class Fx {
  private scene: Phaser.Scene;
  private dust: Phaser.GameObjects.Particles.ParticleEmitter;
  private spark: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private chunks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dust = scene.add
      .particles(0, 0, 'dust', {
        lifespan: 420,
        speed: { min: 30, max: 120 },
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.9, end: 0 },
        gravityY: 320,
        emitting: false,
      })
      .setDepth(60);
    this.spark = scene.add
      .particles(0, 0, 'soft', {
        lifespan: 600,
        speed: { min: 20, max: 90 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: -40,
        emitting: false,
      })
      .setDepth(61);
    this.burst = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 700,
        speed: { min: 80, max: 280 },
        scale: { start: 1.6, end: 0 },
        alpha: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        gravityY: 200,
        emitting: false,
      })
      .setDepth(62);
    // chunky brick-break debris that tumbles and falls
    this.chunks = scene.add
      .particles(0, 0, 'chunk', {
        lifespan: { min: 500, max: 900 },
        speed: { min: 60, max: 200 },
        angle: { min: 200, max: 340 },
        scale: { start: 1, end: 0.3 },
        alpha: { start: 1, end: 0 },
        rotate: { min: -180, max: 180 },
        gravityY: 700,
        bounce: 0.2,
        emitting: false,
      })
      .setDepth(59);
  }

  /** Brick-break debris in the tile's colour. */
  debris(x: number, y: number, color: number): void {
    this.chunks.setParticleTint(color);
    this.chunks.emitParticleAt(x, y, 7);
  }

  digBurst(x: number, y: number, color: number): void {
    this.dust.setParticleTint(color);
    this.dust.emitParticleAt(x, y, 5);
  }

  collect(x: number, y: number, color: number): void {
    this.spark.setParticleTint(color);
    this.spark.emitParticleAt(x, y, 10);
  }

  explosion(x: number, y: number, color: number = 0xff7a2a): void {
    this.burst.setParticleTint(color);
    this.burst.emitParticleAt(x, y, 22);
    const ring = this.scene.add.image(x, y, 'ring').setTint(color).setDepth(63).setScale(0.2);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.6,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
    this.shake(0.012, 220);
  }

  floatText(x: number, y: number, text: string, color: number = COL.brand, size = 18): void {
    const t = this.scene.add
      .text(x, y, text, textStyle(size, color))
      .setOrigin(0.5)
      .setDepth(800);
    t.setStroke('#000000', 4);
    this.scene.tweens.add({
      targets: t,
      y: y - 46,
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => t.destroy(),
    });
  }

  popText(x: number, y: number, text: string, color: number = COL.brand, size = 26): void {
    const t = this.scene.add.text(x, y, text, textStyle(size, color)).setOrigin(0.5).setDepth(810);
    t.setStroke('#000000', 5);
    t.setScale(0.4);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.out' });
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      y: y - 30,
      delay: 700,
      duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  shake(intensity: number, duration: number): void {
    if (App.meta.settings.reduceShake) intensity *= 0.35;
    this.scene.cameras.main.shake(duration, intensity);
  }
}
