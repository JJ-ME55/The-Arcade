import Phaser from 'phaser';
import { BASE_W, BASE_H } from './config/gameplay';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { MainMenu } from './scenes/MainMenu';
import { GameScene } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { HowTo } from './scenes/HowTo';
import { Leaderboard } from './scenes/Leaderboard';
import { Collection } from './scenes/Collection';
import { Season } from './scenes/Season';
import { Workshop } from './scenes/Workshop';
import { Settings } from './scenes/Settings';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05050a',
  width: BASE_W,
  height: BASE_H,
  roundPixels: false,
  antialias: true,
  powerPreference: 'high-performance',
  scale: {
    // RESIZE: the canvas fills the whole window (true desktop sizing). The game world
    // camera fills the screen; UI anchors responsively; menus letterbox-fit via camera zoom.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  dom: { createContainer: false },
  scene: [Boot, Preload, MainMenu, GameScene, GameOver, HowTo, Leaderboard, Collection, Season, Workshop, Settings],
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  import('./core/state').then(({ App }) => {
    (window as unknown as { __deeper: unknown }).__deeper = { game, App };
  });
}

// Block context menu / gesture zoom on the canvas for a clean mobile feel.
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
