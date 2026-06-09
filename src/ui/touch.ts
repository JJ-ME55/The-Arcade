/**
 * Floating virtual joystick (left thumb). Drives the full PodInput: horizontal = x,
 * push up = thrust, push down = dig-down. Appears wherever you press in the move zone.
 * Mobile is a constraint, not a port (Principle #3).
 */
import Phaser from 'phaser';
import { COL } from './theme';
import type { PodInput } from '../entities/pod';

const RADIUS = 64;
const DEADZONE = 0.16;

export class TouchControls {
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private pointerId = -1;
  private originX = 0;
  private originY = 0;
  private curX = 0;
  private curY = 0;
  private input: PodInput = { x: 0, thrust: false, down: false };
  enabled = true;

  /** keep the move-zone clear of the item buttons on the far right (px from right edge). */
  private rightMargin: number;

  constructor(scene: Phaser.Scene, rightMargin = 70) {
    this.scene = scene;
    this.rightMargin = rightMargin;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(1500);

    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.enabled || this.pointerId !== -1) return;
    // move-zone: anywhere except the item buttons on the right and the HUD strip on top
    if (p.x > this.scene.scale.width - this.rightMargin || p.y < 100) return;
    this.pointerId = p.id;
    this.originX = p.x;
    this.originY = p.y;
    this.curX = p.x;
    this.curY = p.y;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.curX = p.x;
    this.curY = p.y;
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    this.pointerId = -1;
    this.input = { x: 0, thrust: false, down: false };
  }

  getInput(): PodInput {
    if (this.pointerId === -1) return this.input;
    let dx = (this.curX - this.originX) / RADIUS;
    let dy = (this.curY - this.originY) / RADIUS;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    this.input = {
      x: Math.abs(dx) > DEADZONE ? dx : 0,
      thrust: dy < -0.35,
      down: dy > 0.42,
    };
    return this.input;
  }

  draw(): void {
    const g = this.g;
    g.clear();
    if (this.pointerId === -1) return;
    let dx = this.curX - this.originX;
    let dy = this.curY - this.originY;
    const mag = Math.hypot(dx, dy);
    if (mag > RADIUS) {
      dx = (dx / mag) * RADIUS;
      dy = (dy / mag) * RADIUS;
    }
    // base ring
    g.lineStyle(3, COL.border, 0.6);
    g.strokeCircle(this.originX, this.originY, RADIUS);
    g.fillStyle(COL.panel, 0.25);
    g.fillCircle(this.originX, this.originY, RADIUS);
    // thumb
    g.fillStyle(COL.brand, 0.85);
    g.fillCircle(this.originX + dx, this.originY + dy, 26);
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(this.originX + dx - 6, this.originY + dy - 6, 8);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
    this.g.destroy();
  }
}
