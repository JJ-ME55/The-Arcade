// @ts-nocheck
import { Tuning } from '../config/tuning';

export interface KartState {
  x: number;
  z: number;
  heading: number; // radians; 0 faces +z — the direction the kart FACES
  velHeading: number; // radians — the direction the kart actually MOVES (lags heading)
  speed: number; // units/s
  driftDir: number; // -1 / 0 / 1 — committed drift direction (0 = not drifting)
  driftCharge: number; // seconds held in the current drift (builds the mini-turbo)
  boostTimer: number; // seconds of mini-turbo / item boost remaining
  recoverTimer: number; // seconds left easing out of a just-released drift
  // item/hit state (optional — default to none)
  stunTimer?: number; // seconds spun out from a hit (ignores input)
  stunHeading?: number; // travel direction at the moment of the hit — the kart spins for show but
                        // recovers facing THIS way (so you don't end up pointed backwards)
  invulnTimer?: number; // i-frames remaining (ignores further hits)
  slowTimer?: number; // seconds of storm-cloud slow remaining
  shield?: boolean; // holding a shield that blocks one hit
  // jump state (optional — default to grounded)
  y?: number; // height above ground in world units (0 = on ground)
  vy?: number; // vertical velocity (units/s); positive = ascending
  /** Set true when the kart is over a water hole (no road under it): disables the
   *  y >= 0 clamp so gravity actually pulls it BELOW ground level and into the water,
   *  for the splash + sink + respawn sequence. Off everywhere else. */
  falling?: boolean;
  /** Absolute elapsed time at which a splashed kart should be teleported back to its
   *  last safe ground state. Undefined whenever it's not in the middle of a water respawn. */
  respawnAt?: number;
}

/** Shortest signed angular difference a→b, in (-PI, PI]. */
function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function angleLerp(a: number, b: number, t: number): number {
  return a + angleDiff(a, b) * t;
}

export interface KartInput {
  throttle: number; // 0..1
  steer: number; // -1..1 (left positive)
  onTrack: boolean;
  /** Off-track severity 0..1: 0 on the road / at the very edge, ramping to 1 deep in the
   *  grass. Drives a GRADUAL slowdown (gentle at the verge, slower the further out you stray)
   *  instead of a hard cliff. If omitted, derived from `onTrack` (0 or 1) for back-compat. */
  offRoad?: number;
  brake?: number; // 0..1
  drift?: boolean; // hold to drift
}

