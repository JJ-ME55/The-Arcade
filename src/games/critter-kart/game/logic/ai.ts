// @ts-nocheck
import { KartState, KartInput } from './kartPhysics';
import { TrackPath } from './trackPath';
import { Tuning } from '../config/tuning';

/**
 * Rule-based bot driving. Aims at a point ahead on the track centreline (the
 * racing line), eases the throttle for sharp upcoming corners so it doesn't
 * slide off, and holds to a speed cap (difficulty / rubber-band knob). Pure +
 * framework-free — feeds the same stepKart the player uses.
 */
export interface BotParams {
  lookahead: number; // arc fraction ahead to steer toward
  cornerLook: number; // arc fraction ahead to assess corner sharpness
  steerGain: number; // how hard it corrects toward the line
  speedCap: number; // 0..1 of maxSpeed it will hold (raise to catch up, lower to ease off)
  cornerSlow: number; // how much sharp corners cut the target speed
  minCornerFrac: number; // floor on corner speed (fraction of maxSpeed)
  lineOffset: number; // lateral offset (world units) from the centreline = this bot's own racing line
}

export const DEFAULT_BOT: BotParams = {
  lookahead: 0.04,
  cornerLook: 0.1, // look well ahead to brake EARLY for corners — critical at the higher top speed
  steerGain: 3.0,
  speedCap: 1.0, // full speed on the straights
  cornerSlow: 0.65, // brake hard for corners so they HOLD the line (was running wide → 60s off-road)
  minCornerFrac: 0.54, // and slow right down for the sharpest bends rather than sliding off
  lineOffset: 0,
};

function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export function botInput(s: KartState, track: TrackPath, t: Tuning, p: BotParams, seek?: { x: number; z: number } | null): KartInput {
  const here = track.nearest(s.x, s.z);

  // steer toward a point ahead on THIS bot's line (centreline + its own lateral offset)
  const lookP = here.progress + p.lookahead;
  const c0 = track.pointAtProgress(lookP);
  const c1 = track.pointAtProgress(lookP + 0.012);
  let tx = c1.x - c0.x;
  let tz = c1.z - c0.z;
  const tl = Math.hypot(tx, tz) || 1;
  tx /= tl;
  tz /= tl;
  const target = { x: c0.x + tz * p.lineOffset, z: c0.z - tx * p.lineOffset };
  // If a pickup (item box / boost pad) has been flagged, divert toward it instead of the
  // pure racing line — this is what makes bots visibly fight for balloons and boosts.
  const aim = seek ?? target;
  const desired = Math.atan2(aim.x - s.x, aim.z - s.z);
  const steer = Math.max(-1, Math.min(1, angleDiff(s.heading, desired) * p.steerGain));

  // sharpest bend over the next stretch (kart->a vs a->b)
  const a = track.pointAtProgress(here.progress + p.cornerLook);
  const b = track.pointAtProgress(here.progress + p.cornerLook * 2);
  const corner = Math.abs(angleDiff(Math.atan2(a.x - s.x, a.z - s.z), Math.atan2(b.x - a.x, b.z - a.z)));

  // NO DRIFT for bots. A rule-based bot can't catch a slide like a human, so drifting just washes
  // it wide into the grass every corner (diagnostics showed ~60s/race off-track). Real kart-game
  // AI doesn't physically drift — it stays glued to the line and rubber-bands its SPEED instead.
  // So: brake properly for corners (slow-in) to hold the line, and let catch-up do the competing.
  const targetFrac = Math.min(p.speedCap, Math.max(p.minCornerFrac, 1 - corner * p.cornerSlow));
  const targetSpeed = targetFrac * t.maxSpeed;

  let throttle = 1;
  let brake = 0;
  if (s.speed > targetSpeed * 1.03) {
    throttle = 0;
    brake = 1; // hard slow-in before the corner so grip holds and it doesn't run wide
  } else if (s.speed > targetSpeed) {
    throttle = 0; // coast to settle at target
  }

  return { throttle, steer, brake, drift: false, onTrack: here.distance < track.halfWidth };
}
