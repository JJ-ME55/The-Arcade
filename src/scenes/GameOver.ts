import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import type { RunState, ScoreBreakdown, DeathCause } from '../core/types';
import { App, randomSeedString } from '../core/state';
import { submitScore, makeEntry } from '../net/leaderboard';
import { Sound } from '../systems/audio';

interface GOData {
  run: RunState;
  score: ScoreBreakdown;
  cause: DeathCause;
  coresEarned: number;
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
    const { run, score, cause, coresEarned } = this.goData;
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    const [head, col] = HEADLINE[cause];
    this.add.text(cx, 70, head, title(34, col)).setOrigin(0.5);
    this.add.text(cx, 108, `${Math.floor(run.depthMax)} m deep · ${run.seed}`, textStyle(14, COL.dim)).setOrigin(0.5);

    // big score
    makePanel(this, cx - 220, 138, 440, 96, { border: COL.brand });
    this.add.text(cx, 158, 'SCORE', textStyle(14, COL.faint)).setOrigin(0.5).setLetterSpacing(2);
    const scoreText = this.add.text(cx, 196, '0', title(48)).setOrigin(0.5);
    this.tweenCount(scoreText, score.total, 900);
    if (score.total >= App.meta.bestScore && score.total > 0) {
      this.add.text(cx + 150, 158, 'NEW BEST', textStyle(13, COL.success)).setOrigin(0.5);
      Sound.jackpot();
    }

    // breakdown
    const rows: [string, number, number][] = [
      ['Cash banked', score.cashScore, COL.cash],
      ['Depth reached', score.depthScore, COL.accent],
      ['Ore variety', score.collectionScore, COL.cargo],
      ['Fossils', score.fossilScore, 0xffe9b0],
    ];
    if (score.bonusScore > 0) rows.push(['Reached the Core', score.bonusScore, COL.brand]);
    let y = 256;
    makePanel(this, cx - 220, y, 440, rows.length * 30 + 20, { alpha: 0.6 });
    y += 14;
    for (const [label, val, c] of rows) {
      this.add.text(cx - 200, y, label, textStyle(15, COL.dim));
      this.add.text(cx + 200, y, (val >= 0 ? '+' : '') + val.toLocaleString(), textStyle(15, c)).setOrigin(1, 0);
      y += 30;
    }
    y += 20;

    // cores + tickets + rank
    makePanel(this, cx - 220, y, 440, 64, { alpha: 0.6 });
    this.add.text(cx - 200, y + 12, 'Cores earned', textStyle(15, COL.dim));
    this.add.text(cx - 200, y + 34, `◈ ${coresEarned}`, textStyle(20, COL.accent));
    if (run.ticketsEarned > 0) {
      this.add.text(cx, y + 12, 'Tickets', textStyle(15, COL.dim)).setOrigin(0.5, 0);
      this.add.text(cx, y + 34, `🎟 ${run.ticketsEarned}`, textStyle(20, COL.brand)).setOrigin(0.5, 0);
    }
    const rankText = this.add.text(cx + 200, y + 22, 'ranking…', textStyle(18, COL.brand)).setOrigin(1, 0.5);
    y += 84;

    // submit to leaderboard
    const entry = makeEntry(App.meta.playerName, score.total, run.depthMax, run.cashBanked, run.mode, run.seed);
    submitScore(entry).then((rank) => rankText.setText(`#${rank} ${run.mode}`));

    // buttons
    new Button(this, cx, BASE_H - 150, 360, 60, '▶  PLAY AGAIN', () => this.again(false), {
      fill: COL.brand,
      textColor: 0x1a1400,
      fontSize: 24,
    });
    new Button(this, cx - 92, BASE_H - 80, 176, 50, 'RETRY SEED', () => this.again(true), { fontSize: 16 });
    new Button(this, cx + 92, BASE_H - 80, 176, 50, 'MAIN MENU', () => this.scene.start('MainMenu'), { fontSize: 16 });
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
