/**
 * Responsive helpers for a RESIZE-mode canvas.
 *
 * Menus/overlays are authored against a fixed 540×960 "design" space. `fitDesign` makes a
 * scene's camera zoom + centre that design into whatever window size we have (exactly like
 * the old Scale.FIT letterbox, but now the canvas fills the window so gameplay can use the
 * full screen). Works for objects added later too, since it's a camera transform.
 */
import Phaser from 'phaser';
import { BASE_W, BASE_H } from '../config/gameplay';

export function fitDesign(scene: Phaser.Scene, dw = BASE_W, dh = BASE_H): void {
  const cam = scene.cameras.main;
  cam.setBackgroundColor('#07060c');
  const layout = () => {
    const W = scene.scale.width;
    const H = scene.scale.height;
    const s = Math.min(W / dw, H / dh);
    cam.setZoom(s);
    cam.centerOn(dw / 2, dh / 2);
  };
  layout();
  scene.scale.on('resize', layout);
  scene.events.once('shutdown', () => scene.scale.off('resize', layout));
}
