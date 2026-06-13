import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title, monoStyle, css } from '../ui/theme';
import { App, randomSeedString, dailySeedString } from '../core/state';
import { LOADOUTS, type LoadoutDef } from '../config/loadouts';
import { getActiveSeason } from '../config/seasons';
import { loadRun, clearRun, type RunSave } from '../systems/runsave';
import { dailyModifier } from '../config/modifiers';
import { fitDesign } from '../ui/layout';
import { nextGoal, playedToday } from '../systems/retention';

interface NavItem {
  label: string;
  action: () => void;
  cta?: boolean;
  dim?: boolean;
}

export class MainMenu extends Phaser.Scene {
  private loadoutIdx = 0;
  private loadoutName!: Phaser.GameObjects.Text;
  private loadoutBlurb!: Phaser.GameObjects.Text;
  private loadoutSwatch!: Phaser.GameObjects.Graphics;
  private glass = { x: 0, y: 0, w: 0, h: 0 };
  private navItems: NavItem[] = [];
  private navTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('MainMenu');
  }

  private unlocked(): LoadoutDef[] {
    return LOADOUTS.filter((l) => App.meta.unlockedLoadouts.includes(l.id));
  }

  create(): void {
    const cx = BASE_W / 2;
    const sky = this.add.image(0, 0, 'bg_sky');

    // hero CGI pod (DesignHandoff) — covers the WHOLE window (full-bleed, no pillarbox), with a
    // dark scrim over it for legibility. Both are re-covered on resize (see coverBleed below).
    let hero: Phaser.GameObjects.Image | undefined;
    let scrim: Phaser.GameObjects.Image | undefined;
    if (this.textures.exists('shell_menu_hero')) {
      hero = this.add.image(cx, BASE_H / 2, 'shell_menu_hero');
      ensureMenuScrim(this);
      scrim = this.add.image(cx, BASE_H / 2, 'menu_scrim');
    }

    // drifting dust motes
    this.add
      .particles(0, 0, 'soft', {
        x: { min: 0, max: BASE_W },
        y: { min: 0, max: BASE_H },
        scale: { min: 0.05, max: 0.18 },
        alpha: { start: 0.22, end: 0 },
        lifespan: 6000,
        frequency: 240,
        speedY: { min: -8, max: -22 },
        tint: 0xffcf4d,
      })
      .setDepth(1);

    // (settings is a phosphor glyph on the monitor glass — see below — not a floating widget)

    // ---- Wordmark ----
    const tGlow = this.add.text(cx, 104, 'DEEPER', title(72)).setOrigin(0.5).setLetterSpacing(7).setDepth(4);
    tGlow.setTint(COL.brand);
    tGlow.setShadow(0, 3, 'rgba(0,0,0,0.7)', 10, true, true);
    this.tweens.add({ targets: tGlow, scale: { from: 0.99, to: 1.01 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add
      .text(cx, 146, 'DIG · SELL · UPGRADE · REPEAT', monoStyle(14, COL.dim))
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setDepth(4);

    const season = getActiveSeason();
    if (season) {
      this.add
        .text(cx, 172, `★  ${season.name.toUpperCase()} IS LIVE  ★`, textStyle(13, season.accent))
        .setOrigin(0.5)
        .setLetterSpacing(1)
        .setDepth(4);
    }

    // ---- Pilot selector (a riveted metal plate + amber chevrons — no glassy UI-kit panel) ----
    const pg = this.add.graphics().setDepth(3);
    pg.fillStyle(0x130d07, 0.92);
    pg.fillRoundedRect(cx - 188, 198, 376, 104, 10);
    pg.fillStyle(0x2a2114, 0.6); // top sheen
    pg.fillRoundedRect(cx - 184, 202, 368, 20, 8);
    pg.lineStyle(2, COL.borderHi, 0.9);
    pg.strokeRoundedRect(cx - 188, 198, 376, 104, 10);
    this.add.text(cx, 212, 'PILOT', monoStyle(12, COL.crtDim)).setOrigin(0.5).setLetterSpacing(3).setDepth(4);
    this.loadoutSwatch = this.add.graphics().setDepth(4);
    this.loadoutName = this.add.text(cx, 242, '', title(23)).setOrigin(0.5).setDepth(4);
    this.loadoutBlurb = this.add
      .text(cx, 278, '', monoStyle(12, COL.dim, { align: 'center', wordWrap: { width: 330 } }))
      .setOrigin(0.5)
      .setDepth(4);
    const chevron = (x: number, glyph: string, dir: number): void => {
      const t = this.add.text(x, 242, glyph, title(30, COL.brand)).setOrigin(0.5).setDepth(4);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffffff'));
      t.on('pointerout', () => t.setColor(css(COL.brand)));
      t.on('pointerup', () => this.cycleLoadout(dir));
    };
    chevron(cx - 150, '‹', -1);
    chevron(cx + 150, '›', 1);
    this.refreshLoadout();

    // ---- CRT monitor: the nav lives on the green screen ----
    if (this.textures.exists('shell_menu_monitor')) {
      const mw = 540;
      const mon = this.add.image(cx, 580, 'shell_menu_monitor').setDepth(3);
      mon.setDisplaySize(mw, mw * (mon.height / mon.width));
      const mh = mon.displayHeight;
      const mx = cx - mw / 2;
      const my = 580 - mh / 2;
      // glass text region (matches the handoff .crt-menu inset of the monitor art)
      this.glass = { x: mx + 0.166 * mw, y: my + 0.3 * mh, w: 0.62 * mw, h: 0.46 * mh };
    } else {
      this.glass = { x: cx - 170, y: 430, w: 340, h: 300 };
    }

    // settings — a discreet phosphor gear in the top-right of the CRT glass (diegetic, on-screen,
    // ︎ forces the monochrome glyph so it reads as a terminal icon, not a colour emoji)
    const gear = this.add
      .text(this.glass.x + this.glass.w - 2, this.glass.y - 4, '⚙︎', monoStyle(19, COL.crtDim))
      .setOrigin(1, 0)
      .setDepth(6);
    gear.setShadow(0, 0, 'rgba(120,255,150,0.6)', 6, true, true);
    gear.setInteractive({ useHandCursor: true });
    gear.on('pointerover', () => gear.setColor('#d8ffe2'));
    gear.on('pointerout', () => gear.setColor(css(COL.crtDim)));
    gear.on('pointerup', () => this.scene.start('Settings'));

    this.navItems = [
      { label: 'NEW GAME', action: () => this.startRun('free'), cta: true },
      { label: 'DAILY DIG', action: () => this.startRun('daily') },
      { label: 'LEADERBOARD', action: () => this.scene.start('Leaderboard') },
      { label: 'COLLECTION', action: () => this.scene.start('Collection') },
      { label: 'WORKSHOP', action: () => this.scene.start('Workshop') },
    ];
    if (season) this.navItems.push({ label: 'SEASON ★', action: () => this.scene.start('Season') });
    this.navItems.push({ label: 'HOW TO PLAY', action: () => this.scene.start('HowTo') });
    this.renderNav();
    void this.checkResume();

    // ---- comeback strip + footer (clean mono readouts — no emoji) ----
    const goal = nextGoal();
    const streakTxt =
      App.meta.streak.count > 0
        ? `STREAK ${App.meta.streak.count}d${playedToday() ? '' : ' · play today'}`
        : 'play today to start a streak';
    const goalTxt = goal ? `NEXT: ${goal.desc}  →  ◈ ${goal.cores} · ${goal.tickets} TKT` : 'all goals complete';
    this.add.text(cx, BASE_H - 56, `${streakTxt}    ·    ${goalTxt}`, monoStyle(12, COL.crtDim)).setOrigin(0.5).setDepth(4);
    this.add
      .text(cx, BASE_H - 32, `v0.1   ·   ${App.meta.playerName}   ·   ◈ ${App.meta.cores}   ·   ${App.meta.tickets} TKT`, monoStyle(12, COL.faint))
      .setOrigin(0.5)
      .setDepth(4);

    fitDesign(this, sky);

    // full-bleed the hero + scrim across the whole window (cover-fit the camera's visible area)
    if (hero && scrim) {
      const h = hero;
      const sc = scrim;
      const coverBleed = (): void => {
        const W = this.scale.width;
        const H = this.scale.height;
        const s = Math.min(W / BASE_W, H / BASE_H);
        const vw = W / s;
        const vh = H / s;
        h.setScale(Math.max(vw / h.width, vh / h.height)).setPosition(cx, BASE_H / 2);
        sc.setDisplaySize(vw, vh).setPosition(cx, BASE_H / 2);
      };
      coverBleed();
      this.scale.on('resize', coverBleed);
      this.events.once('shutdown', () => this.scale.off('resize', coverBleed));
    }
  }

  /** Lay the nav out as green phosphor lines centred in the monitor glass. */
  private renderNav(): void {
    this.navTexts.forEach((t) => t.destroy());
    this.navTexts = [];
    const n = this.navItems.length;
    const lineH = Math.min(30, this.glass.h / n);
    const fs = Math.max(13, Math.round(lineH * 0.58));
    const gx = this.glass.x + this.glass.w / 2;
    const y0 = this.glass.y + this.glass.h / 2 - (lineH * (n - 1)) / 2;
    this.navItems.forEach((it, i) => {
      const base = it.dim ? 0x3f9e52 : it.cta ? 0x9dffb0 : 0x5fe87a;
      const label = it.cta ? '▸ ' + it.label : it.label;
      const t = this.add
        .text(gx, y0 + i * lineH, label, monoStyle(it.cta ? fs + 2 : fs, base))
        .setOrigin(0.5)
        .setLetterSpacing(1)
        .setDepth(5);
      t.setShadow(0, 0, 'rgba(120,255,150,0.75)', 7, true, true);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#d8ffe2'));
      t.on('pointerout', () => t.setColor(css(base)));
      t.on('pointerup', it.action);
      this.navTexts.push(t);
    });
  }

  private cycleLoadout(dir: number): void {
    const list = this.unlocked();
    this.loadoutIdx = (this.loadoutIdx + dir + list.length) % list.length;
    this.refreshLoadout();
  }

  private refreshLoadout(): void {
    const list = this.unlocked();
    const l = list[this.loadoutIdx % list.length];
    this.loadoutName.setText(l.name);
    this.loadoutName.setColor(css(l.color));
    this.loadoutBlurb.setText(l.blurb);
    this.loadoutSwatch.clear();
    this.loadoutSwatch.fillStyle(l.color, 1);
    this.loadoutSwatch.fillCircle(BASE_W / 2 - 116, 242, 6);
    this.loadoutSwatch.fillCircle(BASE_W / 2 + 116, 242, 6);
  }

  private async checkResume(): Promise<void> {
    const save = await loadRun();
    if (!save) return;
    const depth = Math.floor(save.run.depthMax);
    // CONTINUE becomes the bright primary; NEW GAME steps down to a normal line
    const ng = this.navItems.find((i) => i.label === 'NEW GAME');
    if (ng) ng.cta = false;
    this.navItems.unshift({ label: `CONTINUE · ${depth}m`, action: () => this.resume(save), cta: true });
    this.renderNav();
  }

  private resume(save: RunSave): void {
    App.resumeData = save;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  private startRun(mode: 'free' | 'daily'): void {
    const list = this.unlocked();
    const loadout = list[this.loadoutIdx % list.length]?.id ?? 'prospector';
    void clearRun();
    App.resumeData = null;
    const seed = mode === 'daily' ? dailySeedString() : randomSeedString();
    App.runConfig = {
      seed,
      mode,
      loadout,
      modifiers: mode === 'daily' ? [dailyModifier(seed)] : [],
    };
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}

/**
 * A vertical scrim over the hero CGI: a touch of shade up top (so the gold wordmark reads),
 * clear through the middle (the pod shows), and a deep fade at the bottom (so the monitor and
 * footer stay legible). Built once as a canvas texture.
 */
function ensureMenuScrim(scene: Phaser.Scene): void {
  if (scene.textures.exists('menu_scrim')) return;
  const ct = scene.textures.createCanvas('menu_scrim', BASE_W, BASE_H);
  if (!ct) return;
  const ctx = ct.getContext();
  const g = ctx.createLinearGradient(0, 0, 0, BASE_H);
  g.addColorStop(0, 'rgba(6,5,10,0.55)');
  g.addColorStop(0.22, 'rgba(6,5,10,0.2)');
  g.addColorStop(0.5, 'rgba(6,5,10,0.18)');
  g.addColorStop(0.72, 'rgba(6,5,10,0.5)');
  g.addColorStop(1, 'rgba(4,3,8,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ct.refresh();
}
