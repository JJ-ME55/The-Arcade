# Critter Kart — branch brief

> **For Fish's Claude landing on `arcade/critter-kart`.** Read top to bottom before doing anything else.

---

## TL;DR

- You are on branch **`arcade/critter-kart`** of [`JJ-ME55/The-Arcade`](https://github.com/JJ-ME55/The-Arcade).
- Drop the game code in this folder (`src/games/critter-kart/`) and the route component at `src/routes/games/CritterKart.tsx`.
- Look at `src/games/basketball/` and `src/games/keepie-uppies/` for live templates. Same patterns work here.
- **Stack is your call.** Phaser, Three.js, vanilla canvas, all fine — just needs to mount inside a React route and post scores via HTTP.
- **Push to `arcade/critter-kart`. Never push to `main`.** JJ merges when the game is ready.
- **Surface submit failures in the game-over UI.** Silent 401s have cost us real high scores before.

---

## Where you are

This is **The Arcade web hub** repo (`JJ-ME55/The-Arcade`) — Vite + React + TS. Client only. The server lives in the separate SolShot repo (`JJ-ME55/SolShot`) on Render at `https://solshot.onrender.com`.

You are NOT in the SolShot repo. Don't try to edit `server/` — it isn't here. If you need a new server endpoint (e.g. a Critter Kart leaderboard), flag it in your PR description and JJ will land it in the SolShot repo.

Read these first if you have time:
- `docs/THE_ARCADE.md` — canonical doc on what The Arcade is, the brand, the economy, the tech surface
- `docs/FISH_KICKOFF.md` — your onboarding guide
- `docs/THE_ARCADE_v1_DESIGN.md` — full v1 architectural design (brand sections are SUPERSEDED by v2; architectural sections still useful)

---

## The pattern (copy from neighbours)

The three live games each give you a working template:

| Game | Stack | Folder | Look at |
|---|---|---|---|
| **Basketball** | Phaser 3 + React HUD | `src/games/basketball/` | `scene.js` (Phaser config, `_endGame`, `_submitToArcadeLeaderboard`), `hud.jsx` (React game-over overlay with `arcadeSubmitError` surface), `bridge.js` (scene ↔ HUD state) |
| **Keepie Uppies** | Phaser 3 + React HUD | `src/games/keepie-uppies/` | Same pattern, simpler |
| **Free Kicks** | Vite + Three.js | `src/games/free-kicks/` | `boot.js` — different stack, same lifecycle (capture session → play → submit → surface failures) |

If your game is Phaser → mirror Basketball. If Three.js → mirror Free Kicks. If something else → use whichever lifecycle is closer.

### Files you'll typically need

```
src/games/critter-kart/
├── README.md          ← this brief
├── scene.js           ← game logic + render loop (Phaser scene OR Three.js boot OR your equivalent)
├── hud.jsx            ← React HUD overlay (game-over screen, score readout, mute, retry)
├── bridge.js          ← state pipeline between scene + React HUD (basketball pattern; skip if not needed)
└── assets/            ← textures, sprites, audio (keep total under ~500KB per the asset budget)
```

And the route component (mounts your scene):

```
src/routes/games/CritterKart.tsx
```

Then add the route to `src/App.tsx` next to the other games' routes.

---

## Identity / session JWT

Bot users arrive at `/play/critter-kart/launch?session=<jwt>`. The JWT carries their Telegram identity (`tg`, `un`, `fn`) signed server-side.

**On scene boot — capture the JWT into sessionStorage:**

```js
useEffect(() => {
  try {
    const session = new URLSearchParams(window.location.search).get('session');
    if (session) sessionStorage.setItem('arcade_session', session);
  } catch (_) { /* sessionStorage unavailable; game still plays without leaderboard */ }
}, []);
```

(Free Kicks uses `arcadeSession` camelCase — fork history. The `useMyStanding` hook reads both. New games should use snake_case `arcade_session` for consistency with basketball + keepie-uppies.)

**On game-over — submit the score:**

```js
const session = sessionStorage.getItem('arcade_session');
if (!session) return;  // free play; no submit
fetch('https://solshot.onrender.com/api/games/critter-kart/score', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ score: finalScore, session }),
})
  .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
  .then(data => { /* success path — see below */ })
  .catch(err => { /* failure path — MUST surface, see below */ });
```

**⚠ The endpoint above does not exist yet.** JJ will add `POST /api/games/critter-kart/score` + `GET /api/games/critter-kart/leaderboard?limit&since` + `GET /api/games/critter-kart/standing/:telegramUserId` in the SolShot repo when the game is close to playable. Until then your fetch will 404 — that's fine, the game itself still plays.

When the endpoint lands, server side also needs a `BASKETBALL_LEADERBOARD_SECRET`-equivalent env var on Render (`CRITTER_KART_LEADERBOARD_SECRET`) and an entry in the arcade bot's `GAMES` array.

---

## Score-submit reliability (this matters)

We had a real incident on 2026-05-28: a player (Elliot) hit a 450 on Free Kicks that never landed because his 24h session JWT had expired. The game showed "RUN OVER · 450 pts" and he assumed it was saved. It wasn't.

**Fix that we ship across every game now:** surface failures explicitly in the game-over UI.

The pattern for your `.catch`:

```js
.catch(err => {
  const msg = String(err.message || '');
  const isExpired = msg.includes('401');
  if (!isExpired) {
    console.warn('[arcade-leaderboard] submit failed:', msg);
  }
  // Surface failure — DO NOT silently swallow
  this.bridge.updateState({
    arcadeSubmitError: isExpired ? 'session_expired' : 'network_error',
  });
});
```

Then in your game-over HUD:

```jsx
{state.arcadeSubmitError && (
  <div style={styles.submitWarning}>
    {state.arcadeSubmitError === 'session_expired'
      ? '⚠ Score not saved — re-launch /critterkart in @TheArcadeGG_Bot'
      : '⚠ Score not saved — network error'}
  </div>
)}
```

Reference impl: `src/games/basketball/scene.js` (`_submitToArcadeLeaderboard`) + `src/games/basketball/hud.jsx` (game-over card with `submitWarning` style).

Three messages, three behaviours:
- **`session_expired`** (401 from server) → "re-launch /<game> in @TheArcadeGG_Bot" — user needs a fresh JWT
- **`network_error`** (4xx/5xx/timeout) → "Score not saved — network error" — retryable
- **`no_session`** (no JWT in storage) → **stay silent**. Direct web visitors deliberately played without an identity; don't nag them.

---

## What NOT to touch

| Path | Reason |
|---|---|
| `src/components/dashboard/*` | v2 brand chrome. Locked. |
| `src/routes/Dashboard.tsx`, `Leaderboards.tsx`, `Wallet.tsx`, `PrizeCounter.tsx` | Product surfaces. Owned by main-claude. |
| `src/wallet/*` | Privy + auth. Touchy. Coordinate with JJ before any change. |
| `src/hooks/useLeaderboardData.ts`, `useMyStanding.ts` | Shared LB plumbing. If you need a new hook for Critter Kart specifics, add it next to these — don't modify these. |
| `src/data/*` | Brand tokens + fixtures. JJ adds Critter Kart to `PORTAL_GAMES` when ready. |
| Other games (`src/games/basketball/`, `keepie-uppies/`, `free-kicks/`, `pool/`) | Not yours. Read-only references. |
| `package.json` root deps | Coordinate before adding new top-level deps. Game-local deps OK. |
| `vite.config.ts`, `tsconfig.*` | Coordinate before touching build config. |

If you find yourself wanting to modify any of the above, **stop and ping JJ** (via TG or via a question commit in your branch with a TODO note).

---

## Push policy

1. **Push to `arcade/critter-kart` only.** Never push to `main` from this branch.
2. **Push freely.** Commit small, push often. JJ neatens up after each push (code review, naming pass, dead-code removal).
3. **Don't squash.** Atomic commits are easier to review.
4. **Commit messages:** conventional commits style if you can (`feat(critter-kart): ...`, `fix(critter-kart): ...`). Not enforced.
5. **`@ts-nocheck` is fine for `.ts`/`.tsx` files in this folder** if you want to defer strict TypeScript. The lint will not yell. Convert to real types as you go or never — JJ accepts both.
6. **CI is set to deploy `main` to `the-arcade-eta.vercel.app` on every push to main.** Your branch pushes do NOT trigger production deploy. Vercel will build a preview deploy at `the-arcade-git-arcade-critter-kart-jj-me55s-projects.vercel.app` (or similar Vercel auto-suffix).

### When to ping JJ

- You need a new server endpoint (LB, score submit, identity)
- You need an env var added (signing secrets)
- You need a new top-level dependency added
- You're stuck on auth / identity (don't touch `src/wallet/`)
- You're ready for JJ to merge to main + add the tile to the dashboard

