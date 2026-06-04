// @ts-nocheck
import { TrackDef } from '../logic/trackPath';

/**
 * Sunny Meadow — the easy starter circuit. Same hill-climb-solved layout (perfectly
 * balanced L/R, 9 alternating direction changes, ~58 unit minGap), now scaled up 3×
 * so a 3-lap race lasts ~5 minutes instead of ~1. Road width, kart size, and barrier
 * offset stay the same — the world just got bigger around them.
 */
export const SUNNY_MEADOW: TrackDef = {
  name: 'Sunny Meadow',
  halfWidth: 18,
  laps: 3,
  samplesPerSegment: 22,
  jumpZone: { startProgress: 0.19, endProgress: 0.21 }, // open water hole — drive in and you splash & respawn (bridge will be added back over the top later)
  bridgeZone: { startProgress: 0.902, endProgress: 0.922 }, // 2nd water gap (~0.912) spanned by a drivable wooden bridge
  archBridgeZone: { startProgress: 0.04, endProgress: 0.085 }, // ARCHED bridge on the first straight after the start line — ride up & over
  // OPTIONAL upper deck over the flat bridge (just before corner 11): steer onto the LEFT side to
  // ramp up onto a second level carrying a booster that fires you out the far end — an advantage
  // if you commit, but you can ignore it and take the normal bridge. Tunable via playtest.
  upperDeckZone: {
    startProgress: 0.886, rampUpEnd: 0.903, rampDownStart: 0.921, endProgress: 0.937,
    boostStart: 0.906, boostEnd: 0.918, height: 8, side: -1,
  },
  control: [
    { x: -210, z: -345 }, // 0  start/finish — top straight, heading +x
    { x: 105, z: -360 },  // 1
    { x: 189, z: -249 },  // 2
    { x: 300, z: -135 },  // 3
    { x: 264, z: 18 },    // 4
    { x: 110, z: 90 },    // 5  CHICANE — pulled hard inward (was 240,162) creates a tight right→left flick
    { x: 261, z: 315 },   // 6
    { x: 90, z: 444 },    // 7
    { x: -40, z: 335 },   // 8  top corner — eased from a >90° hairpin (was 60,290) so the road no longer folds over itself (flashing)
    { x: -264, z: 210 },  // 9
    { x: -402, z: 162 },  // 10
    { x: -450, z: 12 },   // 11
    { x: -360, z: -102 }, // 12
    { x: -400, z: -178 }, // NEW  gentle outward bend (was -445,-175 — too sharp, folded the road + trapped bots)
    { x: -378, z: -255 }, // 13
    { x: -315, z: -350 }, // NEW  outward kick into the bottom — second new corner
    { x: -252, z: -345 }, // 14
  ],
};
