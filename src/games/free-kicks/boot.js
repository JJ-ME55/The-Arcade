// Refactored from main.js in JJ-ME55/solshot-free-kicks. The submit logic
// is now in sync with that fork's commit 70eb14f (POST resilience —
// single-retry + localStorage stash + retry-on-boot). Forward-ported
// 2026-06-02 after Elliot lost an 1008-pt run on the hub: the structured
// {ok, reason} UI was here, but the stash + retry that survives transient
// failures was missing.
//
// Diverged behaviour vs upstream:
// - exports bootFreeKicks(container) which returns a teardown function
// - API base read from VITE_SOLSHOT_API_BASE with the upstream URL as fallback
// - Safari escape hatch logic preserved but hidden by default (we run on a
//   real-browser web hub, not TG WebView). It still binds on game-over so
//   if the wrapper UI shows the #safari-hatch element we don't break.
// - retryPendingScore() polls sessionStorage for up to 3s before giving up
//   (handles race vs useArcadeSessionMint's Privy → server-mint flow which
//   may not have populated sessionStorage by the time bootFreeKicks runs).

import { FreeKickScene3D } from './scene3d.js';
import { LIVES_MAX } from './physics/constants.js';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLSHOT_API_BASE) ||
  'https://solshot.onrender.com';
const ARCADE_LEADERBOARD_ENDPOINT = `${API_BASE}/api/games/freekicks/score`;
const PENDING_SCORE_KEY = 'arcadePendingScore';

function captureSessionFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) sessionStorage.setItem('arcadeSession', session);
  } catch {
    /* sessionStorage unavailable → free-play mode, no submit */
  }
}

function getArcadeSession() {
  try {
    return sessionStorage.getItem('arcadeSession');
  } catch {
    return null;
  }
}

// === Pending-score persistence ===
// On POST failure, persist the score so a later session (next mount, next
// successful network, next page load) can retry. stashPendingScore writes
// the MAX of existing-stash + current, so a session of multiple failed
// runs preserves the best one regardless of submission order.
function stashPendingScore(score) {
  try {
    const existing = readPendingScore();
    const max = existing !== null && existing > score ? existing : score;
    localStorage.setItem(PENDING_SCORE_KEY, String(max));
  } catch {
    /* localStorage unavailable — nothing to do */
  }
}

function clearPendingScore() {
  try {
    localStorage.removeItem(PENDING_SCORE_KEY);
  } catch {
    /* ignore */
  }
}

function readPendingScore() {
  try {
    const v = localStorage.getItem(PENDING_SCORE_KEY);
    if (!v) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

async function postScore(score, session) {
  return fetch(ARCADE_LEADERBOARD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, session }),
  });
}

// Returns a structured result the UI can branch on:
//   { ok: true,  ... }                            — submitted, leaderboard row returned
//   { ok: false, reason: 'no_session' }           — free-play mode, no minted JWT
//   { ok: false, reason: 'session_expired' }      — 401 from server, user must re-launch
//   { ok: false, reason: 'network_error' }        — fetch threw twice, score stashed
//   { ok: false, reason: 'server_error', status } — non-2xx non-401, score stashed
async function submitToArcadeLeaderboard(score) {
  const session = getArcadeSession();
  if (!session) return { ok: false, reason: 'no_session' };

  // Single retry on network exception — transient blips (mid-deploy
  // Render, brief wifi drop) are common enough to handle automatically.
  let resp;
  try {
    resp = await postScore(score, session);
  } catch (e1) {
    try {
      await new Promise((r) => setTimeout(r, 800));
      resp = await postScore(score, session);
    } catch (e2) {
      console.warn('[freekicks] POST network error (after retry):', e2?.message || e2);
      stashPendingScore(score);
      return { ok: false, reason: 'network_error' };
    }
  }

  if (!resp.ok) {
    if (resp.status === 401) {
      // Expired JWT — don't stash; the score belongs to this player but
      // they need a fresh session before any retry can succeed.
      console.warn('[freekicks] session expired (401)');
      return { ok: false, reason: 'session_expired' };
    }
    console.warn('[freekicks] POST failed:', resp.status);
    stashPendingScore(score);
    return { ok: false, reason: 'server_error', status: resp.status };
  }

  clearPendingScore();
  try {
    const json = await resp.json();
    return { ok: true, ...json };
  } catch {
    return { ok: true };
  }
}

