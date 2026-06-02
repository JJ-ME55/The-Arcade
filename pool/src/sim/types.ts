/**
 * Pure simulation types for pool physics.
 *
 * No DOM, no Canvas2D, no Webpack-specific imports. These types are
 * import-safe from Node so the SolShot server can run the same physics
 * the browser does for server-authoritative shot adjudication.
 *
 * Wire format:
 *   - SerializableBall is what client sends to server (start of shot) and
 *     server returns to clients (end of shot)
 *   - ShotParams is what client commits when player presses READY TO SHOOT
 *   - SimulationResult bundles final state + every event that happened
 */

export type BallColor = 'white' | 'red' | 'yellow' | 'black';

export interface IVec2 {
  x: number;
  y: number;
}

export interface SerializableBall {
  /** Stable ID for cross-reference (cue ball is convention 0; 1-7 solids,
   *  8 black, 9-15 stripes; not enforced by sim — caller picks). */
  id: number;
  color: BallColor;
  position: IVec2;
  velocity: IVec2;
  /** Sidespin (english): [-1, +1]. */
  spinX: number;
  /** Top/back spin: [-1, +1]. */
  spinY: number;
  /** False once pocketed — sim still keeps the entry so IDs stay stable. */
  visible: boolean;
}

export interface ShotParams {
  /** Pixels per tick on the cue ball at release. */
  power: number;
  /** Radians; 0 = +x, π/2 = +y (canvas convention). */
  angle: number;
  spinX: number;
  spinY: number;
}

export interface TableConfig {
  /** Width of the playable canvas in game-space units (matches sprite layout). */
  width: number;
  height: number;
  /** Thickness of the cushion (margin where balls collide with rails). */
  cushionWidth: number;
  /** Pocket center positions (game-space). 6 pockets in standard pool. */
  pocketsPositions: IVec2[];
  /** Pocket capture radius. */
  pocketRadius: number;
}

export interface PhysicsConfig {
  /** Per-tick velocity multiplier loss (rolling friction). 0..1. */
  friction: number;
  /** Velocity multiplier loss applied on cushion + ball collisions. 0..1. */
  collisionLoss: number;
  /** Ball collision diameter. */
  ballDiameter: number;
  /** Below this velocity magnitude, ball is considered stopped. */
  minVelocityLength: number;
}

export type CushionId = 'top' | 'bottom' | 'left' | 'right';

export type ShotEventType =
  | 'cushion_hit'
  | 'ball_collision'
  | 'pocket_drop'
  | 'cue_ball_potted'      // scratch
  | 'eight_ball_potted'
  | 'simulation_complete';

export interface ShotEvent {
  type: ShotEventType;
  atTick: number;
  /** For cushion_hit: which cushion. */
  cushion?: CushionId;
  /** For ball_collision + pocket_drop + *_potted: primary ball ID. */
  ballId?: number;
  /** For ball_collision: the other ball. */
  otherBallId?: number;
  /** For pocket_drop: pocket index 0..5. */
  pocketIdx?: number;
}

export interface SimulationResult {
  /** Final ball state at quiescence (or maxTicks). */
  finalBalls: SerializableBall[];
  /** Every event that happened during the shot, in tick order. */
  events: ShotEvent[];
  /** How many ticks the simulation ran. */
  ticks: number;
  /** True if any ball was still moving when maxTicks hit (rare but possible). */
  truncated: boolean;
  /** Convenience: color of the first ball the cue ball touched (foul detection). */
  firstCollidedBallColor: BallColor | null;
  /** Convenience: IDs of all balls that were pocketed during the shot. */
  pocketedBallIds: number[];
}

/** Useful default for matching the existing browser game's physics tuning. */
export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = Object.freeze({
  friction: 0.018,
  collisionLoss: 0.018,
  ballDiameter: 32,
  minVelocityLength: 0.05
});

/** Safety cap so a runaway simulation never hangs the caller. ~80s at 60fps. */
export const DEFAULT_MAX_TICKS = 5000;
