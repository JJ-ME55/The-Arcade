import { useEffect, useState } from 'react';
import App from './App';
import { GameChrome } from '@/components/GameChrome.jsx';
import { TelegramLinkBanner } from '@/components/TelegramLinkBanner.jsx';
import { useArcadeSessionMint } from '@/wallet/useArcadeSessionMint.js';
import { MultiplayerLayer } from './MultiplayerLayer';

/**
 * CritterKartScreen — mounts the Critter Kart game (a self-contained React +
 * Three.js app, ported from BillionaireBonkClub/critter-kart) inside the arcade
 * route, plus the shared arcade chrome + score-submit pipeline.
 *
 * Unlike the Phaser games this is already a full React app, so we render its
 * <App/> subtree directly instead of a boot()/teardown dance. <App/> exposes an
 * onRaceFinish(results, playerId) hook we use to submit the player's result.
 *
 * Score submission follows the arcade contract (see src/games/critter-kart/README.md):
 *   - bot users arrive at /play/critter-kart/launch?session=<jwt> → captured below
 *   - web users get a JWT minted via useArcadeSessionMint (Privy → server)
 *   - on finish we POST to /api/games/critter-kart/score and SURFACE failures
 *     (the Elliot-450 incident: never a silent 401)
 *
 * NOTE FOR JJ: the score endpoint does not exist yet — fetch will 404 until you
 * land POST /api/games/critter-kart/score in the SolShot repo. The game plays
 * fine without it. Race scoring semantics (position-points vs best-lap vs total
 * time) are your call server-side; we send `score` (Mario-Kart-style position
 * points) plus raw `pos`/`best` so you have everything. See docs/CLAUDE_COMMS.md.
 */

const SCORE_ENDPOINT = 'https://solshot.onrender.com/api/games/critter-kart/score';

// Position → points (6-kart grid). Higher = better, for a "high score" leaderboard.
// Provisional — JJ owns the canonical scoring model server-side.
const POSITION_POINTS = [0, 15, 12, 10, 8, 6, 4];

// CRASH TRAP: persist any uncaught error/rejection so a dead tab still tells
// us what killed it — re-printed as a console.warn on the next load (JJ's
// finish-line crash 2026-06-12 took the console down with it).
if (typeof window !== 'undefined' && !window.__ckCrashTrap) {
  window.__ckCrashTrap = true;
  try {
    const prev = sessionStorage.getItem('ck_lastCrash');
    if (prev) {
      console.warn('[critter-kart/CRASH-LAST-RUN] ⚠⚠⚠', prev);
      sessionStorage.removeItem('ck_lastCrash');
    }
  } catch (_) { /* no storage */ }
  const record = (msg) => { try { sessionStorage.setItem('ck_lastCrash', String(msg).slice(0, 2000)); } catch (_) {} };
  // REMOTE crash reporting — iPads/phones give us no console, so the report
  // must reach the server. text/plain keeps it a CORS "simple request" (no
  // preflight — sendBeacon can't do preflights); keepalive survives teardown.
  const send = (kind, msg) => {
    try {
      const body = JSON.stringify({
        kind,
        msg: String(msg).slice(0, 2000),
        stage: window.__ckStage || null,
        rafAgoMs: window.__ckLastRaf ? Math.round(performance.now() - window.__ckLastRaf) : null,
        ua: navigator.userAgent,
        at: new Date().toISOString(),
      });
      const url = 'https://solshot.onrender.com/api/games/critter-kart/client-crash';
      const beaconOk = navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
      if (!beaconOk) fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {});
    } catch (_) { /* reporting must never throw */ }
  };
  window.__ckReportCrash = send; // GameCanvas uses this for webglcontextlost
  window.addEventListener('error', (e) => {
    record(`${e.message} @ ${e.filename}:${e.lineno}\n${e.error?.stack || ''}`);
    send('error', `${e.message} @ ${e.filename}:${e.lineno}\n${e.error?.stack || ''}`);
    console.warn('[critter-kart/CRASH] ⚠', e.message, e.error?.stack || '');
  });
  window.addEventListener('unhandledrejection', (e) => {
    record(`unhandledrejection: ${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`);
    send('unhandledrejection', `${e.reason?.message || e.reason}\n${e.reason?.stack || ''}`);
    console.warn('[critter-kart/CRASH] ⚠ unhandledrejection:', e.reason);
  });
  // rAF watchdog: a black-stuck screen with NO error event (silent context
  // loss, rAF death) still phones home. Reports once per page life.
  setInterval(() => {
    const last = window.__ckLastRaf;
    const stage = window.__ckStage;
    if (!last || window.__ckRafStallSent) return;
    if ((stage === 'countdown' || stage === 'racing') && performance.now() - last > 8000) {
      window.__ckRafStallSent = true;
      send('raf-stall', `render loop dead ${Math.round((performance.now() - last) / 1000)}s during ${stage}`);
    }
  }, 5000);
}

