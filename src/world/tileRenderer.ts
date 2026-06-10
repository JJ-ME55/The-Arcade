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

export class TileRenderer {
  private scene: Phaser.Scene;
  private world: World;
  private active = new Map<string, Cell>();
  private basePool: Phaser.GameObjects.Image[] = [];
  private overlayPool: Phaser.GameObjects.Image[] = [];
  private shadePool: Phaser.GameObjects.Image[] = [];
  private dirty = new Set<string>();
  private last = { c0: 1, c1: 0, r0: 1, r1: 0 };

  constructor(scene: Phaser.Scene, world: World) {
    this.scene = scene;
    this.world = world;
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

  private baseTexture(x: number, y: number, t: Terrain): string | null {
    if (t === Terrain.Empty || t === Terrain.Sky) return null;
    if (t === Terrain.Boulder) return 't_boulder';
    if (t === Terrain.Bedrock) return 't_bedrock';
    if (t === Terrain.Lava) return 't_lava';
    if (t === Terrain.Gas) return 't_gas';
    const kind = KIND_NAME[t];
    if (!kind) return null;
    // grass cap on the very top diggable row
    if (y === SURFACE_ROW && t === Terrain.Dirt) return 't_grass';
    const biome = biomeAt(this.world.depthMeters(y));
    const v = Math.floor(hash2(this.world.seed, x, y, 200) * 3);
    return `t_${biome.id}_${kind}_${v}`;
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
    const tex = this.baseTexture(x, y, tile.t);
    if (!tex) {
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
    cell.base.setTexture(tex).setPosition(cx, cy);

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

    const overlayKey = tile.special
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
