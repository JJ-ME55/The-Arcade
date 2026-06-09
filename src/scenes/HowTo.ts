import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';

const LINES: [string, string][] = [
  ['DRIVE & FLY', 'Joystick / Arrow keys to move. Hold UP or the THRUST button to fly. Gravity always pulls you down.'],
  ['DIG', 'Push into dirt to drill it — DOWN, LEFT or RIGHT. You can NEVER dig straight up, so plan your way back out.'],
  ['THE SQUEEZE', 'Fuel drains, cargo fills, hull takes hits. All three pull you back to the surface. Greed runs out of fuel.'],
  ['SELL & UPGRADE', 'Fly back up, sell your haul, refuel, repair, and buy upgrades. Then dig deeper for richer ore.'],
  ['GO DEEP', 'Ore is worth exponentially more the deeper you go — but so is the danger. How deep do you dare?'],
];

export class HowTo extends Phaser.Scene {
  constructor() {
    super('HowTo');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.add.text(cx, 80, 'HOW TO PLAY', title(40)).setOrigin(0.5);

    let y = 160;
    for (const [h, body] of LINES) {
      makePanel(this, cx - 230, y, 460, 116, { alpha: 0.6 });
      this.add.text(cx - 210, y + 16, h, textStyle(20, COL.accent));
      this.add
        .text(cx - 210, y + 46, body, textStyle(15, COL.dim, { wordWrap: { width: 420 }, lineSpacing: 4 }))
        .setOrigin(0, 0);
      y += 130;
    }

    new Button(this, cx, BASE_H - 60, 240, 54, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });
  }
}
