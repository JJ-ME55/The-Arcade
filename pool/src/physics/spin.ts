/**
 * Pool spin physics — pure helpers.
 *
 * 2D top-down model. We track two spin axes per ball:
 *   - spinX  ∈ [-1, +1]   sidespin (a.k.a. english)
 *                          -1 = full left-hand english
 *                          +1 = full right-hand english
 *   - spinY  ∈ [-1, +1]   top/back spin
 *                          -1 = full backspin (draw — cue ball reverses on impact)
 *                          +1 = full topspin  (follow — cue ball continues forward)
 *
 * Spin is set by the cue-ball impact-point UI widget (designer spec §3.4)
 * at the moment the player presses READY TO SHOOT and decays continuously
 * while the ball is moving (friction transfers spin to linear motion).
 *
 * The helpers below are pure functions over numbers + Vector2 — no mutation
 * of game state. Caller applies the returned deltas to its Ball/GameWorld
 * fields. This makes the physics directly unit-testable.
 *
 * Sign conventions (matches the canvas):
 *   - x axis: right is positive
 *   - y axis: DOWN is positive (canvas convention, not math convention)
 *   - "tangent" along a cushion goes in the same direction as the cushion
 *     when looking from the playing side
 */

// ──────────────────────────────────────────────────────────────────────
// Vector2 minimal shape — pool's existing Vector2 is interchangeable
// ──────────────────────────────────────────────────────────────────────

export interface IV2 {
  x: number;
  y: number;
}

// ──────────────────────────────────────────────────────────────────────
// Tuning (kept conservative; designer + playtester can tune later)
// ──────────────────────────────────────────────────────────────────────

/** How much sidespin converts to tangential kick on a cushion bounce.
 *  At spinX = ±1 and a fast bounce, contributes ~30% of incident normal
 *  speed to tangential motion. */
export const SIDESPIN_CUSHION_TRANSFER = 0.30;

/** How much sidespin energy is consumed by a cushion bounce. After a
 *  hit, |spinX| ← |spinX| * (1 - SIDESPIN_CUSHION_LOSS). */
export const SIDESPIN_CUSHION_LOSS = 0.45;

/** How much topspin/backspin contributes to cue-ball post-collision
 *  follow/draw. At spinY = ±1, the cue ball's preserved forward velocity
 *  is ±SPIN_FOLLOWTHROUGH_FACTOR × pre-collision speed. */
export const SPIN_FOLLOWTHROUGH_FACTOR = 0.6;

/** Top/back spin is mostly consumed in a single object-ball impact. */
export const SPINY_OBJECT_BALL_LOSS = 0.7;

/** Per-frame spin decay (matches the existing friction model). Both
 *  axes decay at the same rate while the ball is moving. */
export const SPIN_FRICTION = 0.012;

/** Below this magnitude, treat the spin as zero. */
export const SPIN_DEAD_ZONE = 0.005;

// ──────────────────────────────────────────────────────────────────────
// Cushion identification
// ──────────────────────────────────────────────────────────────────────

export type CushionId = 'top' | 'bottom' | 'left' | 'right';

// ──────────────────────────────────────────────────────────────────────
// Pure functions
// ──────────────────────────────────────────────────────────────────────

/**
 * Clamp a spin axis to its valid range.
 */
export function clampSpinAxis(s: number): number {
  if (s > 1) return 1;
  if (s < -1) return -1;
  return s;
}

/**
 * Decay both spin axes one frame's worth (call alongside velocity friction).
 */
export function decaySpin(spinX: number, spinY: number): { spinX: number; spinY: number } {
  const sx = spinX * (1 - SPIN_FRICTION);
  const sy = spinY * (1 - SPIN_FRICTION);
  return {
    spinX: Math.abs(sx) < SPIN_DEAD_ZONE ? 0 : sx,
    spinY: Math.abs(sy) < SPIN_DEAD_ZONE ? 0 : sy
  };
}

/**
 * Apply sidespin to the post-bounce velocity off a cushion.
 *
 * Caller provides the velocity AFTER the standard reflect (n component
 * already flipped + collision loss already applied). This adds the
 * tangential kick from sidespin.
 *
 * @param cushion - which cushion was hit
 * @param velAfterReflect - velocity after the standard reflection
 * @param spinX - sidespin at the moment of contact, ∈ [-1, +1]
 * @returns { velocity, spinAfter } — velocity with tangential kick added,
 *          spin reduced by the energy loss factor
 */
