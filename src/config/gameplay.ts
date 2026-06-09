/**
 * Central tuning sheet. All "magic numbers" live here so balancing is one file.
 * Physics values are in pixels & seconds. 1 tile = TILE px. 1 row below surface = 1 m.
 */

// ---- World dimensions ----
export const TILE = 48;
// Wide enough that even big desktop monitors see mine, not the bedrock walls.
export const WORLD_WIDTH = 64; // columns; world is unbounded deep
export const SKY_ROWS = 6; // rows of sky above the surface line
export const SURFACE_ROW = SKY_ROWS; // first diggable row (the ground)
export const DEPTH_PER_ROW = 1; // metres displayed per tile row

// ---- Design resolution (Scale.FIT scales this to any screen) ----
export const BASE_W = 540;
export const BASE_H = 960;

// ---- Pod physics ----
export const PHYS = {
  gravity: 980, // px/s^2 downward
  thrustAccel: 2050, // px/s^2 upward while thrusting (before weight penalty)
  moveAccel: 1650, // px/s^2 horizontal
  airControl: 0.85, // horizontal accel multiplier while airborne
  maxFall: 660, // px/s terminal velocity
  maxRise: 460, // px/s max upward speed
  maxHoriz: 250, // px/s max horizontal speed
  groundFriction: 2400, // px/s^2 decel when not pressing horizontally on ground
  airFriction: 600, // px/s^2 decel horizontally in air
  podMass: 1980, // base mass (kg) — matches Motherload; cargo adds to this
  fallDamageSpeed: 540, // px/s; impacts faster than this damage the hull
  fallDamageScale: 0.06, // hull dmg per (px/s) over the threshold
} as const;

// ---- Fuel (improved onboarding vs the brutal 10L original) ----
export const FUEL = {
  baseMax: 110,
  idleDrainPerSec: 0.4, // low — thinking shouldn't drain you; activity should
  thrustDrainPerSec: 3.8, // flying is the main fuel cost
  drivePerSec: 1.1, // extra while driving horizontally
  digPerTile: 0.3,
  refuelCostPerUnit: 0.28, // cash per unit at the fuel station
} as const;

// ---- Heat (magma bands) ----
export const HEAT = {
  max: 100,
  ambientCoolPerSec: 9, // cooling in cool/neutral bands
  surfaceCoolPerSec: 30,
  overheatDamagePerSec: 7, // hull dmg/s while at max heat
  lavaContactHeat: 42, // heat added per second touching lava
} as const;

// ---- Hull / repair ----
export const HULL = {
  baseMax: 22,
  repairCostPerHp: 1.1,
  lavaDamagePerSec: 11,
  gasExplosionDamage: 14,
  boulderImpactDamage: 16,
} as const;

// ---- Cargo ----
export const CARGO = {
  baseMax: 12, // cubic units
} as const;

// ---- Digging ----
export const DIG = {
  baseDrillPower: 2.6, // hardness cleared per second at stock drill
  minDigTime: 0.08, // seconds floor so even soft tiles have a satisfying beat
} as const;

// ---- Economy ----
export const ECON = {
  startingCash: 40,
  // Early "depth bounty" one-time payouts to bootstrap past the slow start
  // [depthMetres, cashReward]
  depthBounties: [
    [120, 400],
    [300, 1200],
    [600, 4000],
    [1000, 12000],
    [1500, 40000],
    [2200, 150000],
  ] as [number, number][],
} as const;

// ---- Meta currency (Cores) ----
export const META = {
  // cores earned at end of run = floor(score / coreDivisor) + depth/depthPerCore
  coreScoreDivisor: 50000,
  coreDepthDivisor: 400,
} as const;

// ---- Score formula (v1). Lock the SHAPE; tune the numbers freely. ----
export const SCORE = {
  cashWeight: 1, // banked cash counts 1:1
  depthWeight: 120, // per metre of deepest point reached
  fossilWeight: 30000, // per unique fossil
  artifactWeight: 1, // artifacts use their own cash value
  oreVarietyBonus: 5000, // per distinct ore type mined this run
  coreReachedBonus: 1000000, // reaching The Core
} as const;

// ---- Camera ----
export const CAM = {
  lerp: 0.12,
  lookAheadY: 70, // bias camera in the direction of vertical travel
  deadzoneFrac: 0.12,
} as const;
