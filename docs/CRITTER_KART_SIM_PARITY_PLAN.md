# Critter Kart — Server-Sim Parity Plan ("Option A")

> **For Claude:** execute phase-by-phase. Each phase is independently committable, verified with
> node behavioral tests (no test framework on SolShot — use one-off `.mjs` scripts like the
> item-sync build did). **Decision (Fish, 2026-06-10): full server-authoritative — the
> wagering-grade path.**

## Why (the diagnosis this plan fixes)

Live evidence (Render logs + `/debug/races` + `/debug/errors`, 2026-06-10):

- The MP design is server-authoritative: server simulates the "true" race at 60Hz, clients render
  remote karts from snapshots. **But the server sim is a HALF-port** — it has kart physics, lap
  tracking, kart-kart collisions, and (new) items, but is MISSING: barriers/walls, the water-gap
  jump + respawn, bridges/upper-deck (Y + boost pads), the train hazard, rocket start, and the
  good rail-bot AI (it has a weak physics-steering bot that bunches at the start and never laps).
- Consequence: each human's **server kart diverges** from their locally-rendered kart the moment
  the track features matter — definitively at the **water jump (progress 0.19–0.21)**, which
  matches "breaks at the same time each race." The diverged server kart misses item boxes
  (balloons don't pop — server checks ITS positions), and is what other players see ("kart
  driving off the map backwards"). The 0-fault `/debug/errors` confirms: no crash, pure divergence.
- Separately: mid-race socket drops (`transport close`) fail to recover → after grace, the WEAK
  bot AI takes the kart over and drives it into the void. Both JJ (2 devices, pre-handover) and
  Fish hit this. **Disconnect resilience is in scope.**

## Repos / branches

- **Server (most of the work):** `JJ-ME55/SolShot` `main` (auto-deploys to Render `solshot.onrender.com`)
  — `server/services/games/critter-kart/sim/*`, `server/socket-io/critter-kart.js`.
- **Client (gating + small bits):** `JJ-ME55/The-Arcade` `arcade/critter-kart` (worktree `/c/tmp/ck-mp`)
  — preview `the-arcade-critter-kart.vercel.app`; **sync changed files to `main` after verification**
  (cherry-pick files, not merge — add/add history).
- Verify bundle hash on every client test (cache!). Debug endpoints live:
  `/api/games/critter-kart/debug/lobbies|races|errors` (remove before real launch).

## Port-fidelity rules

1. **Byte-faithful ports.** Copy the client logic (TS → JS) with minimal edits; same constants, same
   per-frame ORDER of operations as GameCanvas (step → barriers → zones → hazards → items), so
   trajectories match. Never invent values.
2. **The client is the reference.** Client sources: `game/logic/barrier.ts` (pure:
   `buildBarriers(track, offset, spacing)`, `resolveBarriers(state, barriers, kartRadius, tuning)`),
   GameCanvas blocks: barriers applied ~line 865 (+ extra upper-deck wall barriers ~167 and bridge-edge
   barriers ~183 built at scene setup); jumpZone launch/air/landing/water-respawn + `lastSafe`
   tracking ~948–1010; arch/flat-bridge + upperDeckZone Y/boost handling (same region); train
   pieces between progress 0.395↔0.769 on a dedicated trainPath, flatten block ~1289; RAIL BOTS
   block ~1023 (vars ~423, `BOT_LINES = [-4,1,6,10,13]` ~531); draft + rocket start in the player
   substep (search `TUNING.draftRange`, `rocketWindow`).
3. **Hazard clock = the race anchor.** Server hazards (train) must compute from the SAME wall-clock
   anchor clients use (`lockedStartAtMs`, persisted on the race doc) — not `runner.startedAt` — so
   the train is in the same place for everyone incl. the server.
4. **Solo purity still sacred** on the client: any client change stays inside `mp` gates.

## Phases

### Phase 1 — Track furniture: barriers + water jump/respawn + bridges + boost pads
- Port `barrier.ts` → `sim/barrier.js`; build barriers in RaceRunner ctor (incl. the upper-deck-side
  and bridge-edge extras GameCanvas adds); apply `resolveBarriers` per kart right after `stepKart`
  (same order as client).
- Port jumpZone: ramp launch (`vy = jumpLaunch` at ramp crossing with `jumpMinSpeed`), gravity,
  airborne y/vy (snapshot already carries y/vy), landing; water landing → respawn at `lastSafe`
  (track it per kart like client line ~962) with `respawnSpeedKeep`.
- Port archBridgeZone (parabolic y), bridgeZone (deck at road height), upperDeckZone (side-commit,
  ramp y profile, boost strip applies `boostTimer`).
- **Verify (node script):** scripted kart driven at the wall STOPS (no off-road escape); kart into
  the water gap respawns at lastSafe; kart over the upper deck gains boost; a full scripted lap's
  server trace stays within road+verge the whole way.

### Phase 2 — Train hazard, server-side
- Build the train path/pieces deterministically in the runner (same constants: crossings 0.395 /
  0.769, TRAIN_PERIOD/PHASE/CAR_OFFSET from GameCanvas); positions from the lockedStartAtMs-anchored
  clock (rule 3).
- Flatten ANY human kart on contact (~6.5u radius, invuln respected): speed → 0 + brief flatten
  timer; add `flattenTimer` to the snapshot so clients can render the squash for remote karts.
- Client: gate the local flatten block to solo (`!mp`) so the server owns it in MP (visual stays).
- **Verify:** scripted kart parked on the crossing at train-arrival time gets flattened; timing
  matches a client-side computation of the train position for the same anchor.

### Phase 3 — Rail-bot AI port (the good bots) + AI-takeover uses it
- Port the RAIL BOTS kinematic model to `sim/railBots.js`: per-bot continuous progress + lateral
  line (`BOT_LINES`), eased catchup rubber-band with dead-zone, jockey oscillation, boost surge,
  train-wait, spline-following x/z/heading/y. Replace `botInput()` physics-steering for bots.
- **MP adaptation (playtest knob, not invented):** the client pins bot pace to THE player; server
  pins to the **leading human's** progress/speed (same catchup constants). Flag for tuning.
- **AI takeover** (disconnect) converts the kart to a RAIL bot → a dropped player's kart keeps
  racing sanely instead of driving into the void.
- **Verify:** all-bot race completes 3 laps in a sane time (~4–6 min); no bot ever >2×halfWidth
  off-road; with a scripted "human" mid-pack, bots stay neck-and-neck (rubber-band working).

### Phase 4 — Fairness extras
- Rocket start: server detects throttle-held-in-window during countdown from real inputs → applies
  `rocketBoost` at GO (client already does it locally for feel; server makes it count).
- Slipstream/draft: port the draft check (range/cone/mult/accel) into the per-kart step if it lives
  in GameCanvas (it does — search `draftRange`); applies to all karts incl. bots.
- Spin recovery facing forward (`stunHeading`) — confirm `kartPhysics.js` port already matches.
- **Verify:** node script — trailing kart in the leader's cone exceeds solo top speed; rocket-start
  input pattern yields boost at GO.

### Phase 5 — Disconnect resilience (the other half of the bug)
- Client diag (`329c872`) now logs disconnect reason + reconnect lifecycle — read results from the
  next live test to see WHY sockets drop; fix what it reveals (e.g. ping config, tab visibility).
- `convertKartToHuman(kartId)`: returning player (joinRace after takeover) regains control —
  reverse of convertKartToBot; rebind socketId; reject bot-kart input only while actually bot-driven.
- Keep 60s grace (shipped `4cf1737`). Auto-rejoin already re-emits joinRace + replays the anchor.
- **Verify:** kill a client's socket mid-race (dev tools offline), reconnect within grace → control
  regained, no AI takeover; after takeover → rejoin regains control.

### Phase 6 — Client cleanup + branch sync + live 2-player verification
- Client: remove/gate any remaining local hazard application in MP that the server now owns; keep
  visuals. Confirm solo unchanged.
- Sync all changed client files `arcade/critter-kart` → `main` (file cherry-pick per handover).
- Live test protocol: bundle-hash check → 2 humans full 3-lap race → balloons pop every row, items
  hit, train flattens fairly, bots competitive, no off-map ghosts; reconnect drill; then strip
  VERBOSE logs + debug endpoints (or gate behind an env flag) before promoting.

## Explicitly OUT of scope (follow-ups)
- Client-side prediction/reconciliation for the local kart (`ackSeq` already in snapshot) — needed
  for wager-grade trust of the LOCAL player's view; design doc exists (handover Deferred #2).
- Lobby character-pick UI (handover Deferred #4).
- Map 2 (Coconut Cove) in MP — port `coconutCove` def + theme to the server sim AFTER parity
  (the registry/theme work makes this mostly data).
- Wagering itself (Playbook §D) — this plan is its prerequisite.
