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

function nextPosition(ball: SerializableBall, _friction: number): IVec2 {
  // Predict next position using current velocity (decel applied later
  // in advancePositions). This is intentionally NOT decelerated here —
  // the cushion-collision detection needs the actual where-the-ball-will-be
  // not where-it-will-be-after-friction. The exponential damping that
  // used to live here was structurally wrong (research workflow wghummavd
  // 2026-06: pool balls have constant-decel sliding then rolling phases,
  // not exponential damping). Decel happens in advancePositions below.
  return vAdd(ball.position, ball.velocity);
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
  // TRUE radius capture — the ball's centre is over the hole. No
  // ball-radius inflation: the previous +ballR/2 generosity (61px) and
  // the 80px rest-rescue potted balls from OUTSIDE the visible 48px
  // pocket rim, which read as false pots. Approach behaviour is now
  // handled by real mouth geometry (below), so capture can be honest.
  for (let i = 0; i < table.pocketsPositions.length; i++) {
    if (vDist(pos, table.pocketsPositions[i]) <= table.pocketRadius) {
      return { hit: true, pocketIdx: i };
    }
  }
  return { hit: false, pocketIdx: -1 };
}

// ──────────────────────────────────────────────────────────────────────
// Pocket-mouth geometry.
//
// The previous model suppressed ALL cushion collision within a radius
// of each pocket centre (pocketRadius + ballDiameter = 80px). That
// created a circular dead zone where balls could sail into rail
// territory, rest at impossible positions (JJ screenshot 2026-06: ball
// half-buried in the BL pocket mouth), and get teleport-potted by a
// rest-rescue. Three band-aids deep, still leaking.
//
// This model mirrors what the renderer actually draws (canvas.ts
// drawSidePocketTable → buildCushions): each rail is a cushion SEGMENT
// with a GAP at each adjacent pocket. The gap endpoints land where the
// pocket circle crosses the wood-seam line (Pythagoras), extended by
// the 30px chamfer miter to the playing face:
//
//   chord    = sqrt(pocketR² − (woodSeam − pocketPerp)²)
//   halfGap  = chord + JAW_CHAMFER
//   mouth    = [pocketAlong − halfGap, pocketAlong + halfGap]
//
// Inside a mouth there is no rail. A ball there either:
//   • crosses the pocket-centre plane or the true pocket radius → potted
//   • drifts sideways into a jaw (the chamfered cushion end) → bounces
//   • runs out of speed → drops (the mouth floor slopes into the hole;
//     a ball cannot rest there — matches real tables and Miniclip)
//
// Constants mirror canvas.ts: FELT_INSET=48 (wood seam), CHAMFER=30,
// VISIBLE_POCKET_R = pocketRadius + 6 (the drawn hole lip).
// ──────────────────────────────────────────────────────────────────────

// Defaults mirror canvas.ts (FELT_INSET=48, CHAMFER=30, VISIBLE_POCKET_R
// = pocketRadius + 6). Tables can override via the optional TableConfig
// fields — the browser adapter passes them explicitly so render and sim
// can never drift apart.
const DEFAULT_WOOD_SEAM_INSET = 48;
const DEFAULT_JAW_CHAMFER = 30;
const DEFAULT_POCKET_RIM = 6;

export interface PocketMouth {
  pocketIdx: number;
  /** Span along the rail axis (x for top/bottom rails, y for left/right) at the playing face. */
  lo: number;
  hi: number;
}

/**
 * Pocket mouths along one rail. Corner pockets contribute a mouth to
 * BOTH adjacent rails. Cheap enough to compute per call (≤3 pockets per
 * rail); keeping it stateless preserves server parity.
 */
export function railMouths(rail: CushionId, table: TableConfig): PocketMouth[] {
  const seamInset = table.woodSeamInset ?? DEFAULT_WOOD_SEAM_INSET;
  const chamfer = table.jawChamfer ?? DEFAULT_JAW_CHAMFER;
  const mouths: PocketMouth[] = [];
  for (let i = 0; i < table.pocketsPositions.length; i++) {
    const p = table.pocketsPositions[i];
    let onRail = false;
    let seam = 0;       // wood-seam coordinate perpendicular to the rail
    let perp = 0;       // pocket centre's perpendicular coordinate
    let along = 0;      // pocket centre's coordinate along the rail
    switch (rail) {
      case 'top':
        onRail = p.y <= table.cushionWidth;
        seam = seamInset; perp = p.y; along = p.x;
        break;
      case 'bottom':
        onRail = p.y >= table.height - table.cushionWidth;
        seam = table.height - seamInset; perp = p.y; along = p.x;
        break;
      case 'left':
        onRail = p.x <= table.cushionWidth;
        seam = seamInset; perp = p.x; along = p.y;
        break;
      case 'right':
        onRail = p.x >= table.width - table.cushionWidth;
        seam = table.width - seamInset; perp = p.x; along = p.y;
        break;
    }
    if (!onRail) continue;
    const d = seam - perp;
    const chord = Math.sqrt(Math.max(0, table.pocketRadius * table.pocketRadius - d * d));
    const halfGap = chord + chamfer;
    mouths.push({ pocketIdx: i, lo: along - halfGap, hi: along + halfGap });
  }
  return mouths;
}

