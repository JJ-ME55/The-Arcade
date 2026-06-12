/**
 * Chunked, pooled tile rendering. Only tiles within the camera (+ margin) get sprites;
 * off-screen sprites are recycled. This keeps a 3000m-deep world at 60fps with flat
 * memory. Ore/specials render as overlays embedded in the wall (classic Motherload look).
 *
 * Layers (scene-level depths — NOT a container, whose insertion-order rendering ignores
 * child depth and could recycle an ore overlay underneath an opaque tile):
 *   10    tile face
 *   10.5  edge-relief shading (inner shadow + rim on sides that border open space)
 *   11    ore / special overlay
 */
import Phaser from 'phaser';
import { TILE, SURFACE_ROW } from '../config/gameplay';
import { Terrain, SOLID } from '../core/types';
import { hash2 } from '../core/rng';
import { biomeAt } from '../config/biomes';
import type { World } from './world';

const MARGIN = 2;
const KIND_NAME: Partial<Record<Terrain, 'dirt' | 'stone' | 'hard'>> = {
  [Terrain.Dirt]: 'dirt',
  [Terrain.Stone]: 'stone',
  [Terrain.HardStone]: 'hard',
};

/** What (if anything) at this cell should shine through the darkness. */
export type GlowKind = 'ore' | 'special' | 'lava';
export interface GlowCell {
  wx: number;
  wy: number;
  kind: GlowKind;
}

interface Cell {
  base: Phaser.GameObjects.Image;
  overlay: Phaser.GameObjects.Image | null;
  shade: Phaser.GameObjects.Image | null;
  glow: GlowKind | null;
}

interface BaseSpec {
  key: string;
  /** sample the texture by world position (continuous authored soil/rock), else a fixed tile. */
  byPos: boolean;
  tint: number;
}