export function CritterKartScreen() {
  // Web-user score submission via Privy → server-minted JWT. No-op if a session
  // JWT already exists (bot user). Slug 'critter-kart' must match the server.
  const { status: sessionStatus } = useArcadeSessionMint('critter-kart');
  const [submitError, setSubmitError] = useState(null); // 'session_expired' | 'network_error' | null

  // Bot users arrive with ?session=<jwt>. Capture it into sessionStorage under
  // both naming conventions so the submit below (and useMyStanding) pick it up.
  useEffect(() => {
    try {
      const session = new URLSearchParams(window.location.search).get('session');
      if (session) {
        sessionStorage.setItem('arcade_session', session);
        sessionStorage.setItem('arcadeSession', session);
      }
    } catch (_) {
      /* sessionStorage unavailable; game still plays without a leaderboard */
    }
  }, []);

  const handleRaceFinish = (results, playerId) => {
    setSubmitError(null);

    let session = null;
    try {
      session = sessionStorage.getItem('arcade_session') || sessionStorage.getItem('arcadeSession');
    } catch (_) { /* no storage */ }
    if (!session) return; // free play / no identity → stay silent (don't nag web visitors)

    const me = results.find((r) => r.racerId === playerId);
    const pos = me?.pos ?? results.length;
    const score = POSITION_POINTS[pos] ?? 0;

    fetch(SCORE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, session, pos, best: me?.best ?? null, time: me?.time ?? null }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(() => { /* success — standings refresh handled by useMyStanding elsewhere */ })
      .catch((err) => {
        const msg = String(err.message || '');
        const isExpired = msg.includes('401');
        if (!isExpired) console.warn('[arcade-leaderboard] critter-kart submit failed:', msg);
        // Surface explicitly — DO NOT silently swallow.
        setSubmitError(isExpired ? 'session_expired' : 'network_error');
      });
  };

  const handleMute = (_next) => {
    // No-op for now (matches the Free Kicks precedent). Critter Kart has its own
    // music; wiring the arcade mute button to a global gain is a follow-up. See
    // docs/CLAUDE_COMMS.md.
  };

  return (
    <div style={styles.root}>
      {/*
        MultiplayerLayer detects ?queue=1 / ?race=<id> in URL and either
        passes through (single-player, no behaviour change) or wraps
        <App/> in MultiplayerProvider so GameCanvas can drive remote
        karts from server snapshots. No-op when URL has neither param.
      */}
      <MultiplayerLayer>
        <App onRaceFinish={handleRaceFinish} />
      </MultiplayerLayer>
      <GameChrome onMute={handleMute} />
      {submitError && (
        <div style={styles.submitWarning}>
          {submitError === 'session_expired'
            ? '⚠ Score not saved — re-launch /critterkart in @TheArcadeGG_Bot'
            : '⚠ Score not saved — network error'}
        </div>
      )}
      {sessionStatus === 'tg_not_linked' && <TelegramLinkBanner />}
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    background: '#0a0a14',
    color: '#fff',
    overflow: 'hidden',
    touchAction: 'none',
    WebkitTapHighlightColor: 'transparent',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  },
  submitWarning: {
    position: 'fixed',
    left: '50%',
    bottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
    transform: 'translateX(-50%)',
    zIndex: 20,
    padding: '8px 14px',
    background: 'rgba(214,58,43,0.95)',
    color: '#fff',
    borderRadius: 8,
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    fontSize: 12,
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(0,0,0,0.45)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
};

export default CritterKartScreen;