/** Mini-turbo tier (0 none, 1 blue, 2 orange, 3 purple) reached for a given drift charge. */
export function driftTier(charge: number, t: Tuning): number {
  if (charge >= t.driftTier3) return 3;
  if (charge >= t.driftTier2) return 2;
  if (charge >= t.driftTier1) return 1;
  return 0;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Turn authority as a function of speed fraction (0..1). Rises off the line,
 * peaks by `peakSpeedFraction`, then tapers toward `highSpeedRetention` at top
 * speed so the kart understeers at speed instead of getting darty.
 * See docs/research/kart-feel.md (R1).
 */
export function steeringAuthority(speedFrac: number, t: Tuning): number {
  const rampUp = Math.min(1, speedFrac / t.peakSpeedFraction);
  const taper = 1 - (1 - t.highSpeedRetention) * smoothstep(0.5, 1, speedFrac);
  return rampUp * taper;
}

/**
 * Pure, deterministic one-frame advance of a kart. No Three.js, no globals —
 * same function will drive the player, the AI bots, and (later) networked karts.
 */
export function stepKart(s: KartState, input: KartInput, t: Tuning, dt: number): KartState {
  // --- spun out from a hit: ignore input, spin, coast to a stop, tick timers ---
  const stun = s.stunTimer ?? 0;
  if (stun > 0) {
    const recover = s.stunHeading ?? s.velHeading; // the way the kart was travelling when it got hit
    const newStun = Math.max(0, stun - dt);
    // Spin the BODY for show, but keep MOVING the way it was going, and finish facing forward — no
    // more recovering pointed backwards. Spin for most of the stun, ease the facing back over the
    // last beat, and snap exactly to `recover` on the final frame.
    let heading: number;
    if (newStun === 0) heading = recover;
    else if (newStun < 0.3) heading = angleLerp(s.heading, recover, 0.3);
    else heading = s.heading + t.spinRate * dt;
    const speed = Math.max(0, s.speed - t.onTrackFriction * dt);
    const velHeading = recover; // momentum carries it straight along its original heading
    let sy = s.y ?? 0;
    let svy = s.vy ?? 0;
    if (sy > 0 || svy !== 0) { svy -= t.gravity * dt; sy += svy * dt; if (!s.falling && sy <= 0) { sy = 0; svy = 0; } }
    return {
      x: s.x + Math.sin(velHeading) * speed * dt,
      z: s.z + Math.cos(velHeading) * speed * dt,
      heading,
      velHeading,
      speed,
      driftDir: 0,
      driftCharge: 0,
      boostTimer: 0,
      recoverTimer: 0,
      stunTimer: newStun,
      stunHeading: newStun === 0 ? undefined : recover,
      invulnTimer: Math.max(0, (s.invulnTimer ?? 0) - dt),
      slowTimer: Math.max(0, (s.slowTimer ?? 0) - dt),
      shield: s.shield,
      y: sy,
      vy: svy,
      falling: s.falling,
      respawnAt: s.respawnAt,
    };
  }

  let speed = s.speed;
  let driftDir = s.driftDir;
  let driftCharge = s.driftCharge;
  let boostTimer = s.boostTimer;
  let recoverTimer = s.recoverTimer;
  let driftStarted = false;

  // --- drift state machine (uses pre-update speed fraction for the gates) ---
  const preFrac = t.maxSpeed === 0 ? 0 : Math.abs(speed) / t.maxSpeed;
  if (input.drift && preFrac >= t.driftBreakGate) {
    if (driftDir === 0) {
      // start a drift: needs the higher start gate + a steering direction
      if (input.steer !== 0 && preFrac >= t.driftStartGate) {
        driftDir = Math.sign(input.steer);
        driftCharge = 0;
        driftStarted = true;
      }
    } else {
      // keep drifting while held; steering the other way switches direction (charge restarts)
      const desired = input.steer !== 0 ? Math.sign(input.steer) : driftDir;
      if (desired !== driftDir) {
        driftDir = desired;
        driftCharge = 0;
        driftStarted = true;
      } else {
        driftCharge += dt;
      }
    }
  } else if (driftDir !== 0) {
    // released (or dropped below the break gate): award a boost by the charge tier reached
    boostTimer = Math.max(boostTimer, t.driftBoostDuration[driftTier(driftCharge, t)]);
    driftDir = 0;
    driftCharge = 0;
    recoverTimer = t.driftRecoverTime; // ease out of the drift over a short window
  }
  const drifting = driftDir !== 0;

  // --- longitudinal speed ---
  if (speed < t.maxSpeed) speed = Math.min(t.maxSpeed, speed + input.throttle * t.accel * dt);
  // brake decelerates; held past a standstill it builds reverse (up to -reverseMax)
  speed -= (input.brake ?? 0) * t.brakeAccel * dt;
  // Off-track severity (0 on road, →1 deep in grass). A continuous ramp so clipping the verge
  // barely slows you, but wandering well off does — no unnatural cliff at the road edge.
  const off = Math.max(0, Math.min(1, input.offRoad ?? (input.onTrack ? 0 : 1)));
  // friction always decays speed toward 0 (works for forward and reverse), blended by `off`
  const friction = t.onTrackFriction + (t.offTrackFriction - t.onTrackFriction) * off;
  if (speed > 0) speed = Math.max(0, speed - friction * dt);
  else if (speed < 0) speed = Math.min(0, speed + friction * dt);
  if (boostTimer > 0) {
    speed += t.boostAccel * dt;
    boostTimer = Math.max(0, boostTimer - dt);
  }
  speed = Math.max(-t.reverseMax, Math.min(t.maxSpeed * t.driftBoostMult, speed));

  // off-track speed cap, scaled by how far off you are (full road speed at the edge → the
  // grass cap deep out), so grass slows you progressively rather than all-at-once
  if (off > 0 && speed > 0) {
    const cap = t.maxSpeed * (1 - (1 - t.offTrackSpeedMult) * off);
    speed = Math.min(speed, cap);
  }

  // storm-cloud slow: cap speed while it lasts
  const slowTimer = s.slowTimer ?? 0;
  if (slowTimer > 0) speed = Math.min(speed, t.maxSpeed * t.stormSlowMult);

  const speedFrac = t.maxSpeed === 0 ? 0 : Math.min(1, Math.abs(speed) / t.maxSpeed);

  // --- steering (drift biases the turn toward the committed direction + tightens) ---
  let effSteer = input.steer;
  let turnMul = 1;
  if (drifting) {
    effSteer = Math.max(-1, Math.min(1, driftDir * t.driftInwardBias + input.steer * t.driftSteerInfluence));
    turnMul = t.driftTurnBonus;
  }
  // After a drift, ease the facing back toward the TRAVEL direction over the recovery
  // window so the kart un-angles gradually (no snap) while keeping its line (no whip).
  const recovering = !drifting && recoverTimer > 0;
  let headingBasis = s.heading;
  if (recovering) {
    headingBasis = angleLerp(s.heading, s.velHeading, t.driftRecoverRate);
    recoverTimer = Math.max(0, recoverTimer - dt);
  }
  // On drift entry/switch, snap the facing ahead by the entry-kick angle so the tail kicks
  // out on frame one — the slide is visible immediately instead of slowly ramping in.
  const entryKick = driftStarted ? driftDir * t.driftEntryKickDeg * (Math.PI / 180) : 0;
  const heading = headingBasis + entryKick + effSteer * t.turnRate * steeringAuthority(speedFrac, t) * turnMul * dt;

  // grip = how fast the velocity direction catches up to the facing direction.
  let grip = t.gripBase + (t.gripAtTopSpeed - t.gripBase) * speedFrac;
  if (off > 0) grip *= 1 - (1 - t.offRoadGripMult) * off;
  grip += (input.brake ?? 0) * t.brakeGripBonus;
  if (drifting) grip *= t.driftGripMult; // slide on purpose
  else if (recovering) grip *= t.driftGripMult; // keep the line while the facing eases back
  grip = Math.max(0, Math.min(1, grip));
  const velHeading = angleLerp(s.velHeading, heading, grip);

  // sliding sideways scrubs speed (much less while drifting — that's the point of drift)
  const slip = Math.abs(angleDiff(heading, velHeading));
  const scrub = t.slipScrub * (drifting ? t.driftScrubMult : 1);
  speed -= scrub * Math.sin(slip) * speed * dt;
  speed = Math.max(-t.reverseMax, speed);

  // the kart MOVES along velHeading, not heading
  const x = s.x + Math.sin(velHeading) * speed * dt;
  const z = s.z + Math.cos(velHeading) * speed * dt;

  // vertical / airborne — gravity pulls the kart back to the ground if it's in the air
  let y = s.y ?? 0;
  let vy = s.vy ?? 0;
  if (y > 0 || vy !== 0) {
    vy -= t.gravity * dt;
    y += vy * dt;
    if (!s.falling && y <= 0) { y = 0; vy = 0; }
  }

  return {
    x,
    z,
    heading,
    velHeading,
    speed,
    driftDir,
    driftCharge,
    boostTimer,
    recoverTimer,
    stunTimer: 0,
    stunHeading: undefined,
    invulnTimer: Math.max(0, (s.invulnTimer ?? 0) - dt),
    slowTimer: Math.max(0, slowTimer - dt),
    shield: s.shield ?? false,
    y,
    vy,
    falling: s.falling,
    respawnAt: s.respawnAt,
  };
}
