/**
 * The surface outpost — three distinct CGI machines (DesignHandoff "DEEPER Outpost Shop"):
 *   • AutoBuy 2000      (shell_shop_upgrades)  — category rail + 6-tier upgrade grid
 *   • Propellant Vendor (shell_shop_fuel)      — fuel gauge instrument + $ buttons
 *   • Mineral Processor (shell_shop_proc)      — sell table + SELL ALL (+ repair)
 *
 * Each machine's UI is composited onto its shell using the exact %/cqw positions from the
 * handoff mockup. All overlay objects live in a scrollFactor-0 root that `layout()` fits to
 * the window; interactive zones use the screen-space `uiHit` (see ui/hit.ts).
 */
import Phaser from 'phaser';
import { BASE_W, BASE_H, FUEL, HULL } from '../config/gameplay';
import { COL, textStyle, monoStyle, css } from './theme';
import { Button } from './widgets';
import { UPGRADES, nextTierCost, UPGRADE_BY_ID, type UpgradeCategory } from '../config/upgrades';
import { ITEMS } from '../config/items';
import { ORE_BY_ID } from '../config/ores';
import type { RunState } from '../core/types';
import type { DerivedStats } from '../systems/stats';
import { cargoValue, sellCargo } from '../systems/run';
import { Sound } from '../systems/audio';
import { uiHit, swallowHit } from './hit';
import type { Fx } from '../systems/fx';

export type ShopMode = 'auto' | 'fuel' | 'proc';

const SHELL: Record<ShopMode, { tex: string; ar: number }> = {
  auto: { tex: 'shell_shop_upgrades', ar: 1536 / 1024 },
  fuel: { tex: 'shell_shop_fuel', ar: 1455 / 1081 },
  proc: { tex: 'shell_shop_processor', ar: 1536 / 1024 },
};

// machine placement in the 540×960 design root
const MW = 540;
const MCY = 442;

export class SurfaceMenu {
  private scene: Phaser.Scene;
  private run: RunState;
  private getStats: () => DerivedStats;
  private recompute: () => DerivedStats;
  private onClose: () => void;
  private fx: Fx;

  private root: Phaser.GameObjects.Container;
  private machineRoot!: Phaser.GameObjects.Container;
  private tabsRoot!: Phaser.GameObjects.Container;
  private dim!: Phaser.GameObjects.Rectangle;
  private onResize: () => void = () => {};
  isOpen = false;

