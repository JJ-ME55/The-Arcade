// @ts-nocheck
/**
 * Smooths digital/analog steering input toward a target instead of snapping,
 * which is a primary cause of "twitchy" keyboard handling.
 * See docs/research/kart-feel.md (R2).
 */
export function rampSteer(
  current: number,
  target: number,
  rampRate: number,
  returnRate: number,
  dt: number,
): number {
  const towardCenter =
    Math.abs(target) < Math.abs(current) ||
    (current !== 0 && Math.sign(target) !== Math.sign(current));
  const rate = towardCenter ? returnRate : rampRate;
  return moveTowards(current, target, rate * dt);
}

function moveTowards(a: number, b: number, maxDelta: number): number {
  const d = b - a;
  if (Math.abs(d) <= maxDelta) return b;
  return a + Math.sign(d) * maxDelta;
}
