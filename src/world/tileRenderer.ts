/**
 * Chunked, pooled tile rendering. Only tiles within the camera (+ margin) get sprites;
 * off-screen sprites are recycled. This keeps a 3000m-deep world at 60fps with flat
 * memory. Ore/specials render as overlays embedded in the wall (classic Motherload look).
 */
import Phaser from 'phaser';
import { TILE, SURFACE_ROW } from '../config/gameplay';
import { Terrain } from '../core/types';
import { hash2 } from '../core/rng';
import { biomeAt } from '../config/biomes';
import type { World } from './world';

const MARGIN = 2;
const KIND_NAME: Partial<Record<Terrain, 'dirt' | 'stone' | 'hard'>> = {
  [Terrain.Dirt]: 'dirt',
  [Terrain.Stone]: 'stone',
  [Terrain.HardStone]: 'hard',
};

interface Cell {
  base: Phaser.GameObjects.Image;
  overlay: Phaser.GameObjects.Image | null;
}

export class TileRenderer {
  private scene: Phaser.Scene;
  private world: World;
  private layer: Phaser.GameObjects.Container;
  private active = new Map<string, Cell>();
  private basePool: Phaser.GameObjects.Image[] = [];
  private overlayPool: Phaser.GameObjects.Image[] = [];
  private dirty = new Set<string>();
  private last = { c0: 1, c1: 0, r0: 1, r1: 0 };

  constructor(scene: Phaser.Scene, world: World) {
    this.scene = scene;
    this.world = world;
    this.layer = scene.add.container(0, 0).setDepth(10);
  }

  markDirty(x: number, y: number): void {
    this.dirty.add(x + ',' + y);
    // neighbours can change appearance (none currently, but cheap to be safe)
  }

  private acquireBase(): Phaser.GameObjects.Image {
    const s = this.basePool.pop();
    if (s) {
      s.setVisible(true).setActive(true);
      return s;
    }
    const img = this.scene.add.image(0, 0, 't_bedrock');
    this.layer.add(img);
    return img;
  }
  private acquireOverlay(): Phaser.GameObjects.Image {
    const s = this.overlayPool.pop();
    if (s) {
      s.setVisible(true).setActive(true);
      return s;
    }
    const img = this.scene.add.image(0, 0, 'soft');
    this.layer.add(img);
    return img;
  }
  private release(key: string): void {
    const c = this.active.get(key);
    if (!c) return;
    c.base.setVisible(false).setActive(false);
    this.basePool.push(c.base);
    if (c.overlay) {
      c.overlay.setVisible(false).setActive(false);
      this.overlayPool.push(c.overlay);
    }
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
      cell = { base: this.acquireBase(), overlay: null };
      this.active.set(key, cell);
    }
    const cx = x * TILE + TILE / 2;
    const cy = y * TILE + TILE / 2;
    cell.base.setTexture(tex).setPosition(cx, cy).setDepth(10);

    const overlayKey = tile.special
      ? 'sp_' + tile.special.split(':')[0]
      : tile.ore
        ? 'ore_' + tile.ore
        : null;
    if (overlayKey && this.scene.textures.exists(overlayKey)) {
      if (!cell.overlay) cell.overlay = this.acquireOverlay();
      cell.overlay.setTexture(overlayKey).setPosition(cx, cy).setDepth(11);
    } else if (cell.overlay) {
      cell.overlay.setVisible(false).setActive(false);
      this.overlayPool.push(cell.overlay);
      cell.overlay = null;
    }
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
    this.layer.destroy(true);
    this.active.clear();
    this.basePool.length = 0;
    this.overlayPool.length = 0;
  }
}
