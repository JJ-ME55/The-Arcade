/**
 * Boulder dynamics — dislodged boulders fall (and can cave in on you). Deterministic,
 * cheap, processed only in a window around the pod. This is what makes you dig carefully.
 */
import Phaser from 'phaser';
import { TILE, WORLD_WIDTH } from '../config/gameplay';
import { Terrain } from '../core/types';
import type { World } from './world';
import type { TileRenderer } from './tileRenderer';

interface Falling {
  col: number;
  py: number;
  vy: number;
  sprite: Phaser.GameObjects.Image;
}

export class BoulderSystem {
  private scene: Phaser.Scene;
  private world: World;
  private renderer: TileRenderer;
  private falling: Falling[] = [];
  private scanTimer = 0;

  onCrush?: (damage: number) => void;
  getPodCell: () => { col: number; row: number; px: number; py: number };

  constructor(
    scene: Phaser.Scene,
    world: World,
    renderer: TileRenderer,
    getPodCell: () => { col: number; row: number; px: number; py: number },
  ) {
    this.scene = scene;
    this.world = world;
    this.renderer = renderer;
    this.getPodCell = getPodCell;
  }

  /** Force a support re-check around a cell (called right after a dig). */
  poke(): void {
    this.scanTimer = 1;
  }

  private isFallingAt(col: number, row: number): boolean {
    for (const f of this.falling) if (f.col === col && Math.floor(f.py / TILE) === row) return true;
    return false;
  }

  private dislodge(col: number, row: number): void {
    this.world.clearTile(col, row);
    this.renderer.markDirty(col, row);
    const sprite = this.scene.add.image(col * TILE + TILE / 2, row * TILE + TILE / 2, 't_boulder').setDepth(40);
    this.falling.push({ col, py: row * TILE + TILE / 2, vy: 30, sprite });
  }

  private scan(): void {
    const pc = this.getPodCell();
    const r0 = Math.max(0, pc.row - 6);
    const r1 = pc.row + 16;
    const c0 = Math.max(0, pc.col - 12);
    const c1 = Math.min(WORLD_WIDTH - 1, pc.col + 12);
    for (let r = r1; r >= r0; r--) {
      for (let c = c0; c <= c1; c++) {
        if (this.world.terrainAt(c, r) !== Terrain.Boulder) continue;
        if (this.isFallingAt(c, r)) continue;
        if (!this.world.solidAt(c, r + 1)) {
          this.dislodge(c, r);
        } else if (
          // simple roll: sits on solid but can topple into an empty diagonal
          this.world.solidAt(c, r + 1) &&
          !this.world.solidAt(c - 1, r) &&
          !this.world.solidAt(c - 1, r + 1) &&
          this.world.terrainAt(c, r + 1) === Terrain.Boulder
        ) {
          this.world.clearTile(c, r);
          this.renderer.markDirty(c, r);
          this.world.setTile(c - 1, r, { t: Terrain.Boulder });
          this.renderer.markDirty(c - 1, r);
        }
      }
    }
  }

  update(dt: number): void {
    this.scanTimer -= dt;
    if (this.scanTimer <= 0) {
      this.scanTimer = 0.12;
      this.scan();
    }

    if (this.falling.length === 0) return;
    const pc = this.getPodCell();
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.vy = Math.min(820, f.vy + 1150 * dt);
      f.py += f.vy * dt;
      f.sprite.y = Math.round(f.py);

      const curRow = Math.floor(f.py / TILE);
      const belowRow = Math.floor((f.py + TILE / 2 + 1) / TILE);

      // hit the pod?
      if (f.col === pc.col && Math.abs(f.py - pc.py) < TILE * 0.85 && f.vy > 180) {
        this.onCrush?.(16);
        this.settle(f, Math.max(0, curRow));
        this.falling.splice(i, 1);
        continue;
      }
      // land on solid
      if (this.world.solidAt(f.col, belowRow)) {
        this.settle(f, belowRow - 1);
        this.falling.splice(i, 1);
      }
    }
  }

  private settle(f: Falling, row: number): void {
    // never entomb the pod inside solid rock — the boulder shatters against it instead
    const pc = this.getPodCell();
    if (f.col === pc.col && row === pc.row) {
      this.onCrush?.(8);
      f.sprite.destroy();
      return;
    }
    this.world.setTile(f.col, row, { t: Terrain.Boulder });
    this.renderer.markDirty(f.col, row);
    f.sprite.destroy();
  }

  destroy(): void {
    for (const f of this.falling) f.sprite.destroy();
    this.falling.length = 0;
  }
}
