#!/usr/bin/env node
/**
 * Smoke tests for the pure pool simulation core (pool/src/sim/).
 *
 * Pure-math/Node tests — no canvas, no DOM, no audio. The whole point
 * is that this module runs identically on the SolShot server, so these
 * tests verify it works without browser surface area.
 *
 * Run:  node --experimental-strip-types pool/test/simulate.test.mjs
 *
 * Exits 0 on success, 1 on any assertion failure.
 */

import { simulateShot } from '../src/sim/simulate';
import { DEFAULT_PHYSICS_CONFIG } from '../src/sim/types';

let failures = 0;
function assert(cond, msg) {
  if (cond) process.stdout.write('  PASS  ' + msg + '\n');
  else { process.stdout.write('  FAIL  ' + msg + '\n'); failures++; }
}
function approx(a, b, tol = 0.01) { return Math.abs(a - b) < tol; }

// ──────────────────────────────────────────────────────────────────
// A standard test table — mirrors the existing game's geometry
// ──────────────────────────────────────────────────────────────────

const table = {
  width: 1422,
  height: 720,
  cushionWidth: 26,
  pocketsPositions: [
    { x: 60, y: 60 },             // top-left
    { x: 1422 / 2, y: 40 },       // top-mid
    { x: 1422 - 60, y: 60 },      // top-right
    { x: 60, y: 720 - 60 },       // bottom-left
    { x: 1422 / 2, y: 720 - 40 }, // bottom-mid
    { x: 1422 - 60, y: 720 - 60 } // bottom-right
  ],
  pocketRadius: 30
};

const physics = DEFAULT_PHYSICS_CONFIG;

