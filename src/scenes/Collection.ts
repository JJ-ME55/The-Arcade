import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App } from '../core/state';
import { ORES } from '../config/ores';
import { FOSSILS, ARTIFACTS } from '../config/specials';

export class Collection extends Phaser.Scene {
  constructor() {
    super('Collection');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.add.text(cx, 52, 'COLLECTION', title(32)).setOrigin(0.5);

    const col = App.meta.collection;
    const oresFound = ORES.filter((o) => (col.ores[o.id] ?? 0) > 0).length;
    const total = ORES.length + FOSSILS.length + ARTIFACTS.length;
    const found = oresFound + col.fossils.length + col.artifacts.length;
    this.add
      .text(cx, 86, `${found} / ${total} discovered  ·  ${Math.round((found / total) * 100)}%`, textStyle(15, COL.accent))
      .setOrigin(0.5);

    // ---- ores grid ----
    this.add.text(28, 116, 'MINERALS', textStyle(14, COL.faint)).setLetterSpacing(2);
    const cols = 5;
    const cellW = 96;
    const cellH = 64;
    const gx = 28;
    let gy = 140;
    ORES.forEach((o, i) => {
      const x = gx + (i % cols) * cellW;
      const y = gy + Math.floor(i / cols) * cellH;
      const count = col.ores[o.id] ?? 0;
      const known = count > 0;
      const g = this.add.graphics();
      g.fillStyle(known ? 0x1c1c30 : 0x121220, 1);
      g.fillRoundedRect(x, y, cellW - 8, cellH - 8, 8);
      g.lineStyle(1.5, known ? o.color : COL.border, 1);
      g.strokeRoundedRect(x, y, cellW - 8, cellH - 8, 8);
      if (known) {
        this.add.image(x + (cellW - 8) / 2, y + 22, 'ore_' + o.id).setScale(0.7);
        this.add.text(x + (cellW - 8) / 2, y + 42, `${o.name} ×${count}`, textStyle(10, COL.dim)).setOrigin(0.5);
      } else {
        this.add.text(x + (cellW - 8) / 2, y + 26, '?', textStyle(22, COL.faint)).setOrigin(0.5);
      }
    });
    gy += Math.ceil(ORES.length / cols) * cellH + 12;

    // ---- fossils ----
    this.add.text(28, gy, 'FOSSILS', textStyle(14, COL.faint)).setLetterSpacing(2);
    gy += 22;
    FOSSILS.forEach((f, i) => {
      const x = 28 + (i % 2) * 244;
      const y = gy + Math.floor(i / 2) * 30;
      const known = col.fossils.includes(f.id);
      this.add.text(x, y, (known ? '🦴 ' : '◌ ') + (known ? f.name : '???'), textStyle(14, known ? 0xffe9b0 : COL.faint));
    });
    gy += Math.ceil(FOSSILS.length / 2) * 30 + 14;

    // ---- artifacts ----
    this.add.text(28, gy, 'ARTIFACTS', textStyle(14, COL.faint)).setLetterSpacing(2);
    gy += 22;
    ARTIFACTS.forEach((a, i) => {
      const x = 28 + (i % 2) * 244;
      const y = gy + Math.floor(i / 2) * 30;
      const known = col.artifacts.includes(a.id);
      this.add.text(x, y, (known ? '✦ ' : '◌ ') + (known ? a.name : '???'), textStyle(14, known ? 0xeaddff : COL.faint));
    });

    new Button(this, cx, BASE_H - 50, 240, 50, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });
  }
}