/** The mouth containing `lateral` on `rail`, or null if the rail is solid there. */
export function mouthAt(rail: CushionId, lateral: number, table: TableConfig): PocketMouth | null {
  const mouths = railMouths(rail, table);
  for (const m of mouths) {
    if (lateral >= m.lo && lateral <= m.hi) return m;
  }
  return null;
}

/** Pot a ball: hide it, zero its motion, emit the standard event trio. */
function potBall(
  ball: SerializableBall,
  events: ShotEvent[],
  tick: number,
  pocketIdx: number
): void {
  ball.visible = false;
  ball.velocity = { x: 0, y: 0 };
  ball.spinX = 0;
  ball.spinY = 0;
  events.push({ type: 'pocket_drop', atTick: tick, ballId: ball.id, pocketIdx });
  if (ball.color === 'white') {
    events.push({ type: 'cue_ball_potted', atTick: tick, ballId: ball.id });
  } else if (ball.color === 'black') {
    events.push({ type: 'eight_ball_potted', atTick: tick, ballId: ball.id });
  }
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

  // Per-rail: reflect only where the cushion segment actually exists.
  // If the crossing point falls inside a pocket mouth, there is no rail
  // there — the ball sails into the mouth and phase 3 (pocket region)
  // takes over: capture, jaw bounce, or drop-at-rest.
  const tryRail = (rail: CushionId, beyond: boolean, lateral: number): void => {
    if (!beyond) return;
    if (mouthAt(rail, lateral, table)) return;
    handleCushion(ball, rail, table, physics);
    events.push({ type: 'cushion_hit', atTick: tick, cushion: rail, ballId: ball.id });
    collided = true;
  };

  tryRail('top', isOutsideTopBorder(next, table, physics.ballDiameter), next.x);
  tryRail('left', isOutsideLeftBorder(next, table, physics.ballDiameter), next.y);
  tryRail('right', isOutsideRightBorder(next, table, physics.ballDiameter), next.y);
  tryRail('bottom', isOutsideBottomBorder(next, table, physics.ballDiameter), next.x);

  if (collided) {
    ball.velocity = vMul(ball.velocity, 1 - physics.collisionLoss);
  }
}

// ──────────────────────────────────────────────────────────────────────
// Pocket region — runs in phase 3 after position advance, for any ball
// whose centre has crossed a rail line into a pocket mouth.
// ──────────────────────────────────────────────────────────────────────

/**
 * Handle a moving ball inside a pocket mouth. Returns true if potted.
 *
 * Rules, in priority order per rail the ball has crossed:
 *   1. Depth capture — ball centre passed the pocket-centre plane:
 *      it is inside the hole region; pot it. (Also the tunneling guard
 *      for fast balls that cross mouth + hole in one 50px step.)
 *   2. Jaw bounce — ball drifts sideways into the chamfered cushion
 *      end: reflect the lateral velocity with the usual energy loss.
 *      A jaw bounce can send the ball back out to the table — a real
 *      "rattle-out".
 *   3. Emergency clamp — beyond a rail line but NOT in any mouth
 *      (can only happen by tunneling past a jaw in one step): snap back
 *      to the playfield and reflect, so rail territory is unreachable.
 *
 * True-radius capture (centre over the hole) is checked by the caller
 * before this runs.
 */
