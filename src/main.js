import { FreeKickScene3D } from './scene3d.js';
import { LIVES_MAX } from './physics/constants.js';

// === Arcade leaderboard wiring ===
// The arcade bot mints a per-user JWT and appends `?session=<jwt>` to the
// launch URL when a TG user taps /freekicks. We stash it in sessionStorage
// so a refresh (or the Open-in-Safari hatch below) doesn't lose identity,
// then POST it on game-over to the SolShot server's freekicks endpoint.
//
// Failure modes we explicitly handle:
//   - iPhone TG WebView silently drops fetch POSTs (intermittent). Mitigated
//     by single-retry, then localStorage-stashed retry-on-next-boot.
//   - JWT expired after 24h. Surfaced to user as "re-tap /freekicks".
//   - Server error / network. Score stashed for next-load retry.
const ARCADE_LEADERBOARD_ENDPOINT = 'https://solshot.onrender.com/api/games/freekicks/score';
const PENDING_SCORE_KEY = 'arcadePendingScore';

(function captureSessionFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session');
        if (session) {
            sessionStorage.setItem('arcadeSession', session);
        }
    } catch { /* sessionStorage unavailable → free-play mode, no submit */ }
})();

function getArcadeSession() {
    try { return sessionStorage.getItem('arcadeSession'); } catch { return null; }
}

// === Pending score persistence ===
// On POST failure, persist the score so the next page load can retry it.
// We stash the MAX of the existing pending value + the current value, so
// a session of multiple failed runs never loses the player's best run.
// The Safari escape hatch link re-attaches the JWT in the URL; on that
// reload, retryPendingOnBoot() picks the score up and POSTs it cleanly.
function stashPendingScore(score) {
    try {
        const existing = readPendingScore();
        const max = (existing !== null && existing > score) ? existing : score;
        localStorage.setItem(PENDING_SCORE_KEY, String(max));
    } catch { /* localStorage unavailable — nothing to do */ }
}
function clearPendingScore() {
    try { localStorage.removeItem(PENDING_SCORE_KEY); } catch {}
}
function readPendingScore() {
    try {
        const v = localStorage.getItem(PENDING_SCORE_KEY);
        if (!v) return null;
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n >= 0 ? n : null;
    } catch { return null; }
}

async function postScore(score, session) {
    return fetch(ARCADE_LEADERBOARD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, session }),
    });
}

// Returns a structured result the UI can branch on:
//   { ok: true,  ... }                           — submitted, leaderboard row returned
//   { ok: false, reason: 'no_session' }          — free-play mode, no minted JWT
//   { ok: false, reason: 'session_expired' }     — 401 from server, user must re-tap /freekicks
//   { ok: false, reason: 'network_error' }       — fetch threw, score stashed for retry
//   { ok: false, reason: 'server_error', status }— non-2xx non-401, score stashed for retry
async function submitToArcadeLeaderboard(score) {
    const session = getArcadeSession();
    if (!session) return { ok: false, reason: 'no_session' };

    // Single retry on network exception — iPhone TG WebView drops are
    // often intermittent rather than total.
    let resp;
    try {
        resp = await postScore(score, session);
    } catch (e1) {
        try {
            await new Promise(r => setTimeout(r, 800));
            resp = await postScore(score, session);
        } catch (e2) {
            console.warn('[freekicks] POST network error (after retry):', e2?.message || e2);
            stashPendingScore(score);
            return { ok: false, reason: 'network_error' };
        }
    }

    if (!resp.ok) {
        if (resp.status === 401) {
            // Expired JWT — don't stash; the score belongs to this player,
            // but they need a fresh session before any retry will succeed.
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
// submission AND we have a session token now, fire it once silently before
// the player starts a new run. Failure here just leaves the stash in place
// for the next reload.
(async function retryPendingOnBoot() {
    const pending = readPendingScore();
    if (pending === null) return;
    if (!getArcadeSession()) return;
    const result = await submitToArcadeLeaderboard(pending);
    if (result?.ok) {
        console.log('[freekicks] recovered pending score:', pending);
    }
})();

const container = document.getElementById('game');
const scene = new FreeKickScene3D(container);

// === HUD ===
const hud = document.getElementById('hud');

const livesEl = document.getElementById('hud-lives');
const scoreEl = document.getElementById('hud-score');
const scenarioEl = document.getElementById('hud-scenario');
const popupEl = document.getElementById('popup');
const replayEl = document.getElementById('replay');
const runOverInfoEl = document.getElementById('run-over-info');
const safariHatchEl = document.getElementById('safari-hatch');

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

scene.onHUDUpdate = ({ lives, score, scenario }) => {
    const hearts = '❤️'.repeat(Math.max(0, lives));
    const ghosts = '♡'.repeat(Math.max(0, LIVES_MAX - lives));
    livesEl.textContent = `${hearts}${ghosts}`;
    scoreEl.textContent = `${score} pts`;
    const angleDeg = Math.round(scenario.angleRad * 180 / Math.PI);
    scenarioEl.textContent = `${scenario.distanceM}m  •  ${angleDeg >= 0 ? '+' : ''}${angleDeg}°  •  ${scenario.wallSize}-man wall`;
};

scene.onResult = ({ result, runState }) => {
    const [text, color] = popupText(result);
    if (text) showPopup(text, color);

    // Update HUD post-shot
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
    popupEl.textContent = `RUN OVER\n${score} pts`;
    popupEl.style.color = '#ff7799';
    popupEl.style.opacity = '1';
    popupEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
    replayEl.style.display = 'block';

    // Show Safari escape hatch whenever a session exists — TG WebView on
    // iPhone silently drops fetch POSTs, so users who got a 0 rank-back can
    // tap this to retry in a real browser. The link rebuilds the original
    // launch URL with the JWT re-attached from sessionStorage.
    const session = getArcadeSession();
    if (session && safariHatchEl) {
        const safariUrl = `${window.location.origin}${window.location.pathname}?session=${encodeURIComponent(session)}`;
        safariHatchEl.href = safariUrl;
        safariHatchEl.style.display = 'block';
    }

    const result = await submitToArcadeLeaderboard(score);
    if (!runOverInfoEl) return;

    if (result?.ok) {
        const rankLine = result.newBest
            ? `🏆 NEW BEST · Rank #${result.rank} of ${result.totalPlayers}`
            : `Best: ${result.bestScore} pts · Rank #${result.rank} of ${result.totalPlayers}`;
        runOverInfoEl.textContent = rankLine;
        runOverInfoEl.style.color = '#cfd8dc';
        runOverInfoEl.style.display = 'block';
        return;
    }

    if (result?.reason === 'no_session') {
        // Free-play mode — no session, no submission expected. Stay silent.
        return;
    }

    if (result?.reason === 'session_expired') {
        runOverInfoEl.textContent = '⚠️ Session expired — re-tap /freekicks in the bot';
        runOverInfoEl.style.color = '#ffaa66';
        runOverInfoEl.style.display = 'block';
        return;
    }

    // network_error or server_error — score is stashed for retry on next load
    runOverInfoEl.textContent = '⚠️ Score not recorded — tap Open in Safari ↗ to retry';
    runOverInfoEl.style.color = '#ff7799';
    runOverInfoEl.style.display = 'block';
}

replayEl.addEventListener('click', () => {
    replayEl.style.display = 'none';
    popupEl.style.opacity = '0';
    if (runOverInfoEl) {
        runOverInfoEl.style.display = 'none';
        runOverInfoEl.textContent = '';
    }
    if (safariHatchEl) safariHatchEl.style.display = 'none';
    scene.restart();
});