/** Per-channel linear blend a→b. */
function lerpCol(a: number, b: number, t: number): number {
  const r = Math.round(((a >> 16) & 0xff) + (((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * t);
  const g = Math.round(((a >> 8) & 0xff) + (((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * t);
  const bl = Math.round((a & 0xff) + ((b & 0xff) - (a & 0xff)) * t);
  return (r << 16) | (g << 8) | bl;
}
function darkenCol(c: number, f: number): number {
  return (
    (Math.round(((c >> 16) & 0xff) * f) << 16) |
    (Math.round(((c >> 8) & 0xff) * f) << 8) |
    Math.round((c & 0xff) * f)
  );
}
// gentle biome wash multiplied onto the (neutral, dark) authored textures — keeps them earthy
// while still shifting hue per band, without crushing them to black.
function soilTint(dirt: number): number {
  return lerpCol(0xffffff, dirt, 0.24);
}
function rockTint(stone: number): number {
  return lerpCol(0xffffff, stone, 0.42);
}

export class TileRenderer {
  private scene: Phaser.Scene;
  private world: World;
  private active = new Map<string, Cell>();
  private basePool: Phaser.GameObjects.Image[] = [];
  private overlayPool: Phaser.GameObjects.Image[] = [];
  private shadePool: Phaser.GameObjects.Image[] = [];
  private dirty = new Set<string>();
  private last = { c0: 1, c1: 0, r0: 1, r1: 0 };
  private useAuthored = false;
  private gridN = 26; // soil/rock texture is gridN × gridN tiles (world-position frames)

  constructor(scene: Phaser.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    // authored CGI soil/rock: cut each into a gridN² mosaic of TILE-sized frames so every cell
    // can show its own world-position slice (seamless + detailed, not a blurry 48px downscale).
    this.useAuthored = scene.textures.exists('soil_tex') && scene.textures.exists('rock_tex');
    if (this.useAuthored) {
      const src = scene.textures.get('soil_tex').getSourceImage() as { width: number };
      this.gridN = Math.max(1, Math.floor(src.width / TILE));
      this.addGrid('soil_tex');
      this.addGrid('rock_tex');
    }
  }

  private addGrid(key: string): void {
    const tex = this.scene.textures.get(key);
    for (let r = 0; r < this.gridN; r++) {
      for (let c = 0; c < this.gridN; c++) {
        const fn = c + '_' + r;
        if (!tex.has(fn)) tex.add(fn, 0, c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  /** Mark a changed tile — and its neighbours, whose edge shading depends on it. */
  markDirty(x: number, y: number): void {
    this.dirty.add(x + ',' + y);
    this.dirty.add(x + 1 + ',' + y);
    this.dirty.add(x - 1 + ',' + y);
    this.dirty.add(x + ',' + (y + 1));
    this.dirty.add(x + ',' + (y - 1));
  }

  /** Positions of on-screen cells that should glint through the darkness. */
  getGlowCells(out: GlowCell[]): void {
    out.length = 0;
    this.active.forEach((cell, key) => {
      if (!cell.glow) return;
      const ci = key.indexOf(',');
      const x = parseInt(key.slice(0, ci), 10);
      const y = parseInt(key.slice(ci + 1), 10);
      out.push({ wx: x * TILE + TILE / 2, wy: y * TILE + TILE / 2, kind: cell.glow });
    });
  }

  private acquire(pool: Phaser.GameObjects.Image[], depth: number): Phaser.GameObjects.Image {
    const s = pool.pop();
    if (s) {
      s.setVisible(true).setActive(true);
      return s;
    }
    return this.scene.add.image(0, 0, 't_bedrock').setDepth(depth);
  }

  private releaseImg(pool: Phaser.GameObjects.Image[], img: Phaser.GameObjects.Image): void {
    img.setVisible(false).setActive(false);
    pool.push(img);
  }

  private release(key: string): void {
    const c = this.active.get(key);
    if (!c) return;
    this.releaseImg(this.basePool, c.base);
    if (c.overlay) this.releaseImg(this.overlayPool, c.overlay);
    if (c.shade) this.releaseImg(this.shadePool, c.shade);
    this.active.delete(key);
  }

  private soilSpec(x: number, y: number, dirt: number): BaseSpec {
    if (this.useAuthored) return { key: 'soil_tex', byPos: true, tint: soilTint(dirt) };
    const v = Math.floor(hash2(this.world.seed, x, y, 200) * 3);
    const biome = biomeAt(this.world.depthMeters(y));
    return { key: `t_${biome.id}_dirt_${v}`, byPos: false, tint: 0xffffff };
  }

  private baseSpec(x: number, y: number, t: Terrain): BaseSpec | null {
    if (t === Terrain.Sky) return null;
    // dug-out / cave space below the surface is a dark scooped recess, not a bright cut-out
    if (t === Terrain.Empty) return y > SURFACE_ROW ? { key: 'recess', byPos: false, tint: 0xffffff } : null;
    if (t === Terrain.Bedrock) return { key: 't_bedrock', byPos: false, tint: 0xffffff };
    if (t === Terrain.Lava) return { key: 't_lava', byPos: false, tint: 0xffffff };
    if (t === Terrain.Gas) return { key: 't_gas', byPos: false, tint: 0xffffff };
    const biome = biomeAt(this.world.depthMeters(y));
    // boulder rides a soil base (the round rock is drawn on the overlay layer above)
    if (t === Terrain.Boulder) return this.soilSpec(x, y, biome.palette.dirt);
    if (t === Terrain.Dirt) {
      if (y === SURFACE_ROW) return { key: 't_grass', byPos: false, tint: 0xffffff };
      return this.soilSpec(x, y, biome.palette.dirt);
    }
    if (t === Terrain.Stone || t === Terrain.HardStone) {
      if (this.useAuthored) {
        const tint = t === Terrain.HardStone ? darkenCol(rockTint(biome.palette.stone), 0.82) : rockTint(biome.palette.stone);
        return { key: 'rock_tex', byPos: true, tint };
      }
      // fallback: connectivity-masked procedural rock
      const kind = KIND_NAME[t];
      return { key: `t_${biome.id}_${kind}_${this.rockMask(x, y)}`, byPos: false, tint: 0xffffff };
    }
    return null;
  }

  /** Is the cell a rock pocket (stone or hard) — i.e. should it fuse with this one? */
  private isRock(x: number, y: number): boolean {
    const t = this.world.getTile(x, y).t;
    return t === Terrain.Stone || t === Terrain.HardStone;
  }

  /** Bitmask of rock-like orthogonal neighbours: 1=top, 2=bottom, 4=left, 8=right. */
  private rockMask(x: number, y: number): number {
    let m = 0;
    if (this.isRock(x, y - 1)) m |= 1;
    if (this.isRock(x, y + 1)) m |= 2;
    if (this.isRock(x - 1, y)) m |= 4;
    if (this.isRock(x + 1, y)) m |= 8;
    return m;
  }

  /** Bitmask of open (non-solid) neighbours: 1=top, 2=bottom, 4=left, 8=right. */
  private openMask(x: number, y: number): number {
    let m = 0;
    if (!this.world.solidAt(x, y - 1)) m |= 1;
    if (!this.world.solidAt(x, y + 1)) m |= 2;
    if (!this.world.solidAt(x - 1, y)) m |= 4;
    if (!this.world.solidAt(x + 1, y)) m |= 8;
    return m;
  }

  private renderCell(x: number, y: number): void {
    const key = x + ',' + y;
    const tile = this.world.getTile(x, y);
    const spec = this.baseSpec(x, y, tile.t);
    if (!spec) {
      this.release(key);
      return;
    }
    let cell = this.active.get(key);
    if (!cell) {
      cell = { base: this.acquire(this.basePool, 10), overlay: null, shade: null, glow: null };
      this.active.set(key, cell);
    }
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    const b = cell.base;
    if (spec.byPos) {
      const N = this.gridN;
      b.setTexture(spec.key, (((x % N) + N) % N) + '_' + (((y % N) + N) % N));
    } else {
      b.setTexture(spec.key);
    }
    b.setPosition(cx, cy).setTint(spec.tint);

    // edge-relief shading on square solids that border open space (skip round boulders)
    const wantShade = SOLID[tile.t] && tile.t !== Terrain.Boulder;
    const mask = wantShade ? this.openMask(x, y) : 0;
    if (mask > 0) {
      if (!cell.shade) cell.shade = this.acquire(this.shadePool, 10.5);
      cell.shade.setTexture(`edge_${mask}`).setPosition(cx, cy);
    } else if (cell.shade) {
      this.releaseImg(this.shadePool, cell.shade);
      cell.shade = null;
    }

    const overlayKey =
      tile.t === Terrain.Boulder
        ? 't_boulder'
        : tile.special
          ? 'sp_' + tile.special.split(':')[0]
          : tile.ore
            ? 'ore_' + tile.ore
            : null;
    if (overlayKey && this.scene.textures.exists(overlayKey)) {
      if (!cell.overlay) cell.overlay = this.acquire(this.overlayPool, 11);
      cell.overlay.setTexture(overlayKey).setPosition(cx, cy);
    } else if (cell.overlay) {
      this.releaseImg(this.overlayPool, cell.overlay);
      cell.overlay = null;
    }

    cell.glow = tile.special ? 'special' : tile.ore ? 'ore' : tile.t === Terrain.Lava ? 'lava' : null;
  }

  update(): void {
    const view = this.scene.cameras.main.worldView;
    const c0 = Math.floor(view.x / TILE) - MARGIN;
    const c1 = Math.floor((view.x + view.width) / TILE) + MARGIN;
    const r0 = Math.floor(view.y / TILE) - MARGIN;
    const r1 = Math.floor((view.y + view.height) / TILE) + MARGIN;

    const boundsSame = c0 === this.last.c0 && c1 === this.last.c1 && r0 === this.last.r0 && r1 === this.last.r1;
    if (boundsSame && this.dirty.size === 0) return;

    if (!boundsSame) {
      // release cells now off-screen
      for (const key of this.active.keys()) {
        const ci = key.indexOf(',');
        const x = parseInt(key.slice(0, ci), 10);
        const y = parseInt(key.slice(ci + 1), 10);
        if (x < c0 || x > c1 || y < r0 || y > r1) this.release(key);
      }
      // render newly visible cells
      for (let y = r0; y <= r1; y++)
        for (let x = c0; x <= c1; x++) if (!this.active.has(x + ',' + y)) this.renderCell(x, y);
      this.last = { c0, c1, r0, r1 };
    }

    if (this.dirty.size) {
      for (const key of this.dirty) {
        const ci = key.indexOf(',');
        const x = parseInt(key.slice(0, ci), 10);
        const y = parseInt(key.slice(ci + 1), 10);
        if (x >= c0 && x <= c1 && y >= r0 && y <= r1) this.renderCell(x, y);
      }
      this.dirty.clear();
    }
  }

  destroy(): void {
    this.active.forEach((c) => {
      c.base.destroy();
      c.overlay?.destroy();
      c.shade?.destroy();
    });
    this.active.clear();
    for (const p of [this.basePool, this.overlayPool, this.shadePool]) {
      for (const img of p) img.destroy();
      p.length = 0;
    }
  }
}
