/**
 * Deterministic RNG + noise. THE SPINE of the game.
 *
 * Everything competitive (daily seeds, replay anti-cheat, shareable runs) depends on
 * world generation being a pure function of (seed, x, y). NEVER use Math.random() for
 * gameplay — only the helpers in this file. Math.random() is allowed ONLY for purely
 * cosmetic effects (particle jitter) that never affect score or world state.
 */

/** Hash an arbitrary seed string into a 32-bit unsigned integer. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — a fast, well-distributed seedable PRNG. Returns a function -> [0,1). */
export function mulberry32(a: number): () => number {
  let s = a >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Coordinate hash: pure function of (seed, x, y, salt) -> [0,1).
 * Different `salt` values give independent rolls at the same coordinate
 * (e.g. salt 1 for ore, salt 2 for specials, salt 3 for boulders).
 */
export function hash2(seed: number, x: number, y: number, salt = 0): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (x | 0), 0x27d4eb2d) >>> 0;
  h = Math.imul(h ^ (y | 0), 0x165667b1) >>> 0;
  h = Math.imul(h ^ (salt | 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in 2D -> [0,1). Deterministic per (seed, salt). */
export function valueNoise2(seed: number, x: number, y: number, salt = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const v00 = hash2(seed, x0, y0, salt);
  const v10 = hash2(seed, x0 + 1, y0, salt);
  const v01 = hash2(seed, x0, y0 + 1, salt);
  const v11 = hash2(seed, x0 + 1, y0 + 1, salt);
  const a = v00 + (v10 - v00) * fx;
  const b = v01 + (v11 - v01) * fx;
  return a + (b - a) * fy;
}

/** Fractal Brownian motion (layered value noise) -> [0,1). */
export function fbm2(
  seed: number,
  x: number,
  y: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
  salt = 0,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(seed, x * freq, y * freq, salt + i * 1013);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/**
 * Weighted pick from a roll in [0,1). `weights` need not sum to 1.
 * Returns the index of the chosen bucket. Deterministic given the roll.
 */
export function weightedIndex(roll: number, weights: number[]): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0) return -1;
  let r = roll * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** A small sequential RNG object for non-spatial deterministic needs. */
export class Rng {
  private next: () => number;
  constructor(seed: number | string) {
    const s = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
    this.next = mulberry32(s);
  }
  float(): number {
    return this.next();
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.range(minInclusive, maxInclusive + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}
