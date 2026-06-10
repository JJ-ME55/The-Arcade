/**
 * The mining pod: weighty lander flight + custom AABB-vs-grid collision + the digging
 * mechanic. Hard rule: you can NEVER dig straight up (the core tension generator).
 */
import Phaser from 'phaser';
import { TILE, PHYS } from '../config/gameplay';
import type { World } from '../world/world';
import type { RunState, Tile } from '../core/types';
import type { DerivedStats } from '../systems/stats';
import { DIG } from '../config/gameplay';
import { cargoMassKg } from '../systems/run';

export interface PodInput {
  x: number; // -1..1 horizontal intent
  thrust: boolean;
  down: boolean;
}

export type DigDir = 'down' | 'left' | 'right' | null;

export interface PodStatus {
  thrusting: boolean;
  driving: boolean;
  digging: boolean;
  digDir: DigDir;
  digProgress01: number;
  speed: number;
}

export class Pod {
  px: number;
  py: number;
  vx = 0;
  vy = 0;
  readonly hw = TILE * 0.42;
  readonly hh = TILE * 0.42;
  onGround = false;
  facing: 1 | -1 = 1;
  gravityMul = 1; // set by run modifiers (e.g. Low Gravity)

  sprite: Phaser.GameObjects.Image;
  private drill: Phaser.GameObjects.Image;
  private prop: Phaser.GameObjects.Image;
  private flame: Phaser.GameObjects.Image;
  private flameOut = 0;
  private propOut = 0;
  private animTime = 0;
  private lastDigDir: DigDir = 'down';
  private scene: Phaser.Scene;
  private world: World;
  private run: RunState;
  private stats: DerivedStats;
  private thrustForcePerHp: number;

  private digTarget: { x: number; y: number } | null = null;
  private digProgress = 0;
  private digTotal = 1;

  onDigComplete?: (tx: number, ty: number, tile: Tile) => void;
  onDigStart?: (tx: number, ty: number, dir: DigDir) => void;
  onLand?: (speed: number) => void;

