# Shootout — handoff to JJ

A browser **first-person shooter** for The Arcade, built by Fish. Pushed to
`arcade/shootout` on `JJ-ME55/The-Arcade`. This branch is the **complete
standalone game** (its own tree/history) — ready for you to wire multiplayer
and fold into the hub.

## ⚠️ Different stack from the ball games
This is **Three.js + Vite (vanilla JS)**, not Phaser/React. It's a full 3D FPS
(closer in scope to SolShot than to Basketball/Keepie-Uppies), so it doesn't drop
in as a `src/games/<slug>/` Phaser scene — it's a self-contained app you'll
integrate however suits the hub (iframe/route/subdomain — your call).

## Run it
```bash
npm install
npm run dev      # vite dev server
npm run build    # -> visual/dist  (static client)
```
`vercel.json` is already set up (`buildCommand: vite build`, `outputDirectory: visual/dist`).
Currently deployed standalone at **https://fps-staking-game.vercel.app**.

## What's built (single-player vs bots — fully playable)
- **Landing menu** (`visual/index.html`): SHOOTOUT title, Play vs Bots (choose 1–3
  bots), Multiplayer button (placeholder), 5-round match.
- **Match loop**: CS-style buy phase (10s, countdown + beeps + "Round N" VO),
  LIVE, round end, **best-of-5**; economy ($2000 start, earn from hits/kills),
  buy menu (rifles/SMG/shotgun/sniper).
- **Bots**: navmesh roaming (recast-navigation), line-of-sight perception, aim +
  fire with human-like accuracy; **red vs blue teams**.
- **Weapons**: AK (auto), M4A1 (burst), SMG (auto), shotgun (pellet spread, pump),
  sniper (4× scope). Real gun/VO audio in `visual/public/sounds/`.
- **Combat**: hitscan + hitboxes (head/chest/limbs), blood, death collapse,
  damage/armor model in `src/engine/`.

## Architecture notes for multiplayer (the part for you)
- **The soldier is already the universal avatar.** Opponents are `PlayerModel`
  soldier instances driven by external state (position, yaw, velocity, shooting) —
  see `src/player-model.js` + how bots drive them in `src/bot.js` /
  `visual/main.js`. A remote player is the *same thing* driven by network packets
  instead of bot AI. So the rendering side of "see each other as soldiers" is done.
- **Local player** is currently just a camera (no networked body) — it'll need to
  broadcast its transform/anim/shots so others render it as a red soldier. FP arms
  are already tinted to the player's team.
- **Server-authoritative** is the intent (real-money): the game is structured so a
  server can own positions/hits. Match/round/economy logic lives in `visual/main.js`
  (`_updateMatch`, `_startBuy`, `_endRound`, etc.).
- Suggested transport: Socket.IO (matches your SolShot server) on Render.
- Modes Fish wants: **1v1 and 2v2** with real players.

## Key files
| Path | What |
|---|---|
| `visual/index.html` | landing menu + boot |
| `visual/main.js` | game orchestrator: match phases, combat, economy, input, audio wiring |
| `src/player-model.js` | third-person soldier (universal avatar) + animation |
| `src/bot.js` | bot AI (roam/perceive/engage) — the template for "remote player driver" |
| `src/navmesh.js` | recast navmesh bake + pathfinding |
| `src/first-person-weapon.js` | FP arms + weapons |
| `src/engine/*.ts` | weapons, combat, hitboxes, damage, recoil |
| `src/audio.js` | SFX + VO (sample playback + synth fallback) |
| `vercel.json` | static build config |

Ping Fish with anything. — built with Fish + Claude
