/**
 * Browser ↔ sim adapter.
 *
 * The sim core (pool/src/sim/{types,simulate,world}.ts) is pure Node and
 * operates on plain SerializableBall objects. The browser game has rich
 * Ball + Vector2 + Color classes. This file is the thin layer that
 * shuttles between them per frame:
 *
 *   each browser frame:
 *     ball → SerializableBall  (syncBallsToSerializable)
 *     stepWorld(view, table, physics, events, tick)   ← server-identical
 *     SerializableBall → ball  (syncSerializableToBalls)
 *     process events for sounds + foul tracking
 *
 * Once this lands, browser and server share the SAME physics implementation
 * byte-for-byte. No more drift, no client-side cheats.
 */

import { Color } from '../common/color';
import { Vector2 } from '../geom/vector2';
import { GameConfig } from '../game.config';

import type { Ball } from '../game-objects/ball';
import type {
  SerializableBall,
  TableConfig,
  PhysicsConfig,
  BallColor,
  IVec2
} from './types';

// ──────────────────────────────────────────────────────────────────────
// Color enum ↔ BallColor string
// ──────────────────────────────────────────────────────────────────────

export function colorEnumToBallColor(color: Color): BallColor {
  switch (color) {
    case Color.white:  return 'white';
    case Color.red:    return 'red';
    case Color.yellow: return 'yellow';
    case Color.black:  return 'black';
  }
  // Exhaustive switch above; this is unreachable but keeps the linter quiet
  // and gives a useful failure mode if a new Color enum is added.
  throw new Error(`colorEnumToBallColor: unknown color ${color}`);
}

// ──────────────────────────────────────────────────────────────────────
// Per-frame state transfer
// ──────────────────────────────────────────────────────────────────────

/**
 * Snapshot the current ball state into the sim's SerializableBall shape.
 * Allocates fresh objects each call — keeps the per-frame cost predictable
 * and avoids subtle bugs where mutation on the sim side would also mutate
 * the source Ball. Browser has ~16 balls; this is ~96 numeric writes per
 * frame. Trivial.
 */
export function syncBallsToSerializable(balls: Ball[]): SerializableBall[] {
  return balls.map((b) => ({
    id: b.id,
    color: colorEnumToBallColor(b.color),
    position: { x: b.position.x, y: b.position.y },
    velocity: { x: b.velocity.x, y: b.velocity.y },
    spinX: b.spinX,
    spinY: b.spinY,
    visible: b.visible
  }));
}

/**
 * Write the sim's updated state back to the browser Ball instances.
 * Uses ball.id to match — relies on initMatch assigning unique IDs.
 * Tracks visibility transitions (visible → hidden) by calling Ball.hide()
 * to ensure all the Ball-level cleanup (audio, sprite flag) runs.
 */
export function syncSerializableToBalls(
  serializable: SerializableBall[],
  balls: Ball[]
): void {
  const byId = new Map<number, Ball>();
  for (const b of balls) byId.set(b.id, b);

  for (const s of serializable) {
    const ball = byId.get(s.id);
    if (!ball) continue;

    // Position + velocity — direct copy. velocity setter handles the
    // _moving flag internally.
    ball.position = new Vector2(s.position.x, s.position.y);
    ball.velocity = new Vector2(s.velocity.x, s.velocity.y);
    ball.spinX = s.spinX;
    ball.spinY = s.spinY;

    // Visibility transitions
    if (!s.visible && ball.visible) {
      ball.hide();
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Config builders — read from GameConfig once, pass to stepWorld every tick
// ──────────────────────────────────────────────────────────────────────

/**
 * Build the sim's TableConfig from the browser's GameConfig.
 * Computed once per match and re-used across frames.
 */
export function buildSimTableConfig(): TableConfig {
  return {
    width: GameConfig.gameSize.x,
    height: GameConfig.gameSize.y,
    cushionWidth: GameConfig.table.cushionWidth,
    pocketsPositions: GameConfig.table.pocketsPositions.map((p): IVec2 => ({
      x: p.x,
      y: p.y
    })),
    pocketRadius: GameConfig.table.pocketRadius
  };
}

/**
 * Build the sim's PhysicsConfig from the browser's GameConfig.
 * Same friction + collision-loss + ball diameter the browser was using
 * before the refactor — keeps the exact same game feel.
 */
export function buildSimPhysicsConfig(): PhysicsConfig {
  return {
    friction:          GameConfig.physics.friction,
    slidingDecel:      GameConfig.physics.slidingDecel,
    rollingDecel:      GameConfig.physics.rollingDecel,
    rollSlipThreshold: GameConfig.physics.rollSlipThreshold,
    collisionLoss:     GameConfig.physics.collisionLoss,
    ballDiameter:      GameConfig.ball.diameter,
    minVelocityLength: GameConfig.ball.minVelocityLength
  };
}
