/** Reusable UI widgets: Button, panel helpers. */
import Phaser from 'phaser';
import { COL, textStyle } from './theme';
import { uiHit } from './hit';

export interface ButtonOpts {
  fill?: number;
  border?: number;
  textColor?: number;
  fontSize?: number;
  align?: 'center' | 'left';
  accent?: number; // left accent stripe
  /**
   * Set for screen-anchored (scrollFactor-0) buttons inside a scrolling scene — uses the
   * screen-space hit test, since Phaser's default tests in world space and misses by the
   * camera scroll.
   */
  fixed?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private bw: number;
  private bh: number;
  private enabled = true;
  private opts: Required<Omit<ButtonOpts, 'accent' | 'fixed'>> & { accent?: number };
  private onClick: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    opts: ButtonOpts = {},
  ) {
    super(scene, x, y);
    this.bw = w;
    this.bh = h;
    this.onClick = onClick;
    this.opts = {
      fill: opts.fill ?? COL.panelHi,
      border: opts.border ?? COL.borderHi,
      textColor: opts.textColor ?? COL.text,
      fontSize: opts.fontSize ?? 22,
      align: opts.align ?? 'center',
      accent: opts.accent,
    };

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, text, textStyle(this.opts.fontSize, this.opts.textColor))
      .setOrigin(this.opts.align === 'center' ? 0.5 : 0, 0.5);
    if (this.opts.align === 'left') this.label.setX(-w / 2 + 18);
    this.add([this.bg, this.label]);

    this.setSize(w, h);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      opts.fixed ? uiHit : Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerover', () => this.draw(1));
    this.on('pointerout', () => this.draw(0));
    this.on('pointerdown', () => {
      if (this.enabled) this.draw(2);
    });
    this.on('pointerup', () => {
      if (!this.enabled) return;
      this.draw(1);
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 90, ease: 'Back.out' });
      this.onClick();
    });
    this.on('pointerdown', () => {
      if (this.enabled)
        this.scene.tweens.add({ targets: this, scaleX: 0.96, scaleY: 0.96, duration: 60 });
    });

    this.draw(0);
    scene.add.existing(this);
  }

  private draw(state: 0 | 1 | 2): void {
    const g = this.bg;
    g.clear();
    const a = !this.enabled ? 0.4 : 1;
    let fill = this.opts.fill;
    let border = this.opts.border;
    if (this.enabled && state === 1) {
      fill = COL.panelHi;
      border = COL.brand;
    } else if (this.enabled && state === 2) {
      fill = COL.panel;
    }
    g.fillStyle(fill, a);
    g.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 10);
    // steel bevel: a lit top sheen (reads on both dark steel and the gold CTA)
    g.fillStyle(0xffffff, 0.09);
    g.fillRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh * 0.44, { tl: 10, tr: 10, bl: 0, br: 0 });
    g.lineStyle(2, border, a);
    g.strokeRoundedRect(-this.bw / 2, -this.bh / 2, this.bw, this.bh, 10);
    if (this.opts.accent !== undefined) {
      g.fillStyle(this.opts.accent, a);
      g.fillRoundedRect(-this.bw / 2 + 4, -this.bh / 2 + 6, 5, this.bh - 12, 3);
    }
  }

  setEnabled(b: boolean): this {
    this.enabled = b;
    this.label.setAlpha(b ? 1 : 0.5);
    this.draw(0);
    return this;
  }

  setLabel(s: string): this {
    this.label.setText(s);
    return this;
  }
}

/** Draw a styled panel onto a graphics object. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; border?: number; radius?: number; alpha?: number } = {},
): void {
  const fill = opts.fill ?? COL.panel;
  const border = opts.border ?? COL.border;
  const r = opts.radius ?? 14;
  const a = opts.alpha ?? 0.96;
  g.fillStyle(fill, a);
  g.fillRoundedRect(x, y, w, h, r);
  // steel bevel: lit top strip + hairline highlight + an inner gold-brown edge for definition
  g.fillStyle(COL.panelHi, a * 0.55);
  g.fillRoundedRect(x, y, w, Math.min(h * 0.4, 38), { tl: r, tr: r, bl: 0, br: 0 });
  g.fillStyle(0xffffff, 0.1);
  g.fillRect(x + r, y + 1, w - 2 * r, 1);
  g.lineStyle(2, border, 1);
  g.strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, COL.borderHi, 0.35);
  g.strokeRoundedRect(x + 1.5, y + 1.5, w - 3, h - 3, r - 1);
}

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: number; border?: number; radius?: number; alpha?: number } = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x, y, w, h, opts);
  return g;
}
