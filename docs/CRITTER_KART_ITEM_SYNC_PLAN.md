# Critter Kart — Server-authoritative item sync (implementation plan)

> **For Claude:** execute slice-by-slice. Each slice is independently committable + verifiable.
> **Author:** Fish's Claude, 2026-06-10 (picking up JJ's MP handover, Deferred #1 — full server-authoritative variant).

## Goal

Make items fully **server-authoritative** in multiplayer: boxes, pickup, held item, use,
projectiles, traps, storm, and hits all run in the server tick; clients render from server
state/events. This makes a human's items actually reach + affect other humans, and is
cheat-resistant for the wager build. **Solo mode stays byte-identical** (every client change
gated on `mp`/`multi` non-null).

## Why this is tractable

- Item boxes are **deterministic**: `ITEM_BOX_ROWS` (progress points) × `ITEM_BOX_LAT` (lane offsets) + the track path. Server computes identical positions with the same constants — no mesh dependency.
- The snapshot **already carries** `boostTimer/stunTimer/slowTimer/shield` → server-applied effects propagate to all clients for free.
- `sim/items.js` already ports `rollItem/rollCategoryItem/applyHit`. The use/projectile/trap/storm logic in `GameCanvas.useItem` (client) is deterministic and portable.

## Repos / branches (from the handover — #1 operational gotcha)

- **Server:** `JJ-ME55/SolShot` `main` → Render autoDeploy. Edit `server/services/games/critter-kart/sim/*` + `socket-io/critter-kart.js`.
- **Client:** `JJ-ME55/The-Arcade` `arcade/critter-kart` (dev) — **then mirror every changed file to `main`** (`git checkout main && git checkout arcade/critter-kart -- <file>`; full merge conflicts on this add/add history).
- Working in worktree `/c/tmp/ck-mp` (client) + `/c/Users/jacob/solshot` (server) to stay clear of the Shootout session.

## Wire-protocol additions (protocol.ts + server snapshot)

- `KartSnapshot`: add `heldItem: number` (ITEM enum / -1), `heldCount: number`.
- `RaceSnapshot`: add `boxes: { id:number; pickedUntilMs:number }[]` (or a bitmask of active boxes) and `projectiles: { id:number; kind:'acorn'|'bee'; x:number; z:number; y:number }[]` and `traps: { id:number; x:number; z:number }[]`.
- `ClientEvents`: add `'race:useItem': { raceId:string; kartId:string; seq?:number }` (intent only — server decides validity/target).
- Add any new server→client event to `proxyEvents` in `net/client.ts` (else the client never sees it — handover gotcha).

---

## Slice 1 — shared box layout server-side  *(server, low risk, no behaviour change)*

**Files:** `server/services/games/critter-kart/sim/items.js` (+ test), mirror constants from client `game/render/*`/`GameCanvas` where `ITEM_BOX_ROWS`/`ITEM_BOX_LAT`/`LANE_CATEGORY` live.

- Add `ITEM_BOX_ROWS`, `ITEM_BOX_LAT`, `LANE_CATEGORY` (copy exact client values) + `computeItemBoxes(track)` → `[{ id, x, z, category }]` using the same `pointAndPerp(prog)` math.
- **Verify:** unit test — box count = rows×3, positions finite; spot-check one matches the client formula. `node --check`.

## Slice 2 — server held-item + pickup + box respawn  *(server)*

**Files:** `sim/runner.js`.

- Kart state: add `heldItem` (-1), `heldCount` (0). Runner: build `this.boxes = computeItemBoxes(track)` + `this.boxRespawnAt = []`.
- New tick **Phase 2.5 (pickup):** for each non-finished kart with no held item, if within `itemPickupRadius` of an active box → roll via `rollCategoryItem(box.category, position, N, rand)` (position from current standings; deterministic RNG seeded per race), set `heldItem/heldCount` (acorn=triple), mark box picked until `now + itemBoxRespawn`.
- Snapshot: add `heldItem`, `heldCount` per kart + `boxes` active state.
- **Verify:** unit/integration test — a kart driven over a box gets a held item; box respawns. `node --check`.

