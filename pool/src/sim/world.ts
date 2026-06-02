/**
 * Pure pool simulation world. No DOM, no rendering, no audio.
 *
 * Mirrors the existing browser physics in pool/src/game-objects/game-world.ts
 * exactly — same velocity friction, same elastic collision response, same
 * cushion reflection — but operates on plain SerializableBall objects so
 * the SolShot server can run the same code.
 *
 * Single-step physics tick:
 *   1. For each ball, predict nextPosition
 *   2. Resolve cushion collisions (reflect + spin response + energy loss)
 *   3. Resolve ball-ball collisions (elastic exchange + cue ball spin)
 *   4. Advance positions (apply velocity × friction)
 *   5. Resolve pocketing
 *   6. Snap stopped balls to zero
 *
 * Caller (simulate.ts) loops this until all balls stop or maxTicks hit.
 */

import {
  applySidespinToCushionBounce,
  applyTopBackSpinToBallCollision,
  decaySpin
} from '../physics/spin';

import type {
  SerializableBall,
  TableConfig,
  PhysicsConfig,
  CushionId,
  ShotEvent,
  IVec2
} from './types';

// ──────────────────────────────────────────────────────────────────────
// Vector math helpers — kept local to avoid coupling to the Vector2
// class (which is used heavily by the browser game but pulls in too
// much surface area for the server module).
// ──────────────────────────────────────────────────────────────────────

