import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App } from '../core/state';
import { getTop, getRank } from '../net/leaderboard';
import type { LeaderboardEntry } from '../core/types';

export class Leaderboard extends Phaser.Scene {
  private mode: 'free' | 'daily' = 'free';
  private listGroup?: Phaser.GameObjects.Container;

  constructor() {
    super('Leaderboard');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.add.text(cx, 56, 'LEADERBOARD', title(32)).setOrigin(0.5);

    new Button(this, cx - 92, 108, 170, 44, 'GLOBAL', () => this.setMode('free'), {
      fontSize: 16,
      border: this.mode === 'free' ? COL.brand : COL.border,
    });
    new Button(this, cx + 92, 108, 170, 44, 'DAILY', () => this.setMode('daily'), {
      fontSize: 16,
      border: this.mode === 'daily' ? COL.brand : COL.border,
    });

    new Button(this, cx, BASE_H - 50, 240, 50, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });

    this.refresh();
  }

  private setMode(m: 'free' | 'daily'): void {
    if (this.mode === m) return;
    this.mode = m;
    this.scene.restart();
  }

  private async refresh(): Promise<void> {
    this.listGroup?.destroy(true);
    this.listGroup = this.add.container(0, 0);
    const entries: LeaderboardEntry[] = await getTop(this.mode, 12);
    const myRank = await getRank(this.mode, App.meta.bestScore);

    const bx = 24;
    const bw = BASE_W - 48;
    let y = 150;
    if (entries.length === 0) {
      this.listGroup.add(this.add.text(BASE_W / 2, 300, 'No scores yet — be the first!', textStyle(16, COL.dim)).setOrigin(0.5));
    }
    entries.forEach((e, i) => {
      const mine = e.name === App.meta.playerName && e.date > 0;
      const g = this.add.graphics();
      g.fillStyle(mine ? 0x24243f : COL.panel, 0.85);
      g.fillRoundedRect(bx, y, bw, 42, 8);
      if (mine) {
        g.lineStyle(2, COL.brand, 1);
        g.strokeRoundedRect(bx, y, bw, 42, 8);
      }
      this.listGroup!.add(g);
      const rankCol = i === 0 ? COL.brand : i === 1 ? 0xd8d8e0 : i === 2 ? 0xc98a4a : COL.dim;
      this.listGroup!.add(this.add.text(bx + 16, y + 11, `${i + 1}`, textStyle(18, rankCol)));
      this.listGroup!.add(this.add.text(bx + 54, y + 6, e.name, textStyle(15, mine ? COL.brand : COL.text)));
      this.listGroup!.add(this.add.text(bx + 54, y + 24, `${e.depth} m`, textStyle(11, COL.faint)));
      this.listGroup!.add(this.add.text(bx + bw - 16, y + 11, e.score.toLocaleString(), textStyle(16, COL.cash)).setOrigin(1, 0));
      y += 48;
    });

    this.listGroup.add(
      this.add
        .text(BASE_W / 2, BASE_H - 96, `Your best: ${App.meta.bestScore.toLocaleString()}  ·  rank #${myRank}`, textStyle(15, COL.accent))
        .setOrigin(0.5),
    );
  }
}
