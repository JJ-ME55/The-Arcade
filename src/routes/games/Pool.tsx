import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Pool launch route — `/play/pool/launch`.
 *
 * Mounts the standalone pool game (Webpack + TS + Canvas, on this repo's
 * arcade/8-ball-pool branch) as a same-origin iframe served from
 * /games/pool/index.html. Same-origin so the iframe can call
 * /api/games/pool/* on solshot.onrender.com without CORS surprises,
 * and so sessionStorage / URL params pass through cleanly.
 *
 * Build pipeline (V2.α):
 *   1. cd pool && npm run build  (on arcade/8-ball-pool branch)
 *   2. cp -r pool/dist/* public/games/pool/  (onto main)
 *   3. commit + push → Vercel serves /games/pool/ statically
 *
 * Long-term, pool's TS modules port to Vite + lift into src/games/pool/
 * (matching the basketball/keepies/free-kicks pattern). For V2.α the
 * iframe ships the playable game today without the porting overhead.
 * Pool's own DOM (canvas + power slider + spin widget) handles the
 * entire game UX inside the frame.
 *
 * Session handoff:
 *   - Bot launches with ?session=<jwt>
 *   - We forward as ?session=... to the iframe so pool's standalone
 *     leaderboard client picks it up the same way basketball/keepies/
 *     free-kicks do
 *   - sessionStorage on the parent is set too, so direct-visit users who
 *     followed a bot link previously still get stable identity
 */
export function Pool() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Stash the arcade-bot session JWT (parent-side). The iframe also reads
  // it from its own URL query — double-write so either side works.
  useEffect(() => {
    const session = params.get('session');
    if (session) {
      try {
        sessionStorage.setItem('arcade_session', session);
      } catch {
        /* sessionStorage unavailable — server-side or private mode */
      }
    }
  }, [params]);

  // Forward query params (currently just session) to the iframe URL.
  const session = params.get('session');
  const iframeSrc = session
    ? `/games/pool/index.html?session=${encodeURIComponent(session)}`
    : '/games/pool/index.html';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0e1209',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="8-Ball Pool"
        loading="eager"
        // Same-origin iframe; no sandbox restrictions needed. Allow
        // fullscreen for the rare in-game fullscreen request.
        allow="fullscreen"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />

      {/*
        Exit button — overlay on the iframe parent so players can return
        to the hub without using browser-back. Designer-spec §15.3 ships
        this as a quick win independent of the design uplift; visual
        styling can be re-skinned later to match the in-game HUD.
        Top-right, safe-area-inset aware for iOS notches.
      */}
      <button
        onClick={() => navigate('/play')}
        aria-label="Back to the Arcade"
        style={{
          position: 'fixed',
          top: 'max(env(safe-area-inset-top, 0px), 12px)',
          right: 'max(env(safe-area-inset-right, 0px), 12px)',
          minWidth: 44,
          minHeight: 44,
          padding: '8px 14px',
          background: 'rgba(14, 18, 9, 0.85)',
          color: '#c8b87a',
          border: '1px solid #2e3e20',
          borderRadius: 4,
          fontFamily: '"IBM Plex Mono", "Share Tech Mono", ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        × Exit
      </button>
    </div>
  );
}
