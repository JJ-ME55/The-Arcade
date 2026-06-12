// @ts-nocheck
/**
 * All physics/feel/balance numbers live here. Start values are reference-derived
 * or marked TODO — they are tuned by PLAYTEST, never silently invented.
 */
export const TUNING = {
  // longitudinal
  maxSpeed: 56, // units/s — +25% (45→56) for a faster, more challenging feel; harder to hold the racing line (playtest)
  accel: 60, // units/s^2 — scaled +25% with maxSpeed so it still reaches top speed snappily
  brakeAccel: 45, // gentler so braking eases to a stop rather than snapping
  reverseMax: 13, // top reverse speed when holding brake from a standstill
  onTrackFriction: 8, // passive decel on track
  offTrackFriction: 24, // grass drags HARD deep out — but blended by off-road severity (see kartPhysics), so the verge is gentle
  offTrackSpeedMult: 0.52, // speed cap deep in the grass (fraction of maxSpeed); ramps in by distance off so the edge isn't a cliff (playtest: grass felt unnaturally slow)

  // grip / sliding — see docs/research/cornering-grip.md
  // grip = how fast the velocity direction catches up to the facing direction.
  // High grip (low speed) = planted; low grip (top speed) = slides wide unless you slow.
  gripBase: 0.2, // grip at standstill (per fixed step)
  gripAtTopSpeed: 0.06, // grip at top speed (slides if you over-cook a corner)
  offRoadGripMult: 0.35, // grass is slippery, not just slow
  brakeGripBonus: 0.25, // braking restores grip — the cornering skill
  slipScrub: 0.9, // sliding sideways bleeds speed (arcade friction circle)

  // steering — see docs/research/kart-feel.md (R1+R3)
  turnRate: 1.8, // rad/s peak turn authority (was 2.4; lowered once curve fixed)
  peakSpeedFraction: 0.38, // speed fraction where turn authority maxes out
  highSpeedRetention: 0.55, // fraction of authority kept at top speed (understeer)

  // steering input smoothing (R2) — digital keys ramp instead of snapping
  steerRampRate: 6.0, // /s, push to full ~0.17s
  steerReturnRate: 9.0, // /s, re-center ~0.11s (snappier than ramp-in)

  // drift / mini-turbo — see docs/research/cornering-grip.md (R-G7) + kart-feel.md (§5)
  // drift = hold the drift key while fast + steering: grip drops (slide on purpose),
  // turn authority rises (rotate tighter), a charge builds → boost on release.
  driftStartGate: 0.55, // must be >55% top speed to START a drift (MK gate)
  driftBreakGate: 0.5, // drift breaks below 50% top speed
  driftGripMult: 0.25, // grip multiplier while drifting (lower = travel keeps more forward momentum = more slide)
  driftTurnBonus: 1.6, // turn-authority multiplier while drifting (tighter)
  driftInwardBias: 0.6, // baseline turn toward the committed drift direction
  driftSteerInfluence: 0.55, // how much player steer widens/tightens the drift (counter-steer)
  driftScrubMult: 0.35, // sliding while drifting bleeds far less speed than an uncontrolled slide
  driftEntryKickDeg: 12, // instant tail-kick (degrees of slip) on entering/switching a drift — see drift-feel.md
  driftRecoverTime: 0.3, // seconds to ease out of a drift (facing un-angles gradually, no snap)
  driftRecoverRate: 0.12, // per-step rate the facing eases toward travel during recovery
  driftTier1: 0.8, // seconds of drift for blue mini-turbo
  driftTier2: 1.8, // orange super mini-turbo
  driftTier3: 2.7, // slowed fill ~35% (playtest 2026-06-12: metre filled too fast) // purple ultra mini-turbo (eased from 2.4 — full bar was a touch too hard to reach)
  driftBoostDuration: [0, 0, 0, 0.85], // ONLY a full-bar (tier-3) drift boosts — eased from 1.1 (drift bonus was a bit strong)
  boostAccel: 130, // push toward the boost ceiling fast
  driftBoostMult: 1.28, // top-speed ceiling multiplier while boosting

  // items / hits — see docs/research/collisions.md
  spinTime: 1.1, // seconds spun out when hit
  hitInvuln: 1.3, // i-frames after a hit (and after a shield block) — no chain hits
  hitSpeedKeep: 0.2, // fraction of speed kept when hit
  spinRate: 9, // rad/s the kart spins while stunned
  turboBoost: 1.1, // seconds of boost from a Turbo Berry / cherry balloon (longer = juicier)
  stormSlow: 2.2, // seconds a Storm Cloud slows its victims
  stormSlowMult: 0.55, // speed cap (fraction of maxSpeed) while storm-slowed
  acornSpeed: 75, // forward projectile speed (units/s)
  beeSpeed: 80, // homing projectile base speed (also dynamically outruns its target)
  beeLife: 8.0, // seconds a homing bee chases before giving up (long — it hunts the target down)
  projectileLife: 3.0, // seconds before a projectile expires
  itemBoxRespawn: 3.0, // seconds for a used item box to return
  itemPickupRadius: 7, // distance to grab an item box
  hitRadius: 5, // projectile/trap hit distance

  // barriers — the run-off wall is physical (see barrier.ts)
  barrierRestitution: 0.12, // head-on: tiny rebound then stop (low = "wall stops you")
  barrierGlanceKeep: 0.82, // glancing: keep most sideways speed, scrape off a little

  // jumps (water-gap ramps, see TrackDef.jumpZone)
  gravity: 22, // units/s^2 pulling the kart back down while airborne
  jumpLaunch: 20, // initial vertical velocity when crossing a launch ramp (~2s air time at ramp height)
  jumpMinSpeed: 14, // need at least this much horizontal speed to clear the gap
  rampHeight: 4, // visual height of the ramp peak — launched from this y so the kart leaves the ramp
  respawnSpeedKeep: 0.7, // fraction of speed retained on a water respawn (don't strangle retries)

  // slipstream / rocket start / boost feel (playtest additions — MK/DKR-style juice)
  draftRange: 22,    // units behind a leading kart where you catch its slipstream
  draftMinDist: 4,   // ignore when you're basically touching it
  draftCone: 0.86,   // how directly behind you must be (dot of your heading vs the line to them)
  draftMult: 1.14,   // slipstream speed ceiling (fraction of maxSpeed)
  draftAccel: 40,    // how fast you wind up to the draft ceiling while tucked in
  rocketBoost: 1.0,  // seconds of boost for a well-timed rocket start
  rocketWindow: 0.85,// hold throttle starting within this many seconds before GO to earn it
  fovBase: 72,       // base camera FOV
  fovBoost: 7,       // extra FOV punched in while boosting (sells the speed)

  // chase camera
  camDistance: 14, // how far behind the kart
  camHeight: 7, // how high above
  camLookAhead: 16, // how far ahead of the kart the camera aims
  camLerp: 0.12, // 0..1 follow smoothing per frame
};

export type Tuning = typeof TUNING;