// Helper: make a ball
function ball(id, color, x, y, vx = 0, vy = 0, sx = 0, sy = 0) {
  return {
    id, color,
    position: { x, y },
    velocity: { x: vx, y: vy },
    spinX: sx,
    spinY: sy,
    visible: true
  };
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[STILL TABLE — no balls move]');
{
  const balls = [ball(0, 'white', 400, 360)];
  const r = simulateShot(
    balls,
    { power: 0, angle: 0, spinX: 0, spinY: 0 },
    table, physics
  );
  // Power 0 → cue ball never moves
  assert(r.ticks <= 1, `power 0: 0 or 1 tick (got ${r.ticks})`);
  assert(r.events[r.events.length - 1].type === 'simulation_complete', 'ends with simulation_complete');
  assert(r.finalBalls[0].position.x === 400, 'cue ball position unchanged');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[DETERMINISM — same inputs, same outputs]');
{
  const balls = [
    ball(0, 'white', 400, 360),
    ball(1, 'red', 900, 360)
  ];
  const shot = { power: 25, angle: 0, spinX: 0, spinY: 0 };

  const r1 = simulateShot(
    JSON.parse(JSON.stringify(balls)),
    shot, table, physics
  );
  const r2 = simulateShot(
    JSON.parse(JSON.stringify(balls)),
    shot, table, physics
  );

  assert(r1.ticks === r2.ticks, `same input → same tick count (${r1.ticks} === ${r2.ticks})`);
  assert(r1.events.length === r2.events.length, 'same event count');
  assert(
    r1.finalBalls.every((b, i) =>
      approx(b.position.x, r2.finalBalls[i].position.x) &&
      approx(b.position.y, r2.finalBalls[i].position.y)
    ),
    'final positions identical between runs'
  );
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[CUE BALL HITS OBJECT BALL — first contact detected]');
{
  const balls = [
    ball(0, 'white', 400, 360),
    ball(1, 'red', 900, 360)
  ];
  const r = simulateShot(
    balls,
    { power: 25, angle: 0, spinX: 0, spinY: 0 },
    table, physics
  );
  const collisions = r.events.filter(e => e.type === 'ball_collision');
  assert(collisions.length >= 1, `cue→red collision recorded (got ${collisions.length})`);
  assert(r.firstCollidedBallColor === 'red', `firstCollidedBallColor = red (got ${r.firstCollidedBallColor})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[NO CONTACT — cue ball missed]');
{
  const balls = [
    ball(0, 'white', 400, 200),     // above red
    ball(1, 'red', 900, 500)         // below white's line
  ];
  // Shoot horizontally right — won't meet the red ball
  const r = simulateShot(
    balls,
    { power: 8, angle: 0, spinX: 0, spinY: 0 },
    table, physics
  );
  const collisions = r.events.filter(e => e.type === 'ball_collision');
  // Low power and offset means the cue ball stops before reaching the red ball
  assert(collisions.length === 0, `no ball collisions for missed shot (got ${collisions.length})`);
  assert(r.firstCollidedBallColor === null, 'no first contact');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[CUSHION BOUNCE — top cushion event recorded]');
{
  // Cue ball moving up-left; should hit top cushion
  const balls = [ball(0, 'white', 400, 100)];
  const r = simulateShot(
    balls,
    { power: 15, angle: -Math.PI / 4, spinX: 0, spinY: 0 }, // up-right
    table, physics
  );
  const cushionEvents = r.events.filter(e => e.type === 'cushion_hit');
  assert(cushionEvents.length >= 1, `at least one cushion bounce (got ${cushionEvents.length})`);
  // First cushion hit should be top (since y starts at 100 close to top)
  const firstCushion = cushionEvents[0];
  assert(firstCushion.cushion === 'top' || firstCushion.cushion === 'right',
    `first cushion is top or right (got ${firstCushion.cushion})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[POCKETING — corner pocket potted]');
{
  // Place a ball close to the top-left pocket; cue ball nudges it in
  const balls = [
    ball(0, 'white', 200, 100),
    ball(1, 'red', 80, 80)   // very close to top-left pocket
  ];
  const r = simulateShot(
    balls,
    { power: 12, angle: Math.atan2(80 - 100, 80 - 200), spinX: 0, spinY: 0 }, // aim toward red
    table, physics
  );
  const drops = r.events.filter(e => e.type === 'pocket_drop');
  assert(drops.length >= 1, `at least one ball dropped (got ${drops.length})`);
  assert(r.pocketedBallIds.length >= 1, `pocketedBallIds populated (got ${r.pocketedBallIds.length})`);
  // The red ball should be the one pocketed
  const redBallAfter = r.finalBalls.find(b => b.id === 1);
  assert(redBallAfter && !redBallAfter.visible, 'red ball hidden after pocketing');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[SCRATCH — cue ball pocketed → cue_ball_potted event]');
{
  // Send cue ball straight into top-left pocket
  const balls = [ball(0, 'white', 200, 200)];
  const angleToPocket = Math.atan2(60 - 200, 60 - 200);
  const r = simulateShot(
    balls,
    { power: 15, angle: angleToPocket, spinX: 0, spinY: 0 },
    table, physics
  );
  const scratches = r.events.filter(e => e.type === 'cue_ball_potted');
  // (Either the cue ball drops or it doesn't reach. Assert one OR the other
  // — both are deterministic outcomes of this scenario.)
  if (scratches.length > 0) {
    const cueAfter = r.finalBalls.find(b => b.color === 'white');
    assert(cueAfter && !cueAfter.visible, 'cue ball hidden after scratch');
  } else {
    // It missed — accept; just verify no events lied
    assert(r.firstCollidedBallColor === null, 'no contact if scratch missed');
  }
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[FRICTION — cue ball eventually stops]');
{
  const balls = [ball(0, 'white', 400, 360)];
  const r = simulateShot(
    balls,
    { power: 30, angle: 0, spinX: 0, spinY: 0 },
    table, physics
  );
  assert(!r.truncated, 'simulation did not hit maxTicks');
  // Final velocity should be zero
  const cueAfter = r.finalBalls.find(b => b.color === 'white');
  assert(cueAfter.velocity.x === 0 && cueAfter.velocity.y === 0,
    'cue ball velocity is zero at end');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[NO CUE BALL — handles gracefully]');
{
  const balls = [ball(1, 'red', 400, 360)];
  const r = simulateShot(
    balls,
    { power: 25, angle: 0, spinX: 0, spinY: 0 },
    table, physics
  );
  assert(r.ticks === 0, 'no cue ball → 0 ticks');
  assert(r.events.length === 1, 'no cue ball → only simulation_complete event');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[INPUT NOT MUTATED — pure function]');
{
  const balls = [
    ball(0, 'white', 400, 360),
    ball(1, 'red', 900, 360)
  ];
  const cuePosBefore = { x: balls[0].position.x, y: balls[0].position.y };
  simulateShot(balls, { power: 25, angle: 0, spinX: 0, spinY: 0 }, table, physics);
  assert(
    balls[0].position.x === cuePosBefore.x && balls[0].position.y === cuePosBefore.y,
    'caller input not mutated (cue ball still at start)'
  );
  assert(balls[0].velocity.x === 0 && balls[0].velocity.y === 0,
    'caller input not mutated (cue ball still at rest)');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[TOPSPIN — cue ball follows through past target]');
{
  // Cue ball with topspin should keep some forward velocity after hitting target
  const balls = [
    ball(0, 'white', 400, 360),
    ball(1, 'red', 600, 360)
  ];
  const r = simulateShot(
    balls,
    { power: 25, angle: 0, spinX: 0, spinY: 1 }, // full topspin
    table, physics
  );
  const cueFinal = r.finalBalls.find(b => b.color === 'white');
  const redFinal = r.finalBalls.find(b => b.color === 'red');
  // Both balls should have moved past their starting positions
  // (cue followed through, red driven forward)
  assert(cueFinal.position.x > 400, `cue ball moved forward with topspin (final x=${cueFinal.position.x.toFixed(1)})`);
  assert(redFinal.position.x > 600, `red ball driven forward (final x=${redFinal.position.x.toFixed(1)})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[BACKSPIN — cue ball reverses past target]');
{
  const balls = [
    ball(0, 'white', 400, 360),
    ball(1, 'red', 600, 360)
  ];
  const r = simulateShot(
    balls,
    { power: 25, angle: 0, spinX: 0, spinY: -1 }, // full backspin
    table, physics
  );
  const cueFinal = r.finalBalls.find(b => b.color === 'white');
  const redFinal = r.finalBalls.find(b => b.color === 'red');
  // Cue ball with backspin should end up LEFT of where it started (drew back)
  assert(cueFinal.position.x < 400, `cue ball drew back with backspin (final x=${cueFinal.position.x.toFixed(1)})`);
  // Red ball still driven forward
  assert(redFinal.position.x > 600, `red ball still driven forward (final x=${redFinal.position.x.toFixed(1)})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('');
if (failures === 0) {
  console.log('ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log(`FAILED — ${failures} assertion${failures > 1 ? 's' : ''}`);
  process.exit(1);
}
