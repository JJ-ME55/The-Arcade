// @ts-nocheck — thin iframe wrapper, no internal game state.

import { useMemo } from 'react';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint.js';

/**
 * Standalone Shootout deployment. The Three.js + Vite app lives at
 * BillionaireBonkClub/shootout and ships as its own Vercel project; we just
 * frame it in. When that URL changes (subdomain switch, env split), swap it
 * here; eventually lift to import.meta.env.VITE_SHOOTOUT_URL.
 *
 * Custom domain since 2026-06-10 (was fps-staking-game.vercel.app —
 * that URL stays live as a fallback for cached links).
 */
const SHOOTOUT_GAME_URL = 'https://shootout.pro/';

/**
 * Capture a bot-launched `?session=<jwt>` from the HUB's URL into
 * sessionStorage (same pattern as BasketballScreen), so we can forward
 * it into the iframe below. Runs synchronously on first render —
 * before useArcadeSessionMint checks sessionStorage — so the bot path
 * never triggers a redundant Privy mint.
 */
function captureHubUrlSession(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      sessionStorage.setItem('arcade_session', session);
      sessionStorage.setItem('arcadeSession', session);
      params.delete('session');
      const q = params.toString();
      const cleanUrl =
        window.location.pathname + (q ? `?${q}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      return session;
    }
    return (
      sessionStorage.getItem('arcade_session') ??
      sessionStorage.getItem('arcadeSession')
    );
  } catch {
    return null;
  }
}

/**
 * Full-bleed iframe of the Shootout game. Mounted at /play/shootout/launch
 * outside the AppShell chrome (mirrors the legacy chromeless Pool wrapper).
 *
 * Identity handoff: the game reads `?session=<jwt>` from ITS OWN URL
 * (visual landing → src/net/client.js stash-and-strip), so we forward
 * whatever session we have — bot-launched (?session= on the hub URL)
 * or Privy-minted via useArcadeSessionMint('shootout') for logged-in
 * web users. With no session the game runs in guest mode (synthetic
 * web-XXXX identity), so we never block the iframe on auth — we only
 * hold rendering during the brief 'minting' state to avoid booting the
 * game as a guest a beat before the real identity lands.
 *
 * The `allow` attribute grants the iframe pointer-lock + fullscreen +
 * gamepad, which the FPS needs for mouse-look + scope + future
 * controller support. The empty sandbox is omitted on purpose — the
 * standalone game owns its own domain and we trust its scripts.
 */
export function ShootoutScreen() {
  // Synchronous: stash any bot-launched ?session= before the mint hook
  // looks at sessionStorage.
  const urlSession = useMemo(() => captureHubUrlSession(), []);

  // Privy web users: mint a shootout session in the background
  // (no-ops to 'has_session' when the bot already provided one).
  const { status } = useArcadeSessionMint('shootout');

  const iframeSrc = useMemo(() => {
    const session =
      urlSession ??
      (() => {
        try {
          return (
            sessionStorage.getItem('arcade_session') ??
            sessionStorage.getItem('arcadeSession')
          );
        } catch {
          return null;
        }
      })();
    const url = new URL(SHOOTOUT_GAME_URL);
    if (session) url.searchParams.set('session', session);
    return url.toString();
    // status is a dependency on purpose: when the mint completes
    // ('ok'), recompute so the freshly-stored JWT makes it into the
    // iframe URL before first mount.
  }, [urlSession, status]);

  // Hold one beat while a Privy mint is in flight; everything else
  // (idle / has_session / ok / tg_not_linked / error) renders — guest
  // mode is a supported state, not a failure.
  if (status === 'minting') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          fontSize: 13,
          letterSpacing: '0.2em',
        }}
      >
        LOADING…
      </div>
    );
  }

  return (
    <iframe
      title="Shootout"
      src={iframeSrc}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        border: 0,
        background: '#000',
      }}
      allow="fullscreen; pointer-lock; gamepad; autoplay"
      allowFullScreen
    />
  );
}
