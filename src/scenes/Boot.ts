import Phaser from 'phaser';
import { App } from '../core/state';
import * as arcade from '../net/arcade';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Capture the Arcade launch session (?session=…) BEFORE the save loads, so the cloud
    // sync can key off it. Then load meta (merges cloud save when online) and retry any score.
    arcade.captureSession();
    App.load().then(() => {
      void arcade.flushUnsentScore();
      this.scene.start('Preload');
    });
  }
}
