/** The surface outpost menu: sell, refuel, repair, upgrades, consumables. */
import Phaser from 'phaser';
import { BASE_W, BASE_H, FUEL, HULL } from '../config/gameplay';
import { COL, textStyle, monoStyle } from './theme';
import { Button } from './widgets';
import { UPGRADES, nextTierCost, UPGRADE_BY_ID, type UpgradeCategory } from '../config/upgrades';
import { ITEMS } from '../config/items';
import type { RunState } from '../core/types';
import type { DerivedStats } from '../systems/stats';
import { cargoValue, sellCargo } from '../systems/run';
import { Sound } from '../systems/audio';
import { swallowHit } from './hit';
import type { Fx } from '../systems/fx';

export class SurfaceMenu {
  private scene: Phaser.Scene;
  private run: RunState;
  private getStats: () => DerivedStats;
  private recompute: () => DerivedStats;
  private onClose: () => void;
  private fx: Fx;

  private root: Phaser.GameObjects.Container;
  private dim!: Phaser.GameObjects.Rectangle;
  private onResize: () => void = () => {};
  isOpen = false;

  private cashText!: Phaser.GameObjects.Text;
  private sellBtn!: Button;
  private fuelBtn!: Button;
  private repairBtn!: Button;
  private upRows: { id: UpgradeCategory; tierText: Phaser.GameObjects.Text; btn: Button; thumb: Phaser.GameObjects.Image }[] = [];
  private itemRows: { id: string; ownText: Phaser.GameObjects.Text; btn: Button }[] = [];

