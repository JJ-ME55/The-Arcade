import Phaser from 'phaser';
import { App } from '../core/state';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    // Load persistent meta-save before anything that needs it.
    App.load().then(() => this.scene.start('Preload'));
  }
}
