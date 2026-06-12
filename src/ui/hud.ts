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
    // gauge letters centred on each tube (fuel tube centre x=40, hull tube centre x=86)
    const lab = (x: number, y: number, t: string, c: number) =>
      scene.add.text(x, y, t, textStyle(12, c)).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
    this.labels = [
      lab(40, 30, 'F', COL.text), lab(40, 137, 'E', COL.faint),
      lab(86, 30, 'H', COL.text), lab(86, 137, 'E', COL.faint),
    ];

    this.depthT = scene.add.text(22, 162, '', monoStyle(28, 0xe7be4e)).setScrollFactor(0).setDepth(1001);
    this.biomeT = scene.add.text(24, 196, '', monoStyle(12, COL.crtDim)).setScrollFactor(0).setDepth(1001).setLetterSpacing(3);

    this.cashT = scene.add.text(rx, 12, '', monoStyle(28, 0xe7be4e)).setScrollFactor(0).setDepth(1001).setOrigin(1, 0);
    // cargo chip + MENU: same 104×34 footprint, right-aligned, stacked (centred contents)
    this.cargoT = scene.add.text(rx - 52, 71, '', monoStyle(15, 0x241a06)).setScrollFactor(0).setDepth(1002).setOrigin(0.5);
    this.menuBtn = new Button(scene, rx - 52, 113, 104, 34, 'MENU', onMenu, { fontSize: 14, fixed: true });
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
    this.cargoT.setX(rx - 52);
    this.menuBtn.setX(rx - 52);
    this.warnT.setX(this.scene.scale.width / 2);
  }

  /** Hide the whole HUD while a full-screen overlay (the outpost shop) is open. */
  setVisible(b: boolean): void {
    this.g.setVisible(b);
    this.cashT.setVisible(b);
    this.depthT.setVisible(b);
    this.biomeT.setVisible(b);
    this.cargoT.setVisible(b);
    this.warnT.setVisible(b);
    this.menuBtn.setVisible(b);
    this.labels.forEach((l) => l.setVisible(b));
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

    // cargo chip (gold) top-right — same footprint as the MENU button below it
    const rx = this.scene.scale.width - 18;
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(rx - 106, 52, 108, 38, 9);
    g.fillStyle(run.cargoUsed >= run.cargoMax ? 0xe0a72a : 0xb8923f, 1);
    g.fillRoundedRect(rx - 104, 54, 104, 34, 8);
    g.fillStyle(0xffffff, 0.1);
    g.fillRoundedRect(rx - 104, 54, 104, 13, 8);

    this.cashT.setText('$' + Math.floor(run.cash).toLocaleString());
    this.cargoT.setText(`CARGO ${run.cargoUsed}/${run.cargoMax}`);
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