// Boot-time recovery: if there's a stashed score from a previous failed
// submission AND we eventually get a session token, fire it silently.
// We poll sessionStorage for up to 3s because the web user flow mints
// the JWT via Privy → server-side (useArcadeSessionMint) and that fetch
// may not have completed by the time bootFreeKicks runs.
async function retryPendingScore() {
  const pending = readPendingScore();
  if (pending === null) return;

  let session = null;
  for (let i = 0; i < 30; i++) {
    session = getArcadeSession();
    if (session) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!session) return;

  const result = await submitToArcadeLeaderboard(pending);
  if (result?.ok) {
    console.log('[freekicks] recovered pending score:', pending);
  }
}

function popupText(result) {
  switch (result) {
    case 'goal': return ['GOAL!', '#ffe680'];
    case 'goal_plus10': return ['GOAL! +10', '#ffe680'];
    case 'goal_heart': return ['GOAL! +LIFE', '#ffe680'];
    case 'goal_plus10_heart': return ['GOAL! +10 +LIFE', '#ffe680'];
    case 'blocked': return ['BLOCKED!', '#ff7799'];
    case 'over': return ['OVER!', '#ff7799'];
    case 'wide': return ['WIDE!', '#ff7799'];
    case 'post': return ['POST!', '#ff7799'];
    case 'short': return ['SHORT!', '#ff7799'];
    default: return [null, null];
  }
}

/**
 * Boots the free-kicks scene into the supplied container element.
 * Requires the following sibling DOM IDs to exist (rendered by
 * FreeKicksScreen.jsx):
 *   #hud-lives, #hud-score, #hud-scenario, #popup, #replay,
 *   #run-over-info, #safari-hatch (optional)
 *
 * Returns a best-effort teardown function. The FreeKickScene3D class
 * doesn't expose a destroy method, so animation loops keep running
 * until the page navigates away — known issue, follow-up to add scene
 * cleanup.
 */