function resolvePocketRegion(
  ball: SerializableBall,
  table: TableConfig,
  physics: PhysicsConfig,
  events: ShotEvent[],
  tick: number
): boolean {
  const ballR = physics.ballDiameter / 2;
  const minX = table.cushionWidth + ballR;
  const maxX = table.width - table.cushionWidth - ballR;
  const minY = table.cushionWidth + ballR;
  const maxY = table.height - table.cushionWidth - ballR;
  // Jaw wall inset — the chamfer is a 30px diagonal miter, so the
  // effective wall a ball edge meets sits about half a ball radius
  // inside the mouth span. Tuned visually against the rendered chamfer.
  const jawInset = ballR * 0.5;
  const loss = 1 - physics.collisionLoss;

  type RailCheck = {
    rail: CushionId;
    beyond: boolean;
    lateral: number;            // ball coordinate along the rail
    depthCrossed: (p: IVec2) => boolean;
    clampBack: () => void;      // emergency: snap to playfield + reflect
    jawReflect: (wall: number, dir: 1 | -1) => void;
  };

  const checks: RailCheck[] = [
    {
      rail: 'top',
      beyond: ball.position.y < minY,
      lateral: ball.position.x,
      depthCrossed: (p) => ball.position.y <= p.y,
      clampBack: () => {
        ball.position = { x: ball.position.x, y: minY };
        ball.velocity = { x: ball.velocity.x, y: Math.abs(ball.velocity.y) * loss };
      },
      jawReflect: (wall, dir) => {
        ball.position = { x: wall, y: ball.position.y };
        ball.velocity = { x: -ball.velocity.x * loss, y: ball.velocity.y * loss };
        void dir;
      }
    },
    {
      rail: 'bottom',
      beyond: ball.position.y > maxY,
      lateral: ball.position.x,
      depthCrossed: (p) => ball.position.y >= p.y,
      clampBack: () => {
        ball.position = { x: ball.position.x, y: maxY };
        ball.velocity = { x: ball.velocity.x, y: -Math.abs(ball.velocity.y) * loss };
      },
      jawReflect: (wall, dir) => {
        ball.position = { x: wall, y: ball.position.y };
        ball.velocity = { x: -ball.velocity.x * loss, y: ball.velocity.y * loss };
        void dir;
      }
    },
    {
      rail: 'left',
      beyond: ball.position.x < minX,
      lateral: ball.position.y,
      depthCrossed: (p) => ball.position.x <= p.x,
      clampBack: () => {
        ball.position = { x: minX, y: ball.position.y };
        ball.velocity = { x: Math.abs(ball.velocity.x) * loss, y: ball.velocity.y };
      },
      jawReflect: (wall, dir) => {
        ball.position = { x: ball.position.x, y: wall };
        ball.velocity = { x: ball.velocity.x * loss, y: -ball.velocity.y * loss };
        void dir;
      }
    },
    {
      rail: 'right',
      beyond: ball.position.x > maxX,
      lateral: ball.position.y,
      depthCrossed: (p) => ball.position.x >= p.x,
      clampBack: () => {
        ball.position = { x: maxX, y: ball.position.y };
        ball.velocity = { x: -Math.abs(ball.velocity.x) * loss, y: ball.velocity.y };
      },
      jawReflect: (wall, dir) => {
        ball.position = { x: ball.position.x, y: wall };
        ball.velocity = { x: ball.velocity.x * loss, y: -ball.velocity.y * loss };
        void dir;
      }
    }
  ];

  for (const c of checks) {
    if (!c.beyond) continue;
    const m = mouthAt(c.rail, c.lateral, table);
    if (!m) {
      c.clampBack();
      events.push({ type: 'cushion_hit', atTick: tick, cushion: c.rail, ballId: ball.id });
      continue;
    }
    const p = table.pocketsPositions[m.pocketIdx];
    if (c.depthCrossed(p)) {
      potBall(ball, events, tick, m.pocketIdx);
      return true;
    }
    // Jaw walls — only reflect when actually moving into the wall, so a
    // ball already bouncing away isn't re-reflected into a loop.
    const jawLo = m.lo + jawInset;
    const jawHi = m.hi - jawInset;
    const lateralVel = (c.rail === 'top' || c.rail === 'bottom') ? ball.velocity.x : ball.velocity.y;
    if (c.lateral < jawLo && lateralVel < 0) {
      c.jawReflect(jawLo, 1);
      events.push({ type: 'cushion_hit', atTick: tick, cushion: c.rail, ballId: ball.id });
    } else if (c.lateral > jawHi && lateralVel > 0) {
      c.jawReflect(jawHi, -1);
      events.push({ type: 'cushion_hit', atTick: tick, cushion: c.rail, ballId: ball.id });
    }
  }
  return false;
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

  // Phase 3: advance positions + two-regime constant-decel friction.
  //
  // Replaced 2026-06 — the old `velocity *= 1 - friction` exponential
  // damping was structurally wrong (deep-research workflow wghummavd,
  // 24/25 claims 3-0 confirmed). Real pool ball motion on cloth has
  // two distinct regimes:
  //   SLIDING — constant decel μ_s·g (skid phase, big decel)
  //   ROLLING — constant decel μ_r·g (long tail, small decel, ~20× smaller)
  // Slip-to-roll transition: when |surface velocity| < rollSlipThreshold.
  // For a ball struck without spin, this lands at exactly v=(5/7)·v_initial
  // (Han 2005 / Shepard derivation from solid-sphere I=(2/5)mR²).
  //
  // Our spinY field maps to top/back spin (forward roll axis); the
  // surface-velocity proxy here uses |velocity| since we don't carry a
  // full angular velocity vector — a faithful one-axis approximation
  // sufficient for the feel. A future pass can add the cross-product
  // surface-velocity check from tailuge/billiards for sidespin physics.
  let anyMoving = false;
  for (const ball of balls) {
    if (!ball.visible) continue;
    const speed = vLen(ball.velocity);
    if (speed === 0) continue;

    // Pick the regime. ~v_slip means we still have surface slip;
    // below that, the ball is in pure rolling. The 5/7 transition
    // emerges naturally from this — sliding decel drops |v| linearly
    // until it falls under the threshold, then rolling decel kicks in.
    const inSliding = speed > physics.rollSlipThreshold;
    const decel = inSliding ? physics.slidingDecel : physics.rollingDecel;

    // Constant deceleration along the velocity-opposite direction.
    // Δv = -decel · (v / |v|). Caps to zero so we don't overshoot
    // into negative magnitude when the decel step exceeds remaining
    // speed (low-velocity edge case).
    const newSpeed = Math.max(0, speed - decel);
    if (newSpeed === 0) {
      ball.velocity = { x: 0, y: 0 };
    } else {
      const scale = newSpeed / speed;
      ball.velocity = vMul(ball.velocity, scale);
    }

    ball.position = vAdd(ball.position, ball.velocity);

    // Decay spin in step with velocity
    const decayed = decaySpin(ball.spinX, ball.spinY);
    ball.spinX = decayed.spinX;
    ball.spinY = decayed.spinY;

    // Pocket capture — TRUE radius (centre over the hole). Honest
    // capture is safe now that mouth geometry handles the approach.
    const pocketHit = isInsidePocket(ball.position, table);
    if (pocketHit.hit) {
      potBall(ball, events, tick, pocketHit.pocketIdx);
      continue;
    }

    // Mouth region — depth capture, jaw bounces, emergency clamp.
    if (resolvePocketRegion(ball, table, physics, events, tick)) {
      continue;
    }

    // Dead-zone snap + rest rules.
    if (vLen(ball.velocity) < physics.minVelocityLength) {
      ball.velocity = { x: 0, y: 0 };
      ball.spinX = 0;
      ball.spinY = 0;

      // A stopped ball cannot rest:
      //   1. Inside a pocket mouth (beyond a rail line) — the mouth
      //      floor slopes into the hole on a real table. Drop it.
      //   2. With its centre over the visible hole lip
      //      (pocketRadius + POCKET_RIM = the drawn 48px circle) —
      //      nothing under its centre of mass. Drop it.
      // Anything else — including a genuine "hanging in the jaws" ball
      // sitting on felt at the mouth edge — stays. That hang is real
      // pool (and Miniclip) behaviour.
      const ballR = physics.ballDiameter / 2;
      const minXr = table.cushionWidth + ballR;
      const maxXr = table.width - table.cushionWidth - ballR;
      const minYr = table.cushionWidth + ballR;
      const maxYr = table.height - table.cushionWidth - ballR;

      let restPotIdx = -1;
      if (ball.position.y < minYr) {
        const m = mouthAt('top', ball.position.x, table);
        if (m) restPotIdx = m.pocketIdx;
      } else if (ball.position.y > maxYr) {
        const m = mouthAt('bottom', ball.position.x, table);
        if (m) restPotIdx = m.pocketIdx;
      }
      if (restPotIdx < 0 && ball.position.x < minXr) {
        const m = mouthAt('left', ball.position.y, table);
        if (m) restPotIdx = m.pocketIdx;
      } else if (restPotIdx < 0 && ball.position.x > maxXr) {
        const m = mouthAt('right', ball.position.y, table);
        if (m) restPotIdx = m.pocketIdx;
      }
      if (restPotIdx < 0) {
        const lipR = table.pocketRadius + (table.pocketRim ?? DEFAULT_POCKET_RIM);
        for (let i = 0; i < table.pocketsPositions.length; i++) {
          if (vDist(ball.position, table.pocketsPositions[i]) <= lipR) {
            restPotIdx = i;
            break;
          }
        }
      }
      if (restPotIdx >= 0) {
        potBall(ball, events, tick, restPotIdx);
      }
    } else {
      anyMoving = true;
    }
  }

  return anyMoving;
}