function vAdd(a: IVec2, b: IVec2): IVec2 { return { x: a.x + b.x, y: a.y + b.y }; }
function vSub(a: IVec2, b: IVec2): IVec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function vMul(a: IVec2, s: number): IVec2 { return { x: a.x * s, y: a.y * s }; }
function vLen(a: IVec2): number { return Math.sqrt(a.x * a.x + a.y * a.y); }
function vDot(a: IVec2, b: IVec2): number { return a.x * b.x + a.y * b.y; }
function vDist(a: IVec2, b: IVec2): number {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ──────────────────────────────────────────────────────────────────────
// Cushion + pocket helpers
// ──────────────────────────────────────────────────────────────────────

function nextPosition(ball: SerializableBall, friction: number): IVec2 {
  // Mirror Ball.nextPosition: position + velocity * (1 - friction)
  const v = vMul(ball.velocity, 1 - friction);
  return vAdd(ball.position, v);
}

function isOutsideTopBorder(pos: IVec2, table: TableConfig, ballDiameter: number): boolean {
  return pos.y - ballDiameter / 2 <= table.cushionWidth;
}
function isOutsideLeftBorder(pos: IVec2, table: TableConfig, ballDiameter: number): boolean {
  return pos.x - ballDiameter / 2 <= table.cushionWidth;
}
function isOutsideRightBorder(pos: IVec2, table: TableConfig, ballDiameter: number): boolean {
  return pos.x + ballDiameter / 2 >= table.width - table.cushionWidth;
}
function isOutsideBottomBorder(pos: IVec2, table: TableConfig, ballDiameter: number): boolean {
  return pos.y + ballDiameter / 2 >= table.height - table.cushionWidth;
}

function isInsidePocket(pos: IVec2, table: TableConfig): { hit: boolean; pocketIdx: number } {
  for (let i = 0; i < table.pocketsPositions.length; i++) {
    if (vDist(pos, table.pocketsPositions[i]) <= table.pocketRadius) {
      return { hit: true, pocketIdx: i };
    }
  }
  return { hit: false, pocketIdx: -1 };
}

// ──────────────────────────────────────────────────────────────────────
// Cushion collision — mirrors game-world.ts handleCollisionWith*Cushion
// ──────────────────────────────────────────────────────────────────────

function handleCushion(
  ball: SerializableBall,
  cushion: CushionId,
  table: TableConfig,
  physics: PhysicsConfig
): void {
  switch (cushion) {
    case 'top':
      ball.position = {
        x: ball.position.x,
        y: ball.position.y + (table.cushionWidth - ball.position.y + physics.ballDiameter / 2)
      };
      ball.velocity = { x: ball.velocity.x, y: -ball.velocity.y };
      break;
    case 'left':
      ball.position = {
        x: ball.position.x + (table.cushionWidth - ball.position.x + physics.ballDiameter / 2),
        y: ball.position.y
      };
      ball.velocity = { x: -ball.velocity.x, y: ball.velocity.y };
      break;
    case 'right':
      ball.position = {
        x: ball.position.x + (table.width - table.cushionWidth - ball.position.x - physics.ballDiameter / 2),
        y: ball.position.y
      };
      ball.velocity = { x: -ball.velocity.x, y: ball.velocity.y };
      break;
    case 'bottom':
      ball.position = {
        x: ball.position.x,
        y: ball.position.y + (table.height - table.cushionWidth - ball.position.y - physics.ballDiameter / 2)
      };
      ball.velocity = { x: ball.velocity.x, y: -ball.velocity.y };
      break;
  }

  // Apply sidespin kick
  const r = applySidespinToCushionBounce(cushion, ball.velocity, ball.spinX);
  ball.velocity = r.velocity;
  ball.spinX = r.spinAfter;
}

function resolveCushionCollisions(
  ball: SerializableBall,
  table: TableConfig,
  physics: PhysicsConfig,
  events: ShotEvent[],
  tick: number
): void {
  const next = nextPosition(ball, physics.friction);
  let collided = false;

  if (isOutsideTopBorder(next, table, physics.ballDiameter)) {
    handleCushion(ball, 'top', table, physics);
    events.push({ type: 'cushion_hit', atTick: tick, cushion: 'top', ballId: ball.id });
    collided = true;
  }
  if (isOutsideLeftBorder(next, table, physics.ballDiameter)) {
    handleCushion(ball, 'left', table, physics);
    events.push({ type: 'cushion_hit', atTick: tick, cushion: 'left', ballId: ball.id });
    collided = true;
  }
  if (isOutsideRightBorder(next, table, physics.ballDiameter)) {
    handleCushion(ball, 'right', table, physics);
    events.push({ type: 'cushion_hit', atTick: tick, cushion: 'right', ballId: ball.id });
    collided = true;
  }
  if (isOutsideBottomBorder(next, table, physics.ballDiameter)) {
    handleCushion(ball, 'bottom', table, physics);
    events.push({ type: 'cushion_hit', atTick: tick, cushion: 'bottom', ballId: ball.id });
    collided = true;
  }

  if (collided) {
    ball.velocity = vMul(ball.velocity, 1 - physics.collisionLoss);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Ball-ball collision — mirrors game-world.ts resolveBallsCollision
// ──────────────────────────────────────────────────────────────────────

function resolveBallsCollision(
  first: SerializableBall,
  second: SerializableBall,
  physics: PhysicsConfig
): boolean {
  if (!first.visible || !second.visible) return false;

  const n = vSub(first.position, second.position);
  const dist = vLen(n);
  if (dist > physics.ballDiameter) return false;

  // Snapshot pre-collision velocities for the spin follow-through math
  const firstPre: IVec2 = { x: first.velocity.x, y: first.velocity.y };
  const secondPre: IVec2 = { x: second.velocity.x, y: second.velocity.y };

  // MTD to unstick the balls
  const mtdFactor = (physics.ballDiameter - dist) / dist;
  const mtd = vMul(n, mtdFactor);
  first.position = vAdd(first.position, vMul(mtd, 0.5));
  second.position = vSub(second.position, vMul(mtd, 0.5));

  // Unit normal + tangent
  const un = vMul(n, 1 / dist);
  const ut: IVec2 = { x: -un.y, y: un.x };

  const v1n = vDot(un, first.velocity);
  const v1t = vDot(ut, first.velocity);
  const v2n = vDot(un, second.velocity);
  const v2t = vDot(ut, second.velocity);

  // Elastic exchange (equal masses)
  const v1nTag = vMul(un, v2n);
  const v1tTag = vMul(ut, v1t);
  const v2nTag = vMul(un, v1n);
  const v2tTag = vMul(ut, v2t);

  first.velocity = vAdd(v1nTag, v1tTag);
  second.velocity = vAdd(v2nTag, v2tTag);

  first.velocity = vMul(first.velocity, 1 - physics.collisionLoss);
  second.velocity = vMul(second.velocity, 1 - physics.collisionLoss);

  // Cue ball top/back spin follow-through
  if (first.color === 'white' && first.spinY !== 0) {
    const r = applyTopBackSpinToBallCollision(first.velocity, firstPre, first.spinY);
    first.velocity = r.velocity;
    first.spinY = r.spinAfter;
  }
  if (second.color === 'white' && second.spinY !== 0) {
    const r = applyTopBackSpinToBallCollision(second.velocity, secondPre, second.spinY);
    second.velocity = r.velocity;
    second.spinY = r.spinAfter;
  }

  return true;
}

// ──────────────────────────────────────────────────────────────────────
// Public API — single tick
// ──────────────────────────────────────────────────────────────────────

/**
 * Run a single physics tick over the world.
 * Mutates the ball objects in place. Pushes any events to the events array.
 *
 * @returns true if any ball is still moving after this tick
 */
export function stepWorld(
  balls: SerializableBall[],
  table: TableConfig,
  physics: PhysicsConfig,
  events: ShotEvent[],
  tick: number
): boolean {
  // Phase 1: cushion collisions (per ball, using predicted next position)
  for (const ball of balls) {
    if (!ball.visible) continue;
    if (vLen(ball.velocity) === 0) continue;
    resolveCushionCollisions(ball, table, physics, events, tick);
  }

  // Phase 2: ball-ball collisions (pairwise)
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (!a.visible) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (!b.visible) continue;
      const collided = resolveBallsCollision(a, b, physics);
      if (collided) {
        events.push({
          type: 'ball_collision',
          atTick: tick,
          ballId: a.id,
          otherBallId: b.id
        });
      }
    }
  }

  // Phase 3: advance positions + apply friction; check pockets; check stopped
  let anyMoving = false;
  for (const ball of balls) {
    if (!ball.visible) continue;
    const speed = vLen(ball.velocity);
    if (speed === 0) continue;

    // Apply friction first (matches Ball.update order in browser)
    ball.velocity = vMul(ball.velocity, 1 - physics.friction);
    ball.position = vAdd(ball.position, ball.velocity);

    // Decay spin in step with velocity
    const decayed = decaySpin(ball.spinX, ball.spinY);
    ball.spinX = decayed.spinX;
    ball.spinY = decayed.spinY;

    // Pocket check
    const pocketHit = isInsidePocket(ball.position, table);
    if (pocketHit.hit) {
      ball.visible = false;
      ball.velocity = { x: 0, y: 0 };
      ball.spinX = 0;
      ball.spinY = 0;
      events.push({
        type: 'pocket_drop',
        atTick: tick,
        ballId: ball.id,
        pocketIdx: pocketHit.pocketIdx
      });
      if (ball.color === 'white') {
        events.push({ type: 'cue_ball_potted', atTick: tick, ballId: ball.id });
      } else if (ball.color === 'black') {
        events.push({ type: 'eight_ball_potted', atTick: tick, ballId: ball.id });
      }
      continue;
    }

    // Dead-zone snap
    if (vLen(ball.velocity) < physics.minVelocityLength) {
      ball.velocity = { x: 0, y: 0 };
      ball.spinX = 0;
      ball.spinY = 0;
    } else {
      anyMoving = true;
    }
  }

  return anyMoving;
}
