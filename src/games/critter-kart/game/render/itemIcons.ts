// @ts-nocheck
/**
 * Distinct pixel icons for each item, drawn to data URLs for the HUD and to
 * THREE.CanvasTexture for the item-balloon sprites. Order matches ITEM ids in
 * logic/items.ts so the balloon you see in the world matches the icon in the HUD
 * corner the moment you grab it. Browser-only (uses canvas) — call from inside
 * the component effect, not at module load.
 */
import * as THREE from 'three';

type IconDraw = (g: CanvasRenderingContext2D, px: (x: number, y: number, w: number, h: number, c: string) => void, size: number) => void;

/** Pixel-art recipes for each item — shared by HUD icons (small, on white card) and
 *  balloon textures (larger, on transparent canvas). */
const RECIPES: IconDraw[] = [
  // TURBO BERRY — red berry + green leaf
  (_g, px, S) => {
    const u = S / 32;
    px(13 * u, 2 * u, 6 * u, 4 * u, '#3fa046');
    px(16 * u, 4 * u, 2 * u, 4 * u, '#2c7a33');
    px(9 * u, 9 * u, 14 * u, 16 * u, '#d62246');
    px(7 * u, 12 * u, 18 * u, 10 * u, '#d62246');
    px(11 * u, 12 * u, 5 * u, 5 * u, '#ff7a96');
    px(18 * u, 18 * u, 4 * u, 4 * u, '#9c1733');
  },
  // ACORN CANNON — brown acorn
  (_g, px, S) => {
    const u = S / 32;
    px(8 * u, 7 * u, 16 * u, 7 * u, '#6b4422');
    px(8 * u, 7 * u, 16 * u, 2 * u, '#8a5a2e');
    px(15 * u, 4 * u, 2 * u, 4 * u, '#6b4422');
    px(9 * u, 14 * u, 14 * u, 13 * u, '#bb8047');
    px(11 * u, 16 * u, 4 * u, 7 * u, '#d9a972');
    px(17 * u, 20 * u, 4 * u, 5 * u, '#946232');
  },
  // HOMING BEE — yellow + black stripes, wings
  (_g, px, S) => {
    const u = S / 32;
    px(6 * u, 9 * u, 6 * u, 4 * u, '#e8f6ff');
    px(20 * u, 9 * u, 6 * u, 4 * u, '#e8f6ff');
    px(10 * u, 11 * u, 12 * u, 12 * u, '#ffd23f');
    px(10 * u, 13 * u, 12 * u, 2 * u, '#1a1a1a');
    px(10 * u, 17 * u, 12 * u, 2 * u, '#1a1a1a');
    px(10 * u, 21 * u, 12 * u, 2 * u, '#1a1a1a');
    px(12 * u, 11 * u, 2 * u, 2 * u, '#1a1a1a');
  },
  // MUD PUDDLE — brown splat
  (_g, px, S) => {
    const u = S / 32;
    px(6 * u, 17 * u, 20 * u, 7 * u, '#4a2f15');
    px(9 * u, 14 * u, 6 * u, 5 * u, '#5b3a1a');
    px(17 * u, 13 * u, 7 * u, 6 * u, '#5b3a1a');
    px(12 * u, 19 * u, 4 * u, 3 * u, '#3a2410');
    px(4 * u, 20 * u, 3 * u, 3 * u, '#4a2f15');
    px(25 * u, 19 * u, 3 * u, 3 * u, '#4a2f15');
  },
  // LEAF SHIELD — green shield
  (_g, px, S) => {
    const u = S / 32;
    px(9 * u, 5 * u, 14 * u, 4 * u, '#5ad17a');
    px(8 * u, 9 * u, 16 * u, 10 * u, '#3fa046');
    px(10 * u, 19 * u, 12 * u, 4 * u, '#2c7a33');
    px(13 * u, 23 * u, 6 * u, 3 * u, '#2c7a33');
    px(15 * u, 8 * u, 2 * u, 14 * u, '#bdf0c8');
  },
  // STORM CLOUD — grey cloud + rain
  (_g, px, S) => {
    const u = S / 32;
    px(8 * u, 9 * u, 16 * u, 8 * u, '#c2c9d2');
    px(11 * u, 6 * u, 11 * u, 5 * u, '#dde3ea');
    px(6 * u, 13 * u, 6 * u, 4 * u, '#b3bac4');
    px(11 * u, 20 * u, 2 * u, 6 * u, '#4aa3e0');
    px(16 * u, 20 * u, 2 * u, 7 * u, '#4aa3e0');
    px(21 * u, 20 * u, 2 * u, 6 * u, '#4aa3e0');
  },
];

function drawIcon(draw: IconDraw, size: number, transparentBg: boolean, badge = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  if (!transparentBg) {
    // HUD uses an opaque canvas (the CSS card supplies the background)
    g.clearRect(0, 0, size, size);
  }
  // Balloon badge: a cream "coin" behind the icon so it reads clearly against ANY balloon
  // colour (a brown mud icon on a brown balloon was nearly invisible before).
  if (badge) {
    const cx = size / 2, cy = size / 2, r = size * 0.47;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = '#fffdf3';
    g.fill();
    g.lineWidth = size * 0.045;
    g.strokeStyle = 'rgba(44,32,20,0.6)';
    g.stroke();
  }
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };
  draw(g, px, size);
  return c;
}

export function buildItemIcons(): string[] {
  return RECIPES.map((r) => drawIcon(r, 32, false).toDataURL());
}

/** Larger transparent-background textures for the in-world item balloons. They show
 *  the actual weapon/boost graphic that matches the HUD icon you'll see once you grab
 *  the box, so players know which kind of balloon they're flying into. */
export function buildItemBalloonTextures(): THREE.CanvasTexture[] {
  return RECIPES.map((r) => {
    const tex = new THREE.CanvasTexture(drawIcon(r, 256, true, true)); // hi-res + cream badge for legibility
    tex.minFilter = THREE.LinearMipmapLinearFilter; // smooth the round badge edge at distance
    tex.generateMipmaps = true;
    return tex;
  });
}
