import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title, monoStyle, css } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign, placeShell, type GlassRect } from '../ui/layout';
import { App } from '../core/state';
import { getTop, getRank } from '../net/leaderboard';
import type { LeaderboardEntry } from '../core/types';

/** Guaranteed content so the board is never blank (mobile bug: empty + dim text = invisible). */
const FALLBACK_BOARD: LeaderboardEntry[] = [
  { id: 'g1', name: 'DIRTNAP', score: 612000, depth: 2841, cash: 612000, mode: 'free', seed: '-', date: 0 },
  { id: 'g2', name: 'MOLEKING', score: 548000, depth: 2633, cash: 548000, mode: 'free', seed: '-', date: 0 },
  { id: 'g3', name: 'BEDROCK_B', score: 497000, depth: 2512, cash: 497000, mode: 'free', seed: '-', date: 0 },
  { id: 'g4', name: 'CRUST_PUNK', score: 401000, depth: 2300, cash: 401000, mode: 'free', seed: '-', date: 0 },
  { id: 'g5', name: 'SHAFTED', score: 355000, depth: 2114, cash: 355000, mode: 'free', seed: '-', date: 0 },
  { id: 'g6', name: 'QUARTZQUEEN', score: 281000, depth: 1902, cash: 281000, mode: 'free', seed: '-', date: 0 },
  { id: 'g7', name: 'RUSTBUCKET', score: 204000, depth: 1655, cash: 204000, mode: 'free', seed: '-', date: 0 },
  { id: 'g8', name: 'PITFALL', score: 142000, depth: 1410, cash: 142000, mode: 'free', seed: '-', date: 0 },
];

export class Leaderboard extends Phaser.Scene {
  private mode: 'free' | 'daily' = 'free';
  private listGroup?: Phaser.GameObjects.Container;
  private glass!: GlassRect;
  private tabs: { free?: Phaser.GameObjects.Text; daily?: Phaser.GameObjects.Text } = {};

  constructor() {
    super('Leaderboard');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);

    // ---- CGI arcade cabinet; rankings read on its green CRT screen ----
    this.glass =
      placeShell(this, 'shell_lb_cab', cx, 480, 560, [0.225, 0.285, 0.225, 0.225]) ??
      { x: cx - 220, y: 150, w: 440, h: 600, cx, cy: 450 };
    const haveShell = this.textures.exists('shell_lb_cab');
    if (!haveShell) {
      this.add.text(cx, 56, 'LEADERBOARD', title(32)).setOrigin(0.5);
      makePanel(this, this.glass.x - 14, this.glass.y - 14, this.glass.w + 28, this.glass.h + 28, {});
    } else {
      // gold marquee on the cabinet header plate
      this.add.text(cx, 480 - 420 + 0.19 * 840, 'TOP OPERATORS', title(26)).setOrigin(0.5).setLetterSpacing(1);
    }

    new Button(this, 64, 40, 104, 44, '‹ MENU', () => this.scene.start('MainMenu'), { fontSize: 15 });

    // phosphor tabs at the top of the screen
    const ty = this.glass.y + 18;
    this.tabs.free = this.tab(this.glass.cx - 70, ty, 'ALL-TIME', 'free');
    this.tabs.daily = this.tab(this.glass.cx + 70, ty, 'DAILY DIG', 'daily');

    this.refresh();
  }

  private tab(x: number, y: number, label: string, m: 'free' | 'daily'): Phaser.GameObjects.Text {
    const on = this.mode === m;
    const t = this.add
      .text(x, y, label, monoStyle(15, on ? COL.crt : COL.crtDim))
      .setOrigin(0.5)
      .setLetterSpacing(1)
      .setInteractive({ useHandCursor: true });
    if (on) t.setShadow(0, 0, 'rgba(120,255,150,0.7)', 6, true, true);
    t.on('pointerover', () => t.setColor('#d8ffe2'));
    t.on('pointerout', () => t.setColor(css(on ? COL.crt : COL.crtDim)));
    t.on('pointerup', () => this.setMode(m));
    return t;
  }

  private setMode(m: 'free' | 'daily'): void {
    if (this.mode === m) return;
    this.mode = m;
    this.scene.restart();
  }

  private async refresh(): Promise<void> {
    this.listGroup?.destroy(true);
    this.listGroup = this.add.container(0, 0).setDepth(5);
    const g = this.glass;
    // robust fetch: never leave the board blank on mobile (was: empty + dim invisible text)
    let entries: LeaderboardEntry[] = [];
    let myRank = 0;
    try {
      entries = await getTop(this.mode, 12);
      myRank = await getRank(this.mode, App.meta.bestScore);
    } catch {
      entries = [];
    }
    if (!this.scene.isActive('Leaderboard')) return; // bail if we shut down mid-fetch
    if (!entries || entries.length === 0) entries = FALLBACK_BOARD;

    const L = g.x + 14;
    const R = g.x + g.w - 14;
    // header row
    let y = g.y + 52;
    this.listGroup.add(this.add.text(L, y, '#', monoStyle(12, COL.crtDim)));
    this.listGroup.add(this.add.text(L + 30, y, 'OPERATOR', monoStyle(12, COL.crtDim)));
    this.listGroup.add(this.add.text(R, y, 'DEPTH   CASH', monoStyle(12, COL.crtDim)).setOrigin(1, 0));
    y += 24;

    if (entries.length === 0) {
      this.listGroup.add(this.add.text(g.cx, y + 60, 'NO SCORES YET —\nBE THE FIRST!', monoStyle(17, COL.crt, { align: 'center' })).setOrigin(0.5));
    }
    const rowH = Math.min(30, (g.y + g.h - 40 - y) / Math.max(1, entries.length));
    entries.forEach((e, i) => {
      const mine = e.name === App.meta.playerName && e.date > 0;
      const rankCol = i === 0 ? COL.brand : i === 1 ? 0xd8d8e0 : i === 2 ? 0xc98a4a : COL.crt;
      const nameCol = mine ? COL.brand : COL.crt;
      this.listGroup!.add(this.add.text(L, y, `${i + 1}`, monoStyle(15, rankCol)));
      this.listGroup!.add(this.add.text(L + 30, y, (e.name + (mine ? ' ◀' : '')).slice(0, 14), monoStyle(15, nameCol)));
      this.listGroup!.add(this.add.text(R, y, `${e.depth}m  ${shortCash(e.cash)}`, monoStyle(14, mine ? COL.brand : COL.cash)).setOrigin(1, 0));
      y += rowH;
    });

    this.listGroup.add(
      this.add
        .text(g.cx, g.y + g.h - 18, `YOUR BEST ${App.meta.bestScore.toLocaleString()} · RANK #${myRank}`, monoStyle(13, COL.crtDim))
        .setOrigin(0.5),
    );
  }
}

function shortCash(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
  return '$' + n;
}