  constructor(
    scene: Phaser.Scene,
    run: RunState,
    getStats: () => DerivedStats,
    recompute: () => DerivedStats,
    fx: Fx,
    onClose: () => void,
  ) {
    this.scene = scene;
    this.run = run;
    this.getStats = getStats;
    this.recompute = recompute;
    this.fx = fx;
    this.onClose = onClose;
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(2000).setVisible(false);
    // full-screen click-blocking dim behind the (scaled, centred) panel
    this.dim = scene.add
      .rectangle(0, 0, 6000, 6000, 0x05050a, 0.72)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1999)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), swallowHit)
      .setVisible(false);
    this.build();
    this.onResize = () => { if (this.isOpen) this.layout(); };
    scene.scale.on('resize', this.onResize);
  }

  /** Fit-and-centre the 540×960 panel into the current window. */
  private layout(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const s = Math.min(W / BASE_W, H / BASE_H, 1.15);
    this.root.setScale(s).setPosition((W - BASE_W * s) / 2, (H - BASE_H * s) / 2);
  }

  private build(): void {
    const px = 18;
    const pw = BASE_W - 36;
    const panel = this.scene.add.graphics();
    panel.fillStyle(COL.panel, 0.98);
    panel.fillRoundedRect(px, 34, pw, BASE_H - 68, 16);
    panel.lineStyle(2, COL.border, 1);
    panel.strokeRoundedRect(px, 34, pw, BASE_H - 68, 16);
    this.root.add(panel);

    this.root.add(this.scene.add.text(BASE_W / 2, 58, 'SURFACE OUTPOST', textStyle(24, COL.brand)).setOrigin(0.5));
    this.cashText = this.scene.add.text(BASE_W / 2, 88, '', textStyle(18, COL.cash)).setOrigin(0.5);
    this.root.add(this.cashText);

    // service buttons (fixed: screen-space hit testing — the shop UI is scrollFactor-0)
    this.sellBtn = new Button(this.scene, BASE_W / 2 - 160, 132, 150, 44, '', () => this.doSell(), { accent: COL.cargo, fontSize: 15, fixed: true });
    this.fuelBtn = new Button(this.scene, BASE_W / 2, 132, 150, 44, '', () => this.doRefuel(), { accent: COL.fuel, fontSize: 15, fixed: true });
    this.repairBtn = new Button(this.scene, BASE_W / 2 + 160, 132, 150, 44, '', () => this.doRepair(), { accent: COL.hull, fontSize: 15, fixed: true });
    this.root.add([this.sellBtn, this.fuelBtn, this.repairBtn]);

    // upgrades — each row shows the authored sprite for the owned tier
    this.root.add(this.scene.add.text(px + 16, 168, 'UPGRADES', monoStyle(14, COL.crt)).setLetterSpacing(2));
    let y = 196;
    for (const u of UPGRADES) {
      const thumb = this.scene.add.image(px + 34, y + 16, 'up_' + u.id + '_0');
      const name = this.scene.add.text(px + 64, y, u.name, textStyle(16, COL.text));
      const tier = this.scene.add.text(px + 64, y + 18, '', textStyle(12, COL.dim));
      const btn = new Button(this.scene, BASE_W - px - 78, y + 14, 128, 36, '', () => this.buyUpgrade(u.id), { fontSize: 14, fixed: true });
      this.root.add([thumb, name, tier, btn]);
      this.upRows.push({ id: u.id, tierText: tier, btn, thumb });
      y += 46;
    }

    // items
    this.root.add(this.scene.add.text(px + 16, y + 6, 'CONSUMABLES', monoStyle(14, COL.crt)).setLetterSpacing(2));
    y += 32;
    for (const it of ITEMS) {
      const dot = this.scene.add.graphics();
      dot.fillStyle(it.color, 1);
      dot.fillCircle(px + 24, y + 12, 6);
      const name = this.scene.add.text(px + 40, y, it.name, textStyle(15, COL.text));
      const own = this.scene.add.text(px + 40, y + 17, '', textStyle(11, COL.dim));
      const btn = new Button(this.scene, BASE_W - px - 78, y + 12, 128, 32, '', () => this.buyItem(it.id), { fontSize: 13, fixed: true });
      this.root.add([dot, name, own, btn]);
      this.itemRows.push({ id: it.id, ownText: own, btn });
      y += 38;
    }

    const descend = new Button(this.scene, BASE_W / 2, BASE_H - 74, BASE_W - 80, 50, '▼  DESCEND', () => this.close(), {
      fill: COL.brand,
      textColor: 0x1a1400,
      fontSize: 22,
      fixed: true,
    });
    this.root.add(descend);
    this.root.add(
      this.scene.add.text(BASE_W / 2, BASE_H - 44, 'ESC also closes', textStyle(11, COL.faint)).setOrigin(0.5),
    );
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.layout();
    this.dim.setVisible(true);
    this.root.setVisible(true);
    this.refresh();
    this.root.setAlpha(0);
    this.dim.setAlpha(0);
    this.scene.tweens.add({ targets: [this.root, this.dim], alpha: 1, duration: 160 });
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.setVisible(false);
    this.dim.setVisible(false);
    Sound.click();
    this.onClose();
  }

  private doSell(): void {
    const s = this.getStats();
    const val = cargoValue(this.run, s.sellMul);
    if (val <= 0) return;
    sellCargo(this.run, s.sellMul);
    Sound.sell();
    this.fx.popText(BASE_W / 2, 200, `+$${val.toLocaleString()}`, COL.cash, 28);
    this.refresh();
  }

  private doRefuel(): void {
    const missing = this.run.fuelMax - this.run.fuel;
    if (missing <= 0.5) return;
    const cost = Math.ceil(missing * FUEL.refuelCostPerUnit);
    if (this.run.cash < cost) {
      // partial refuel for whatever cash allows
      const afford = Math.floor(this.run.cash / FUEL.refuelCostPerUnit);
      if (afford <= 0) return;
      this.run.fuel += afford;
      this.run.cash -= Math.ceil(afford * FUEL.refuelCostPerUnit);
    } else {
      this.run.fuel = this.run.fuelMax;
      this.run.cash -= cost;
    }
    Sound.click();
    this.refresh();
  }

  private doRepair(): void {
    const missing = this.run.hullMax - this.run.hull;
    if (missing <= 0.5) return;
    const cost = Math.ceil(missing * HULL.repairCostPerHp);
    if (this.run.cash < cost) {
      const afford = Math.floor(this.run.cash / HULL.repairCostPerHp);
      if (afford <= 0) return;
      this.run.hull += afford;
      this.run.cash -= Math.ceil(afford * HULL.repairCostPerHp);
    } else {
      this.run.hull = this.run.hullMax;
      this.run.cash -= cost;
    }
    Sound.click();
    this.refresh();
  }

  private buyUpgrade(id: UpgradeCategory): void {
    const cur = this.run.upgrades[id] ?? 0;
    const cost = nextTierCost(id, cur);
    if (cost === null || this.run.cash < cost) return;
    this.run.cash -= cost;
    this.run.upgrades[id] = cur + 1;
    this.recompute();
    Sound.upgrade();
    this.fx.popText(BASE_W / 2, 200, `${UPGRADE_BY_ID[id].name} UP!`, UPGRADE_BY_ID[id].color, 22);
    this.refresh();
  }

  private buyItem(id: string): void {
    const it = ITEMS.find((i) => i.id === id);
    if (!it || this.run.cash < it.cost) return;
    this.run.cash -= it.cost;
    this.run.items[it.id] = (this.run.items[it.id] ?? 0) + 1;
    Sound.click();
    this.refresh();
  }

  refresh(): void {
    const s = this.getStats();
    this.cashText.setText('$' + Math.floor(this.run.cash).toLocaleString());

    const haul = cargoValue(this.run, s.sellMul);
    this.sellBtn.setLabel(haul > 0 ? `SELL  $${haul.toLocaleString()}` : 'NO CARGO').setEnabled(haul > 0);

    const fuelCost = Math.ceil((this.run.fuelMax - this.run.fuel) * FUEL.refuelCostPerUnit);
    this.fuelBtn.setLabel(fuelCost > 0 ? `REFUEL  $${fuelCost}` : 'FUEL FULL').setEnabled(fuelCost > 0 && this.run.cash > 0);

    const repCost = Math.ceil((this.run.hullMax - this.run.hull) * HULL.repairCostPerHp);
    this.repairBtn.setLabel(repCost > 0 ? `REPAIR  $${repCost}` : 'HULL FULL').setEnabled(repCost > 0 && this.run.cash > 0);

    for (const row of this.upRows) {
      const def = UPGRADE_BY_ID[row.id];
      const cur = this.run.upgrades[row.id] ?? 0;
      const cost = nextTierCost(row.id, cur);
      // swap the row's sprite to the owned tier (art runs 0..5)
      const key = 'up_' + row.id + '_' + Math.min(cur, 5);
      if (this.scene.textures.exists(key)) {
        const src = this.scene.textures.get(key).getSourceImage() as { width: number; height: number };
        row.thumb.setTexture(key).setScale(Math.min(44 / src.width, 38 / src.height));
      }
      row.tierText.setText(`${def.tiers[cur].name}  ·  ${def.tiers[cur].value}${def.unit}`);
      if (cost === null) {
        row.btn.setLabel('MAX').setEnabled(false);
      } else {
        row.btn.setLabel('$' + cost.toLocaleString()).setEnabled(this.run.cash >= cost);
      }
    }

    for (const row of this.itemRows) {
      const it = ITEMS.find((i) => i.id === row.id)!;
      row.ownText.setText(`owned ${this.run.items[it.id] ?? 0}  ·  ${it.blurb}`);
      row.btn.setLabel('$' + it.cost.toLocaleString()).setEnabled(this.run.cash >= it.cost);
    }
  }

  destroy(): void {
    this.scene.scale.off('resize', this.onResize);
    this.dim.destroy();
    this.root.destroy(true);
  }
}
