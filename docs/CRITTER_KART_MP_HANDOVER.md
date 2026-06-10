# Critter Kart Multiplayer — Handover (JJ-Claude → Fish-Claude)

**Date:** 2026-06-10
**From:** JJ's Claude session (multiplayer build-out, ~June 4–10)
**To:** Fish + Fish's Claude — picking this up while JJ is on other commitments
**State:** Multiplayer works. Two humans + 4 bots race in sync with smooth motion. A handful of polish items remain to make it feel fully NFS-grade. Everything known is documented below — fixed bugs, live gotchas, deferred work, and how to test.

---

## 1. TL;DR — where it stands

As of the last test (race `5imikBtO35Y`, 2026-06-10): two clients raced **~90 seconds in lockstep** — same countdown instant, same race clock, smooth interpolated remote karts, no phantom item throws, server simulating all 6 karts at 60 Hz. The session ended when the idle Mac's Safari suspended its page (App Nap) and killed the websocket; the auto-rejoin fix for exactly that shipped right after (`9540c51f8`) and is **untested** — it's the first thing to verify.

**Prime directive (unchanged):** Fish's solo gameplay must remain byte-identical when multiplayer is off. Every MP change is gated on `multi`/`mp` being non-null. If `useMultiplayer()` returns null, the game must behave exactly as Fish wrote it.

---

## 2. Architecture (server-authoritative)

```
┌─────────────────────┐         socket.io          ┌──────────────────────┐
│ The-Arcade client    │ ──── race:input (per rAF) ─▶ SolShot server       │
│ (Vercel, Vite/React/ │                            │ (Render, Express)    │
│  Three.js)           │ ◀─── race:snapshot (30Hz) ─ │                      │
│                      │ ◀─ race:countdownLocked ── │ RaceRunner: 60Hz sim │
│ GameCanvas renders:  │                            │ - kartPhysics step   │
│ - own kart: LOCAL    │                            │ - collisions         │
│   physics (snappy)   │                            │ - lap/finish detect  │
│ - remote karts:      │                            │ - bot AI (4 slots)   │
│   INTERPOLATED from  │                            │ Mongo: race lifecycle│
│   snapshot buffer    │                            │ state machine        │
└─────────────────────┘                            └──────────────────────┘
```

- **Server sim:** `server/services/games/critter-kart/sim/runner.js` — 60 Hz physics (`PHYSICS_HZ`), 30 Hz snapshots (`SNAPSHOT_HZ`), 5-min hard timeout. Physics/tuning/AI are a port of Fish's client modules (sim/*.js mirrors the client's game logic).
- **Client:** own kart runs Fish's local physics (no rubber-banding); every non-self slot is overwritten per rAF tick from interpolated snapshots. Bots are server-driven too (the local rail-bot loop is fully skipped when `mp` is non-null — see the `!mp` guard around the rail-bot block in GameCanvas, ~line 992).
- **Race lifecycle (Mongo state machine):** `matched → loading → countdown → racing → finished → settled` (+ `cancelled`). Only `lifecycle.js` writes race docs.

### Race-start synchronization (the part that took 4 attempts — don't regress it)

