import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App } from '../core/state';
import { getActiveSeason, SEASONS } from '../config/seasons';
import { podName } from '../systems/season';

export class Season extends Phaser.Scene {
  constructor() {
    super('Season');
  }

  create(): void {
    const cx = BASE_W / 2;
    this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this);
    const season = getActiveSeason();

    this.add.text(cx, 60, 'SEASON', title(34, season ? season.accent : COL.dim)).setOrigin(0.5);

    if (!season) {
      this.add.text(cx, 160, 'No season is live right now.', textStyle(18, COL.dim)).setOrigin(0.5);
      this.add
        .text(cx, 200, 'Upcoming: ' + SEASONS.map((s) => s.name).join(' · '), textStyle(14, COL.faint, { wordWrap: { width: 460 }, align: 'center' }))
        .setOrigin(0.5);
      this.backBtn(cx);
      return;
    }

    this.add.text(cx, 100, season.name.toUpperCase(), textStyle(24, season.accent)).setOrigin(0.5);
    this.add.text(cx, 130, season.blurb, textStyle(14, COL.dim)).setOrigin(0.5);

    const pts = App.meta.seasonPoints[season.id] ?? 0;
    const maxPts = season.track[season.track.length - 1].points;

    // progress bar
    const bx = cx - 220;
    const bw = 440;
    const by = 176;
    const g = this.add.graphics();
    g.fillStyle(0x20202e, 1);
    g.fillRoundedRect(bx, by, bw, 16, 8);
    g.fillStyle(season.accent, 1);
    g.fillRoundedRect(bx, by, bw * Math.min(1, pts / maxPts), 16, 8);
    this.add.text(cx, by + 28, `${pts} ★  season points`, textStyle(14, COL.text)).setOrigin(0.5);

    // track rewards
    let y = 232;
    for (const r of season.track) {
      const unlocked = App.meta.seasonUnlocks.includes(season.id + ':' + r.id);
      makePanel(this, bx, y, bw, 52, { alpha: 0.6, border: unlocked ? season.accent : COL.border });
      this.add.text(bx + 16, y + 9, r.name, textStyle(16, unlocked ? COL.text : COL.dim));
      this.add.text(bx + 16, y + 30, `${r.points} ★`, textStyle(12, COL.faint));
      this.add
        .text(bx + bw - 16, y + 16, unlocked ? '✓ UNLOCKED' : 'LOCKED', textStyle(14, unlocked ? COL.success : COL.faint))
        .setOrigin(1, 0);
      y += 60;
    }

    // pod skins
    y += 6;
    this.add.text(bx, y, 'EQUIP POD', textStyle(14, COL.faint)).setLetterSpacing(2);
    y += 26;
    const pods = App.meta.unlockedPods;
    pods.forEach((pid, i) => {
      const px = bx + (i % 3) * 150;
      const py = y + Math.floor(i / 3) * 52;
      const equipped = App.meta.selectedPod === pid;
      new Button(this, px + 70, py + 20, 140, 42, podName(pid), () => {
        App.meta.selectedPod = pid;
        App.saveNow();
        this.scene.restart();
      }, { fontSize: 13, border: equipped ? season.accent : COL.border, accent: equipped ? season.accent : undefined });
    });

    this.backBtn(cx);
  }

  private backBtn(cx: number): void {
    new Button(this, cx, BASE_H - 56, 240, 52, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });
  }
}
