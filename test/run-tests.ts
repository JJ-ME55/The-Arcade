import assert from 'assert';
import MovementEngine, { InputState } from '../src/engine/movement';

function approxEqual(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

// Test 1: forward acceleration increases horizontal speed
(() => {
  const engine = new MovementEngine();
  const dt = 1 / 64;
  const input: InputState = { forward: 1, right: 0, jump: false, crouch: false };
  const before = Math.hypot(engine.velocity.x, engine.velocity.z);
  for (let i = 0; i < 20; i++) engine.update(dt, input);
  const after = Math.hypot(engine.velocity.x, engine.velocity.z);
  assert(after > before, 'Engine should gain horizontal speed when moving forward');
})();

// Test 2: jump sets upward velocity and clears onGround
(() => {
  const engine = new MovementEngine();
  const dt = 1 / 64;
  const input: InputState = { forward: 0, right: 0, jump: true, crouch: false };
  assert(engine.onGround, 'Should start on ground');
  engine.update(dt, input);
  assert(!engine.onGround, 'Should be in air after jump');
  assert(engine.velocity.y > 0, 'Upward velocity should be positive after jump');
})();

// Test 3: ground friction reduces excessive speed
(() => {
  const engine = new MovementEngine();
  engine.velocity.x = 600;
  engine.velocity.z = 0;
  engine.position.y = 0;
  engine.onGround = true;
  const dt = 1 / 64;
  engine.update(dt, { forward: 0, right: 0, jump: false, crouch: false });
  const speedAfter = Math.hypot(engine.velocity.x, engine.velocity.z);
  assert(speedAfter < 600, 'Friction should reduce a very high horizontal speed');
})();

console.log('All movement tests passed.');
