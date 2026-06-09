/**
 * Responsive helpers for a RESIZE-mode canvas.
 *
 * Menus/overlays are authored against a fixed 540×960 "design" space. `fitDesign` centres +
 * scales that design to the window via the camera, and stretches the scene's background to
 * fill the ENTIRE window (no letterbox bars — so desktop never looks like a phone in a box).
 * Pass the scene's background object so it can be stretched full-bleed.
 */
import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';
import { COL } from './theme';

type Bg = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

export function fitDesign(scene: Phaser.Scene, bg?: Bg, dw = BASE_W, dh = BASE_H): void {
  const cam = scene.cameras.main;
  cam.setBackgroundColor(COL.bg);
  if (bg) bg.setOrigin(0.5);

  const layout = () => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const s = Math.min(W / dw, H / dh);
    cam.setZoom(s);
    cam.centerOn(dw / 2, dh / 2);
    // stretch the background to cover the full visible world area (full-bleed)
    if (bg) bg.setPosition(dw / 2, dh / 2).setDisplaySize(W / s, H / s);
  };
  layout();
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', () => scene.scale.off('resize', layout));
}
