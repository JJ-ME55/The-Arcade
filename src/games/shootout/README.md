# Shootout (iframe integration)

A browser 3D FPS by Fish. The game itself lives as a self-contained Three.js + Vite
app at `BillionaireBonkClub/shootout` (mirror dev tree: `c:\Users\jacob\fps-staking-game\`),
deployed standalone at `shootout.pro` (custom domain since 2026-06-10;
`fps-staking-game.vercel.app` stays live as a fallback).

The Arcade integrates it via a chromeless iframe at `/play/shootout/launch`.

## Why an iframe (not src/games/shootout/ port)

Per `HANDOFF_FOR_JJ.md` in the source repo:
> "Different stack from the ball games. This is Three.js + Vite (vanilla JS),
> not Phaser/React. It's a full 3D FPS … it doesn't drop in as a `src/games/<slug>/`
> Phaser scene — it's a self-contained app you'll integrate however suits the hub
> (iframe/route/subdomain — your call)."

A 2026-06-06 attempt to port `visual/main.js` (~2000 lines) into a React-wrapped
`GameCanvas.tsx` dropped dozens of subtle tuning + feel details (animation
arming, shader grid overlay, bot perception, weapon state ticks, etc.) and the
result was visibly broken. Reset to scaffold; switched to iframe integration.

## What goes where

| Concern | Where it lives |
|---|---|
| Game code (rendering, bots, audio, weapons, match loop, all tuning) | `BillionaireBonkClub/shootout` (deployed at `shootout.pro`) |
| Multiplayer netcode (client side: net/client.ts, prediction, interpolation) | Also `BillionaireBonkClub/shootout` — the same app gains an MP code path |
| Multiplayer netcode (server side) | `JJ-ME55/SolShot` `arcade/shootout` branch (Checkpoint 1 already there) |
| The Arcade integration | This dir — just the route wrapper |

## When the standalone URL changes

Edit `SHOOTOUT_GAME_URL` in `ShootoutScreen.tsx`. Eventually this lifts to an
env var (`VITE_SHOOTOUT_URL`) for dev/prod separation.
