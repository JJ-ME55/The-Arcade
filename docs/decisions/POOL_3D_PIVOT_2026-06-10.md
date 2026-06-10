# Decision: Full 3D (Three.js) skin for Side Pocket pool — built as a duplicate

**Date:** 2026-06-10
**Decider:** JJ
**Status:** Adopted — parallel build on branch `pool-3d`

## Context

JJ saw a viral "Claude Fable one-shotted a Miniclip-grade pool game" demo
(`The-Arcade/8ball/` — contact sheets + clip). On inspection it is a curated
~63-second **Three.js nine-ball** prototype: cinematic 3D arena, multiple
cameras, spin/power UI, foul → ball-in-hand. Visually premium; mechanically
**thinner** than what we already have (nine-ball = "hit lowest ball first",
one rule; one curated table; desktop capture; no server authority, no wager
integration).

Our weeks of work built the hard, invisible half — the "truth engine":

- Two-regime physics (Han 2005 sliding/rolling), tuned
- Real pocket-mouth geometry (jaw bounces, rattles), not radial
- **Full 8-ball** rules: groups, open table, legal/illegal hits, fouls,
  ball-in-hand, win/loss on the black
- Server-authoritative sim with client/server parity (wagering needs this)
- Aim tangent, spin, shot clock, live HUD bridge

The demo did the *opposite* half (the 3D skin) and skipped the engine. Per the
build order even that demo's own teardown recommends — *2D physics/rules core
first, then skin in 3D* — we already did Phases 1–2. The 3D presentation is
**additive**.

## Decision

Commit to a **full 3D Three.js presentation** for pool, built as a
**duplicate / parallel line** so the shipped 2D game stays untouched and
deployable. The 2D game on `main` (`/play/pool/launch`, `pool/`,
`public/games/pool/`) is the fallback and is not modified by this work.

## Why this is feasible without throwing work away

The architecture already separates sim from render. `pool/src/sim/world.ts`
operates on plain `SerializableBall { id, color, position:{x,y}, velocity,
spinX, spinY, visible }`. The Canvas2D renderer only *draws* those. A Three.js
renderer consumes the **same** sim output — map sim `(x, y)` → world
`(x, ballRadius, y)` on a plane, spin the ball mesh by distance/radius. **Zero
physics or rules are rebuilt.**

## Non-negotiable: shared truth, no engine fork

The sim + rules are the single source of truth and must stay shared:
- Physics: `pool/src/sim/world.ts` (two-regime, pocket mouths)
- Rules/turn flow: `pool/src/game-objects/game-world.ts`
- Spin: `pool/src/physics/spin.ts`

The 3D build swaps **only** the render layer (Canvas2D → Three.js) + entry. If
isolation forces a physical copy, every physics/rule fix must be mirrored to
both — prefer importing the one engine over copying it.

## Primary risk: mobile / Telegram WebView performance

The arcade ships through Telegram's WebView. A 2D canvas is mobile-perfect; a
3D WebGL arena in a TG webview on mid-range Android is **unproven**. Validate
perf on a real phone **early**, before deep polish. (Miniclip — our original
target — is itself 2D top-down; this 3D direction is a deliberate step toward a
more premium Pure-Pool / broadcast aesthetic, beyond the Miniclip target.)

## Phased plan

1. **Scaffold** — Three.js scene reading our real sim: table plane, 16 ball
   spheres at sim x/y, cue mesh, render loop. (this branch, in progress)
2. **Motion + geometry** — ball rolling (rotation from velocity/radius),
   cushion + pocket meshes, lighting, arena shell.
3. **Cameras** — aim / top-down / follow-ball / cinematic-pot modes.
4. **HUD** — port the live HUD bridge, shot clock, spin widget, aim guide to
   the 3D view (the postMessage bridge already exists).
5. **Mobile/TG perf pass** — measure + optimise on a real phone.
6. **Assets** — table/arena/cue via a 3D-gen pipeline (Tripo-style) if needed.

## How to compare against 2D

This branch gets a Vercel preview deploy; A/B the preview's pool route against
production `/play/pool/launch` (2D). No production risk.
