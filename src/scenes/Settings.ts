import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL, textStyle, title } from '../ui/theme';
import { Button, makePanel } from '../ui/widgets';
import { fitDesign } from '../ui/layout';
import { App, defaultMeta, SAVE_KEYS } from '../core/state';
import { Sound } from '../systems/audio';
import { clearRun } from '../systems/runsave';
import { kvSet } from '../core/save';

export class Settings extends Phaser.Scene {
  private rows: { get: () => string; t: Phaser.GameObjects.Text }[] = [];

  constructor() {
    super('Settings');
  }

  create(): void {
    const cx = BASE_W / 2;
    const bg = this.add.rectangle(0, 0, BASE_W, BASE_H, COL.bg).setOrigin(0);
    fitDesign(this, bg);
    this.add.text(cx, 70, 'SETTINGS', title(34)).setOrigin(0.5);

    const s = App.meta.settings;
    let y = 160;
    const row = (label: string, get: () => string, dec: () => void, inc: () => void) => {
      makePanel(this, cx - 220, y, 440, 56, { alpha: 0.6 });
      this.add.text(cx - 200, y + 18, label, textStyle(17, COL.text));
      const val = this.add.text(cx + 70, y + 18, get(), textStyle(16, COL.accent)).setOrigin(0.5);
      new Button(this, cx + 150, y + 28, 44, 40, '–', () => { dec(); val.setText(get()); App.saveNow(); }, { fontSize: 24 });
      new Button(this, cx + 200, y + 28, 44, 40, '+', () => { inc(); val.setText(get()); App.saveNow(); Sound.click(); }, { fontSize: 22 });
      y += 66;
    };
    const pct = (v: number) => `${Math.round(v * 100)}%`;

    row('Sound FX', () => pct(s.sfxVolume), () => (s.sfxVolume = Math.max(0, s.sfxVolume - 0.1)), () => (s.sfxVolume = Math.min(1, s.sfxVolume + 0.1)));
    row('Music', () => pct(s.musicVolume), () => (s.musicVolume = Math.max(0, s.musicVolume - 0.1)), () => (s.musicVolume = Math.min(1, s.musicVolume + 0.1)));

    // toggles
    makePanel(this, cx - 220, y, 440, 56, { alpha: 0.6 });
    this.add.text(cx - 200, y + 18, 'Screen Shake', textStyle(17, COL.text));
    const shakeBtn = new Button(this, cx + 160, y + 28, 100, 40, s.reduceShake ? 'REDUCED' : 'FULL', () => {
      s.reduceShake = !s.reduceShake;
      shakeBtn.setLabel(s.reduceShake ? 'REDUCED' : 'FULL');
      App.saveNow();
    }, { fontSize: 14 });
    y += 66;

    makePanel(this, cx - 220, y, 440, 56, { alpha: 0.6 });
    this.add.text(cx - 200, y + 18, 'Pilot Name', textStyle(17, COL.text));
    this.add.text(cx + 40, y + 18, App.meta.playerName, textStyle(15, COL.accent)).setOrigin(0.5);
    new Button(this, cx + 170, y + 28, 90, 40, 'EDIT', () => this.editName(), { fontSize: 14 });
    y += 80;

    new Button(this, cx, y, 320, 48, 'RESET ALL PROGRESS', () => this.resetProgress(), { accent: COL.danger, fontSize: 16 });

    new Button(this, cx, BASE_H - 56, 240, 52, 'BACK', () => this.scene.start('MainMenu'), {
      fill: COL.brand,
      textColor: 0x1a1400,
    });
  }

  private editName(): void {
    const name = window.prompt('Pilot name:', App.meta.playerName);
    if (name && name.trim()) {
      App.meta.playerName = name.trim().slice(0, 16);
      App.saveNow();
      this.scene.restart();
    }
  }

  private resetProgress(): void {
    if (!window.confirm('Reset ALL progress — cores, unlocks, collection, scores? This cannot be undone.')) return;
    const name = App.meta.playerName;
    App.meta = defaultMeta();
    App.meta.playerName = name;
    void kvSet(SAVE_KEYS.meta, App.meta);
    void clearRun();
    this.scene.start('MainMenu');
  }
}
