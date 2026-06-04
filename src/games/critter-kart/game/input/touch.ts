// @ts-nocheck
/**
 * Shared touch-control state. The on-screen joystick + buttons (TouchControls.tsx) write to this
 * object, and the keyboard reader (keyboard.ts) merges it in — so the game loop reads ONE unified
 * DriveInput whether you're on a keyboard or a phone.
 */
export interface TouchState {
  steer: number;    // -1..1 (left positive, matching DriveInput)
  throttle: number; // 0..1 (held at 1 while the touch controls are mounted = auto-accelerate)
  brake: number;    // 0..1
  drift: boolean;
  use: boolean;
}

export const touchInput: TouchState = { steer: 0, throttle: 0, brake: 0, drift: false, use: false };

export function resetTouchInput(): void {
  touchInput.steer = 0;
  touchInput.throttle = 0;
  touchInput.brake = 0;
  touchInput.drift = false;
  touchInput.use = false;
}

/** True on phones/tablets (touch-capable) → show the on-screen controls. Robust detection:
 *  touch events OR touch points OR a coarse (finger) primary pointer. Override with ?touch=1 / 0
 *  (handy for forcing the controls on a desktop to test, or off). */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search).get('touch');
  if (q === '1' || q === 'true') return true;
  if (q === '0' || q === 'false') return false;
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return ('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0 || coarse;
};
