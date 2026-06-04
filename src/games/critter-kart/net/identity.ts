// @ts-nocheck
/**
 * Identity bootstrap. Multiplayer needs to know the player's Arcade username so
 * lobbies can read "Fish vs JJ" and the matchmaker can quote real names. JJ owns
 * the mechanism by which Critter Kart actually receives that username (URL param,
 * postMessage from a parent frame, `/api/me`, shared cookie — TBD). This module
 * encapsulates the lookup so the rest of the app awaits one Promise and doesn't
 * care which strategy is in play.
 *
 * Dev fallback: until JJ wires a real source, prompt for a name on first visit
 * and persist it in localStorage so subsequent visits skip the prompt.
 */

const LS_KEY = 'ck_dev_username';

let cached: Promise<string> | null = null;

/** Resolve the player's Arcade username. Cached on first call so screens can
 *  safely await it repeatedly without re-prompting. */
export function getArcadeUsername(): Promise<string> {
  if (cached) return cached;
  cached = resolve();
  return cached;
}

/** Wipe the cached identity (used by the dev "change name" affordance below). */
export function resetIdentity(): void {
  cached = null;
  try { localStorage.removeItem(LS_KEY); } catch { /* private mode etc. */ }
}

async function resolve(): Promise<string> {
  // ── Strategy 1 (TBD with JJ): URL param ?u=<username> ──────────────────────
  // Cheap to support if The Arcade ends up redirecting us with the name attached.
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('u');
    if (fromUrl && fromUrl.trim()) return fromUrl.trim();
  } catch { /* fall through */ }

  // ── Strategy 2 (TBD with JJ): parent-frame postMessage ─────────────────────
  // The Arcade embeds us in an iframe and posts the username on load. We wait a
  // short window for that handshake before falling through to dev mode.
  // (Wire this up once JJ confirms the message shape.)

  // ── Strategy 3 (TBD with JJ): cookie-backed /api/me endpoint ───────────────
  // For when we're served from the same origin as The Arcade and the session
  // cookie travels with us. Sample shape:
  //   const res = await fetch('/api/me', { credentials: 'include' });
  //   if (res.ok) { const { username } = await res.json(); if (username) return username; }

  // ── Dev fallback — localStorage prompt ────────────────────────────────────
  // Lets us build + test multiplayer screens without any backend at all.
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch { /* private mode */ }

  const entered = (typeof window.prompt === 'function')
    ? window.prompt('Critter Kart — pick a dev username:', 'Fish')?.trim()
    : null;
  const name = entered && entered.length > 0 ? entered : `racer-${Math.random().toString(36).slice(2, 7)}`;
  try { localStorage.setItem(LS_KEY, name); } catch { /* private mode */ }
  return name;
}
