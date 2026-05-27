# Shootout — Session Handoff

**For:** a fresh Claude Code session in this worktree on branch `arcade/shootout`, intended to do **multiplayer / Render** work.
**Companion doc:** `HANDOFF_FOR_JJ.md` (Fish's brief from c83af19) — read that first for the game architecture.

---

## 1. Read these first

1. **`HANDOFF_FOR_JJ.md`** at repo root — Fish's brief covering the game itself: Three.js + Vite + Rapier3D + recast-navigation, full single-player vs bots, what's built, key files.
2. **This doc** — what's done since Fish's handoff + the Render plan + locked decisions.

## 2. What's done since Fish's handoff (c83af19)

- **Vercel project created**: `the-arcade-shootout` on JJ's team (`team_Qce0MaAG8nIOZHPNXaHrZIpQ`)
- **Linked to** `JJ-ME55/The-Arcade`
- **First production deploy** from `arcade/shootout` → **live at https://the-arcade-shootout.vercel.app** (200 OK)
- **Production branch set** to `arcade/shootout` — future pushes to this branch auto-deploy
- Build pipeline: Vite auto-detected, `vercel.json` controls (`buildCommand: npm run build`, `outputDirectory: visual/dist`) — clean

So the **single-player vs bots** version is live and playable. **Multiplayer is the open work.**

## 3. Render plan — what we're building

Fish suggested "Socket.IO on Render matching SolShot's pattern." We agreed on Socket.IO, but recommend a **separate Render service**, not extending SolShot's existing server.

### Why separate, not shared
SolShot's server (`JJ-ME55/SolShot/server/`) is **turn-based**: per-turn state push, ~60s shot clock, deterministic physics applied at turn boundaries. FPS netcode is **fundamentally different**:
- 20-60Hz tick rate (continuous, not turn-based)
- Lag compensation (server reconciles client-predicted positions with server truth)
- Client-side prediction (player feels responsive; server corrects when needed)
- Hit registration server-side (anti-cheat: client can't claim a hit it didn't make)
- Authoritative physics on the server (positions, hits, ammo, economy)

Sharing the SolShot process would mean one game's traffic spikes affect the other. Different evolution rates, different scaling needs. Keep them isolated.

### Architecture sketch
- **New repo**: `JJ-ME55/arcade-shootout-server` (not in this monorepo)
- **Stack**: Node + Socket.IO + Rapier3D (server-side authoritative physics, matches the client-side Rapier3D already in `package.json`)
- **Shared microservices with SolShot** (small HTTP APIs, NOT shared process):
  - Privy session validation
  - Leaderboard JWT issuance
  - (V3) escrow router integration when wagering arrives
- **Owns**: state model, tick loop, lag-comp, anti-cheat hooks
- **Deploys to**: Render as its own service

### V1 scope — multiplayer foundation (~3-5 weeks)
| Step | Effort |
|------|--------|
| Socket.IO server + room matchmaking (lobby, join, ready-up) | 3-5d |
| Server-authoritative state (positions, hits, ammo, economy) | 5-7d |
| Client network integration — drive `PlayerModel` from packets instead of `bot.js` | 3-5d |
| Lag comp + hit reconciliation | 5-7d (the hard part) |
| Anti-cheat hooks (server validates all shots/positions) | 3-5d |

Per Fish: "The soldier is already the universal avatar." Rendering remote players as soldiers is done. The work is the network layer + server-side state.

### V2+ (wagering, gated on V3 arcade economy)
- Privy auth integration — 2-3d
- Escrow router integration — 1-2w
- Pre-match buy-in collection + post-match settlement
- Anti-cheat hardening for real-money matches

## 4. Setup before doing anything

This is a Vite project. From this worktree root:
```powershell
npm install
npm run dev      # vite dev server, default localhost:5173
npm run build    # → visual/dist
```

You should be able to play single-player vs bots locally before touching multiplayer.

## 5. Locked decisions

- **Vercel project**: `the-arcade-shootout` on `JJ-ME55/The-Arcade` `arcade/shootout` branch. Don't rename/move.
- **Server: separate Render service**, not in this repo, not extending SolShot's server. See §3.
- **Stack on server**: Node + Socket.IO + Rapier3D server-side.
- **Wagering: V3 work**, not V1. V1 ships free multiplayer (no real money, no escrow).
- **Real-money intent (Fish's note)**: design *for* it from day one (server-authoritative, anti-cheat), but **don't build** the wager flow until V3 economy lands.
- **Game scope**: 1v1 and 2v2 per Fish.

## 6. The Arcade broader context

This branch sits on `JJ-ME55/The-Arcade` alongside:
- `main` — empty init commit, eventually arcade hub homepage
- `arcade/basketball` — Phaser + CRA, deployed
- `arcade/keepie-uppies` — Phaser + CRA, deployed
- `arcade/free-kicks` — Vite + Three.js, deployed
- `arcade/8-ball-pool` — Vite + Three.js (separate active Claude session doing Phase A)
- `arcade/website-design` — design proposal for hub homepage
- **`arcade/shootout`** — this branch

Each has its own Vercel project on JJ's team. SolShot artillery stays in the separate `JJ-ME55/SolShot` repo at www.solshot.gg.

## 7. JJ's working style (observed)

- **Terse answers up front, decisions and tradeoffs explicit.**
- **Ask before destructive operations** (force-push, delete branches, delete files, change repo).
- **"Just go for it" means skip the confirmation step.**
- **Wants WHY, not just WHAT.** Explain tradeoffs.
- **Skill-not-luck filter is non-negotiable.** Reject RNG-heavy mechanics.
- **Per-game Vercel projects, never shared domains.** (Cardinal rule.)

## 8. Open questions for Fish

The message JJ sent Fish:
1. **Are you sold on separate Render service**, or did you want shared?
2. **Server-authoritative physics** — Rapier3D server-side (full physics sim), or simpler hitscan-only validation with positions broadcast?
3. **Any anti-cheat constraints we should know about** for high-stake matches?

Wait for Fish's response on these before locking the architecture.

## 9. First action when this session opens

```powershell
cd <this-worktree>
npm install
npm run dev
```

Open http://localhost:5173 (or whatever Vite picks), verify single-player works. Then:
- Read `HANDOFF_FOR_JJ.md` carefully — especially the "Architecture notes for multiplayer" section
- Read `src/player-model.js` + `src/bot.js` — these are the templates for "remote player driver"
- Scope-confirm with JJ before starting on the new `arcade-shootout-server` repo

## 10. Coordination

- **Pool session**: separate active Claude Code session on `arcade/8-ball-pool` branch. Has its own working tree (and a SESSION_HANDOFF.md in `pool/`). Don't touch pool/.
- **This session**: shootout-only. Stay on `arcade/shootout` branch.

---

**Handoff context:** This doc was written by the Claude session that did the Vercel migration + initial scoping. That session is now closing; this session takes over Render/multiplayer work. The Vercel side is fully done — you don't need to touch it unless the production branch setting breaks (unlikely).

Built with JJ + Claude.
