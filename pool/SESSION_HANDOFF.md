# Pool — Session Handoff

**For:** a fresh Claude Code session starting from `C:\Users\johnk\The-Arcade-git\` on branch `arcade/8-ball-pool`.

**Status (2026-05-27):** mid-Phase A wk1 of `POOL_DESIGN_TARGET.md`. Toolchain upgrade done; mobile + touch + brand reskin still ahead.

---

## 1. Read these first (in order)

1. **`Docs/arcade/pool/POOL_DESIGN_TARGET.md`** — full gameplay spec, locked match-flow parameters, the 10 Miniclip antipatterns we explicitly reject, lessons. This is the canonical doc — every decision lives here.
2. **`Docs/arcade/pool/POOL_DESIGN_HANDOFF.md`** — design brief for when we get to screen mockups. Doesn't drive engineering yet, but read it for visual / brand context.

If you only have 60s, read POOL_DESIGN_TARGET.md §7 (locked match flow) + §8 (open decisions). That tells you the game we're building.

## 2. What's done

- Cloned `henshmi/Classic-8-Ball-Pool` (TypeScript remake, MIT) into `pool/` as Phase A foundation
- Upgraded toolchain: Webpack 4→5, TypeScript 3→5, ts-loader 5→9, added webpack-dev-server 5
- Restructured: static files moved from `dist/` to `public/`; `dist/` is now fully generated and gitignored
- npm scripts: `npm run build`, `build:dev`, `dev`, `clean`, `typecheck`
- `tsconfig.json`: target es2020, strict-off (deliberately), skipLibCheck, typeRoots restricted to local node_modules
- Verified build produces a 47.8 KB bundle.js with no env-flag workarounds needed

## 3. What's next — Phase A wk1 remaining

Per the design doc, in order:

1. **Mobile responsive canvas** (~half day, solo engineering)
   - Viewport-scaled, aspect-ratio lock
   - Test target: iOS Safari at 390×844 (smallest mainstream TG WebView size per `BALL_GAMES_PLAYBOOK`)
   - The current canvas is fixed-size in `src/canvas.ts` + `src/game.config.ts` (`gameSize` in IVector2). Needs a resize/scale strategy.

2. **Touch input** (~half-to-full day, solo engineering)
   - Drag-aim handlers (mobile pointer events)
   - Stale-pointer guard (per memory: "Touch input MUST have stale-tracking guard" — basketball stuck-bug)
   - Tap targets ≥44×44 px
   - Currently `src/input/mouse.ts` is mouse-only; needs touch-event integration

3. **Brand reskin** — BLOCKED on designer assets. See `Docs/arcade/pool/POOL_DESIGN_HANDOFF.md` for what's needed (wordmark, sprites, prestige badges, etc).

Phase A wk2+ (after wk1):
- Spin/English physics (~5 days, fully solo)
- Server-authoritative split for Phase B (~5 days)
- Async match state serialization (~3-5 days)

## 4. Setup before doing anything

```powershell
# From C:\Users\johnk\The-Arcade-git on branch arcade/8-ball-pool
cd pool
npm install          # not committed; first thing every fresh checkout needs
npm run dev          # webpack-dev-server on http://localhost:8765 with HMR
```

Verify in browser: hot-seat 1v1 + vs Computer (4 levels) should work as the TS-remake author shipped them. Don't change gameplay yet.

## 5. Locked design decisions (do NOT re-litigate)

These are in POOL_DESIGN_TARGET.md §7.3 and §8 already; quick reference:

- **Cues are cosmetic-only, never stat-affecting.** Miniclip's Legendary Payback is the canonical antipattern (OD-1 locked).
- **TS remake base, not the vanilla 2018 JS** (OD-3 locked — Referee class + State class + types justify it).
- **Pool lives in `pool/` subfolder on its own branch** (`arcade/8-ball-pool`) — own webpack/TS toolchain, no contact with anything else in The-Arcade.
- **Match flow (12 params locked):** 45s sync turn timer, 12h async window, 72h match wall-clock, pure-skip on timeout (no ball-in-hand), no calling pockets V1, 8-on-break re-rack, cue-ball-follows-8 is auto-loss, kitchen placement on break, deterministic seed rack, server-authoritative physics, skill-based matchmaking (Elo/win-rate — not Miniclip's coin-balance), canned-phrases chat only.
- **V1 modes:** web lobby (random match + invite-link 1v1) + vs Computer. No TG-only.
- **V3 economy lock:** no Tickets / shop / wagered tables / cosmetic gacha / pass progression before V3. V1 is solo + 1v1 with skill-gated cosmetic unlocks (prestige tiers Bronze→Diamond).

## 6. Open decisions to resolve mid-stream (with JJ)

- **OD-5** Brand name: "SolShot Pool" / "Hustle Hall" / something else. Defer until arcade brand is decided.
- **OD-6** Audio: license a small SFX pack (recommended) vs from scratch.
- **OD-7** Prestige unlock thresholds: placeholder table in POOL_DESIGN_HANDOFF.md §3.8 (10 wins for Bronze, 30+50% WR for Silver, etc.) — sanity-check with JJ before implementing.

## 7. The Arcade context — broader project state

You're in `JJ-ME55/The-Arcade`. This repo was just split out of `JJ-ME55/SolShot` (the original artillery game) to give arcade games a clean home. Other branches on this repo:

- `main` — empty init commit, eventually the arcade hub homepage
- `arcade/basketball` — solo-skill basketball (live at sol-shot-basketball.vercel.app)
- `arcade/keepie-uppies` — solo-skill football juggling (sol-shot-keepie-uppies.vercel.app)
- `arcade/free-kicks` — Vite + Three.js, solo-skill free kicks (solshot-free-kicks-iota.vercel.app)
- `arcade/website-design` — design proposal for the hub homepage (mostly inactive)

Each has its own Vercel project. SolShot artillery stays in the separate `JJ-ME55/SolShot` repo, deploys to www.solshot.gg.

**Important context for design decisions:**
- `Docs/arcade/pool/POOL_DESIGN_TARGET.md` references `../../internal/V3_ARCADE_ECONOMY_NORTH_STAR.md` — that file is in the SolShot repo, NOT this one. The reference link will be broken here. Get the V3 economy doc from `C:\Users\johnk\SolShot\Docs\internal\V3_ARCADE_ECONOMY_NORTH_STAR.md` if you need it.
- Memory file in `~/.claude/projects/...SolShot/memory/MEMORY.md` has rich project history if the user grants access.

## 8. JJ's working style (observed across the prior session)

- **Wants terse answers with decisions and tradeoffs up front, not walls of text.**
- **Wants to be asked before you do destructive things.** Push to remote, delete branches, force-push, delete files in his working tree → confirm first.
- **Will say "just go for it" when they're ready to skip the confirmation step.**
- **Doesn't want SolShot history in The-Arcade.** Per-branch orphan-squashes are how we kept it clean.
- **Wants to know WHY about technical choices, not just WHAT.** Explain tradeoffs.
- **Prefers per-game Vercel projects, never shared domains.** (Cardinal rule.)
- **Skill-not-luck filter is non-negotiable.** Reject RNG-heavy mechanics.

## 9. Known gotchas

- **Don't use `NODE_OPTIONS=--openssl-legacy-provider`** — it was needed for Webpack 4, no longer applies. Plain `npm run build` works.
- **Don't commit `dist/` or `node_modules/`** — both gitignored.
- **TG WebView is flaky** — audio fragile, service workers cause issues, need "Open in Safari ↗" escape hatch (relevant once we deploy).
- **`Standard.js` style — DON'T do** — pool uses class-based TS, the upstream pattern is OOP not procedural. Stay in that style.
- **Stale-pointer guard required on every drag handler** — known mobile gotcha that bit basketball for days. Don't skip.
- **`safeAudio` wrapper recommended around every play* export** — Web Audio fragile on mobile.

## 10. First action when this session opens

Run:

```powershell
cd C:\Users\johnk\The-Arcade-git\pool
npm install
npm run dev
```

Open http://localhost:8765 — verify game works. Then start on mobile-responsive canvas (item 1 in §3).

If anything's broken, the upstream code is intact at `C:\Users\johnk\SolShot-Arcade-Research\Classic-8-Ball-Pool\` for cross-reference.

---

**Session log this hands off from:** 2026-05-27, ~3h continuous work. Major events:
1. Cloned + audited henshmi/Classic-Pool-Game and TS remake; picked TS remake
2. Wrote POOL_DESIGN_TARGET.md and POOL_DESIGN_HANDOFF.md
3. Locked match-flow spec + 10 Miniclip antipatterns we reject
4. Upgraded toolchain Webpack 4→5 + TS 3→5
5. Migrated all arcade branches out of SolShot into The-Arcade (orphan-squash, no SolShot history)
6. Re-linked 3 Vercel projects (basketball / keepies / free-kicks) to The-Arcade
7. Pruned obvious SolShot dead weight from basketball/keepies/website-design branches
8. Triggered fresh production deploys, all 3 live URLs returning 200

The pool branch is where it should be. Toolchain is modern. Design is locked enough to start building. Pick up at mobile responsive canvas + touch input.
