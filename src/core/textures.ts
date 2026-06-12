/**
 * Procedural texture generation — all art is baked at load time (no external assets,
 * no licensing). Clean flat shapes with edge highlights + glow read as "high class"
 * and scale crisply when Scale.FIT upscales on desktop.
 */
import Phaser from 'phaser';
import { TILE, BASE_W, BASE_H } from '../config/gameplay';
import { BIOMES } from '../config/biomes';
import { ORES } from '../config/ores';
import { SPECIAL_KINDS } from '../config/specials';

type G = Phaser.GameObjects.Graphics;

function darken(c: number, f: number): number {
  const r = Math.max(0, Math.min(255, ((c >> 16) & 0xff) * f));
  const g = Math.max(0, Math.min(255, ((c >> 8) & 0xff) * f));
  const b = Math.max(0, Math.min(255, (c & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}
function lighten(c: number, amt: number): number {
  const r = Math.min(255, ((c >> 16) & 0xff) + amt);
  const g = Math.min(255, ((c >> 8) & 0xff) + amt);
  const b = Math.min(255, (c & 0xff) + amt);
  return (r << 16) | (g << 8) | b;
}
function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

/** Pull a colour toward its own luminance (desaturate). amt 0..1. */
function desat(c: number, amt: number): number {
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  return (
    (Math.round(r + (lum - r) * amt) << 16) |
    (Math.round(g + (lum - g) * amt) << 8) |
    Math.round(b + (lum - b) * amt)
  );
}

/**
 * Grade a raw terrain colour toward gritty, photoreal earth/rock: knock the saturation back
 * (kills the "brown-clay / bubblegum" cartoon read) and drop the value a touch. Applied to every
 * dirt/stone/grass fill at bake time so the whole dig world reads dark, dusty and real.
 */
function grit(c: number): number {
  return darken(desat(c, 0.5), 0.9);
}

/** Draw a single tile face: fill + bevel (light top-left, dark bottom-right) + speckles. */
/**
 * A patch of CONTINUOUS soil — no seams, no grid. Adjacent tiles must blend into one
 * unbroken earth mass; the carved relief comes entirely from the edge-shade overlays at
 * tunnel borders. Mottling is kept low-contrast so tile boundaries never read.
 */
function tileFace(g: G, fill: number, edge: number, variant: number): void {
  g.clear();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, TILE, TILE);

  let s = (variant * 9301 + 49297) % 233280;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  // soft mottling — large, low-contrast patches (keeps the band continuous, no per-tile read)
  for (let i = 0; i < 3; i++) {
    const x = rnd() * TILE;
    const y = rnd() * TILE;
    const r = 10 + rnd() * 16;
    g.fillStyle(rnd() > 0.5 ? darken(fill, 0.84) : lighten(fill, 8), 0.1);
    g.fillCircle(x, y, r);
  }

  // COARSE grit — dense hard specks (the gritty, pixelated photoreal earth, not toy-smooth).
  // Modest contrast, drawn as integer rects so it reads coarse rather than airbrushed.
  const n = 58 + Math.floor(rnd() * 16);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * TILE);
    const y = Math.floor(rnd() * TILE);
    const sz = 1 + Math.floor(rnd() * 2.3);
    const v = rnd();
    if (v < 0.5) g.fillStyle(darken(fill, 0.6), 0.24);
    else if (v < 0.8) g.fillStyle(lighten(fill, 26), 0.09);
    else g.fillStyle(darken(edge, 0.8), 0.26);
    g.fillRect(x, y, sz, sz);
  }

  // embedded pebbles / rock chips (dark body + a single light glint) for realism
  const peb = 1 + Math.floor(rnd() * 2);
  for (let i = 0; i < peb; i++) {
    const x = 4 + rnd() * (TILE - 8);
    const y = 4 + rnd() * (TILE - 8);
    const r = 1.6 + rnd() * 2.2;
    g.fillStyle(darken(edge, 0.68), 0.85);
    g.fillCircle(x, y, r);
    g.fillStyle(lighten(fill, 44), 0.22);
    g.fillCircle(x - r * 0.3, y - r * 0.34, r * 0.4);
  }
}

/**
 * A dug-out / cave interior — a dark, warm scooped recess (NOT a bright tan cut-out). Uniform
 * so a vertical tunnel of stacked empties reads as one continuous hole; the carved 3-D comes
 * from the edge-relief on the surrounding solid walls + the pod lamp. (Target: `carve()`.)
 */
