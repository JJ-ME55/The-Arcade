/** In-run HUD: the three squeeze meters (fuel/hull/cargo), depth, cash, heat + warnings. */
import Phaser from 'phaser';
import { COL, textStyle, css } from './theme';
import { FUEL } from '../config/gameplay';
import type { RunState } from '../core/types';
import type { DerivedStats } from '../systems/stats';

export interface HudData {
  depth: number;
  biomeName: string;
  haulValue: number;
}

export class Hud {
  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;
  private fuelT: Phaser.GameObjects.Text;
  private hullT: Phaser.GameObjects.Text;
  private cargoT: Phaser.GameObjects.Text;
  private cashT: Phaser.GameObjects.Text;
  private depthT: Phaser.GameObjects.Text;
  private biomeT: Phaser.GameObjects.Text;
  private haulT: Phaser.GameObjects.Text;
  private warnT: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(1000);

    const mk = (x: number, y: number, c: number, size = 13, origin = 0) =>
      scene.add
        .text(x, y, '', textStyle(size, c))
        .setScrollFactor(0)
        .setDepth(1001)
        .setOrigin(origin, 0);

    const rx = scene.scale.width - 18;
    this.fuelT = mk(20, 17, COL.text, 12);
    this.hullT = mk(20, 43, COL.text, 12);
    this.cargoT = mk(20, 69, COL.text, 12);
    this.cashT = mk(rx, 16, COL.cash, 24, 1);
    this.depthT = mk(rx, 48, COL.accent, 20, 1);
    this.biomeT = mk(rx, 74, COL.dim, 12, 1);
    this.haulT = mk(rx, 92, COL.cargo, 13, 1);

    this.warnT = scene.add
      .text(scene.scale.width / 2, 116, '', textStyle(15, COL.danger))
      .setScrollFactor(0)
      .setDepth(1002)
      .setOrigin(0.5);
  }

  /** Re-anchor the right-aligned & centred elements after a window resize. */
  relayout(): void {
    const rx = this.scene.scale.width - 18;
    this.cashT.setX(rx);
    this.depthT.setX(rx);
    this.biomeT.setX(rx);
    this.haulT.setX(rx);
    this.warnT.setX(this.scene.scale.width / 2);
  }

  private bar(x: number, y: number, w: number, h: number, frac: number, color: number): void {
    const g = this.g;
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 4);
    g.fillStyle(0x20202e, 1);
    g.fillRoundedRect(x, y, w, h, 3);
    const fw = Math.max(0, Math.min(1, frac)) * w;
    if (fw > 2) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(x, y, fw, h, 3);
      g.fillStyle(0xffffff, 0.18);
      g.fillRoundedRect(x, y, fw, h / 2, 3);
    }
  }

  update(run: RunState, stats: DerivedStats, data: HudData): void {
    const g = this.g;
    g.clear();

    const bw = 168;
    const fuelFrac = run.fuel / Math.max(1, run.fuelMax);
    this.bar(20, 28, bw, 12, fuelFrac, fuelFrac < 0.2 ? COL.danger : COL.fuel);
    this.bar(20, 54, bw, 12, run.hull / Math.max(1, run.hullMax), COL.hull);
    this.bar(20, 80, bw, 12, run.cargoUsed / Math.max(1, run.cargoMax), COL.cargo);

    this.fuelT.setText(`FUEL  ${Math.ceil(run.fuel)}/${run.fuelMax}`);
    this.hullT.setText(`HULL  ${Math.ceil(run.hull)}/${run.hullMax}`);
    this.cargoT.setText(`CARGO  ${run.cargoUsed}/${run.cargoMax}`);

    if (run.heat > 1) {
      this.bar(20, 106, bw, 8, run.heat / 100, COL.heat);
    }

    this.cashT.setText('$' + Math.floor(run.cash).toLocaleString());
    this.depthT.setText(`${Math.floor(data.depth)} m`);
    this.biomeT.setText(data.biomeName.toUpperCase());
    this.haulT.setText(data.haulValue > 0 ? `haul $${data.haulValue.toLocaleString()}` : '');

    // fuel-to-return warning. Climbing costs ~0.4 fuel/m (thrust drain ÷ climb speed);
    // 0.45 + a small buffer keeps the warning honest instead of permanently-on deep down.
    const estReturn = data.depth * 0.45 + 8;
    if (data.depth > 30 && run.fuel < estReturn * 1.25) {
      const crit = run.fuel < estReturn;
      this.warnT.setText(crit ? '⚠  FUEL CRITICAL — RETURN NOW' : '⚠  fuel low — plan your climb');
      this.warnT.setColor(css(crit ? COL.danger : COL.warn));
      this.warnT.setAlpha(0.6 + 0.4 * Math.sin(this.scene.time.now / 120));
    } else {
      this.warnT.setText('');
    }
  }
}
