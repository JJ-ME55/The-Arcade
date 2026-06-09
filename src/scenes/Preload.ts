import Phaser from 'phaser';
import { generateAllTextures } from '../core/textures';

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    generateAllTextures(this);
    const el = document.getElementById('boot-loader');
    if (el) {
      el.classList.add('hidden');
      window.setTimeout(() => el.remove(), 500);
    }
    this.scene.start('MainMenu');
  }
}
