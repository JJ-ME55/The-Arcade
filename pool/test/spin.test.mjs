#!/usr/bin/env node
/**
 * Smoke test for pool spin physics (pool/src/physics/spin.ts).
 *
 * Pure-math tests, no canvas / DOM / Phaser required.
 *
 * Run:  node pool/test/spin.test.mjs
 *
 * Exits 0 on success, 1 on any assertion failure.
 *
 * Imports the .ts source directly — Node 22+ supports import-via-tsx
 * if you run `tsx pool/test/spin.test.mjs`, but for plain `node` we
 * point at the compiled output. Build with `npm run build` first.
 */

// Direct .ts imports via tsx (if installed) — otherwise we fall back
// to a local compiled copy. For CI this script runs via `node --import=tsx`.
import {
  clampSpinAxis,
  decaySpin,
  applySidespinToCushionBounce,
  applyTopBackSpinToBallCollision,
  widgetPointToSpin,
  SIDESPIN_CUSHION_TRANSFER,
  SIDESPIN_CUSHION_LOSS,
  SPIN_FOLLOWTHROUGH_FACTOR,
  SPIN_FRICTION,
  SPIN_DEAD_ZONE
} from '../src/physics/spin.ts';

let failures = 0;
function assert(cond, msg) {
  if (cond) {
    process.stdout.write('  PASS  ' + msg + '\n');
  } else {
    process.stdout.write('  FAIL  ' + msg + '\n');
    failures++;
  }
}
function approx(a, b, tol = 0.001) { return Math.abs(a - b) < tol; }

// ──────────────────────────────────────────────────────────────────
console.log('\n[clampSpinAxis]');
assert(clampSpinAxis(0) === 0, 'clamp 0 → 0');
assert(clampSpinAxis(0.5) === 0.5, 'clamp 0.5 → 0.5');
assert(clampSpinAxis(1.5) === 1, 'clamp 1.5 → 1 (cap)');
assert(clampSpinAxis(-1.5) === -1, 'clamp -1.5 → -1 (floor)');
assert(clampSpinAxis(2.7) === 1, 'clamp 2.7 → 1');

// ──────────────────────────────────────────────────────────────────
console.log('\n[decaySpin]');
const d1 = decaySpin(1, 1);
assert(approx(d1.spinX, 1 - SPIN_FRICTION), `one tick: 1 → 1 - friction (got ${d1.spinX.toFixed(4)})`);
assert(approx(d1.spinY, 1 - SPIN_FRICTION), 'spinY decays at same rate');

// After many ticks, spin approaches zero (then snaps to zero at dead zone)
let { spinX, spinY } = { spinX: 1, spinY: -1 };
for (let i = 0; i < 1000; i++) {
  ({ spinX, spinY } = decaySpin(spinX, spinY));
}
assert(spinX === 0, `1000 ticks: spinX snaps to 0 at dead zone (got ${spinX})`);
assert(spinY === 0, `1000 ticks: spinY snaps to 0 (got ${spinY})`);

// Zero spin stays zero
const dZero = decaySpin(0, 0);
assert(dZero.spinX === 0 && dZero.spinY === 0, 'zero stays zero');

