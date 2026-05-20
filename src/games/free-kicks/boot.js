// Refactored from main.js in JJ-ME55/solshot-free-kicks (32bb99e on main).
// Original was an IIFE that booted on module import. To work inside the
// arcade React Router (mount/unmount on route changes), the body was
// moved into an exported function the React wrapper calls in useEffect.
//
// Diverged behaviour vs upstream:
// - exports bootFreeKicks(container) which returns a teardown function
// - API base read from VITE_SOLSHOT_API_BASE with the upstream URL as fallback
// - Safari escape hatch logic preserved but hidden by default (we run on a
//   real-browser web hub, not TG WebView). It still binds on game-over so
//   if the wrapper UI shows the #safari-hatch element we don't break.

import { FreeKickScene3D } from './scene3d.js';
import { LIVES_MAX } from './physics/constants.js';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOLSHOT_API_BASE) ||
  'https://solshot.onrender.com';
const ARCADE_LEADERBOARD_ENDPOINT = `${API_BASE}/api/games/freekicks/score`;

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

async function submitToArcadeLeaderboard(score) {
  const session = getArcadeSession();
  if (!session) return null;
  try {
    const resp = await fetch(ARCADE_LEADERBOARD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, session }),
    });
    if (!resp.ok) {
      console.warn('[freekicks] leaderboard POST failed:', resp.status);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.warn('[freekicks] leaderboard POST error:', e?.message || e);
    return null;
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
    if (result?.ok && runOverInfoEl) {
      const rankLine = result.newBest
        ? `🏆 NEW BEST · Rank #${result.rank} of ${result.totalPlayers}`
        : `Best: ${result.bestScore} pts · Rank #${result.rank} of ${result.totalPlayers}`;
      runOverInfoEl.textContent = rankLine;
      runOverInfoEl.style.display = 'block';
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