### When NOT to ping JJ

- You're refactoring inside `src/games/critter-kart/` — just push
- You're adding assets to `src/games/critter-kart/assets/` — just push (keep page weight in mind)
- You're iterating on game design / physics / UX — just push

---

## Build + run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
```

Your game will be reachable at `http://localhost:5173/play/critter-kart` once the route is wired in `src/App.tsx`.

If `npm run build` fails on something in your folder, fix it before pushing. Vercel preview deploys will fail otherwise. Build failures in other folders are JJ's problem.

---

## Telegram bot launch URL (for testing once endpoint lands)

When the server-side endpoints are live, the bot will mint a session JWT and link users at:

```
https://the-arcade-eta.vercel.app/play/critter-kart/launch?session=<jwt>
```

The `/launch` suffix is the Phase 2 IA convention — `/play/<slug>` is the editorial detail page, `/play/<slug>/launch` mounts the game canvas full-bleed. Bot users skip the detail page; web users land on it first.

---

## Hero art

Three assets per game per the brief: tile (1280×800), hero (2400×1050), splash (1080×1920). All WebP. Total ~270 KB per game.

**Not your job.** JJ commissions hero art separately. Just leave the tile/hero slots empty in your fixture entry when JJ adds it to `PORTAL_GAMES`. Placeholder WebPs land first, real studio art swaps in later.

Your code just needs to render the game canvas. Brand chrome + tile art + featured cabinet are wired separately.

---

## Coordination etiquette

- **JJ is the integrator.** All cross-cutting changes flow through him.
- **Verify before reporting.** Before saying "I pushed X," run `git log -1 origin/arcade/critter-kart` and paste the commit hash. Before saying "Vercel preview is up," paste the URL + status. (Hallucinated tool output has burned prior comms exchanges — don't be the next.)
- **Cross-Claude conversation lives in `docs/CLAUDE_COMMS.md`** in this repo. Append entries dated + signed.
- **Cross-repo conversation** (e.g. you need a server endpoint) lives in `Docs/internal/CLAUDE_COMMS.md` in the SolShot repo. JJ updates that side; you note your need here and tag JJ.

---

— main-claude, 2026-05-29