  constructor(scene: Phaser.Scene, world: World, run: RunState, stats: DerivedStats, px: number, py: number) {
    this.scene = scene;
    this.world = world;
    this.run = run;
    this.stats = stats;
    this.px = px;
    this.py = py;
    this.thrustForcePerHp = (PHYS.thrustAccel * PHYS.podMass) / 100;
    this.drill = scene.add.image(px, py + this.hh * 0.7, 'drill').setDepth(49);
    this.flame = scene.add
      .image(px, py + this.hh, 'flame')
      .setDepth(48)
      .setOrigin(0.5, 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    this.sprite = scene.add.image(px, py, 'pod').setDepth(50);
    this.prop = scene.add.image(px, py - this.hh, 'propellor').setDepth(51).setScale(1, 0).setVisible(false);
  }

  setStats(s: DerivedStats): void {
    this.stats = s;
  }

  /** Tint body + drill + prop together (pod skins). */
  setTint(tint: number): void {
    if (tint === 0xffffff) {
      this.sprite.clearTint();
      return;
    }
    this.sprite.setTint(tint);
  }

  cell(): { col: number; row: number } {
    return { col: Math.floor(this.px / TILE), row: Math.floor(this.py / TILE) };
  }

  teleportTo(px: number, py: number): void {
    this.px = px;
    this.py = py;
    this.vx = 0;
    this.vy = 0;
    this.digTarget = null;
    this.digProgress = 0;
  }

  private solid(col: number, row: number): boolean {
    return this.world.solidAt(col, row);
  }

  update(dt: number, input: PodInput): PodStatus {
    dt = Math.min(dt, 1 / 30);
    this.animTime += dt;

    // ---- horizontal ----
    const accel = (this.onGround ? PHYS.moveAccel : PHYS.moveAccel * PHYS.airControl) * dt;
    let driving = false;
    if (Math.abs(input.x) > 0.12) {
      this.vx += input.x * accel;
      this.facing = input.x < 0 ? -1 : 1;
      driving = true;
    } else {
      const f = (this.onGround ? PHYS.groundFriction : PHYS.airFriction) * dt;
      if (this.vx > 0) this.vx = Math.max(0, this.vx - f);
      else this.vx = Math.min(0, this.vx + f);
    }
    this.vx = Phaser.Math.Clamp(this.vx, -PHYS.maxHoriz, PHYS.maxHoriz);

    // ---- vertical: gravity + thrust (weight-aware) ----
    this.vy += PHYS.gravity * this.gravityMul * dt;
    let thrusting = false;
    if (input.thrust && !input.down) {
      const totalMass = PHYS.podMass + cargoMassKg(this.run);
      const effThrust = (this.stats.enginePower * this.thrustForcePerHp) / totalMass;
      this.vy -= effThrust * dt;
      thrusting = true;
    }
    this.vy = Phaser.Math.Clamp(this.vy, -PHYS.maxRise, PHYS.maxFall);

    // ---- move + collide (per axis) ----
    this.px += this.vx * dt;
    this.resolveX();
    const impactVy = this.vy;
    this.py += this.vy * dt;
    const landed = this.resolveY();
    // soft sky ceiling — a few tiles of headroom, then no higher (keeps the camera with you)
    const ceil = -TILE * 7;
    if (this.py < ceil) {
      this.py = ceil;
      this.vy = Math.max(0, this.vy);
    }
    this.updateGround();
    if (landed && impactVy > PHYS.fallDamageSpeed) this.onLand?.(impactVy);

    // ---- digging (never up) ----
    const status = this.updateDig(dt, input, thrusting);

    // ---- present ----
    this.sprite.setPosition(Math.round(this.px), Math.round(this.py));
    this.sprite.setFlipX(this.facing < 0);
    this.updateVisuals(status, thrusting, dt);

    return {
      thrusting,
      driving,
      digging: status.digging,
      digDir: status.dir,
      digProgress01: this.digTotal > 0 ? this.digProgress / this.digTotal : 0,
      speed: Math.hypot(this.vx, this.vy),
    };
  }

  /** Drill orients to the dig direction & spins; propellor pops out while thrusting. */
  private updateVisuals(status: { digging: boolean; dir: DigDir }, thrusting: boolean, dt: number): void {
    const dir: DigDir = status.dir ?? this.lastDigDir;
    if (status.dir) this.lastDigDir = status.dir;
    const off = this.hh * 0.7;
    // vibration toward the tile while drilling
    const vib = status.digging ? Math.sin(this.animTime * 70) * 1.6 : 0;
    let dx = 0;
    let dy = off;
    let rot = 0;
    if (dir === 'left') {
      dx = -off - vib;
      dy = 0;
      rot = Math.PI / 2;
    } else if (dir === 'right') {
      dx = off + vib;
      dy = 0;
      rot = -Math.PI / 2;
    } else {
      dy = off + vib;
    }
    this.drill.setPosition(Math.round(this.px + dx), Math.round(this.py + dy));
    this.drill.setRotation(rot);
    // fake axial spin by flipping the flutes while drilling
    this.drill.scaleX = status.digging && Math.sin(this.animTime * 50) < 0 ? -1 : 1;

    // propellor pop-out + spin
    const target = thrusting ? 1 : 0;
    this.propOut += (target - this.propOut) * Math.min(1, dt * 14);
    if (this.propOut < 0.02) {
      this.prop.setVisible(false);
    } else {
      this.prop.setVisible(true);
      this.prop.setPosition(Math.round(this.px), Math.round(this.py - this.hh - 2 - this.propOut * 6));
      this.prop.setScale(Math.cos(this.animTime * 48), this.propOut); // scaleX spin, scaleY pop
      this.prop.setAlpha(this.propOut);
    }

    // thruster flame — flickering additive jet under the pod while lifting
    this.flameOut += (target - this.flameOut) * Math.min(1, dt * 16);
    if (this.flameOut < 0.04) {
      this.flame.setVisible(false);
    } else {
      const fl = 0.85 + 0.35 * Math.abs(Math.sin(this.animTime * 31)) + 0.12 * Math.sin(this.animTime * 53);
      this.flame.setVisible(true);
      this.flame.setPosition(Math.round(this.px), Math.round(this.py + this.hh * 0.55));
      this.flame.setScale((0.8 + 0.2 * Math.sin(this.animTime * 47)) * this.flameOut, fl * this.flameOut * 1.25);
      this.flame.setAlpha(Math.min(1, this.flameOut * 1.2));
    }
  }

  private updateDig(dt: number, input: PodInput, thrusting: boolean): { digging: boolean; dir: DigDir } {
    let dir: DigDir = null;
    let tx = 0;
    let ty = 0;
    const col = Math.floor(this.px / TILE);
    const rowC = Math.floor(this.py / TILE);

    if (!thrusting) {
      if (input.down) {
        const r = Math.floor((this.py + this.hh + 2) / TILE);
        if (this.world.diggableAt(col, r)) {
          dir = 'down';
          tx = col;
          ty = r;
        }
      }
      if (!dir && input.x < -0.3) {
        const c = Math.floor((this.px - this.hw - 2) / TILE);
        if (this.world.diggableAt(c, rowC)) {
          dir = 'left';
          tx = c;
          ty = rowC;
        }
      }
      if (!dir && input.x > 0.3) {
        const c = Math.floor((this.px + this.hw + 2) / TILE);
        if (this.world.diggableAt(c, rowC)) {
          dir = 'right';
          tx = c;
          ty = rowC;
        }
      }
    }

    if (!dir) {
      this.digTarget = null;
      this.digProgress = 0;
      return { digging: false, dir: null };
    }

    // new target?
    if (!this.digTarget || this.digTarget.x !== tx || this.digTarget.y !== ty) {
      this.digTarget = { x: tx, y: ty };
      this.digProgress = 0;
      this.digTotal = Math.max(DIG.minDigTime, this.world.hardnessAt(tx, ty) / this.stats.drillPower);
      this.onDigStart?.(tx, ty, dir);
    }

    // align the pod to the tunnel for a clean entry
    if (dir === 'down') this.px = Phaser.Math.Linear(this.px, (tx + 0.5) * TILE, 0.25);
    else this.py = Phaser.Math.Linear(this.py, (ty + 0.5) * TILE, 0.25);

    this.digProgress += dt;
    if (this.digProgress >= this.digTotal) {
      const tile = this.world.getTile(tx, ty);
      this.world.clearTile(tx, ty);
      this.onDigComplete?.(tx, ty, tile);
      this.digTarget = null;
      this.digProgress = 0;
      // advance into the freed cell so the NEXT tile is immediately drillable —
      // makes continuous drilling feel smooth instead of dig-fall-dig.
      if (dir === 'down') {
        this.py = ty * TILE + TILE * 0.6;
        this.vy = Math.max(this.vy, 60);
      } else if (dir === 'left') {
        this.px = tx * TILE + TILE * 0.4;
        this.vx = Math.min(this.vx, -60);
      } else if (dir === 'right') {
        this.px = tx * TILE + TILE * 0.6;
        this.vx = Math.max(this.vx, 60);
      }
    }
    return { digging: true, dir };
  }

  private resolveX(): void {
    const top = this.py - this.hh + 3;
    const bottom = this.py + this.hh - 3;
    const r0 = Math.floor(top / TILE);
    const r1 = Math.floor(bottom / TILE);
    if (this.vx > 0) {
      const col = Math.floor((this.px + this.hw) / TILE);
      for (let r = r0; r <= r1; r++)
        if (this.solid(col, r)) {
          this.px = col * TILE - this.hw - 0.01;
          this.vx = 0;
          return;
        }
    } else if (this.vx < 0) {
      const col = Math.floor((this.px - this.hw) / TILE);
      for (let r = r0; r <= r1; r++)
        if (this.solid(col, r)) {
          this.px = (col + 1) * TILE + this.hw + 0.01;
          this.vx = 0;
          return;
        }
    }
  }

  private resolveY(): boolean {
    const left = this.px - this.hw + 3;
    const right = this.px + this.hw - 3;
    const c0 = Math.floor(left / TILE);
    const c1 = Math.floor(right / TILE);
    if (this.vy > 0) {
      const row = Math.floor((this.py + this.hh) / TILE);
      for (let c = c0; c <= c1; c++)
        if (this.solid(c, row)) {
          this.py = row * TILE - this.hh - 0.01;
          this.vy = 0;
          return true;
        }
    } else if (this.vy < 0) {
      const row = Math.floor((this.py - this.hh) / TILE);
      for (let c = c0; c <= c1; c++)
        if (this.solid(c, row)) {
          this.py = (row + 1) * TILE + this.hh + 0.01;
          this.vy = 0;
          return false;
        }
    }
    return false;
  }

  private updateGround(): void {
    const left = this.px - this.hw + 3;
    const right = this.px + this.hw - 3;
    const c0 = Math.floor(left / TILE);
    const c1 = Math.floor(right / TILE);
    const row = Math.floor((this.py + this.hh + 2) / TILE);
    this.onGround = false;
    for (let c = c0; c <= c1; c++)
      if (this.solid(c, row)) {
        this.onGround = true;
        return;
      }
  }
}