## Slice 3 — server use + projectiles + traps + storm + hits  *(server, the meat)*

**Files:** `sim/runner.js` (+ port `useItem`/projectile-step/hit-detect from client `GameCanvas`), reuse `sim/items.js applyHit`.

- `useItem({ kartId })` (called by the socket `race:useItem` handler): port the client `useItem` switch — turbo→boostTimer, shield→flag, acorn/bee→spawn projectile (bee homing/target per standings), mud→trap behind, storm→slow all ahead (shield blocks). Decrement `heldCount`.
- Runner arrays `this.projectiles`, `this.traps`. New tick **Phase 2.6:** step projectiles (acorn arc, bee homing toward target), age traps, **hit detection** vs karts within `hitRadius` (skip owner + invuln + shielded→consume) → `applyHit` sets `stunTimer/slowTimer/invulnTimer`.
- Bots: server-side bot item use (port `botUseAt` cadence) so AI karts throw in MP too.
- Snapshot: add `projectiles`, `traps`.
- **Verify:** unit test — acorn hit sets victim `stunTimer`; shield consumes a hit; storm slows only those ahead. `node --check`.

## Slice 4 — socket wiring  *(server)*

**Files:** `server/socket-io/critter-kart.js`.

- Add `race:useItem` handler → `runner.useItem({ kartId })` (validate membership + kart ownership; add to `RL_EXEMPT_EVENTS`? No — use is low-frequency, keep rate-limited).
- Confirm snapshot broadcast already carries the new fields (it builds from runner).
- **Verify:** `node --check`; deploy to Render; watch logs.

## Slice 5 — client render-from-server, mp-gated  *(client, keep solo byte-identical)*

**Files:** `src/games/critter-kart/GameCanvas.tsx`, `net/protocol.ts`, `net/client.ts`, `game/multiplayer/context.tsx`.

- When `mp`: **skip** the local item sim entirely — pickup loop, `useItem`, projectile/trap update, storm, hit application (wrap each in `if (!mp)` or extend the existing `isRemoteHuman` gating to "all karts when mp"). Local player's *own* effects (boost/stun visual) come from snapshot like every other kart.
- When `mp`: render boxes' picked/active state, each kart's held-item HUD, projectiles, traps, and effect VFX **from the snapshot**.
- Player item-use input (the existing use button/key) → when `mp`, `mp.useItem()` (emit `race:useItem`) instead of calling local `useItem`.
- **Verify:** `npm run typecheck`. **Solo-purity check:** with `mp` null, every new branch is skipped — diff shows only additive `if (mp)` blocks. Play solo locally — identical.

## Slice 6 — branch sync + verify + hand to Fish

- Mirror every changed client file from `arcade/critter-kart` → `main` (per the handover's file-cherry-pick recipe). Commit both.
- Server: commit + push SolShot `main` (autoDeploys ~2min). **Verify bundle hash** in client console when testing.
- Hand Fish the 2-player test: see the other human's acorn/bee fly + actually get stunned; shield blocks; storm slows those ahead; held-item HUD matches; bots throw. Plus the still-pending reconnect drill (`9540c51f8`).

---

## Guards / risks

- **Live server:** SolShot `main` autoDeploys. Keep each server slice `node --check`-clean; the tick is wrapped in `_tickGuarded` (a throw aborts one race, not the process) but don't rely on it — validate.
- **Determinism / RNG:** server pickup roll needs a seeded RNG per race (don't use `Math.random()` raw if reproducibility matters; for casual it's fine, but seed for future replay/anti-cheat).
- **Solo purity is sacred** (handover prime directive): no client item behaviour may change when `mp` is null.
- **Two branches:** every client file lands on `arcade/critter-kart` AND `main`, or hub players run stale code.