function genRecess(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x1b1108, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x000000, 0.28);
  g.fillRect(0, 0, TILE, TILE);
  let s = 9173;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 22; i++) {
    g.fillStyle(rnd() > 0.5 ? 0x000000 : 0x3a2613, rnd() > 0.5 ? 0.3 : 0.12);
    g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1, 1 + Math.floor(rnd() * 2));
  }
  g.generateTexture('recess', TILE, TILE);
  g.destroy();
}

/**
 * A rock pocket drawn ON TOP of a soil base. The shape is keyed by which orthogonal
 * neighbours are ALSO rock (bit 1=top, 2=bottom, 4=left, 8=right): a side that faces
 * soil pulls in and rounds its corners (so the rock reads as an organic lump in the
 * earth); a side that faces rock overflows the cell edge so the two pockets fuse into
 * one continuous mass. Corners shared by two rock-facing sides are squared off, so a
 * solid rock field tiles seamlessly with no dirt "dots" and no grid. The result: stone
 * looks like rock embedded in soil, never like minesweeper squares.
 */
function stoneBlob(g: G, fill: number, edge: number, mask: number, accent?: number): void {
  const top = mask & 1;
  const bottom = mask & 2;
  const left = mask & 4;
  const right = mask & 8;
  const OV = 3; // overflow past the edge where rock meets rock (guarantees a seamless join)
  const IN = 3; // pull-in from the edge where rock meets soil (a thin earth gap around the lump)
  const R = 13; // rounded-corner radius on soil-facing corners
  const x0 = left ? -OV : IN;
  const y0 = top ? -OV : IN;
  const x1 = right ? TILE + OV : TILE - IN;
  const y1 = bottom ? TILE + OV : TILE - IN;
  const w = x1 - x0;
  const h = y1 - y0;
  const radii = {
    tl: top && left ? 0 : R,
    tr: top && right ? 0 : R,
    bl: bottom && left ? 0 : R,
    br: bottom && right ? 0 : R,
  };

  g.fillStyle(fill, 1);
  g.fillRoundedRect(x0, y0, w, h, radii);

  // interior grain — deliberately low-contrast so a packed rock mass doesn't read as a
  // repeating texture grid (the per-tile shape varies; the speckle must stay quiet).
  let s = ((mask + 1) * 7919) % 233280;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 9; i++) {
    const gx = x0 + 5 + rnd() * (w - 10);
    const gy = y0 + 5 + rnd() * (h - 10);
    g.fillStyle(rnd() > 0.5 ? lighten(fill, 14) : darken(fill, 0.82), 0.22);
    g.fillCircle(gx, gy, 1 + rnd() * 1.6);
  }
  // a couple of darker fracture pits for depth
  for (let i = 0; i < 2; i++) {
    g.fillStyle(darken(fill, 0.68), 0.3);
    g.fillCircle(x0 + 6 + rnd() * (w - 12), y0 + 6 + rnd() * (h - 12), 1.5 + rnd() * 1.5);
  }
  // crystal/core biomes: an occasional embedded glint
  if (accent !== undefined && rnd() > 0.5) {
    const ax = x0 + 7 + rnd() * (w - 14);
    const ay = y0 + 7 + rnd() * (h - 14);
    g.fillStyle(accent, 0.6);
    g.fillTriangle(ax, ay - 3, ax + 2.5, ay, ax, ay + 3);
    g.fillTriangle(ax, ay - 3, ax - 2.5, ay, ax, ay + 3);
  }
  // rim — only the soil-facing (rounded) sides land inside the cell; rock-facing sides
  // overflow off-cell so no seam line shows inside a continuous mass.
  g.lineStyle(2, edge, 0.85);
  g.strokeRoundedRect(x0, y0, w, h, radii);
}

