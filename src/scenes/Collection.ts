import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title, monoStyle, css } from '../ui/theme';
import { Button } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App } from '../core/state';
import { ORES } from '../config/ores';
import { FOSSILS, ARTIFACTS } from '../config/specials';

type Tab = 'min' | 'fos' | 'art';

interface CardData {
  known: boolean;
  art?: string;
  glyph?: string;
  name: string;
  sub: string;
  tint: number;
}

export class Collection extends Phaser.Scene {
  private tab: Tab = 'min';
  private group?: Phaser.GameObjects.Container;
  private tabTexts: Partial<Record<Tab, Phaser.GameObjects.Text>> = {};

  constructor() {
    super('Collection');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);

    this.add.text(cx, 44, 'THE VAULT', title(30)).setOrigin(0.5).setLetterSpacing(2);

    const col = App.meta.collection;
    const oresFound = ORES.filter((o) => (col.ores[o.id] ?? 0) > 0).length;
    const total = ORES.length + FOSSILS.length + ARTIFACTS.length;
    const found = oresFound + col.fossils.length + col.artifacts.length;
    this.add
      .text(cx, 78, `${found} / ${total} DISCOVERED · ${Math.round((found / total) * 100)}%`, monoStyle(14, COL.accent))
      .setOrigin(0.5)
      .setLetterSpacing(1);

    this.tabTexts.min = this.makeTab(cx - 150, 118, `MINERALS ${oresFound}/${ORES.length}`, 'min');
    this.tabTexts.fos = this.makeTab(cx, 118, `FOSSILS ${col.fossils.length}/${FOSSILS.length}`, 'fos');
    this.tabTexts.art = this.makeTab(cx + 150, 118, `RELICS ${col.artifacts.length}/${ARTIFACTS.length}`, 'art');

    new Button(this, cx, BASE_H - 48, 240, 50, '‹ MENU', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });

    this.render();
  }

  private makeTab(x: number, y: number, label: string, t: Tab): Phaser.GameObjects.Text {
    const on = this.tab === t;
    const txt = this.add
      .text(x, y, label, textStyle(13, on ? COL.brand : COL.dim))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    txt.on('pointerup', () => {
      if (this.tab === t) return;
      this.tab = t;
      this.refreshTabs();
      this.render();
    });
    return txt;
  }

  private refreshTabs(): void {
    (Object.keys(this.tabTexts) as Tab[]).forEach((t) => {
      this.tabTexts[t]?.setColor(css(this.tab === t ? COL.brand : COL.dim));
    });
  }

  private render(): void {
    this.group?.destroy(true);
    this.group = this.add.container(0, 0);
    const cards = this.cards();

    const cols = 4;
    const cellW = 126;
    const cellH = 138;
    const gw = cols * cellW;
    const x0 = (BASE_W - gw) / 2 + 6;
    const y0 = 156;
    cards.forEach((c, i) => {
      const x = x0 + (i % cols) * cellW;
      const y = y0 + Math.floor(i / cols) * cellH;
      this.card(x, y, cellW - 10, cellH - 10, c);
    });
  }

  private card(x: number, y: number, w: number, h: number, c: CardData): void {
    const G = this.group!;
    const g = this.add.graphics();
    g.fillStyle(c.known ? 0x171728 : 0x101019, 0.92);
    g.fillRoundedRect(x, y, w, h, 10);
    g.lineStyle(1.5, c.known ? c.tint : COL.border, c.known ? 0.9 : 0.45);
    g.strokeRoundedRect(x, y, w, h, 10);
    G.add(g);

    if (c.known && c.art && this.textures.exists(c.art)) {
      const img = this.add.image(x + w / 2, y + h * 0.4, c.art);
      img.setScale(Math.min((w * 0.62) / img.width, (h * 0.52) / img.height));
      G.add(img);
    } else if (c.known && c.glyph) {
      G.add(this.add.text(x + w / 2, y + h * 0.36, c.glyph, title(30, c.tint)).setOrigin(0.5));
    } else {
      G.add(this.add.text(x + w / 2, y + h * 0.34, '?', title(28, COL.faint)).setOrigin(0.5));
    }

    if (c.known) {
      G.add(this.add.text(x + w / 2, y + h - 34, c.name, textStyle(11, COL.text, { align: 'center', wordWrap: { width: w - 8 } })).setOrigin(0.5, 0));
      G.add(this.add.text(x + w / 2, y + h - 16, c.sub, monoStyle(10, COL.crtDim)).setOrigin(0.5, 0));
    } else {
      G.add(this.add.text(x + w / 2, y + h - 24, 'UNDISCOVERED', monoStyle(8, COL.faint)).setOrigin(0.5, 0).setLetterSpacing(1));
    }
  }

  private cards(): CardData[] {
    const col = App.meta.collection;
    if (this.tab === 'min') {
      return ORES.map((o) => {
        const count = col.ores[o.id] ?? 0;
        return {
          known: count > 0,
          art: 'src_ore_' + o.id,
          name: o.name,
          sub: `$${o.value} ·×${count}`,
          tint: o.color,
        };
      });
    }
    if (this.tab === 'fos') {
      return FOSSILS.map((f) => {
        const known = col.fossils.includes(f.id);
        return {
          known,
          art: 'fossil_' + f.id,
          glyph: '🦴',
          name: f.name,
          sub: `${f.minDepth}m`,
          tint: 0xffe9b0,
        };
      });
    }
    return ARTIFACTS.map((a) => {
      const known = col.artifacts.includes(a.id);
      return {
        known,
        glyph: '✦',
        name: a.name,
        sub: `$${a.value.toLocaleString()}`,
        tint: 0xc792ff,
      };
    });
  }
}
