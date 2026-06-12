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

export interface GlassRect {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

/**
 * Place a CGI shell image (DesignHandoff machine/cabinet/plaque) centred at (cx,cy), scaled to
 * `width` design-px — which MAY exceed the 540-wide design so the steel frame bleeds off-screen
 * for a more immersive fit in portrait. Returns the inner "glass screen" rect derived from the
 * shell's fractional insets `[left, top, right, bottom]`, where composited UI should live. Null
 * if the texture is missing (caller falls back to a plain layout).
 */
export function placeShell(
  scene: Phaser.Scene,
  key: string,
  cx: number,
  cy: number,
  width: number,
  ins: [number, number, number, number],
  depth = 0,
): GlassRect | null {
  if (!scene.textures.exists(key)) return null;
  const img = scene.add.image(cx, cy, key).setDepth(depth);
  img.setDisplaySize(width, width * (img.height / img.width));
  const w = img.displayWidth;
  const h = img.displayHeight;
  const x = cx - w / 2 + ins[0] * w;
  const y = cy - h / 2 + ins[1] * h;
  const gw = (1 - ins[0] - ins[2]) * w;
  const gh = (1 - ins[1] - ins[3]) * h;
  return { x, y, w: gw, h: gh, cx: x + gw / 2, cy: y + gh / 2 };
}