export function bootFreeKicks(container) {
  if (!container) return () => {};

  captureSessionFromUrl();
  // Fire-and-forget: if a previous mount stashed a failed score, try to
  // submit it now. Polls for session availability internally so it's safe
  // to call before useArcadeSessionMint resolves.
  retryPendingScore();

  const scene = new FreeKickScene3D(container);

  const livesEl = document.getElementById('hud-lives');
  const scoreEl = document.getElementById('hud-score');
  const scenarioEl = document.getElementById('hud-scenario');
  const popupEl = document.getElementById('popup');
  const replayEl = document.getElementById('replay');
  const runOverInfoEl = document.getElementById('run-over-info');
  const safariHatchEl = document.getElementById('safari-hatch');

  scene.onHUDUpdate = ({ lives, score, scenario }) => {
    const hearts = '❤️'.repeat(Math.max(0, lives));
    const ghosts = '♡'.repeat(Math.max(0, LIVES_MAX - lives));
    if (livesEl) livesEl.textContent = `${hearts}${ghosts}`;
    if (scoreEl) scoreEl.textContent = `${score} pts`;
    if (scenarioEl) {
      const angleDeg = Math.round((scenario.angleRad * 180) / Math.PI);
      scenarioEl.textContent = `${scenario.distanceM}m  •  ${angleDeg >= 0 ? '+' : ''}${angleDeg}°  •  ${scenario.wallSize}-man wall`;
    }
  };

  scene.onResult = ({ result, runState }) => {
    const [text, color] = popupText(result);
    if (text) showPopup(text, color);
    scene.onHUDUpdate({
      lives: runState.lives,
      score: runState.score,
      scenario: scene.scenario,
    });
    if (runState.runEnded) {
      setTimeout(() => showRunOver(runState.score), 800);
    }
  };

  function showPopup(text, color) {
    if (!popupEl) return;
    popupEl.textContent = text;
    popupEl.style.color = color;
    popupEl.style.opacity = '1';
    popupEl.style.transform = 'translate(-50%, -50%) scale(1.0)';
    requestAnimationFrame(() => {
      popupEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
    });
    setTimeout(() => {
      popupEl.style.opacity = '0';
    }, 600);
  }

  async function showRunOver(score) {
    if (popupEl) {
      popupEl.textContent = `RUN OVER\n${score} pts`;
      popupEl.style.color = '#ff7799';
      popupEl.style.opacity = '1';
      popupEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
    }
    if (replayEl) replayEl.style.display = 'block';

    // Safari escape hatch — only useful on TG WebView; arcade web hub
    // shouldn't need it. Left wired up in case the wrapper opts to show
    // the #safari-hatch element.
    const session = getArcadeSession();
    if (session && safariHatchEl) {
      const safariUrl = `${window.location.origin}${window.location.pathname}?session=${encodeURIComponent(session)}`;
      safariHatchEl.href = safariUrl;
    }

    const result = await submitToArcadeLeaderboard(score);
    if (!runOverInfoEl) return;
    if (result?.ok) {
      const rankLine = result.newBest
        ? `🏆 NEW BEST · Rank #${result.rank} of ${result.totalPlayers}`
        : `Best: ${result.bestScore} pts · Rank #${result.rank} of ${result.totalPlayers}`;
      runOverInfoEl.textContent = rankLine;
      runOverInfoEl.style.display = 'block';
    } else if (result?.reason === 'session_expired') {
      // 401 — JWT expired. Score is NOT stashed (a stale token would just
      // fail again on retry); user must re-launch to mint a fresh one.
      // Original surfacing was added after Elliot lost a 450-pt run
      // 2026-05-28. JWT TTL has since been bumped to 30d.
      runOverInfoEl.textContent =
        '⚠ Score not saved — re-launch /freekicks in @TheArcadeGG_Bot';
      runOverInfoEl.style.display = 'block';
    } else if (
      result?.reason === 'network_error' ||
      result?.reason === 'server_error'
    ) {
      // Score is stashed in localStorage; retryPendingScore() at the next
      // mount (route re-enter, page reload, replay button) will resubmit.
      // Fork commit 70eb14f's logic, forward-ported 2026-06-02 after
      // Elliot lost an 1008-pt run because the stash didn't exist here.
      runOverInfoEl.textContent =
        '⚠ Score not yet saved — will retry automatically next time';
      runOverInfoEl.style.display = 'block';
    } else if (result?.reason === 'no_session') {
      // Guest played without auth — stash so the React ClaimScoreOverlay
      // can surface "Sign in to claim" CTA. After sign-in, the overlay
      // auto-fires the submit with the buffered score.
      try {
        sessionStorage.setItem('claimable_score', JSON.stringify({
          game: 'free-kicks',
          score,
          ts: Date.now(),
        }));
      } catch { /* sessionStorage unavailable — claim flow no-op */ }
      // Run-over UI still shows the score; the overlay handles the
      // sign-in prompt above it.
    }
  }

  const onReplay = () => {
    if (replayEl) replayEl.style.display = 'none';
    if (popupEl) popupEl.style.opacity = '0';
    if (runOverInfoEl) {
      runOverInfoEl.style.display = 'none';
      runOverInfoEl.textContent = '';
    }
    if (safariHatchEl) safariHatchEl.style.display = 'none';
    // Also retry pending on replay — user who failed to submit and
    // immediately taps "Play again" should get their previous score
    // flushed without having to leave the route.
    retryPendingScore();
    scene.restart();
  };

  if (replayEl) replayEl.addEventListener('click', onReplay);

  // Best-effort teardown
  return () => {
    if (replayEl) replayEl.removeEventListener('click', onReplay);
    // TODO: scene.destroy() once FreeKickScene3D exposes one. Until
    // then, the rAF loop keeps running after route change. Known issue.
  };
}
