import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title, css } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { App, randomSeedString, dailySeedString } from '../core/state';
import { LOADOUTS, type LoadoutDef } from '../config/loadouts';
import { getActiveSeason } from '../config/seasons';
import { loadRun, clearRun, type RunSave } from '../systems/runsave';
import { dailyModifier } from '../config/modifiers';
import { fitDesign } from '../ui/layout';
import { nextGoal, playedToday } from '../systems/retention';

export class MainMenu extends Phaser.Scene {
  private loadoutIdx = 0;
  private loadoutName!: Phaser.GameObjects.Text;
  private loadoutBlurb!: Phaser.GameObjects.Text;
  private loadoutSwatch!: Phaser.GameObjects.Graphics;

  constructor() {
    super('MainMenu');
  }

  private unlocked(): LoadoutDef[] {
    return LOADOUTS.filter((l) => App.meta.unlockedLoadouts.includes(l.id));
  }

  create(): void {
    const cx = BASE_W / 2;
    const sky = this.add.image(0, 0, 'bg_sky');

    // drifting dust motes for atmosphere
    const parts = this.add.particles(0, 0, 'soft', {
      x: { min: 0, max: BASE_W },
      y: { min: 0, max: BASE_H },
      scale: { min: 0.05, max: 0.18 },
      alpha: { start: 0.25, end: 0 },
      lifespan: 6000,
      frequency: 220,
      speedY: { min: -8, max: -22 },
      tint: 0xffcf4d,
    });
    parts.setDepth(1);

    // settings gear (top-right)
    new Button(this, BASE_W - 38, 40, 52, 48, '⚙', () => this.scene.start('Settings'), { fontSize: 24 });

    // ---- Title ----
    const tGlow = this.add.text(cx, 188, 'DEEPER', title(84)).setOrigin(0.5);
    tGlow.setTint(COL.brand);
    tGlow.setShadow(0, 0, css(COL.brand), 28, true, true);
    this.tweens.add({ targets: tGlow, scale: { from: 0.98, to: 1.02 }, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add
      .text(cx, 252, 'DIG DEEP · GET RICH · DON’T GET STRANDED', textStyle(15, COL.dim, { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setLetterSpacing(2);

    // ---- Best score panel ----
    makePanel(this, cx - 200, 296, 400, 70, { alpha: 0.55 });
    this.add.text(cx - 178, 312, 'BEST SCORE', textStyle(13, COL.faint)).setLetterSpacing(1);
    this.add.text(cx - 178, 330, App.meta.bestScore.toLocaleString(), textStyle(26, COL.brand));
    this.add.text(cx + 178, 312, 'DEEPEST', textStyle(13, COL.faint)).setOrigin(1, 0).setLetterSpacing(1);
    this.add.text(cx + 178, 330, `${Math.floor(App.meta.bestDepth)} m`, textStyle(26, COL.accent)).setOrigin(1, 0);

    // ---- Loadout selector ----
    makePanel(this, cx - 200, 390, 400, 132, {});
    this.add.text(cx, 404, 'PILOT', textStyle(13, COL.faint)).setOrigin(0.5).setLetterSpacing(2);
    this.loadoutSwatch = this.add.graphics();
    this.loadoutName = this.add.text(cx, 440, '', textStyle(26, COL.text)).setOrigin(0.5);
    this.loadoutBlurb = this.add
      .text(cx, 476, '', textStyle(14, COL.dim, { align: 'center', wordWrap: { width: 320 } }))
      .setOrigin(0.5);
    new Button(this, cx - 168, 446, 44, 44, '‹', () => this.cycleLoadout(-1), { fontSize: 30 });
    new Button(this, cx + 168, 446, 44, 44, '›', () => this.cycleLoadout(1), { fontSize: 30 });
    this.refreshLoadout();

    // ---- live season banner ----
    const season = getActiveSeason();
    if (season) {
      this.add
        .text(cx, 274, `★  ${season.name.toUpperCase()} IS LIVE  ★`, textStyle(14, season.accent))
        .setOrigin(0.5)
        .setLetterSpacing(1);
    }

    // ---- Action buttons ----
    new Button(this, cx, 600, 360, 60, '▶  PLAY', () => this.startRun('free'), {
      fill: COL.brand,
      border: COL.brand,
      textColor: 0x1a1400,
      fontSize: 28,
    });
    new Button(this, cx, 662, 360, 46, 'DAILY CHALLENGE', () => this.startRun('daily'), {
      accent: COL.accent,
      fontSize: 18,
    });
    new Button(this, cx - 92, 716, 176, 46, 'LEADERBOARD', () => this.scene.start('Leaderboard'), { fontSize: 15 });
    new Button(this, cx + 92, 716, 176, 46, 'COLLECTION', () => this.scene.start('Collection'), { fontSize: 15 });
    new Button(this, cx - 92, 766, 176, 46, 'WORKSHOP', () => this.scene.start('Workshop'), { fontSize: 15, accent: COL.accent });
    new Button(this, cx + 92, 766, 176, 46, season ? 'SEASON ★' : 'SEASON', () => this.scene.start('Season'), {
      fontSize: 15,
      accent: season ? season.accent : COL.faint,
    });
    new Button(this, cx, 814, 360, 40, 'HOW TO PLAY', () => this.scene.start('HowTo'), { fontSize: 15, accent: COL.success });

    // ---- resume a suspended run, if any (reserved slot at y=548) ----
    void this.checkResume();

    fitDesign(this, sky);

    // comeback strip: streak status + the next goal carrot
    const goal = nextGoal();
    const streakTxt =
      App.meta.streak.count > 0
        ? `🔥 ${App.meta.streak.count}-day streak${playedToday() ? '' : ' — play today!'}`
        : '🔥 play today to start a streak';
    const goalTxt = goal ? `NEXT: ${goal.desc} → ◈${goal.cores} 🎟${goal.tickets}` : 'all goals complete — legend';
    this.add
      .text(cx, BASE_H - 44, `${streakTxt}   ·   ${goalTxt}`, textStyle(12, COL.dim))
      .setOrigin(0.5);

    // footer
    this.add
      .text(cx, BASE_H - 22, `v0.1  ·  ${App.meta.playerName}  ·  ◈ ${App.meta.cores}  ·  🎟 ${App.meta.tickets}`, textStyle(13, COL.faint))
      .setOrigin(0.5);
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
    this.loadoutSwatch.fillCircle(BASE_W / 2 - 120, 440, 7);
    this.loadoutSwatch.fillCircle(BASE_W / 2 + 120, 440, 7);
  }

  private async checkResume(): Promise<void> {
    const save = await loadRun();
    if (!save) return;
    const depth = Math.floor(save.run.depthMax);
    new Button(this, BASE_W / 2, 548, 360, 44, `↩  CONTINUE  ·  ${depth} m`, () => this.resume(save), {
      fill: COL.panelHi,
      border: COL.success,
      accent: COL.success,
      fontSize: 18,
    });
  }

  private resume(save: RunSave): void {
    App.resumeData = save;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }

  private startRun(mode: 'free' | 'daily'): void {
    const list = this.unlocked();
    const loadout = list[this.loadoutIdx % list.length]?.id ?? 'prospector';
    void clearRun(); // starting fresh abandons any suspended run
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