function genTiles(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const b of BIOMES) {
    const accent = b.id === 'crystal' || b.id === 'core' ? b.palette.accent : undefined;
    // grade every fill toward gritty, desaturated earth/rock (see grit())
    const dirt = grit(b.palette.dirt);
    const dirtEdge = grit(b.palette.dirtEdge);
    // DIRT — seamless continuous soil, 3 quiet variants picked by world position.
    for (let v = 0; v < 3; v++) {
      tileFace(g, dirt, dirtEdge, (b.depthStart + 1) * 7 + v * 31);
      g.generateTexture(`t_${b.id}_dirt_${v}`, TILE, TILE);
    }
    // STONE & HARD — an organic rock pocket on soil, one tile per neighbour-connectivity
    // mask (0..15) so rock fuses with rock and rounds against soil.
    const rock: [string, number, number][] = [
      ['stone', grit(b.palette.stone), grit(b.palette.stoneEdge)],
      ['hard', grit(b.palette.hard), grit(b.palette.hardEdge)],
    ];
    for (const [kind, fill, edge] of rock) {
      for (let mask = 0; mask < 16; mask++) {
        tileFace(g, dirt, dirtEdge, mask * 5 + kind.length * 13);
        stoneBlob(g, fill, edge, mask, accent);
        g.generateTexture(`t_${b.id}_${kind}_${mask}`, TILE, TILE);
      }
    }
  }
  g.destroy();
}

