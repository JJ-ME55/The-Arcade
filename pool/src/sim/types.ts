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
  /**
   * LEGACY field — was the per-tick exponential-damping multiplier
   * (velocity *= 1 - friction). The 2026-06 physics refactor replaced
   * this with the two-regime constant-decel model (slidingDecel +
   * rollingDecel). The field stays in the type for back-compat with
   * tests that still construct PhysicsConfig literals; it is no longer
   * read by stepWorld.
   */
  friction: number;
  /**
   * Sliding deceleration in game-coord units per tick² (μ_s · g · dt² in
   * pixel-per-tick units). Constant linear-in-time velocity loss while
   * the ball is sliding/skidding. From Shepard / Han 2005:
   *   μ_s ≈ 0.2 (cloth-on-resin sliding friction)
   *   g  ≈ 9.81 m/s² → with our 528 px/m scale, ~5180 px/s²
   *   At 60 fps (dt = 1/60), decel ≈ 0.2 · 5180 / 60 ≈ 17.3 px/tick
   * The ball is in this regime until surface velocity reaches zero
   * (slip-to-roll transition, v_final = 5/7 · v_initial for no-spin
   * shots).
   */
  slidingDecel: number;
  /**
   * Rolling deceleration in game-coord units per tick². Same form as
   * sliding, but with μ_r ≈ 0.01 (rolling resistance on Simonis cloth).
   * Roughly 20× smaller than slidingDecel — gives the long, slow tail
   * that "feels right" once the skid phase ends.
   *   At 60 fps: decel ≈ 0.01 · 5180 / 60 ≈ 0.86 px/tick
   * Replaces the previous exponential `friction` field for the rolling
   * regime.
   */
  rollingDecel: number;
  /**
   * Surface-velocity magnitude below which the ball is considered to
   * be in pure rolling (no slip). When |v + R · (up × ω)| < this, the
   * sliding-friction kick stops and we switch to rolling resistance.
   * Tuned per the tailuge/billiards reference (~0.05 in their units,
   * scaled to our pixel-per-tick world).
   */
  rollSlipThreshold: number;
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

/**
 * Default physics tuning — calibrated against the deep-research findings
 * (workflow wghummavd, 2026-06): constants μ_s=0.20, μ_r=0.01 (Shepard /
 * Han 2005 standard); world scale ≈ 528 px/m (regulation 2.84m table fits
 * our 1500-px canvas width); 60 fps assumed.
 *   slidingDecel = 0.20 · 9.81 · 528 / 60² = ~0.288 px/tick²
 *     (but expressed per-tick — so velocity decrement per tick is
 *      0.20 · 9.81 · 528 / 60 ≈ 17.3 px/tick at the start of each tick).
 *   rollingDecel = 0.01 · 9.81 · 528 / 60 ≈ 0.86 px/tick.
 *
 * These values give a hard shot (~200 px/tick initial) ~3.4 ticks of
 * skid before transitioning to roll, then ~166 ticks of rolling to
 * stop — total ~2.8s. Matches the feel of regulation pool.
 */
export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = Object.freeze({
  friction: 0.018,            // legacy, unused by stepWorld
  slidingDecel: 17.3,
  rollingDecel: 0.86,
  rollSlipThreshold: 1.2,     // tuned empirically — captures the surface-vel transition
  collisionLoss: 0.018,
  ballDiameter: 32,
  minVelocityLength: 0.05
});

/** Safety cap so a runaway simulation never hangs the caller. ~80s at 60fps. */
export const DEFAULT_MAX_TICKS = 5000;
