/**
 * In-run HUD (DesignHandoff "Gameplay Target"): two vertical cylinder gauges (orange fuel /
 * blue hull) top-left with depth + biome beneath, cash + a CARGO chip + a MENU button top-right,
 * and a low-fuel warning. Muted/earthy — no neon, no shop button (selling happens at the outpost).
 * Consumables live in the bottom hotbar (see Game.buildItemBar).
 */
import Phaser from 'phaser';
import { COL, monoStyle, textStyle, css } from './theme';
import { Button } from './widgets';
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
  private cashT: Phaser.GameObjects.Text;
  private depthT: Phaser.GameObjects.Text;
  private biomeT: Phaser.GameObjects.Text;
  private cargoT: Phaser.GameObjects.Text;
  private warnT: Phaser.GameObjects.Text;
  private labels: Phaser.GameObjects.Text[] = [];
  private menuBtn: Button;

  constructor(scene: Phaser.Scene, onMenu: () => void) {
    this.scene = scene;
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(1000);

    const rx = scene.scale.width - 18;
    // gauge letters (F/E on fuel, H/· on hull)
    const lab = (x: number, y: number, t: string, c: number) =>
      scene.add.text(x, y, t, textStyle(11, c)).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
    this.labels = [
      lab(40, 27, 'F', COL.text), lab(40, 138, 'E', COL.dim),
      lab(86, 27, 'H', COL.text), lab(86, 138, '·', COL.dim),
    ];

    this.depthT = scene.add.text(22, 160, '', monoStyle(28, 0xe7be4e)).setScrollFactor(0).setDepth(1001);
    this.biomeT = scene.add.text(24, 194, '', monoStyle(12, COL.crtDim)).setScrollFactor(0).setDepth(1001).setLetterSpacing(3);

    this.cashT = scene.add.text(rx, 14, '', monoStyle(30, 0xe7be4e)).setScrollFactor(0).setDepth(1001).setOrigin(1, 0);
    this.cargoT = scene.add.text(rx - 139, 70, '', monoStyle(15, 0x2a1c05)).setScrollFactor(0).setDepth(1002).setOrigin(0.5);

    this.menuBtn = new Button(scene, rx - 32, 84, 60, 40, 'MENU', onMenu, { fontSize: 13, fixed: true });
    this.menuBtn.setScrollFactor(0).setDepth(1001);

    this.warnT = scene.add
      .text(scene.scale.width / 2, 124, '', textStyle(15, COL.danger))
      .setScrollFactor(0)
      .setDepth(1002)
      .setOrigin(0.5);
  }

  relayout(): void {
    const rx = this.scene.scale.width - 18;
    this.cashT.setX(rx);
    this.cargoT.setX(rx - 139);
    this.menuBtn.setX(rx - 32);
    this.warnT.setX(this.scene.scale.width / 2);
  }

  /** A vertical cylinder gauge: steel housing, dark tube, bottom-anchored liquid + meniscus. */
  private gauge(x: number, y: number, w: number, h: number, frac: number, kind: 'fuel' | 'hull'): void {
    const g = this.g;
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 9);
    g.fillStyle(COL.panelHi, 1);
    g.fillRoundedRect(x, y, w, h, 8);
    g.fillStyle(COL.panel, 1);
    g.fillRoundedRect(x, y + h * 0.18, w, h * 0.82, { tl: 0, tr: 0, bl: 8, br: 8 });
    // tube
    const tx = x + 5;
    const ty = y + 5;
    const tw = w - 10;
    const th = h - 10;
    g.fillStyle(0x070504, 1);
    g.fillRoundedRect(tx, ty, tw, th, 6);
    // liquid (light-top → dark-bottom fake gradient), muted — no glow
    const f = Math.max(0, Math.min(1, frac));
    const lh = f * (th - 4);
    const ly = ty + th - 2 - lh;
    const cols: [number, number, number] = kind === 'fuel' ? [0xc79c52, 0x9c6c28, 0x5f3f12] : [0x9bb6c4, 0x587f92, 0x2e4d5e];
    if (lh > 1) {
      g.fillStyle(cols[2], 1);
      g.fillRoundedRect(tx + 2, ly, tw - 4, lh, 4);
      g.fillStyle(cols[1], 1);
      g.fillRect(tx + 2, ly, tw - 4, lh * 0.5);
      g.fillStyle(cols[0], 1);
      g.fillRect(tx + 2, ly, tw - 4, Math.min(lh, 4));
      g.fillStyle(0xffffff, 0.2);
      g.fillRect(tx + 2, ly, tw - 4, 2);
    }
    // glass gloss streak
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(tx + 3, ty + 3, 3, th - 6, 2);
  }

  update(run: RunState, _stats: DerivedStats, data: HudData): void {
    const g = this.g;
    g.clear();

    this.gauge(20, 18, 40, 130, run.fuel / Math.max(1, run.fuelMax), 'fuel');
    this.gauge(66, 18, 40, 130, run.hull / Math.max(1, run.hullMax), 'hull');

    // low-fuel tint on the fuel letter
    const fuelFrac = run.fuel / Math.max(1, run.fuelMax);
    this.labels[0].setColor(css(fuelFrac < 0.2 ? COL.danger : COL.text));

    // cargo chip (gold) top-right
    const rx = this.scene.scale.width - 18;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(rx - 200, 60, 122, 36, 9);
    g.fillStyle(run.cargoUsed >= run.cargoMax ? 0xe0a72a : 0xc2994a, 1);
    g.fillRoundedRect(rx - 198, 62, 118, 32, 8);
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(rx - 198, 62, 118, 14, 8);

    this.cashT.setText('$' + Math.floor(run.cash).toLocaleString());
    this.cargoT.setText(`${run.cargoUsed}/${run.cargoMax} ⛏`);
    this.depthT.setText(`${Math.floor(data.depth)} m`);
    this.biomeT.setText(data.biomeName.toUpperCase());

    // fuel-to-return warning (same honest math as before)
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
