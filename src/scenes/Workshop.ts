import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App } from '../core/state';
import { META_UPGRADES, metaNextCost, META_UPGRADE_BY_ID } from '../config/metaUpgrades';
import { LOADOUTS } from '../config/loadouts';
import { Sound } from '../systems/audio';

export class Workshop extends Phaser.Scene {
  private coresText!: Phaser.GameObjects.Text;
  private rows: { id: string; level: Phaser.GameObjects.Text; btn: Button }[] = [];
  private loadoutBtns: { id: string; btn: Button }[] = [];

  constructor() {
    super('Workshop');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.add.text(cx, 50, 'WORKSHOP', title(32)).setOrigin(0.5);
    this.coresText = this.add.text(cx, 86, '', textStyle(18, COL.accent)).setOrigin(0.5);
    this.add.text(cx, 112, 'Spend Cores on permanent upgrades — dying still pays off.', textStyle(12, COL.dim)).setOrigin(0.5);

    const bx = 24;
    const bw = BASE_W - 48;
    const SPRITE: Record<string, string> = { fuelCell: 'up_fuel_0', reinforce: 'up_hull_0', sharpDrill: 'up_drill_0', bigBay: 'up_cargo_0' };
    let y = 140;
    this.add.text(bx, y, 'PERMANENT UPGRADES', textStyle(13, COL.faint)).setLetterSpacing(2);
    y += 24;
    for (const u of META_UPGRADES) {
      makePanel(this, bx, y, bw, 56, { alpha: 0.6 });
      const sk = SPRITE[u.id];
      if (sk && this.textures.exists(sk)) {
        const im = this.add.image(bx + 26, y + 28, sk);
        const src = this.textures.get(sk).getSourceImage() as { width: number; height: number };
        im.setScale(Math.min(40 / src.width, 44 / src.height));
      } else {
        const dot = this.add.graphics();
        dot.fillStyle(u.color, 1);
        dot.fillCircle(bx + 24, y + 26, 9);
        this.add.text(bx + 24, y + 26, '◈', textStyle(13, 0x2a1c05)).setOrigin(0.5);
      }
      this.add.text(bx + 52, y + 8, u.name, textStyle(16, COL.text));
      const level = this.add.text(bx + 52, y + 30, '', textStyle(12, COL.dim));
      const btn = new Button(this, bx + bw - 78, y + 28, 132, 38, '', () => this.buy(u.id), { fontSize: 14 });
      this.rows.push({ id: u.id, level, btn });
      y += 64;
    }

    y += 6;
    this.add.text(bx, y, 'UNLOCK PILOTS', textStyle(13, COL.faint)).setLetterSpacing(2);
    y += 24;
    const locked = LOADOUTS.filter((l) => !l.unlockedByDefault);
    for (const l of locked) {
      makePanel(this, bx, y, bw, 52, { alpha: 0.6 });
      const dot = this.add.graphics();
      dot.fillStyle(l.color, 1);
      dot.fillCircle(bx + 22, y + 18, 7);
      this.add.text(bx + 40, y + 6, l.name, textStyle(15, COL.text));
      this.add.text(bx + 40, y + 26, l.blurb, textStyle(11, COL.dim, { wordWrap: { width: bw - 220 } }));
      const btn = new Button(this, bx + bw - 70, y + 24, 116, 38, '', () => this.unlock(l.id), { fontSize: 13 });
      this.loadoutBtns.push({ id: l.id, btn });
      y += 60;
    }

    new Button(this, cx, BASE_H - 46, 240, 48, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });

    this.refresh();
  }

  private buy(id: string): void {
    const cur = App.meta.metaUpgrades[id] ?? 0;
    const cost = metaNextCost(id, cur);
    if (cost === null || App.meta.cores < cost) return;
    App.meta.cores -= cost;
    App.meta.metaUpgrades[id] = cur + 1;
    App.saveNow();
    Sound.upgrade();
    this.refresh();
  }

  private unlock(id: string): void {
    const l = LOADOUTS.find((x) => x.id === id);
    if (!l || !l.coreCost || App.meta.unlockedLoadouts.includes(id)) return;
    if (App.meta.cores < l.coreCost) return;
    App.meta.cores -= l.coreCost;
    App.meta.unlockedLoadouts.push(id);
    App.saveNow();
    Sound.upgrade();
    this.refresh();
  }

  private refresh(): void {
    this.coresText.setText(`◈ ${App.meta.cores} Cores`);
    for (const row of this.rows) {
      const def = META_UPGRADE_BY_ID[row.id];
      const lvl = App.meta.metaUpgrades[row.id] ?? 0;
      row.level.setText(`${def.blurb}   [${lvl}/${def.maxLevel}]`);
      const cost = metaNextCost(row.id, lvl);
      if (cost === null) row.btn.setLabel('MAX').setEnabled(false);
      else row.btn.setLabel(`◈ ${cost}`).setEnabled(App.meta.cores >= cost);
    }
    for (const lb of this.loadoutBtns) {
      const l = LOADOUTS.find((x) => x.id === lb.id)!;
      if (App.meta.unlockedLoadouts.includes(lb.id)) lb.btn.setLabel('OWNED').setEnabled(false);
      else lb.btn.setLabel(`◈ ${l.coreCost}`).setEnabled(App.meta.cores >= (l.coreCost ?? 0));
    }
  }
}