1. Host taps Start → server creates race → `race:start` carries a **provisional** `startAtMs` (clients must NOT use it — see fix log #5/#9).
2. Each client finishes loading assets → emits `critterkart:ready`.
3. All humans ready (or 15 s fallback) → server runs `runCountdownAndRace`:
   - locks `lockedStartAtMs = Date.now() + 3000`,
   - **persists it on the race doc**,
   - broadcasts `race:countdownLocked { startAtMs }`.
4. Clients anchor `elapsed = (Date.now() - lockedStartAtMs) / 1000`. **No fallback** — if the lock hasn't arrived, the client holds at countdown.
5. Any socket that joins/rejoins later gets the lock **replayed** inside the `critterkart:joinRace` handler (reads `race.lockedStartAtMs`).

This gives every client the same wall-clock zero regardless of load times, refreshes, or reconnects.

---

## 3. Repos, branches, deploys — ⚠️ the #1 operational gotcha

| What | Repo / branch | Deploys to | Notes |
|---|---|---|---|
| Game client (dev) | `JJ-ME55/The-Arcade` → **`arcade/critter-kart`** | `the-arcade-critter-kart.vercel.app` | **This is what the bot's `/critterkart` button opens.** Active dev branch. |
| Arcade hub | `JJ-ME55/The-Arcade` → **`main`** | `thearcade.gg` | Carries a copy of the game. **Must be kept in sync manually.** |
| Server | `JJ-ME55/SolShot` → **`main`** | `solshot.onrender.com` (Render, autoDeploy) | All socket handlers + sim + Mongo models. |

**War story:** between June 4 and June 10, all client fixes went to `arcade/critter-kart` while `main` kept the June 4 snapshot. Anyone testing via the hub was running month-old code while commit messages claimed fixes were live. The branches were reconciled on 2026-06-10 (`a0f5d5045` + `636e11439` on main). **Every client change must land on BOTH branches** (commit on `arcade/critter-kart`, then `git checkout main && git checkout arcade/critter-kart -- src/games/critter-kart/<file>` and commit — the add/add history means full merges conflict).

**Always verify the bundle hash when testing.** The console's first lines show `index-XXXXXXXX.js`. If it matches the previous test's hash, you're on cached/stale code — hard refresh (`Ctrl/Cmd+Shift+R`). Several "the fix didn't work" reports were stale bundles.

---

## 4. File map

### Server (SolShot)

| File | What it is |
|---|---|
| `server/socket-io/critter-kart.js` | ALL socket handlers (~1300 lines): lobby:*, match:*, critterkart:joinRace/ready/leaveRace, race:input, `runCountdownAndRace`, reconnect grace, RaceRunner wiring. |
| `server/services/games/critter-kart/sim/runner.js` | RaceRunner — 60 Hz tick, input apply, collisions, laps, snapshots, finish ranking. |
| `server/services/games/critter-kart/sim/*.js` | Ports of Fish's physics: tuning, kartPhysics, steering, trackPath, lap, standings, collision, ai, sunnyMeadow. |
| `server/services/games/critter-kart/lifecycle.js` | Race state machine: createRace (assigns `kart-N` + racerId per slot), beginCountdown/Racing, finish/settle/cancel, registerReady. `ROSTER_RACER_IDS` = all 6 chars. |
| `server/services/games/critter-kart/lobbyService.js` | Lobby CRUD + wire shapes. `toLobbyStateWire` must emit `racerId` (mirrors lifecycle's roster). |
| `server/services/games/critter-kart/matchmaking.js` | Quick-race queue → createRace with bot fill. |
| `server/models/CritterKartRace.js` | Race doc. Note `lockedStartAtMs` field (anchor replay). |
| `server/models/CritterKartLobby.js`, `CritterKartQueue.js`, `CritterKartCareer.js` | Lobby / queue / career aggregates. |

### Client (The-Arcade, `src/games/critter-kart/`)

| File | What it is |
|---|---|
| `GameCanvas.tsx` | Fish's Three.js game (~1450 lines). MP integration: input send + snapshot apply (~line 723), elapsed anchor (~line 678), `botPersonaForSlot` (~line 133), `isRemoteHuman` item gate (~line 1145), ready signal in the loadingManager callback (~line 246). |
| `net/client.ts` | THE socket wrapper (singleton `getNetClient()`). Snapshot ring buffer + `getInterpolatedKart` (bracket lerp), `getRaceStartAtMs`, auto-rejoin-on-reconnect, proxy event list. **If you add a server event, add it to `proxyEvents` or the client never sees it.** |
| `net/protocol.ts` | Wire types. `Member.telegramUserId` is the self-identification key. |
| `net/identity.ts` | JWT → identity (telegramUserId, sessionJwt) from the `?session=` param. |
| `game/multiplayer/context.tsx` | `MultiplayerProvider` + `useMultiplayerSync` — the narrow API GameCanvas consumes (`applyToSlot`, `sendInput`, `signalReady`, `getStartAtMs`, `members`, `selfSlot`). |
| `MultiplayerLayer.tsx`, `App.tsx`, `ui/multiplayer/screens.tsx` | Lobby UI, race join flow, provider wiring. `App.tsx` emits `critterkart:joinRace`. |
| `*.fallback` files | Frozen pre-V2 snapshots kept as safety nets. Not imported; ignore unless rolling back. |

---

## 5. Fixed-bug ledger (do not re-break these)

Chronological. Each was found in live 2-player testing; commit refs are on `arcade/critter-kart` (client) / SolShot `main` (server).

| # | Symptom | Root cause | Fix | Commit |
|---|---|---|---|---|
| 1 | Joiner's client crashed mid-race (`undefined reading 'useDelay'`) | `BOT_PERSONAS[i-1]` → index −1 when PLAYER=1 (joiner occupies slot 1, slot 0 is a remote human) | `botPersonaForSlot(i) = i < PLAYER ? i : i-1` maps non-player slots onto 5 personas | `e5f54253a` |
| 2 | "Two Shellys / two Rustys" in 6-kart races | Server only cycled 4 racerIds across 6 slots | `ROSTER_RACER_IDS` = all 6 (`jj`/`fish` included — their `playerOnly` flag only gates the solo picker UI, not runtime rendering) | `9002bb9` (SolShot) |
| 3 | Lobby preview showed wrong/duplicate characters | `toLobbyStateWire` didn't emit `racerId`; SlotCard fell back to RACERS[0] | Wire emits preview racerId, mirroring lifecycle's roster | `d31d736` (SolShot) |
| 4 | Countdown desynced between clients | `elapsed` accumulated from local rAF mount time | Anchor `elapsed` to server wall-clock in MP | `b72da7754` |
| 5 | Still desynced — "they run their own race times" | `startAtMs` was locked at lobby-start, before clients loaded (stale by seconds) | All-clients-ready handshake: `critterkart:ready` per client → server locks + broadcasts `race:countdownLocked` | `a10448a6c` + `18098d3` |
| 6 | Shelly's screen showed Shelly throwing an acorn she never threw | Each client ran item pickup + use AI for EVERY non-self slot, including remote humans | `isRemoteHuman(i)` gate on both item loops; bots stay locally AI-driven | `c5f06fbc2` |
| 7 | Bots froze ~8 s into the race; server logged `race driver failed` then `race cancelled` | The 15 s lobby:start fallback re-fired `runCountdownAndRace` mid-race; its `beginCountdown` threw "not in countdown-eligible state"; the catch ran `cancelRace` on the LIVE race | Inner catch detects the idempotency error → no-op return. Also fixed pino arg order (object-first) which had been hiding `err.message` | `cbfee56` (SolShot) |
| 8 | "Jumpy / not clean" remote karts despite healthy server | Interp kept only 2 snapshots; with a 100 ms render delay, `renderTime` predated the older snapshot → `t` clamped to 0 → discrete 33 ms steps, no lerp at all | 1-second snapshot ring buffer + bracket search (proper Glenn Fiedler): find the pair straddling `renderTime`, lerp; extrapolate ≤1.5× past newest | `d40e43c45` |
| 9 | "Rusty started way before Shelly" again | `race:countdownLocked` broadcast is fire-and-forget; a socket joining the room after it misses the lock and fell back to the provisional anchor | Server persists `lockedStartAtMs` on the race doc + replays it in `joinRace`; client dropped ALL fallbacks (locked-anchor-only, holds at countdown otherwise) | `189e224` (SolShot) + `e8a84bcc4` |
| 10 | Mid-race one client dies (`transport close`) and never recovers | Safari App Nap suspends the idle window ~2 min → WS killed. socket.io reconnects the transport, but **rooms are per-connection** — nothing re-emitted `joinRace`, so no snapshots ever resumed | NetClient remembers the last `critterkart:joinRace` payload, re-emits on reconnect, clears on race final. Pairs with #9's server replay for instant re-anchor. **UNTESTED — verify first.** | `9540c51f8` |

---

## 6. Live gotchas & conventions

- **Pino logger: object FIRST, message second.** `logger.info({ raceId }, 'msg')`. The other order silently drops your fields — this cost us a day on bug #7.
- **socket.io rooms are per-connection.** Any reconnect = new socket.id, zero rooms. Anything room-scoped must be re-established (that's why auto-rejoin exists). If you add new room-scoped state, make `joinRace` replay it.
- **`proxyEvents` allowlist in `net/client.ts`.** New server→client events MUST be added there or the client silently never receives them (bug class we hit twice pre-handover).
- **Input path:** GameCanvas calls `mp.sendInput` every rAF frame; the singleton NetClient emits immediately (no client throttle); server buffers latest-per-kart and applies at the next 60 Hz tick; stale `seq` rejected. The 30 Hz "down-sample" comment in GameCanvas is aspirational, not actual.
- **Reconnect grace = 30 s** (`RECONNECT_GRACE_MS`, socket-io/critter-kart.js). On expiry: **AI takeover** if the runner is alive (kart keeps racing as a bot — cheat-resistant for future wagers), DNF fallback if the race/runner is gone. After takeover the human cannot regain control (`applyInput` rejects bot karts) — see Deferred #3.
- **Bots are simulated independently on each client for ITEMS only** (pickups/throws) — positions come from server snapshots. Item state is per-client visual flavor; only remote-human item AI is suppressed. Fine for casual; will need rework when items become competitive (Deferred #1).
- **Telegram bot:** `/critterkart` on `@TheArcadeGG_Bot` mints the JWT launch link (`server/services/arcadeBot.js`, GAMES registry — note the "TEMPORARY: point at preview" comment if you change deploy targets).
- **Safari App Nap will kill any idle test window in ~2 min.** Keep both windows visible and machines awake during 2-player tests. This is environmental, not a bug — but it's why auto-rejoin matters.
- **VERBOSE logging** (`[VERBOSE race:input] heartbeat`, snapshot heartbeats, joinRace traces) is everywhere in `socket-io/critter-kart.js` from this debugging stretch. Invaluable now; strip or gate behind an env flag before any real launch (Render log volume + noise).
- **Solo-mode purity check:** after any GameCanvas edit, confirm every new behavior is inside `if (mp)` / `if (multi)` / `isRemoteHuman` guards. `npm run typecheck` in The-Arcade root is the fast sanity gate (a pre-existing `src/main.tsx` Sentry typing error on main is known and unrelated).

---

## 7. Deferred work — your runway, roughly in value order

1. **Item sync between humans** (the biggest visible gap). Today, if Shelly throws an acorn, Rusty never sees it (and it can't hit him — each client's projectiles are local). Sketch: client emits `item:use { raceId, kartId, kind, targetKartId? }` → server validates (does that kart hold that item? — requires moving item *state* server-side, or trust-for-casual) → broadcast → peers spawn the projectile VFX locally. Decide early whether items affect server physics (stun/slow timers already exist in `KartSnap`) or stay cosmetic-per-client until the wager build. Snapshot already carries `stunTimer`/`slowTimer`/`boostTimer`/`shield`, so server-applied effects will propagate for free.
2. **Client-side prediction + reconciliation for own kart.** Currently own-kart is pure local physics; server runs a parallel sim of the same kart from inputs. Fine for casual; for wagered play the server's positions must be authoritative for the LOCAL kart too (`ackSeq` is already in the snapshot for replaying unacked inputs). Big job — design doc: `docs/CRITTER_KART_MULTIPLAYER_DESIGN.md`.
3. **Regain control after AI takeover.** Player back after >30 s currently spectates their own bot. Needs `runner.convertKartToHuman(kartId)` + a joinRace hook. Small, high goodwill.
4. **Lobby character pick UI.** Server assigns racerIds by slot; players can't choose. `CharacterSelect` exists for solo — wire a pick into lobby state (`racerId` already flows through the wire).
5. **Log hygiene + minor warnings:** strip VERBOSE logs; fix the duplicate Mongoose index warnings (`CritterKartQueue.joinedAt`, `CritterKartLobby.lastActiveAt`); `ERR_ERL_KEY_GEN_IPV6` from express-rate-limit at boot (`server/index.js:581` — needs a proper IPv6-safe keyGenerator); missing `favicon.svg` 404 on the Vercel deploy.
6. **Snapshot tick jitter** (only if smoothness regresses): `setInterval` at 60 Hz drifts under load; a self-correcting loop (compute next-tick target, `setTimeout(target - now)`) tightens it. Not currently needed — interpolation absorbs observed jitter.

---

## 8. Testing playbook (2-player)

1. Two Telegram identities → `@TheArcadeGG_Bot` → `/critterkart` → launch on two browsers/machines.
2. **Verify bundle hash** in each console differs from the last test (cache!).
3. Lobby: create on A → join request from B → A accepts → both Ready → A starts.
4. The one number that proves sync: both consoles must print the SAME value in
   `[critter-kart/diag] race:countdownLocked → startAtMs <N>`.
5. Expected console sequence per client: `FIRST FRAME — mp is: {...}` → `emitted critterkart:ready` → `race:countdownLocked → startAtMs` → `FIRST SNAPSHOT received` → `FIRST APPLY slot N` (one per non-self slot).
6. Render logs to watch (live tail in Render dashboard): `[VERBOSE lobby:start] awaiting critterkart:ready`, `[VERBOSE countdown] locked startAtMs broadcast`, snapshot heartbeats every ~1.6 s (`tick` +100, `kartsInSnap:6`, `roomSize:2`), input heartbeats per kart.
7. **Reconnect drill (first thing to test — validates `9540c51f8`):** mid-race, leave one window idle until its kart freezes (~2 min, Safari) or kill/restore wifi. On waking: console shows `socket reconnected → auto re-joined race`, Render shows `[VERBOSE joinRace] replayed lockedStartAtMs to late joiner`, and the world snaps back live. Within 30 s = kart saved; beyond = AI takeover.
8. When filing a bug, capture all three: F12 console from BOTH clients, the Render log window from `lobby:start` onward, one plain sentence of what felt wrong. Bundle hashes settle "is the fix even deployed" instantly.

---

## 9. Quick reference

```bash
# Client (The-Arcade) — work on arcade/critter-kart, sync files to main after
npm run typecheck

# Server (SolShot) — main auto-deploys to Render (~2 min)
node --check server/socket-io/critter-kart.js

# Sync a client fix to the hub branch (full merges conflict — cherry-pick files):
git checkout main && git checkout arcade/critter-kart -- src/games/critter-kart/<file> && git commit
```

| Thing | Value |
|---|---|
| Bot launch URL | `https://the-arcade-critter-kart.vercel.app/play/critter-kart/launch?session=<JWT>` |
| Server | `https://solshot.onrender.com` (override: `VITE_SOLSHOT_API_BASE`) |
| Sim / snapshots / input | 60 Hz / 30 Hz / per-rAF latest-wins |
| Interp render delay | 100 ms, ring buffer 1 s, extrapolation cap 1.5× |
| Countdown / grace / fallback | 3 s / 30 s / 15 s |
| Design doc | `docs/CRITTER_KART_MULTIPLAYER_DESIGN.md` |
| Cross-Claude protocol | `docs/CLAUDE_COMMS.md` |

Good luck — the foundation is solid now. Verify the reconnect drill, then go straight at item sync; it's the last thing standing between "works" and "feels like a real kart racer." 🏁
