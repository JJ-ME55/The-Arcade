# SolShot Free-Kick Madness — Playtest Harness

Standalone playtest repo for **Free-Kick Madness**, the third arcade title in the SolShot suite. Lives outside the monorepo (`C:\Users\jacob\SolShot`) so the game loop can be iterated on fast without a server roundtrip.

The canonical implementation lives in the monorepo at `server/services/games/free-kicks/`. The pure JS modules (`constants.js`, `physics.js`, `shotgen.js`, `rules.js`, `gesture.js`) are mirrored here verbatim into `src/physics/`. Keep them in sync.

## Stack

- **Vite** — fast dev server, ESM-native
- **Phaser 3** — scene + input
- **Vanilla JS** — no React layer (justified for a playtest harness; the production React mount lives in the SolShot monorepo)

This is a **deliberate departure from `solshot-basketball`'s CRA + React + Privy stack**. Basketball's standalone repo doubled as a near-prod mirror that validated the wallet integration; free-kicks doesn't need to re-prove that. Lighter stack = faster iteration on game feel.

## Run

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

Outputs to `dist/`.

## How to play

- **Swipe up** to shoot. Length of swipe = power.
- **Curve your swipe** to bend the ball. Right-bow = right curl (banana shot bending right), left-bow = left curl.
- **Vertical component** of swipe = elevation. Steeper swipe = higher lob.
- **Targets** in the goal mouth: hit a `+10` for bonus points, hit a `❤️` to refill a life.
- **5 lives** — every miss (blocked / over / wide / post) costs one.

## Structure

```
src/
  main.js                — Phaser bootstrap
  scene.js               — gameplay scene (rendering, lifecycle, animation)
  input.js               — gesture capture, live trail
  projection.js          — empirical K(z) projection
  physics/
    constants.js         — research-cited physics + scoring constants (mirror)
    physics.js           — Magnus + drag + RK4 + swept collision (mirror)
    shotgen.js           — deterministic per-shot scenario (mirror)
    rules.js             — scoring + lives + run-end (mirror)
    gesture.js           — gesture → derived inputs (mirror)
```

## Tuning

All gameplay-feel tunables are calibration constants in `src/physics/gesture.js` and `src/physics/constants.js`:

- `REFERENCE_PATH_LENGTH_PX` — how long a "full power" swipe is, in pixels
- `LATERAL_AIM_SENSITIVITY` — dampening factor for swipe-angle → azimuth (0.65 default, basketball-playbook tested)
- `SPIN_SENSITIVITY_RAD_S_PER_PX` — pixels of midpoint deviation → rad/s of spin
- `REFERENCE_VERTICAL_SWIPE_PX` / `REFERENCE_VERTICAL_ELEVATION_RAD` — vertical swipe → elevation calibration

Change them, hot reload, playtest, iterate. The same constants must be ported back to the monorepo when tuning lands.

## Sync with monorepo

When a constant or function changes here, port it back to `server/services/games/free-kicks/` and run the server-side tests:

```bash
cd C:\Users\jacob\SolShot\server
node --test services/games/free-kicks/__tests__/*.test.js
```

## What's intentionally NOT here

- Wallet / Privy / Solana — not needed for game-feel iteration
- Multiplayer lobby / matchmaking — same
- Telegram bot — same
- DALL-E art assets — drawn as Phaser primitives for v0.1; swap in when assets land

These all live in the monorepo and get wired up in the integration phase.

— fishyboy-claude, 2026-05-18