function genStaticTiles(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // grass-topped soil for the surface row (topsoil → rock cross-section starts here)
  const topsoil = BIOMES[0].palette;
  tileFace(g, grit(topsoil.dirt), grit(topsoil.dirtEdge), 5);
  // dry, desaturated turf (not bubblegum lawn-green)
  g.fillStyle(grit(0x4e8a3a), 1);
  g.fillRect(0, 0, TILE, 7);
  g.fillStyle(grit(0x6ab04c), 1);
  g.fillRect(0, 0, TILE, 4);
  for (let x = 2; x < TILE; x += 5) {
    g.fillStyle(grit(0x7ec85a), 1);
    g.fillTriangle(x, 4, x + 3, 4, x + 1.5, -2 + (x % 7));
  }
  g.generateTexture('t_grass', TILE, TILE);

  g.clear();
  // bedrock — near-indestructible dark hatched
  tileFace(g, 0x14141a, 0x26262e, 3);
  g.lineStyle(2, 0x000000, 0.5);
  for (let i = -TILE; i < TILE; i += 8) g.lineBetween(i, 0, i + TILE, TILE);
  g.generateTexture('t_bedrock', TILE, TILE);

  // boulder — gritty, desaturated round rock with speckle, cracks + key-light shading
  g.clear();
  {
    const bc = TILE / 2;
    const br = TILE / 2 - 2;
    g.fillStyle(grit(0x6a6470), 1);
    g.fillCircle(bc, bc, br);
    g.fillStyle(grit(0x837c8a), 1);
    g.fillCircle(bc - 5, bc - 6, br - 8); // key-lit shoulder (top-left)
    g.fillStyle(0x000000, 0.42);
    g.fillCircle(bc + 6, bc + 8, br * 0.55); // occluded underside
    let bs = 4242;
    const brnd = () => ((bs = (bs * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 16; i++) {
      const a = brnd() * Math.PI * 2;
      const rr = brnd() * (br - 4);
      g.fillStyle(brnd() > 0.5 ? 0x000000 : grit(0x9a93a0), 0.22);
      g.fillRect(bc + Math.cos(a) * rr, bc + Math.sin(a) * rr, 1 + Math.floor(brnd() * 2), 1);
    }
    g.lineStyle(1, 0x000000, 0.4);
    g.lineBetween(bc - br * 0.4, bc - br * 0.2, bc + br * 0.1, bc + br * 0.5);
    g.lineBetween(bc + br * 0.2, bc - br * 0.4, bc + br * 0.45, bc + br * 0.1);
    g.lineStyle(2, darken(grit(0x6a6470), 0.55), 1);
    g.strokeCircle(bc, bc, br);
  }
  g.generateTexture('t_boulder', TILE, TILE);

  // lava — glowing molten
  g.clear();
  g.fillStyle(0xff5a1e, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0xffb02a, 0.9);
  for (let i = 0; i < 5; i++) g.fillCircle((i * 13) % TILE, (i * 19) % TILE, 6);
  g.fillStyle(0xfff04a, 0.8);
  g.fillCircle(TILE * 0.5, TILE * 0.4, 5);
  g.generateTexture('t_lava', TILE, TILE);

  // gas — translucent green haze
  g.clear();
  g.fillStyle(0x4aff8a, 0.32);
  g.fillRect(0, 0, TILE, TILE);
  g.fillStyle(0x9dffc0, 0.4);
  g.fillCircle(TILE * 0.35, TILE * 0.4, 9);
  g.fillCircle(TILE * 0.65, TILE * 0.62, 7);
  g.generateTexture('t_gas', TILE, TILE);

  g.destroy();
}

/** A faceted gem cluster overlay for an ore (transparent background). */
function genOres(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const o of ORES) {
    g.clear();
    const cx = TILE / 2;
    const cy = TILE / 2;
    const R = TILE * 0.3;
    // outer glow
    g.fillStyle(o.glow, 0.18);
    g.fillCircle(cx, cy, R * 1.5);
    // main facet
    g.fillStyle(o.color, 1);
    g.beginPath();
    g.moveTo(cx, cy - R);
    g.lineTo(cx + R * 0.85, cy - R * 0.2);
    g.lineTo(cx + R * 0.5, cy + R);
    g.lineTo(cx - R * 0.5, cy + R);
    g.lineTo(cx - R * 0.85, cy - R * 0.2);
    g.closePath();
    g.fillPath();
    // highlight facet
    g.fillStyle(lighten(o.glow, 10), 0.85);
    g.beginPath();
    g.moveTo(cx, cy - R);
    g.lineTo(cx + R * 0.85, cy - R * 0.2);
    g.lineTo(cx, cy + R * 0.1);
    g.closePath();
    g.fillPath();
    // glint
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(cx - R * 0.25, cy - R * 0.35, 2.2);
    g.generateTexture(`ore_${o.id}`, TILE, TILE);
  }
  g.destroy();
}

/** Special-find overlay icons. */
function genSpecials(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const cx = TILE / 2;
  const cy = TILE / 2;
  for (const sk of SPECIAL_KINDS) {
    g.clear();
    g.fillStyle(sk.glow, 0.18);
    g.fillCircle(cx, cy, TILE * 0.42);
    if (sk.kind === 'geode') {
      g.fillStyle(sk.color, 1);
      g.fillCircle(cx, cy, TILE * 0.32);
      g.fillStyle(sk.glow, 0.9);
      g.fillCircle(cx, cy, TILE * 0.18);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(cx - 4, cy - 4, 2);
    } else if (sk.kind === 'fossil') {
      g.lineStyle(3, sk.color, 1);
      g.strokeCircle(cx, cy, TILE * 0.22);
      g.lineStyle(2, sk.glow, 1);
      for (let a = 0; a < 6; a++) {
        const ang = (a / 6) * Math.PI * 2;
        g.lineBetween(cx, cy, cx + Math.cos(ang) * TILE * 0.22, cy + Math.sin(ang) * TILE * 0.22);
      }
    } else if (sk.kind === 'lockbox' || sk.kind === 'cache') {
      g.fillStyle(sk.color, 1);
      g.fillRoundedRect(cx - TILE * 0.26, cy - TILE * 0.2, TILE * 0.52, TILE * 0.4, 4);
      g.fillStyle(sk.glow, 1);
      g.fillRect(cx - 3, cy - TILE * 0.2, 6, TILE * 0.4);
      g.fillStyle(0x000000, 0.6);
      g.fillCircle(cx, cy, 3);
    } else if (sk.kind === 'goody') {
      // a wrapped present / treasure box with a bow
      g.fillStyle(sk.color, 1);
      g.fillRoundedRect(cx - TILE * 0.24, cy - TILE * 0.16, TILE * 0.48, TILE * 0.34, 4);
      g.fillStyle(sk.glow, 1);
      g.fillRect(cx - 3, cy - TILE * 0.16, 6, TILE * 0.34); // ribbon vertical
      g.fillRect(cx - TILE * 0.24, cy - 3, TILE * 0.48, 6); // ribbon horizontal
      g.fillStyle(sk.glow, 1);
      g.fillCircle(cx - 5, cy - TILE * 0.18, 4); // bow
      g.fillCircle(cx + 5, cy - TILE * 0.18, 4);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(cx - TILE * 0.12, cy - 2, 2);
    } else if (sk.kind === 'wreck') {
      // a broken, dead pod — half-buried husk
      g.fillStyle(sk.color, 1);
      g.fillRoundedRect(cx - TILE * 0.26, cy - TILE * 0.1, TILE * 0.52, TILE * 0.28, 5);
      g.fillStyle(0x12202e, 1);
      g.fillCircle(cx - TILE * 0.08, cy, TILE * 0.1); // dead cockpit
      g.fillStyle(sk.glow, 0.9);
      g.fillTriangle(cx + TILE * 0.18, cy - TILE * 0.05, cx + TILE * 0.3, cy + TILE * 0.06, cx + TILE * 0.16, cy + TILE * 0.14); // snapped drill
      g.lineStyle(2, 0x000000, 0.5);
      g.lineBetween(cx - TILE * 0.1, cy - TILE * 0.1, cx + TILE * 0.04, cy + TILE * 0.16); // crack
    } else {
      // artifact — diamond
      g.fillStyle(sk.color, 1);
      g.fillTriangle(cx, cy - TILE * 0.28, cx + TILE * 0.24, cy, cx, cy + TILE * 0.28);
      g.fillTriangle(cx, cy - TILE * 0.28, cx - TILE * 0.24, cy, cx, cy + TILE * 0.28);
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(cx - 4, cy - 6, 2.2);
    }
    g.generateTexture(`sp_${sk.kind}`, TILE, TILE);
  }
  g.destroy();
}

/** The mining pod — industrial hull, glowing visor, hazard stripe. ~TILE wide. */
function genPod(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const W = TILE;
  const H = TILE;
  g.clear();
  // thruster pods (dark steel with inner vent)
  g.fillStyle(0x2e333e, 1);
  g.fillRoundedRect(W * 0.13, H * 0.58, W * 0.15, H * 0.26, 4);
  g.fillRoundedRect(W * 0.72, H * 0.58, W * 0.15, H * 0.26, 4);
  g.fillStyle(0x171a22, 1);
  g.fillRect(W * 0.155, H * 0.76, W * 0.1, H * 0.06);
  g.fillRect(W * 0.745, H * 0.76, W * 0.1, H * 0.06);
  // antenna
  g.lineStyle(2, 0x8a93a0, 1);
  g.lineBetween(W * 0.7, H * 0.2, W * 0.78, H * 0.06);
  g.fillStyle(0xff5a5a, 1);
  g.fillCircle(W * 0.78, H * 0.055, 2.4);
  // main hull — dark riveted gunmetal-bronze (matches the DesignHandoff drill pod), soft top sheen
  g.fillStyle(0x5e564a, 1);
  g.fillRoundedRect(W * 0.15, H * 0.17, W * 0.7, H * 0.54, 9);
  g.fillStyle(0x7c7260, 1);
  g.fillRoundedRect(W * 0.18, H * 0.19, W * 0.64, H * 0.16, 7);
  g.fillStyle(0x3c362c, 1);
  g.fillRoundedRect(W * 0.15, H * 0.5, W * 0.7, H * 0.21, { tl: 0, tr: 0, bl: 9, br: 9 });
  // hazard chevrons on the skid plate
  g.fillStyle(0x23262e, 1);
  g.fillRect(W * 0.18, H * 0.585, W * 0.64, H * 0.075);
  g.fillStyle(0xffb347, 1);
  for (let i = 0; i < 4; i++) {
    const x0 = W * (0.2 + i * 0.16);
    g.fillTriangle(x0, H * 0.66, x0 + W * 0.07, H * 0.585, x0 + W * 0.14, H * 0.66);
  }
  // rivets
  g.fillStyle(0x9a8c66, 1);
  g.fillCircle(W * 0.2, H * 0.23, 1.6);
  g.fillCircle(W * 0.8, H * 0.23, 1.6);
  g.fillCircle(W * 0.2, H * 0.46, 1.6);
  g.fillCircle(W * 0.8, H * 0.46, 1.6);
  // cockpit visor — dark ring, glowing core, twin glints
  g.fillStyle(0x10171f, 1);
  g.fillCircle(W * 0.5, H * 0.37, W * 0.185);
  g.fillStyle(0x2ec4ff, 1);
  g.fillCircle(W * 0.5, H * 0.37, W * 0.135);
  g.fillStyle(0x9fe8ff, 0.85);
  g.fillCircle(W * 0.475, H * 0.345, W * 0.05);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(W * 0.455, H * 0.325, W * 0.022);
  // hull outline
  g.lineStyle(2, 0x26211a, 1);
  g.strokeRoundedRect(W * 0.15, H * 0.17, W * 0.7, H * 0.54, 9);
  // drill mount nub (the drill itself is a separate, orientable sprite)
  g.fillStyle(0x6b7280, 1);
  g.fillRect(W * 0.42, H * 0.66, W * 0.16, H * 0.09);
  g.generateTexture('pod', W, H);
  g.destroy();
}

/** Orientable drill bit + pop-out propellor (separate sprites parented to the pod). */
function genPodParts(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // DRILL — bit points DOWN by default (tip at bottom). Origin used = centre.
  const DW = Math.round(TILE * 0.44);
  const DH = Math.round(TILE * 0.52);
  g.clear();
  g.fillStyle(0x8a93a0, 1);
  g.fillRect(DW * 0.34, 0, DW * 0.32, DH * 0.42); // shaft
  g.fillStyle(0xcfd6df, 1);
  g.fillTriangle(DW * 0.14, DH * 0.38, DW * 0.86, DH * 0.38, DW * 0.5, DH * 0.99); // cone
  g.fillStyle(0x9aa3ad, 1);
  g.fillTriangle(DW * 0.5, DH * 0.38, DW * 0.86, DH * 0.38, DW * 0.5, DH * 0.99); // shade
  g.lineStyle(2, 0x5a626e, 1);
  g.lineBetween(DW * 0.28, DH * 0.5, DW * 0.72, DH * 0.58); // helical flutes
  g.lineBetween(DW * 0.33, DH * 0.66, DW * 0.67, DH * 0.74);
  g.lineBetween(DW * 0.4, DH * 0.82, DW * 0.6, DH * 0.88);
  g.generateTexture('drill', DW, DH);

  // PROPELLOR — horizontal rotor; spin faked via scaleX, pops out on thrust.
  const PW = Math.round(TILE * 0.84);
  const PH = Math.round(TILE * 0.3);
  g.clear();
  g.fillStyle(0xb8c0cc, 0.95);
  g.fillEllipse(PW * 0.5, PH * 0.5, PW * 0.92, PH * 0.42); // blade bar
  g.fillStyle(0x9aa3ad, 0.9);
  g.fillEllipse(PW * 0.5, PH * 0.5, PW * 0.5, PH * 0.36);
  g.fillStyle(0x6b7280, 1);
  g.fillCircle(PW * 0.5, PH * 0.5, PH * 0.3); // hub
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(PW * 0.5, PH * 0.42, PH * 0.12);
  g.generateTexture('propellor', PW, PH);

  // DEBRIS chunk — small rounded shard for brick-break bursts.
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(0, 0, 9, 9, 2);
  g.generateTexture('chunk', 9, 9);

  g.destroy();
}

/** Small FX sprites. */
function genFX(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  // soft circle
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('soft', 16, 16);
  // dust square
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 6, 6);
  g.generateTexture('dust', 6, 6);
  // spark
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 2, 10, 2);
  g.fillRect(4, 0, 2, 6);
  g.generateTexture('spark', 10, 6);
  // ring (for shockwaves)
  g.clear();
  g.lineStyle(3, 0xffffff, 1);
  g.strokeCircle(32, 32, 28);
  g.generateTexture('ring', 64, 64);
  g.destroy();
}