// ──────────────────────────────────────────────────────────────────
console.log('\n[applySidespinToCushionBounce — top]');
// Ball moving down-right hits top cushion (already reflected). After reflect:
// velocity is moving upward (negative y). Right-hand english (+spinX) kicks right.
{
  const reflected = { x: 5, y: -10 }; // moving up-right after bounce
  const r = applySidespinToCushionBounce('top', reflected, 1);
  // Expected: x increases by 1 * |y| * SIDESPIN_CUSHION_TRANSFER = 10 * 0.30 = 3
  assert(approx(r.velocity.x, 5 + 3), `top + right english: x kicked right (got ${r.velocity.x})`);
  assert(r.velocity.y === -10, 'top + right english: y unchanged');
  assert(approx(r.spinAfter, 1 * (1 - SIDESPIN_CUSHION_LOSS)), `spin reduced by loss factor`);
}
// Left-hand english (-spinX) kicks left
{
  const reflected = { x: 5, y: -10 };
  const r = applySidespinToCushionBounce('top', reflected, -1);
  assert(approx(r.velocity.x, 5 - 3), `top + left english: x kicked left (got ${r.velocity.x})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[applySidespinToCushionBounce — left]');
// Ball moving up-left hits left cushion (already reflected). Now moving right.
// Right-hand english (+spinX) kicks UP (negative y).
{
  const reflected = { x: 10, y: 5 }; // moving right-down after bounce
  const r = applySidespinToCushionBounce('left', reflected, 1);
  assert(approx(r.velocity.y, 5 - 3), `left + right english: y kicked up (got ${r.velocity.y})`);
  assert(r.velocity.x === 10, 'left + right english: x unchanged');
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[applySidespinToCushionBounce — sign convention sanity]');
// All four cushions with right-hand english (+1) at the same incident
// magnitudes should produce kicks of equal magnitude
const incidentX = 10;
const incidentY = 10;
const top = applySidespinToCushionBounce('top', { x: 0, y: -incidentY }, 1);
const bot = applySidespinToCushionBounce('bottom', { x: 0, y: incidentY }, 1);
const lft = applySidespinToCushionBounce('left', { x: incidentX, y: 0 }, 1);
const rgt = applySidespinToCushionBounce('right', { x: -incidentX, y: 0 }, 1);
const expectedKick = incidentX * SIDESPIN_CUSHION_TRANSFER;
assert(approx(top.velocity.x, expectedKick), `top: kick = +incident × ${SIDESPIN_CUSHION_TRANSFER}`);
assert(approx(bot.velocity.x, -expectedKick), `bottom: kick = -incident × ${SIDESPIN_CUSHION_TRANSFER} (opposite)`);
assert(approx(lft.velocity.y, -expectedKick), `left: kick UP (canvas -y)`);
assert(approx(rgt.velocity.y, expectedKick), `right: kick DOWN (canvas +y, opposite of left)`);

// Zero spin = no kick anywhere
const zeroSpin = applySidespinToCushionBounce('top', { x: 5, y: -10 }, 0);
assert(zeroSpin.velocity.x === 5 && zeroSpin.velocity.y === -10, 'zero spin: no kick');

// ──────────────────────────────────────────────────────────────────
console.log('\n[applyTopBackSpinToBallCollision — topspin]');
// Cue ball moving right at 10. Hits target, exchange leaves cue at rest.
// Full topspin (spinY = 1) should preserve SPIN_FOLLOWTHROUGH_FACTOR × 10 in +x.
{
  const preCollision = { x: 10, y: 0 };
  const afterExchange = { x: 0, y: 0 }; // post-elastic, target was still
  const r = applyTopBackSpinToBallCollision(afterExchange, preCollision, 1);
  assert(approx(r.velocity.x, 10 * SPIN_FOLLOWTHROUGH_FACTOR),
    `full topspin: cue keeps ${SPIN_FOLLOWTHROUGH_FACTOR} × incident (got ${r.velocity.x.toFixed(2)})`);
  assert(approx(r.velocity.y, 0), 'topspin doesn\'t change perpendicular axis');
}

// Backspin reverses cue ball direction
{
  const preCollision = { x: 10, y: 0 };
  const afterExchange = { x: 0, y: 0 };
  const r = applyTopBackSpinToBallCollision(afterExchange, preCollision, -1);
  assert(r.velocity.x < 0, `backspin: cue reverses direction (got ${r.velocity.x.toFixed(2)})`);
  assert(approx(r.velocity.x, -10 * SPIN_FOLLOWTHROUGH_FACTOR),
    `full backspin: cue reverses by ${SPIN_FOLLOWTHROUGH_FACTOR} × incident`);
}

// Half topspin = half effect
{
  const preCollision = { x: 10, y: 0 };
  const afterExchange = { x: 0, y: 0 };
  const r = applyTopBackSpinToBallCollision(afterExchange, preCollision, 0.5);
  assert(approx(r.velocity.x, 5 * SPIN_FOLLOWTHROUGH_FACTOR),
    `half topspin: ${SPIN_FOLLOWTHROUGH_FACTOR / 2} × incident`);
}

// Zero topspin = no change
{
  const r = applyTopBackSpinToBallCollision({ x: 0, y: 0 }, { x: 10, y: 0 }, 0);
  assert(r.velocity.x === 0 && r.velocity.y === 0, 'zero spinY: no change');
}

// Diagonal collision — follow-through stays in the diagonal direction.
// preSpeed = 10, follow magnitude = 10 * SPIN_FOLLOWTHROUGH_FACTOR = 6
// Direction unit vector = (0.6, 0.8) since speed is 10 and components are 6, 8
// So expected velocity = 6 * (0.6, 0.8) = (3.6, 4.8)
{
  const preCollision = { x: 6, y: 8 };
  const afterExchange = { x: 0, y: 0 };
  const r = applyTopBackSpinToBallCollision(afterExchange, preCollision, 1);
  assert(approx(r.velocity.x, 10 * SPIN_FOLLOWTHROUGH_FACTOR * 0.6),
    `diagonal topspin: x component preserved (got ${r.velocity.x.toFixed(2)})`);
  assert(approx(r.velocity.y, 10 * SPIN_FOLLOWTHROUGH_FACTOR * 0.8),
    `diagonal topspin: y component preserved (got ${r.velocity.y.toFixed(2)})`);
}

// ──────────────────────────────────────────────────────────────────
console.log('\n[widgetPointToSpin]');
// Center = no spin
{
  const s = widgetPointToSpin(0, 0, 50);
  assert(s.spinX === 0 && s.spinY === 0, 'widget center: zero spin');
}
// Edge right = +1 spinX
{
  const s = widgetPointToSpin(50, 0, 50);
  assert(approx(s.spinX, 1) && s.spinY === 0, 'widget edge right: spinX = +1');
}
// Edge bottom = +1 spinY (canvas +y is down = topspin in our convention)
{
  const s = widgetPointToSpin(0, 50, 50);
  assert(s.spinX === 0 && approx(s.spinY, 1), 'widget edge bottom: spinY = +1');
}
// Outside the circle clamps to edge
{
  const s = widgetPointToSpin(100, 0, 50);
  assert(approx(s.spinX, 1), `outside circle: spinX clamps to 1 (got ${s.spinX})`);
}
// Diagonal: 45° down-right at edge ≈ (0.707, 0.707)
{
  const s = widgetPointToSpin(35.36, 35.36, 50);
  assert(approx(s.spinX, 0.7071, 0.01), `45° diagonal: spinX ≈ 0.71 (got ${s.spinX.toFixed(3)})`);
  assert(approx(s.spinY, 0.7071, 0.01), `45° diagonal: spinY ≈ 0.71`);
}
// Negative offsets give negative spin
{
  const s = widgetPointToSpin(-50, -50, 50);
  assert(s.spinX < 0 && s.spinY < 0, 'top-left widget click: both negative');
}
// Zero radius is safe
{
  const s = widgetPointToSpin(10, 10, 0);
  assert(s.spinX === 0 && s.spinY === 0, 'zero radius: returns zero (no divide by zero)');
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
