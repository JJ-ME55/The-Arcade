import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title, monoStyle } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign, placeShell } from '../ui/layout';
import type { RunState, ScoreBreakdown, DeathCause } from '../core/types';
import { App, randomSeedString } from '../core/state';
import { submitScore, makeEntry } from '../net/leaderboard';
import { Sound } from '../systems/audio';
import type { GoalDef } from '../config/goals';

interface GOData {
  run: RunState;
  score: ScoreBreakdown;
  cause: DeathCause;
  coresEarned: number;
  streak?: { count: number; ticketsAwarded: number };
  goals?: GoalDef[];
}

const HEADLINE: Record<DeathCause, [string, number]> = {
  fuel: ['STRANDED', COL.danger],
  hull: ['HULL DESTROYED', COL.danger],
  crushed: ['CRUSHED', COL.danger],
  lava: ['INCINERATED', COL.heat],
  gas: ['GAS BLAST', COL.success],
  quit: ['RUN ABANDONED', COL.dim],
  victory: ['YOU REACHED THE CORE', COL.brand],
};

export class GameOver extends Phaser.Scene {
  private goData!: GOData;
  constructor() {
    super('GameOver');
  }

  init(data: GOData): void {
    this.goData = data;
  }

  create(): void {
    const { run, score, cause, coresEarned, streak, goals } = this.goData;
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    const [head, col] = HEADLINE[cause];

    // ---- CGI plaque; the run summary reads on its green CRT screen ----
    const glass =
      placeShell(this, 'shell_gameover', cx, 346, 800, [0.21, 0.22, 0.21, 0.26]) ??
      { x: cx - 220, y: 150, w: 440, h: 340, cx, cy: 320 };
    if (!this.textures.exists('shell_gameover')) {
      makePanel(this, glass.x - 14, glass.y - 14, glass.w + 28, glass.h + 28, { border: COL.brand });
    }
    const gL = glass.x + 18;
    const gR = glass.x + glass.w - 18;

    // headline + cause line
    this.add.text(glass.cx, glass.y + 22, head, title(30, col)).setOrigin(0.5);
    this.add
      .text(glass.cx, glass.y + 48, `${Math.floor(run.depthMax)} m deep · ${run.seed}`, monoStyle(13, COL.crtDim))
      .setOrigin(0.5);

    // big score
    this.add.text(glass.cx, glass.y + 78, 'RUN SCORE', monoStyle(13, COL.crt)).setOrigin(0.5).setLetterSpacing(2);
    const scoreText = this.add.text(glass.cx, glass.y + 112, '0', title(46)).setOrigin(0.5);
    this.tweenCount(scoreText, score.total, 900);
    if (score.total >= App.meta.bestScore && score.total > 0) {
      this.add.text(glass.cx, glass.y + 140, '★ NEW RECORD ★', textStyle(14, COL.success)).setOrigin(0.5);
      Sound.jackpot();
    } else if (score.total > 0) {
      const gap = App.meta.bestScore - score.total;
      this.add
        .text(glass.cx, glass.y + 140, `best ${App.meta.bestScore.toLocaleString()} — ${gap.toLocaleString()} short`, monoStyle(12, COL.crtDim))
        .setOrigin(0.5);
    }

    // breakdown rows, on the screen
    const rows: [string, number, number][] = [
      ['CASH BANKED', score.cashScore, COL.cash],
      ['DEPTH REACHED', score.depthScore, COL.accent],
      ['ORE VARIETY', score.collectionScore, COL.cargo],
      ['FOSSILS', score.fossilScore, 0xffe9b0],
    ];
    if (score.bonusScore > 0) rows.push(['REACHED THE CORE', score.bonusScore, COL.brand]);
    let y = glass.y + 168;
    const rowH = Math.min(26, (glass.y + glass.h - 14 - y) / rows.length);
    for (const [label, val, c] of rows) {
      this.add.text(gL, y, label, monoStyle(13, COL.crtDim));
      this.add.text(gR, y, (val >= 0 ? '+' : '') + val.toLocaleString(), monoStyle(14, c)).setOrigin(1, 0);
      y += rowH;
    }

    // ---- below the plaque: rewards + rank (framed so the lower half reads intentional) ----
    makePanel(this, cx - 228, 624, 456, 296, { alpha: 0.5 });
    let by = 638;
    const rankText = this.add.text(cx, by, 'ranking…', textStyle(16, COL.brand)).setOrigin(0.5);
    by += 28;
    const bits: string[] = [`◈ ${coresEarned} cores`];
    if (run.ticketsEarned > 0) bits.push(`🎟 ${run.ticketsEarned} tickets`);
    this.add.text(cx, by, bits.join('   ·   '), textStyle(15, COL.accent)).setOrigin(0.5);
    by += 30;

    if (streak && streak.ticketsAwarded > 0) {
      const t = this.add
        .text(cx, by, `🔥 DAY ${streak.count} STREAK  +🎟 ${streak.ticketsAwarded}`, textStyle(16, COL.warn))
        .setOrigin(0.5)
        .setAlpha(0);
      this.tweens.add({ targets: t, alpha: 1, scale: { from: 0.7, to: 1 }, delay: 500, duration: 300, ease: 'Back.out' });
      by += 28;
    }
    if (goals && goals.length > 0) {
      for (let i = 0; i < Math.min(goals.length, 2); i++) {
        const g = goals[i];
        const t = this.add
          .text(cx, by, `✓ ${g.desc}  +◈${g.cores} +🎟${g.tickets}`, textStyle(14, COL.success))
          .setOrigin(0.5)
          .setAlpha(0);
        this.tweens.add({ targets: t, alpha: 1, scale: { from: 0.7, to: 1 }, delay: 750 + i * 220, duration: 300, ease: 'Back.out' });
        Sound.milestone();
        by += 24;
      }
    }

    // submit to leaderboard
    const entry = makeEntry(App.meta.playerName, score.total, run.depthMax, run.cashBanked, run.mode, run.seed);
    submitScore(entry).then((rank) => rankText.setText(`RANK #${rank} · ${run.mode.toUpperCase()}`));

    // buttons (tightened so there's no dead band above them)
    new Button(this, cx, BASE_H - 192, 360, 58, '▶  PLAY AGAIN', () => this.again(false), {
      fill: COL.brand,
      textColor: 0x1a1400,
      fontSize: 24,
    });
    new Button(this, cx - 92, BASE_H - 124, 176, 50, 'RETRY SEED', () => this.again(true), { fontSize: 16 });
    new Button(this, cx + 92, BASE_H - 124, 176, 50, 'MAIN MENU', () => this.scene.start('MainMenu'), { fontSize: 16 });
    this.add.text(cx, BASE_H - 84, 'R — instant retry  ·  ENTER — same seed', monoStyle(11, COL.faint)).setOrigin(0.5);

    // zero-friction restart: R = new run, ENTER = same seed
    this.input.keyboard?.once('keydown-R', () => this.again(false));
    this.input.keyboard?.once('keydown-ENTER', () => this.again(true));
  }

  private tweenCount(text: Phaser.GameObjects.Text, to: number, dur: number): void {
    const o = { v: 0 };
    this.tweens.add({
      targets: o,
      v: to,
      duration: dur,
      ease: 'Cubic.out',
      onUpdate: () => text.setText(Math.floor(o.v).toLocaleString()),
      onComplete: () => text.setText(to.toLocaleString()),
    });
  }

  private again(sameSeed: boolean): void {
    const prev = App.runConfig!;
    App.runConfig = {
      seed: sameSeed || prev.mode === 'daily' ? prev.seed : randomSeedString(),
      mode: prev.mode,
      loadout: prev.loadout,
      modifiers: prev.modifiers,
      challengeId: prev.challengeId,
    };
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}
