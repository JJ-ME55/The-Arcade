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

/** Draw a single tile face: fill + bevel (light top-left, dark bottom-right) + speckles. */
/**
 * A parcel of SOIL (not a raised brick). Flat, speckled earth with a faint square-grid
 * division on the bottom & right edges — like Motherload's ground. No 3D bevel.
 */
function tileFace(g: G, fill: number, edge: number, variant: number): void {
  g.clear();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, TILE, TILE);

  let s = (variant * 9301 + 49297) % 233280;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);

  // soft organic mottling — patches of slightly lighter/darker earth
  for (let i = 0; i < 5; i++) {
    const x = rnd() * TILE;
    const y = rnd() * TILE;
    const r = 7 + rnd() * 11;
    g.fillStyle(rnd() > 0.5 ? darken(fill, 0.86) : lighten(fill, 10), 0.16);
    g.fillCircle(x, y, r);
  }

  // fine soil grains
  const n = 16 + Math.floor(rnd() * 10);
  for (let i = 0; i < n; i++) {
    const x = 2 + rnd() * (TILE - 4);
    const y = 2 + rnd() * (TILE - 4);
    const r = 0.6 + rnd() * 1.4;
    g.fillStyle(rnd() > 0.55 ? lighten(fill, 16) : darken(fill, 0.76), 0.4);
    g.fillCircle(x, y, r);
  }

  // a few small embedded pebbles (edge-tinted)
  const peb = Math.floor(rnd() * 3);
  for (let i = 0; i < peb; i++) {
    g.fillStyle(darken(edge, 0.85), 0.5);
    g.fillCircle(4 + rnd() * (TILE - 8), 4 + rnd() * (TILE - 8), 2 + rnd() * 1.5);
  }

  // faint parcel grid — a thin darker seam on bottom + right (single line per boundary)
  g.fillStyle(darken(fill, 0.55), 0.28);
  g.fillRect(0, TILE - 1, TILE, 1);
  g.fillRect(TILE - 1, 0, 1, TILE);
  g.fillStyle(darken(fill, 0.7), 0.12);
  g.fillRect(0, TILE - 2, TILE, 1);
  g.fillRect(TILE - 2, 0, 1, TILE);
}

function genTiles(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const b of BIOMES) {
    const sets: [string, number, number][] = [
      ['dirt', b.palette.dirt, b.palette.dirtEdge],
      ['stone', b.palette.stone, b.palette.stoneEdge],
      ['hard', b.palette.hard, b.palette.hardEdge],
    ];
    for (const [kind, fill, edge] of sets) {
      for (let v = 0; v < 3; v++) {
        tileFace(g, fill, edge, (b.depthStart + 1) * 7 + kind.length * 13 + v * 31);
        // crystal/core accent flecks for some variants
        if ((b.id === 'crystal' || b.id === 'core') && v === 2) {
          g.fillStyle(b.palette.accent, 0.5);
          g.fillTriangle(TILE * 0.6, TILE * 0.3, TILE * 0.7, TILE * 0.5, TILE * 0.55, TILE * 0.55);
        }
        g.generateTexture(`t_${b.id}_${kind}_${v}`, TILE, TILE);
      }
    }
  }
  g.destroy();
}

function genStaticTiles(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // grass-topped soil for the surface row (topsoil → rock cross-section starts here)
  const topsoil = BIOMES[0].palette;
  tileFace(g, topsoil.dirt, topsoil.dirtEdge, 5);
  g.fillStyle(0x4e8a3a, 1);
  g.fillRect(0, 0, TILE, 7);
  g.fillStyle(0x6ab04c, 1);
  g.fillRect(0, 0, TILE, 4);
  for (let x = 2; x < TILE; x += 5) {
    g.fillStyle(0x7ec85a, 1);
    g.fillTriangle(x, 4, x + 3, 4, x + 1.5, -2 + (x % 7));
  }
  g.generateTexture('t_grass', TILE, TILE);

  g.clear();
  // bedrock — near-indestructible dark hatched
  tileFace(g, 0x14141a, 0x26262e, 3);
  g.lineStyle(2, 0x000000, 0.5);
  for (let i = -TILE; i < TILE; i += 8) g.lineBetween(i, 0, i + TILE, TILE);
  g.generateTexture('t_bedrock', TILE, TILE);

  // boulder — round shaded rock
  g.clear();
  g.fillStyle(0x5a5560, 1);
  g.fillCircle(TILE / 2, TILE / 2, TILE / 2 - 2);
  g.fillStyle(0x736d7c, 1);
  g.fillCircle(TILE / 2 - 5, TILE / 2 - 5, TILE / 2 - 9);
  g.fillStyle(0x3a3640, 0.6);
  g.fillCircle(TILE / 2 + 6, TILE / 2 + 7, TILE / 4);
  g.lineStyle(2, 0x2a2730, 1);
  g.strokeCircle(TILE / 2, TILE / 2, TILE / 2 - 2);
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
  // main hull — two-tone with a soft top sheen
  g.fillStyle(0xf2c63c, 1);
  g.fillRoundedRect(W * 0.15, H * 0.17, W * 0.7, H * 0.54, 9);
  g.fillStyle(0xffe372, 1);
  g.fillRoundedRect(W * 0.18, H * 0.19, W * 0.64, H * 0.16, 7);
  g.fillStyle(0xc9982c, 1);
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
  g.fillStyle(0xa57f22, 1);
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
  g.lineStyle(2, 0x6e5414, 1);
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
