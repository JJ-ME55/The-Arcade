import { WeaponSystem, WeaponType, WeaponState } from '../src/engine/weapons';
import { AccuracyModel, getRecoilAngle, AK47_PATTERN, M4A1_PATTERN } from '../src/engine/recoil-patterns';

console.log('=== VERIFICATION TESTS ===\n');

// Test 1: State machine transitions
console.log('Test 1: State machine transitions');
const ws = new WeaponSystem(WeaponType.AK47);
console.log('Initial state:', ws.state); // Should be IDLE

const fireResult = ws.fire(0);
console.log('After fire, state:', ws.state); // Should be FIRING
console.log('Fire result:', fireResult); // Should have shotIndex: 0

ws.update(0.1, 0.1);
console.log('After update(0.1s), state:', ws.state); // Should return to IDLE

// Test 2: Spray pattern index increments
ws.update(0.1, 0.2); // Transition back to IDLE
const fire2 = ws.fire(0.2);
console.log('\nTest 2: Spray pattern tracking');
console.log('Second shot index:', fire2?.shotIndex); // Should be 1
ws.update(0.1, 0.3); // Transition back to IDLE
const fire3 = ws.fire(0.3);
console.log('Third shot index:', fire3?.shotIndex); // Should be 2

// Test 3: Spray reset after 0.45s
ws.update(0.5, 1.0); // 0.7s gap from last shot (0.3 + 0.5 = 0.8s > 0.45s)
console.log('\nTest 3: Spray reset after 0.45s gap');
console.log('Shots fired after reset:', ws.shotsFired); // Should be 0

// Test 4: Weapon configs match CONTEXT.md
console.log('\nTest 4: Weapon config values');
const akConfig = ws.getWeaponConfig();
console.log('AK-47 config:', {
  damage: akConfig.baseDamage, // Should be 36
  fireRate: akConfig.fireRate,  // Should be 0.1
  magazine: akConfig.magazine,  // Should be 30
});

const ws2 = new WeaponSystem(WeaponType.M4A1);
const m4Config = ws2.getWeaponConfig();
console.log('M4A1 config:', {
  damage: m4Config.baseDamage, // Should be 32
  fireRate: m4Config.fireRate,  // Should be 0.09
  magazine: m4Config.magazine,  // Should be 30
});

// Test 5: State transitions prevent actions
console.log('\nTest 5: State transition enforcement');
ws.startReload();
console.log('Started reload, state:', ws.state); // Should be RELOADING
console.log('Can fire during reload?', ws.canFire()); // Should be false
console.log('Can switch during reload?', ws.canSwitch()); // Should be false

// Test 6: Spray patterns
console.log('\nTest 6: Spray patterns');
console.log('AK-47 pattern length:', AK47_PATTERN.length); // Should be 30
console.log('M4A1 pattern length:', M4A1_PATTERN.length); // Should be 30
console.log('AK-47 shot 1:', AK47_PATTERN[0]); // Should be upward, x near 0
console.log('AK-47 shot 6:', AK47_PATTERN[5]); // Should have negative x (left pull)

// Test 7: Accuracy model
console.log('\nTest 7: Accuracy model');
const acc = new AccuracyModel();
console.log('Initial accuracy:', acc.accuracy); // Should be 1.0

// Standing still on ground
acc.update(0.016, 0, true, false, 1.0, WeaponType.AK47);
console.log('Standing still accuracy:', acc.accuracy); // Should be 1.0

// Moving on ground - simulate several frames for blend to take effect
acc.reset();
for (let i = 0; i < 10; i++) {
  acc.update(0.016, 100, true, false, 1.0, WeaponType.AK47);
}
console.log('Moving accuracy (rifle):', acc.accuracy.toFixed(2)); // Should be near 0.1

// Reset and test pistol
acc.reset();
for (let i = 0; i < 10; i++) {
  acc.update(0.016, 100, true, false, 1.0, WeaponType.PISTOL);
}
console.log('Moving accuracy (pistol):', acc.accuracy.toFixed(2)); // Should be near 0.4

console.log('\n=== ALL TESTS COMPLETE ===');
