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

/**
 * Phaser rasterises text to canvas at creation, so a web font that arrives late renders in
 * the fallback. Wait for the DesignHandoff fonts (Oxanium / Share Tech Mono) before boot —
 * with a short timeout so a slow/offline font CDN never blocks the game from starting.
 */
async function waitForFonts(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.race([
      Promise.all([
        fonts.load('800 64px Oxanium'),
        fonts.load('700 24px Oxanium'),
        fonts.load('400 18px "Share Tech Mono"'),
      ]).then(() => fonts.ready),
      new Promise((res) => window.setTimeout(res, 2500)),
    ]);
  } catch {
    /* offline / CDN blocked — fall back to system font */
  }
}

let game: Phaser.Game;
void waitForFonts().then(() => {
  game = new Phaser.Game(config);
  if (import.meta.env.DEV) {
    import('./core/state').then(({ App }) => {
      (window as unknown as { __deeper: unknown }).__deeper = { game, App };
    });
  }
});

// Block context menu / gesture zoom on the canvas for a clean mobile feel.
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