  private mode: ShopMode = 'auto';
  private catIdx = 0; // selected AutoBuy category

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
    this.dim = scene.add
      .rectangle(0, 0, 6000, 6000, 0x05050a, 0.78)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1999)
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), swallowHit)
      .setVisible(false);
    this.tabsRoot = scene.add.container(0, 0);
    this.machineRoot = scene.add.container(0, 0);
    this.root.add([this.tabsRoot, this.machineRoot]);
    this.buildTabs();
    this.onResize = () => {
      if (this.isOpen) this.layout();
    };
    scene.scale.on('resize', this.onResize);
  }

  /** Fit-and-centre the 540×960 root into the current window. */
  private layout(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const s = Math.min(W / BASE_W, H / BASE_H, 1.15);
    this.root.setScale(s).setPosition((W - BASE_W * s) / 2, (H - BASE_H * s) / 2);
  }

  // ---- persistent tabs + close ----
  private buildTabs(): void {
    const tabs: [ShopMode, string][] = [
      ['proc', 'PROCESSOR'],
      ['fuel', 'PROPELLANT'],
      ['auto', 'AUTOBUY'],
    ];
    tabs.forEach(([m, label], i) => {
      const x = BASE_W / 2 + (i - 1) * 168;
      const btn = new Button(this.scene, x, 44, 158, 44, label, () => this.setMode(m), {
        fontSize: 15,
        fixed: true,
      });
      this.tabsRoot.add(btn);
    });
    const descend = new Button(this.scene, BASE_W / 2, BASE_H - 50, BASE_W - 120, 48, '▼  DESCEND', () => this.close(), {
      fill: COL.brand,
      textColor: 0x1a1400,
      fontSize: 20,
      fixed: true,
    });
    this.tabsRoot.add(descend);
    this.tabsRoot.add(
      this.scene.add.text(BASE_W / 2, BASE_H - 22, 'ESC also closes', monoStyle(11, COL.faint)).setOrigin(0.5),
    );
  }

  open(mode: ShopMode = 'auto'): void {
    this.mode = mode;
    if (!this.isOpen) {
      this.isOpen = true;
      this.layout();
      this.dim.setVisible(true);
      this.root.setVisible(true);
      this.root.setAlpha(0);
      this.dim.setAlpha(0);
      this.scene.tweens.add({ targets: [this.root, this.dim], alpha: 1, duration: 160 });
    }
    this.render();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.setVisible(false);
    this.dim.setVisible(false);
    Sound.click();
    this.onClose();
  }

  private setMode(m: ShopMode): void {
    if (this.mode === m && this.isOpen) return;
    this.mode = m;
    Sound.click();
    this.render();
  }

  /** Public hook used by the scene to refresh after external state changes. */
  refresh(): void {
    if (this.isOpen) this.render();
  }

  // ---- machine geometry helpers (depend on current shell) ----
  private geo() {
    const ar = SHELL[this.mode].ar;
    const w = MW;
    const h = MW / ar;
    const left = BASE_W / 2 - w / 2;
    const top = MCY - h / 2;
    return {
      w,
      h,
      left,
      top,
      PX: (p: number) => left + (p / 100) * w,
      PY: (p: number) => top + (p / 100) * h,
      CW: (v: number) => (v / 100) * w,
    };
  }

  private render(): void {
    this.machineRoot.removeAll(true);
    const g = this.geo();
    const tex = SHELL[this.mode].tex;
    if (this.scene.textures.exists(tex)) {
      const img = this.scene.add.image(BASE_W / 2, MCY, tex).setDisplaySize(g.w, g.h);
      this.machineRoot.add(img);
    }

    if (this.mode === 'auto') this.renderAuto(g);
    else if (this.mode === 'fuel') this.renderFuel(g);
    else this.renderProc(g);
  }

  // small helpers to add composited overlay objects to the machine
  private add<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.machineRoot.add(o);
    return o;
  }
  private hotzone(x: number, y: number, w: number, h: number, onClick: () => void): void {
    const z = this.scene.add
      .zone(x + w / 2, y + h / 2, w, h)
      .setScrollFactor(0)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), uiHit);
    z.on('pointerup', onClick);
    this.machineRoot.add(z);
  }

  // ======================= AutoBuy 2000 =======================
  private renderAuto(g: ReturnType<SurfaceMenu['geo']>): void {
    const s = this.getStats();
    void s;
    const cat = UPGRADES[this.catIdx];
    const cur = this.run.upgrades[cat.id] ?? 0;

    // LCD category label (17.2%, 8.0%, 24%×7.2%)
    this.add(
      this.scene.add
        .text(g.PX(17.2 + 12), g.PY(8.0 + 3.6), cat.name.toUpperCase(), monoStyle(g.CW(2.4), COL.crt))
        .setOrigin(0.5)
        .setLetterSpacing(3),
    );
    // AutoBuy logo (silver / red) at 44%,5.4%
    this.add(this.scene.add.text(g.PX(81), g.PY(5.4), 'AutoBuy', textStyle(g.CW(4.0), 0xd7dee6)).setOrigin(1, 0));
    this.add(this.scene.add.text(g.PX(81), g.PY(5.4 + 4.4), '2000', textStyle(g.CW(3.5), 0xff6a48)).setOrigin(1, 0));
    // cash (44%,19.2%, right)
    this.add(
      this.scene.add
        .text(g.PX(81), g.PY(19.2), '$' + Math.floor(this.run.cash).toLocaleString(), textStyle(g.CW(3), COL.brand))
        .setOrigin(1, 0),
    );

    // category rail at top 20.1% — positions from the handoff
    const POS = [11.2, 16.8, 22.3, 28.0, 33.4, 38.7, 44.4, 49.8];
    UPGRADES.forEach((u, i) => {
      const x = g.PX(POS[i]);
      const y = g.PY(20.1 + 2.75);
      const on = i === this.catIdx;
      const dot = this.scene.add.graphics();
      dot.fillStyle(u.color, on ? 1 : 0.5);
      dot.fillCircle(x, y, g.CW(1.5));
      if (on) {
        dot.lineStyle(g.CW(0.4), 0xffffff, 0.9);
        dot.strokeCircle(x, y, g.CW(1.9));
      }
      this.add(dot);
      this.add(this.scene.add.text(x, y, u.name[0], monoStyle(g.CW(1.7), 0x0a0c0e)).setOrigin(0.5));
      this.hotzone(x - g.CW(2.6), y - g.CW(2.6), g.CW(5.2), g.CW(5.2), () => {
        this.catIdx = i;
        Sound.click();
        this.render();
      });
    });
    // EXIT at POS[7]
    {
      const x = g.PX(POS[7]);
      const y = g.PY(20.1 + 2.75);
      this.add(this.scene.add.text(x, y, '✕', monoStyle(g.CW(2.2), 0x1a0c08)).setOrigin(0.5));
      this.hotzone(x - g.CW(2.6), y - g.CW(2.6), g.CW(5.2), g.CW(5.2), () => this.close());
    }

    // CURRENT label + cell + name (11%..)
    this.add(this.scene.add.text(g.PX(13.6), g.PY(35.4), 'CURRENT:', monoStyle(g.CW(1.9), COL.crtDim)).setLetterSpacing(1));
    this.cell(g, 11, 40.0, 28.4, 42.6, true);
    const curKey = 'up_' + cat.id + '_' + Math.max(0, Math.min(5, cur - 1));
    if (cur > 0 && this.scene.textures.exists(curKey)) this.sprite(g, curKey, 11, 40.0, 28.4, 42.6, cur > 0 ? 1 : 0.4);
    else if (this.scene.textures.exists('up_' + cat.id + '_0')) this.sprite(g, 'up_' + cat.id + '_0', 11, 40.0, 28.4, 42.6, 0.4);
    this.add(
      this.scene.add
        .text(g.PX(11 + 14.2), g.PY(77.2), cat.tiers[cur].name, monoStyle(g.CW(1.8), COL.crt))
        .setOrigin(0.5, 0),
    );

    // AVAILABLE UPGRADES label
    this.add(this.scene.add.text(g.PX(39.8), g.PY(35.4), 'AVAILABLE UPGRADES:', monoStyle(g.CW(1.9), COL.crtDim)).setLetterSpacing(1));

    // 6 upgrade cells (tier i+1 -> sprite up_<cat>_i)
    const CELLS = [
      [39.9, 40.0],
      [55.2, 40.0],
      [70.5, 40.0],
      [39.9, 62.2],
      [55.2, 62.2],
      [70.5, 62.2],
    ];
    const maxTier = cat.tiers.length - 1;
    CELLS.forEach(([lx, ly], i) => {
      const tier = i + 1;
      if (tier > maxTier) return; // scanner has fewer
      const owned = tier <= cur;
      const buyable = tier === cur + 1;
      this.cell(g, lx, ly, 13.7, 20.4, buyable);
      const spr = 'up_' + cat.id + '_' + Math.min(i, 5);
      if (this.scene.textures.exists(spr)) this.sprite(g, spr, lx, ly, 13.7, 20.4, owned ? 0.55 : buyable ? 1 : 0.7);
      // price / state tag
      const cost = cat.tiers[tier].cost;
      const tag = owned ? '✓' : '$' + cost.toLocaleString();
      const col = owned ? COL.crtDim : buyable && this.run.cash >= cost ? COL.brand : COL.faint;
      this.add(this.scene.add.text(g.PX(lx + 13.0), g.PY(ly + 17.5), tag, monoStyle(g.CW(1.5), col)).setOrigin(1, 0));
      if (buyable) {
        this.hotzone(g.PX(lx), g.PY(ly), g.CW(13.7), g.CW(13.7 / (1536 / 1024)) + g.CW(6.7), () => this.buyUpgrade(cat.id));
      }
    });

    // consumables strip below the machine
    this.renderConsumables(g);
  }

  private cell(g: ReturnType<SurfaceMenu['geo']>, lx: number, ly: number, wPct: number, hPct: number, hot: boolean): void {
    const x = g.PX(lx);
    const y = g.PY(ly);
    const w = (wPct / 100) * g.w;
    const h = (hPct / 100) * g.h;
    const gr = this.scene.add.graphics();
    gr.fillStyle(0x040703, 0.92);
    gr.fillRoundedRect(x, y, w, h, g.CW(0.9));
    gr.lineStyle(g.CW(0.18), hot ? COL.crt : COL.crtDim, hot ? 0.9 : 0.5);
    gr.strokeRoundedRect(x, y, w, h, g.CW(0.9));
    this.add(gr);
  }

  private sprite(g: ReturnType<SurfaceMenu['geo']>, key: string, lx: number, ly: number, wPct: number, hPct: number, alpha: number): void {
    const x = g.PX(lx) + ((wPct / 100) * g.w) / 2;
    const y = g.PY(ly) + ((hPct / 100) * g.h) / 2;
    const boxW = (wPct / 100) * g.w * 0.9;
    const boxH = (hPct / 100) * g.h * 0.9;
    const img = this.scene.add.image(x, y, key).setAlpha(alpha);
    const src = this.scene.textures.get(key).getSourceImage() as { width: number; height: number };
    img.setScale(Math.min(boxW / src.width, boxH / src.height));
    this.add(img);
  }

  private renderConsumables(g: ReturnType<SurfaceMenu['geo']>): void {
    const y = g.top + g.h + 18;
    if (y > BASE_H - 110) return;
    this.add(this.scene.add.text(BASE_W / 2, y, 'SUPPLIES', monoStyle(13, COL.crtDim)).setOrigin(0.5).setLetterSpacing(2));
    const items = ITEMS;
    const cols = 3;
    const cw = 168;
    const ch = 30;
    const x0 = (BASE_W - cols * cw) / 2 + 6;
    items.forEach((it, i) => {
      const x = x0 + (i % cols) * cw;
      const yy = y + 24 + Math.floor(i / cols) * (ch + 6);
      const own = this.run.items[it.id] ?? 0;
      const afford = this.run.cash >= it.cost;
      const gr = this.scene.add.graphics();
      gr.fillStyle(0x141426, 0.9);
      gr.fillRoundedRect(x, yy, cw - 8, ch, 7);
      gr.lineStyle(1.2, afford ? it.color : COL.border, afford ? 0.8 : 0.4);
      gr.strokeRoundedRect(x, yy, cw - 8, ch, 7);
      this.add(gr);
      this.add(this.scene.add.text(x + 8, yy + 6, `${it.name}`, textStyle(11, afford ? COL.text : COL.faint)));
      this.add(this.scene.add.text(x + cw - 16, yy + 6, `$${(it.cost / 1000).toFixed(it.cost >= 1000 ? 1 : 0)}k·${own}`, monoStyle(10, afford ? COL.brand : COL.faint)).setOrigin(1, 0));
      this.hotzone(x, yy, cw - 8, ch, () => this.buyItem(it.id));
    });
  }

  // ======================= Propellant Vendor =======================
  private renderFuel(g: ReturnType<SurfaceMenu['geo']>): void {
    this.add(this.scene.add.text(g.PX(5.5), g.PY(6), 'Propellant Vendor', textStyle(g.CW(3.3), 0xd7dee6)));
    this.add(this.scene.add.text(g.PX(84), g.PY(6.6), '$' + Math.floor(this.run.cash).toLocaleString(), textStyle(g.CW(3.2), COL.brand)).setOrigin(1, 0));

    const pct = Math.max(0, Math.min(1, this.run.fuel / this.run.fuelMax));
    this.add(
      this.scene.add
        .text(g.PX(12.5 + 7.75), g.PY(77 + 3.75), `${Math.round(this.run.fuel)} / ${this.run.fuelMax} L`, monoStyle(g.CW(1.8), COL.crt))
        .setOrigin(0.5),
    );

    // gauge instrument (12.4%, 24.6%, 15%×50.8%)
    const gx = g.PX(12.4);
    const gy = g.PY(24.6);
    const gw = g.CW(15);
    const gh = (50.8 / 100) * g.h;
    const low = pct <= 0.2;
    const gr = this.scene.add.graphics();
    gr.fillStyle(0x191510, 1);
    gr.fillRoundedRect(gx, gy, gw, gh, g.CW(1.7));
    // glass slot
    const pad = g.CW(1.1);
    const slotX = gx + pad;
    const slotY = gy + pad;
    const slotW = gw * 0.62 - pad;
    const slotH = gh - pad * 2;
    gr.fillStyle(0x0b0a07, 1);
    gr.fillRoundedRect(slotX, slotY, slotW, slotH, g.CW(0.9));
    // liquid
    const lh = slotH * pct;
    gr.fillStyle(low ? 0xff6a3a : 0xffd84d, 1);
    gr.fillRoundedRect(slotX + 2, slotY + slotH - lh, slotW - 4, lh, g.CW(0.7));
    // tick rail
    const railX = slotX + slotW + g.CW(0.6);
    const railW = gw - slotW - pad * 2 - g.CW(0.6);
    gr.fillStyle(0x39342a, 1);
    gr.fillRoundedRect(railX, slotY, railW, slotH, g.CW(0.5));
    this.add(gr);
    this.add(this.scene.add.text(railX + railW / 2, slotY + 2, 'F', textStyle(g.CW(1.5), 0xe8dfb8)).setOrigin(0.5, 0));
    this.add(this.scene.add.text(railX + railW / 2, slotY + slotH - 2, 'E', textStyle(g.CW(1.5), 0xe8dfb8)).setOrigin(0.5, 1));

    // buttons: buy $X of fuel; FILL = full
    const fbtn = (lx: number, ly: number, wPct: number, hPct: number, label: string, onClick: () => void) => {
      const x = g.PX(lx);
      const y = g.PY(ly);
      const w = (wPct / 100) * g.w;
      const h = (hPct / 100) * g.h;
      this.add(this.scene.add.text(x + w / 2, y + h / 2, label, textStyle(g.CW(3.2), 0x160805)).setOrigin(0.5));
      this.hotzone(x, y, w, h, onClick);
    };
    const buy = (dollars: number) => {
      const perL = FUEL.refuelCostPerUnit;
      const want = dollars / perL;
      const missing = this.run.fuelMax - this.run.fuel;
      const liters = Math.min(want, missing, this.run.cash / perL);
      if (liters <= 0.01) return;
      this.run.fuel += liters;
      this.run.cash -= Math.ceil(liters * perL);
      Sound.click();
      this.render();
    };
    fbtn(56.6, 26.8, 12.4, 8.2, '$5', () => buy(5));
    fbtn(75.9, 27.0, 12.6, 7.8, '$10', () => buy(10));
    fbtn(56.6, 47.1, 12.2, 7.8, '$25', () => buy(25));
    fbtn(75.9, 47.1, 12.6, 8.0, '$50', () => buy(50));
    fbtn(57.6, 68.3, 30.7, 9.3, 'FILL TANK', () => this.doRefuel());
  }

  // ======================= Mineral Processor =======================
  private renderProc(g: ReturnType<SurfaceMenu['geo']>): void {
    const s = this.getStats();
    this.add(this.scene.add.text(g.PX(14.8), g.PY(6.4), 'Mineral Processor', textStyle(g.CW(3.4), 0xd7dee6)));
    this.add(this.scene.add.text(g.PX(78), g.PY(7.4), '$' + Math.floor(this.run.cash).toLocaleString(), textStyle(g.CW(3.2), COL.brand)).setOrigin(1, 0));

    const tx = g.PX(17.5);
    const tw = (65 / 100) * g.w;
    let ty = g.PY(22.5);
    const colName = tx;
    const colQty = tx + tw * 0.61;
    const colVal = tx + tw * 0.78;
    const colTot = tx + tw;
    // header
    this.add(this.scene.add.text(colName, ty, 'CARGO BAY', textStyle(g.CW(1.8), 0xc2cfc4)));
    this.add(this.scene.add.text(colQty, ty, 'QTY', textStyle(g.CW(1.8), 0xc2cfc4)).setOrigin(1, 0));
    this.add(this.scene.add.text(colVal, ty, 'VALUE', textStyle(g.CW(1.8), 0xc2cfc4)).setOrigin(1, 0));
    this.add(this.scene.add.text(colTot, ty, 'TOTAL', textStyle(g.CW(1.8), 0xc2cfc4)).setOrigin(1, 0));
    ty += g.CW(3.4);

    const entries = Object.entries(this.run.cargo).filter(([, q]) => q > 0);
    let grand = 0;
    if (entries.length === 0) {
      this.add(this.scene.add.text(tx + tw / 2, ty + g.CW(6), 'CARGO BAY EMPTY', monoStyle(g.CW(2), COL.crtDim)).setOrigin(0.5));
    }
    entries.slice(0, 8).forEach(([id, qty]) => {
      const ore = ORE_BY_ID[id];
      if (!ore) return;
      const val = Math.round(ore.value * s.sellMul);
      const tot = val * qty;
      grand += tot;
      const iconKey = this.scene.textures.exists('src_ore_' + id) ? 'src_ore_' + id : 'ore_' + id;
      if (this.scene.textures.exists(iconKey)) {
        const im = this.scene.add.image(colName + g.CW(1.8), ty + g.CW(1.6), iconKey);
        const src = this.scene.textures.get(iconKey).getSourceImage() as { width: number; height: number };
        im.setScale(g.CW(3.6) / Math.max(src.width, src.height));
        this.add(im);
      }
      this.add(this.scene.add.text(colName + g.CW(4.2), ty, ore.name, monoStyle(g.CW(1.85), COL.crt)));
      this.add(this.scene.add.text(colQty, ty, `${qty}×`, monoStyle(g.CW(1.85), COL.crtDim)).setOrigin(1, 0));
      this.add(this.scene.add.text(colVal, ty, `$${val}`, monoStyle(g.CW(1.85), COL.crtDim)).setOrigin(1, 0));
      this.add(this.scene.add.text(colTot, ty, `$${tot.toLocaleString()}`, monoStyle(g.CW(1.85), COL.crt)).setOrigin(1, 0));
      ty += g.CW(4.4);
    });

    // SELL ALL + grand total
    const footY = g.PY(82);
    this.add(this.scene.add.text(tx + tw / 2, footY, '[ SELL ALL ]', monoStyle(g.CW(2.7), grand > 0 ? COL.crt : COL.crtDim)).setOrigin(0.5));
    if (grand > 0) this.hotzone(tx + tw / 2 - g.CW(12), footY - g.CW(2), g.CW(24), g.CW(5), () => this.doSell());
    this.add(this.scene.add.text(colTot, footY, '$' + grand.toLocaleString(), monoStyle(g.CW(3), COL.crt)).setOrigin(1, 0.5));

    // repair button (maintenance bay) below the table
    const repCost = Math.ceil((this.run.hullMax - this.run.hull) * HULL.repairCostPerHp);
    const y2 = g.top + g.h + 18;
    if (y2 < BASE_H - 90) {
      const repair = new Button(
        this.scene,
        BASE_W / 2,
        y2 + 20,
        300,
        44,
        repCost > 0 ? `REPAIR HULL  $${repCost.toLocaleString()}` : 'HULL FULL',
        () => this.doRepair(),
        { accent: COL.hull, fontSize: 16, fixed: true },
      );
      repair.setEnabled(repCost > 0 && this.run.cash > 0);
      this.machineRoot.add(repair);
    }
  }

  // ---- actions (shared) ----
  private doSell(): void {
    const s = this.getStats();
    const val = cargoValue(this.run, s.sellMul);
    if (val <= 0) return;
    sellCargo(this.run, s.sellMul);
    Sound.sell();
    this.fx.popText(BASE_W / 2, 220, `+$${val.toLocaleString()}`, COL.cash, 28);
    this.render();
  }

  private doRefuel(): void {
    const missing = this.run.fuelMax - this.run.fuel;
    if (missing <= 0.5) return;
    const cost = Math.ceil(missing * FUEL.refuelCostPerUnit);
    if (this.run.cash < cost) {
      const afford = Math.floor(this.run.cash / FUEL.refuelCostPerUnit);
      if (afford <= 0) return;
      this.run.fuel += afford;
      this.run.cash -= Math.ceil(afford * FUEL.refuelCostPerUnit);
    } else {
      this.run.fuel = this.run.fuelMax;
      this.run.cash -= cost;
    }
    Sound.click();
    this.render();
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
    this.render();
  }

  private buyUpgrade(id: UpgradeCategory): void {
    const cur = this.run.upgrades[id] ?? 0;
    const cost = nextTierCost(id, cur);
    if (cost === null || this.run.cash < cost) return;
    this.run.cash -= cost;
    this.run.upgrades[id] = cur + 1;
    this.recompute();
    Sound.upgrade();
    this.fx.popText(BASE_W / 2, 220, `${UPGRADE_BY_ID[id].name} UP!`, UPGRADE_BY_ID[id].color, 22);
    this.render();
  }

  private buyItem(id: string): void {
    const it = ITEMS.find((i) => i.id === id);
    if (!it || this.run.cash < it.cost) return;
    this.run.cash -= it.cost;
    this.run.items[it.id] = (this.run.items[it.id] ?? 0) + 1;
    Sound.click();
    this.render();
  }

  destroy(): void {
    this.scene.scale.off('resize', this.onResize);
    this.dim.destroy();
    this.root.destroy(true);
  }
}