/** Vertical gradient background per biome (canvas — proper gradients). */
function genBackgrounds(scene: Phaser.Scene): void {
  for (const b of BIOMES) {
    const key = `bg_${b.id}`;
    if (scene.textures.exists(key)) continue;
    const ct = scene.textures.createCanvas(key, BASE_W, BASE_H);
    if (!ct) continue;
    const ctx = ct.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
    grad.addColorStop(0, hex(b.palette.bgTop));
    grad.addColorStop(1, hex(b.palette.bgBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    // vignette
    const vg = ctx.createRadialGradient(BASE_W / 2, BASE_H * 0.4, BASE_H * 0.2, BASE_W / 2, BASE_H * 0.5, BASE_H * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ct.refresh();
  }
}

/** Sky background for the surface. */
function genSky(scene: Phaser.Scene): void {
  const key = 'bg_sky';
  if (scene.textures.exists(key)) return;
  const ct = scene.textures.createCanvas(key, BASE_W, BASE_H);
  if (!ct) return;
  const ctx = ct.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, BASE_H);
  grad.addColorStop(0, '#1a2340');
  grad.addColorStop(0.5, '#3a2f4a');
  grad.addColorStop(1, '#5a3a32');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  let s = 12345;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 60; i++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.6;
    ctx.fillRect(rnd() * BASE_W, rnd() * BASE_H * 0.5, 2, 2);
  }
  ctx.globalAlpha = 1;
  ct.refresh();
}

/**
 * Edge-relief masks ("ambient occlusion"). For each open-neighbour bitmask (1=top, 2=bottom,
 * 4=left, 8=right) bake a 48px overlay: an inner shadow fading in from every open side plus
 * a thin rim — light on top/left, dark on bottom/right (top-left key light). Laid over solid
 * tiles that border tunnels, this gives the world carved, 3-D relief instead of flat squares.
 */
function genEdgeShades(scene: Phaser.Scene): void {
  const D = 10; // shadow reach in px
  for (let mask = 1; mask < 16; mask++) {
    const key = `edge_${mask}`;
    if (scene.textures.exists(key)) continue;
    const ct = scene.textures.createCanvas(key, TILE, TILE);
    if (!ct) continue;
    const ctx = ct.getContext();
    if (mask & 1) {
      const g = ctx.createLinearGradient(0, 0, 0, D);
      g.addColorStop(0, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, TILE, D);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, 0, TILE, 2);
    }
    if (mask & 2) {
      const g = ctx.createLinearGradient(0, TILE, 0, TILE - D);
      g.addColorStop(0, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, TILE - D, TILE, D);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, TILE - 2, TILE, 2);
    }
    if (mask & 4) {
      const g = ctx.createLinearGradient(0, 0, D, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, D, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(0, 0, 2, TILE);
    }
    if (mask & 8) {
      const g = ctx.createLinearGradient(TILE, 0, TILE - D, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(TILE - D, 0, D, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(TILE - 2, 0, 2, TILE);
    }
    ct.refresh();
  }
}

/** Additive thruster flame (teardrop gradient, flickered via scale at runtime). */
function genFlame(scene: Phaser.Scene): void {
  const key = 'flame';
  if (scene.textures.exists(key)) return;
  const W = 28;
  const H = 44;
  const ct = scene.textures.createCanvas(key, W, H);
  if (!ct) return;
  const ctx = ct.getContext();
  let g = ctx.createRadialGradient(W / 2, H * 0.3, 2, W / 2, H * 0.42, H * 0.62);
  g.addColorStop(0, 'rgba(255,240,180,0.95)');
  g.addColorStop(0.35, 'rgba(255,160,48,0.8)');
  g.addColorStop(0.75, 'rgba(255,80,20,0.35)');
  g.addColorStop(1, 'rgba(255,60,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H * 0.26, 1, W / 2, H * 0.3, 9);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ct.refresh();
}

/** Tiling parallax rock layer seen through tunnels/caves — slow-scrolling depth. */
function genCaveParallax(scene: Phaser.Scene): void {
  const key = 'cave_bg';
  if (scene.textures.exists(key)) return;
  const S = 256;
  const ct = scene.textures.createCanvas(key, S, S);
  if (!ct) return;
  const ctx = ct.getContext();
  ctx.fillStyle = '#0b0b13';
  ctx.fillRect(0, 0, S, S);
  let s = 777;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  // big soft boulders-in-shadow blobs (kept off the edges so the tile repeats cleanly)
  for (let i = 0; i < 26; i++) {
    const x = 24 + rnd() * (S - 48);
    const y = 24 + rnd() * (S - 48);
    const r = 8 + rnd() * 22;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(28,28,44,0.5)' : 'rgba(6,6,12,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ct.refresh();
}

/** Soft radial light brush used to "erase" holes in the underground darkness overlay. */
function genLightMask(scene: Phaser.Scene): void {
  const key = 'lightmask';
  if (scene.textures.exists(key)) return;
  const S = 512;
  const ct = scene.textures.createCanvas(key, S, S);
  if (!ct) return;
  const ctx = ct.getContext();
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.96)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  ct.refresh();
}

export function generateAllTextures(scene: Phaser.Scene): void {
  genTiles(scene);
  genStaticTiles(scene);
  genRecess(scene);
  genEdgeShades(scene);
  genFlame(scene);
  genCaveParallax(scene);
  genLightMask(scene);
  genOres(scene);
  genSpecials(scene);
  genPod(scene);
  genPodParts(scene);
  genFX(scene);
  genBackgrounds(scene);
  genSky(scene);
}
