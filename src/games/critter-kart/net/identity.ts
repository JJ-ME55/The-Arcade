// @ts-nocheck
/**
 * Identity bootstrap. Multiplayer needs to know the player's identity (TG id +
 * username) so the server can attribute lobby actions + race results.
 *
 * UPDATED Session 2d (2026-06-04): now sources from the arcade session JWT
 * (in sessionStorage as 'arcade_session' / 'arcadeSession'). The JWT was
 * minted by the SolShot server when the bot launched the game; we trust
 * it for client-side display purposes (server re-verifies on socket
 * handshake).
 *
 * Public:
 *   getArcadeUsername()  — display name (sync after first call)
 *   getArcadeIdentity()  — { telegramUserId, telegramUsername, firstName, sessionJwt }
 *   resetIdentity()      — clear cache; new lookups re-resolve
 */

const LS_KEY = 'ck_dev_username';

interface Identity {
  telegramUserId: number | null;
  telegramUsername: string | null;
  firstName: string | null;
  sessionJwt: string | null;
  username: string;   // resolved display name
}

let cached: Promise<Identity> | null = null;

function getSessionJwt(): string | null {
  try {
    return (sessionStorage.getItem('arcade_session')
      || sessionStorage.getItem('arcadeSession')
      || null);
  } catch {
    return null;
  }
}

function decodeJwtBody(jwt: string): any | null {
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    // base64url → base64
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

async function resolve(): Promise<Identity> {
  const jwt = getSessionJwt();
  const body = jwt ? decodeJwtBody(jwt) : null;

  // JWT carries { tg, un, fn } per server's mintSession contract
  if (body && typeof body.tg === 'number') {
    const telegramUsername = typeof body.un === 'string' ? body.un : null;
    const firstName = typeof body.fn === 'string' ? body.fn : null;
    const username = telegramUsername
      ? `@${telegramUsername}`
      : (firstName || `Player ${String(body.tg).slice(-4)}`);
    return {
      telegramUserId: body.tg,
      telegramUsername,
      firstName,
      sessionJwt: jwt,
      username,
    };
  }

  // ── Strategy: URL param ?u=<username> ────────────────────────────────
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('u');
    if (fromUrl && fromUrl.trim()) {
      return {
        telegramUserId: null,
        telegramUsername: null,
        firstName: null,
        sessionJwt: jwt,
        username: fromUrl.trim(),
      };
    }
  } catch { /* fall through */ }

  // ── Dev fallback — localStorage prompt ───────────────────────────────
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && stored.trim()) {
      return {
        telegramUserId: null,
        telegramUsername: null,
        firstName: null,
        sessionJwt: jwt,
        username: stored.trim(),
      };
    }
  } catch { /* private mode */ }

  const entered = (typeof window.prompt === 'function')
    ? window.prompt('Critter Kart — pick a dev username:', 'Racer')?.trim()
    : null;
  const name = entered && entered.length > 0
    ? entered
    : `racer-${Math.random().toString(36).slice(2, 7)}`;
  try { localStorage.setItem(LS_KEY, name); } catch { /* private mode */ }
  return {
    telegramUserId: null,
    telegramUsername: null,
    firstName: null,
    sessionJwt: jwt,
    username: name,
  };
}

/** Resolve the player's Arcade username. Cached on first call. */
export async function getArcadeUsername(): Promise<string> {
  const id = await getArcadeIdentity();
  return id.username;
}

/** Resolve the full identity (TG ids + JWT + display name). */
export function getArcadeIdentity(): Promise<Identity> {
  if (cached) return cached;
  cached = resolve();
  return cached;
}

export function resetIdentity(): void {
  cached = null;
  try { localStorage.removeItem(LS_KEY); } catch { /* private mode */ }
}
