/**
 * Pool shot simulation — top-level entry point.
 *
 * Used by the SolShot server to authoritatively resolve a shot:
 *   1. Client sends `(currentBalls, shotParams)`
 *   2. Server calls `simulateShot()`
 *   3. Server returns `(finalBalls, events)` to BOTH clients
 *
 * Determinism: identical inputs → identical outputs, no randomness, no
 * floating-point drift across browsers (we use only standard arithmetic).
 * This is the property that makes server-authoritative anti-cheat work —
 * client cannot lie about the outcome because server has the only vote
 * on what happens.
 *
 * Also used by the browser game (via a thin wrapper Ball/GameWorld
 * refactor in a later commit) so the same physics ships in both places.
 */

import {
  DEFAULT_MAX_TICKS
} from './types';

import type {
  SerializableBall,
  ShotParams,
  TableConfig,
  PhysicsConfig,
  ShotEvent,
  SimulationResult,
  BallColor
} from './types';

import { stepWorld } from './world';

/**
 * Apply a shot to the cue ball in the given world, then simulate forward
 * until all balls stop (or maxTicks safety cap).
 *
 * @param initialBalls - state at the moment the shot is committed. Caller
 *                       passes ALL balls (cue + objects); sim doesn't care
 *                       about order. Cue ball is identified by color='white'.
 * @param shotParams - power, angle, spin (from PowerHud + cue angle + SpinHud)
 * @param table - geometry (rebalanced per V3 themed tables)
 * @param physics - friction + collision-loss + ball diameter tuning
 * @param maxTicks - safety cap (defaults to DEFAULT_MAX_TICKS)
 * @returns full simulation result with final balls + all events
 */
export function simulateShot(
  initialBalls: SerializableBall[],
  shotParams: ShotParams,
  table: TableConfig,
  physics: PhysicsConfig,
  maxTicks: number = DEFAULT_MAX_TICKS
): SimulationResult {
  // Defensive deep-clone so caller's input isn't mutated. Cheaper than
  // structuredClone (no Map/Set/Date in our types) — JSON round-trip works.
  const balls: SerializableBall[] = initialBalls.map(b => ({
    id: b.id,
    color: b.color,
    position: { x: b.position.x, y: b.position.y },
    velocity: { x: b.velocity.x, y: b.velocity.y },
    spinX: b.spinX,
    spinY: b.spinY,
    visible: b.visible
  }));

  // Apply shot to the cue ball
  const cueBall = balls.find(b => b.color === 'white');
  if (!cueBall) {
    // No cue ball — return current state with a "complete" event.
    return {
      finalBalls: balls,
      events: [{ type: 'simulation_complete', atTick: 0 }],
      ticks: 0,
      truncated: false,
      firstCollidedBallColor: null,
      pocketedBallIds: []
    };
  }
  if (!cueBall.visible) {
    // Cue ball already pocketed — caller should have given it a fresh
    // position via ball-in-hand placement first.
    return {
      finalBalls: balls,
      events: [{ type: 'simulation_complete', atTick: 0 }],
      ticks: 0,
      truncated: false,
      firstCollidedBallColor: null,
      pocketedBallIds: []
    };
  }

  // Shot kinematics — mirrors Ball.shoot(power, angle)
  cueBall.velocity = {
    x: shotParams.power * Math.cos(shotParams.angle),
    y: shotParams.power * Math.sin(shotParams.angle)
  };
  cueBall.spinX = clampUnit(shotParams.spinX);
  cueBall.spinY = clampUnit(shotParams.spinY);

  // Run the simulation
  const events: ShotEvent[] = [];
  let tick = 0;
  let truncated = false;

  while (tick < maxTicks) {
    const anyMoving = stepWorld(balls, table, physics, events, tick);
    tick++;
    if (!anyMoving) break;
  }
  if (tick >= maxTicks) truncated = true;

  // Final event marker
  events.push({ type: 'simulation_complete', atTick: tick });

  // Derive convenience fields
  const firstCollidedBallColor = deriveFirstCollidedBallColor(events, balls);
  const pocketedBallIds = events
    .filter(e => e.type === 'pocket_drop')
    .map(e => e.ballId!)
    .filter(id => id !== undefined);

  return {
    finalBalls: balls,
    events,
    ticks: tick,
    truncated,
    firstCollidedBallColor,
    pocketedBallIds
  };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function clampUnit(s: number): number {
  if (s > 1) return 1;
  if (s < -1) return -1;
  return s;
}

/**
 * Walk events; return the color of the first non-cue ball the cue ball
 * touched (foul detection — must hit your own group first per 8-ball rules).
 */
function deriveFirstCollidedBallColor(
  events: ShotEvent[],
  finalBalls: SerializableBall[]
): BallColor | null {
  const byId = new Map<number, SerializableBall>();
  for (const b of finalBalls) byId.set(b.id, b);

  for (const e of events) {
    if (e.type !== 'ball_collision') continue;
    if (e.ballId === undefined || e.otherBallId === undefined) continue;
    const a = byId.get(e.ballId);
    const b = byId.get(e.otherBallId);
    if (!a || !b) continue;
    if (a.color === 'white') return b.color;
    if (b.color === 'white') return a.color;
  }
  return null;
}