export function applySidespinToCushionBounce(
  cushion: CushionId,
  velAfterReflect: IV2,
  spinX: number
): { velocity: IV2; spinAfter: number } {
  if (spinX === 0) return { velocity: velAfterReflect, spinAfter: 0 };

  // Magnitude of the tangential kick scales with normal-axis incident speed
  // (which equals the post-reflect normal speed since |reflect| ≈ |incident|).
  let kickX = 0;
  let kickY = 0;

  switch (cushion) {
    case 'top': {
      // Wall along x-axis at top. Normal-axis is y. Tangent is x.
      // Right-hand english (+spinX) on the top cushion kicks ball rightward.
      const normalSpeed = Math.abs(velAfterReflect.y);
      kickX = spinX * normalSpeed * SIDESPIN_CUSHION_TRANSFER;
      break;
    }
    case 'bottom': {
      // Wall along x-axis at bottom. Right-hand english kicks ball leftward
      // (mirror of top: same world-physics, observer's perspective flips).
      const normalSpeed = Math.abs(velAfterReflect.y);
      kickX = -spinX * normalSpeed * SIDESPIN_CUSHION_TRANSFER;
      break;
    }
    case 'left': {
      // Wall along y-axis at left. Right-hand english kicks ball upward
      // (negative y in canvas coords).
      const normalSpeed = Math.abs(velAfterReflect.x);
      kickY = -spinX * normalSpeed * SIDESPIN_CUSHION_TRANSFER;
      break;
    }
    case 'right': {
      // Wall along y-axis at right. Right-hand english kicks ball downward.
      const normalSpeed = Math.abs(velAfterReflect.x);
      kickY = spinX * normalSpeed * SIDESPIN_CUSHION_TRANSFER;
      break;
    }
  }

  const velocity: IV2 = {
    x: velAfterReflect.x + kickX,
    y: velAfterReflect.y + kickY
  };
  const spinAfter = spinX * (1 - SIDESPIN_CUSHION_LOSS);

  return { velocity, spinAfter };
}

/**
 * Apply topspin/backspin to the cue ball's post-collision velocity.
 *
 * Standard 2D elastic transfer leaves the cue ball with zero normal-axis
 * velocity (if the target was still). Topspin keeps some forward motion;
 * backspin sends it backward.
 *
 * @param cueVelAfterCollision - cue ball velocity after standard exchange
 * @param cueVelBeforeCollision - cue ball velocity right before impact
 *                                 (needed to know the "forward direction")
 * @param spinY - top/back spin at moment of contact, ∈ [-1, +1]
 * @returns { velocity, spinAfter }
 */
export function applyTopBackSpinToBallCollision(
  cueVelAfterCollision: IV2,
  cueVelBeforeCollision: IV2,
  spinY: number
): { velocity: IV2; spinAfter: number } {
  if (spinY === 0) return { velocity: cueVelAfterCollision, spinAfter: 0 };

  const preSpeed = Math.sqrt(
    cueVelBeforeCollision.x * cueVelBeforeCollision.x +
    cueVelBeforeCollision.y * cueVelBeforeCollision.y
  );
  if (preSpeed < 0.001) return { velocity: cueVelAfterCollision, spinAfter: 0 };

  // Unit vector pointing in the cue ball's original direction of motion
  const fwdX = cueVelBeforeCollision.x / preSpeed;
  const fwdY = cueVelBeforeCollision.y / preSpeed;

  // Topspin → +preSpeed * factor in forward direction
  // Backspin → negative same direction = reverse
  const followMag = spinY * SPIN_FOLLOWTHROUGH_FACTOR * preSpeed;

  const velocity: IV2 = {
    x: cueVelAfterCollision.x + fwdX * followMag,
    y: cueVelAfterCollision.y + fwdY * followMag
  };
  const spinAfter = spinY * (1 - SPINY_OBJECT_BALL_LOSS);

  return { velocity, spinAfter };
}

/**
 * Convenience: given a click point inside the cue-ball UI widget,
 * return spin coordinates clamped to the unit circle.
 *
 * The widget shows a circle of radius R; the player picks a contact
 * point inside. Points outside the circle are clamped to its edge.
 *
 * @param dx - widget x-offset from center
 * @param dy - widget y-offset from center
 * @param radius - widget radius in pixels
 */
export function widgetPointToSpin(
  dx: number,
  dy: number,
  radius: number
): { spinX: number; spinY: number } {
  if (radius <= 0) return { spinX: 0, spinY: 0 };
  let nx = dx / radius;
  let ny = dy / radius;
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) {
    const r = Math.sqrt(r2);
    nx /= r;
    ny /= r;
  }
  return { spinX: clampSpinAxis(nx), spinY: clampSpinAxis(ny) };
}
