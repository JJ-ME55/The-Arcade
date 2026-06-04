// @ts-nocheck
import { touchInput } from './touch';

export interface DriveInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1 (left positive)
  drift: boolean; // hold to drift
  use: boolean; // use held item
}

const PREVENT = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];

/** Tracks held keys and reports a DriveInput each frame. */
export function createKeyboard(): { read: () => DriveInput; dispose: () => void } {
  const keys: Record<string, boolean> = {};

  const onDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (PREVENT.includes(k)) e.preventDefault();
  };
  const onUp = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false;
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  // Merge keyboard + on-screen touch controls into one input (whichever is active wins).
  const read = (): DriveInput => {
    const kSteer = (keys['arrowleft'] || keys['a'] ? 1 : 0) - (keys['arrowright'] || keys['d'] ? 1 : 0);
    return {
      throttle: Math.max(keys['arrowup'] || keys['w'] ? 1 : 0, touchInput.throttle),
      brake: Math.max(keys['arrowdown'] || keys['s'] ? 1 : 0, touchInput.brake),
      steer: kSteer !== 0 ? kSteer : touchInput.steer,
      drift: !!(keys[' '] || keys['shift']) || touchInput.drift,
      use: !!(keys['e'] || keys['control'] || keys['enter']) || touchInput.use,
    };
  };

  const dispose = () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
  };

  return { read, dispose };
}
