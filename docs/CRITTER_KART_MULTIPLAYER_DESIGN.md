# Critter Kart — Multiplayer Race Architecture

> **Status:** design doc, pre-implementation (2026-06-04).
> **For:** Fish's Claude on `arcade/critter-kart`, JJ for the server side, future-me for the bot integration.
>
> Server-authoritative from start. Wagered-ready (free now, SOL-wagered planned). Mirror of pool's match infrastructure.

---

## Decisions locked

- **Format:** 3 laps per race.
- **Player count:** 2–6 humans, remaining slots filled with AI bots.
- **Matchmaking:** quick-match queue. No TG group lobby in v1.
- **Authority model:** server-authoritative — clients send inputs, server runs physics, returns truth.
- **Wagered:** free in v1; wagered flow added once race feel + anti-cheat are validated.

---

## Race lifecycle (state machine)

```
queued       → player in matchmaking queue, not yet matched
              │
              │ (queue ticker fires when 2+ humans waiting,
              │  or oldest player waited >30s — start with bots)
              ▼
matched      → race created server-side (CritterKartRace doc), player
              │ list locked. Server emits `race:matched` with raceId
              │ + launch URL.
              │
              │ (clients connect via socket, server waits up to 15s
              │  for all to load)
              ▼
loading      → clients send `race:ready`. Server waits for all-ready
              │ OR timeout (any not-ready slot becomes a bot).
              ▼
countdown    → 3-2-1 (3s). Clients can't input until 0. Server starts
              │ physics clock.
              ▼
racing       → live race. Server simulates physics at 20Hz tick.
              │ Server sends authoritative state to clients at 15Hz
              │ (subset of tick — bandwidth budget).
              │ Clients render local with prediction + reconciliation.
              │
              │ End condition: all-finished OR 5min hard timeout.
              ▼
finished     → server computes positions, awards career points via
              │ submitRace() per player, writes race result.
              │ Server emits `race:final` to all clients (results).
              ▼
settled      → terminal. Race doc stays in Mongo for 7d (analytics +
                replay), then archived.
```

Disconnect handling at every stage:
- `queued`: player drops → just remove from queue.
- `matched` / `loading`: player no-shows → slot becomes a bot.
- `racing`: player disconnects → their kart switches to AI control mid-race.
  No race abort. No refund for v1. (When wagered ships, disconnect policy
  needs proper definition — see §Wager hooks below.)

---

## Server-side scope

### What the server simulates

- **Kart positions** (x, y, z, rotation, velocity vec) per player + per bot, 20Hz tick.
- **Lap progress** (track segment progress, lap count, lap times).
- **Collisions** (kart-kart, kart-track-wall).
- **Items** (pickup zones, item assignment to player on pickup, item-use effects on other karts: shell hit, banana spin, etc.).
- **Authoritative race state** (positions, items, lap times, finishing order).

### What clients still own (rendering, not truth)

- **Camera, lighting, particle effects, sound** — purely visual.
- **Local input capture** — keyboard / touch / gamepad → input stream sent to server.
- **Visual prediction** — apply local input to local kart instantly for responsiveness; reconcile with server snapshot on each tick.
- **Other karts** — interpolate between server snapshots (no client-side physics for remotes).

### Input model

Client sends inputs at 30Hz over WebSocket:

```ts
type InputFrame = {
  seq: number;          // monotonic client-side seq, server acks last received
  t: number;            // client clock ms (for RTT estimation, not authoritative)
  steer: number;        // -1..1
  throttle: number;     // 0..1
  brake: number;        // 0..1
  useItem: boolean;     // edge-triggered (true = fire on this frame)
  drift: boolean;       // hold
};
```

Server buffers ~3 frames per client for jitter resilience, runs them at the server tick.

### Server snapshot to clients

15Hz:

```ts
type RaceSnapshot = {
  t: number;            // server clock ms
  tick: number;         // monotonic server tick
  ackSeq: number;       // highest input seq processed for THIS client
  karts: Array<{
    id: string;         // player or bot id
    pos: [number, number, number];
    rot: number;
    vel: [number, number, number];
    lap: number;
    segment: number;    // track segment progress 0..1 within lap
    item: string | null; // current held item
    status: 'racing' | 'finished' | 'dnf';
  }>;
  events: Array<        // discrete events since last snapshot
    | { type: 'item_pickup'; kartId: string; item: string }
    | { type: 'item_used'; kartId: string; item: string; targetId?: string }
    | { type: 'hit'; kartId: string; cause: string }
    | { type: 'lap_complete'; kartId: string; lap: number; lapTimeMs: number }
    | { type: 'finished'; kartId: string; pos: number; totalTimeMs: number }
  >;
};
```

Snapshot delta-compression is a later optimization; v1 sends full state.

### Anti-cheat (free of charge with server-auth)

- Clients send inputs only, so they can't fake position / lap times / item pickups.
- Server validates input ranges (throttle ≤ 1, steer ∈ [-1, 1]) and rate (frames/sec).
- Server caps inputs at sane limits before applying.
- Reconciliation handles legit network jitter without booting players.

When wagered ships:
- Add per-frame input signing (server-issued race token, client signs each frame's seq).
- Add replay logging (full input stream → Mongo) so disputes can be re-simulated.

---

## Mongo schemas

### `CritterKartRace`

```js
{
  raceId: String,           // uuid, indexed
  state: String,            // 'matched'|'loading'|'countdown'|'racing'|'finished'|'settled'
  format: { laps: 3, players: { min: 2, max: 6 } },
  track: String,            // future: multi-track support; v1: 'default'

  players: [{
    telegramUserId: Number,
    displayName: String,
    kartId: String,         // unique within race
    joinedAt: Date,
    readyAt: Date | null,
    isBot: Boolean,
    finishPosition: Number | null,  // 1..N, set on finish
    finishTimeMs: Number | null,
    lapTimes: [Number],     // 3 lap times in ms (best-lap derives from min)
    dnf: Boolean,           // true if disconnected mid-race
  }],

  wager: {                  // null in free mode
    lamports: Number | null,
    escrowMatchId: String | null,  // pool's escrow-v2 wrapper match id
  },

  // Snapshots stored for replay (truncated to 30min retention)
  // V1: not stored; add when wagered launches.
  inputLog: null,

  createdAt: Date,
  startedAt: Date | null,   // racing began
  endedAt: Date | null,     // all finished or timeout
  settledAt: Date | null,
}
```

Indexes:
- `{ raceId: 1 }` unique
- `{ state: 1, createdAt: -1 }` for queue ticker / cleanup jobs
- `{ 'players.telegramUserId': 1 }` for "my recent races" queries

### `CritterKartQueue`

```js
{
  telegramUserId: Number,   // unique — one queue entry per player
  socketId: String,         // current socket; refreshed on reconnect
  joinedAt: Date,
  notifiedAt: Date | null,  // when bot sent "race ready" message
}
```

Index: `{ joinedAt: 1 }` for FIFO matching.

Queue ticker: runs every 5s OR on each new join. Pulls oldest N entries
(up to max=6), atomically deletes them, creates a race.

### Existing `CritterKartCareer` (already shipped)

Unchanged. Race finish calls `submitRace({telegramUserId, points, pos, bestLapMs, raceTimeMs})` which updates the career aggregate.

---

## Socket.io event schema

Connection: client connects to `wss://solshot.onrender.com/ws/critter-kart` with session JWT in handshake auth.

### Client → Server

```
joinQueue          payload: {}
                   ack: { ok, position, eta? }

leaveQueue         payload: {}
                   ack: { ok }

joinRace           payload: { raceId }
                   ack: { ok, race, kartId }
                   server emits `race:state` to all in race

ready              payload: { raceId }
                   ack: { ok }
                   server emits `race:state` when all ready

input              payload: InputFrame  (see §Input model)
                   no ack (volume-sensitive)

reportFinish       payload: { raceId }  (advisory; server is canonical)

leaveRace          payload: { raceId }
                   server marks player as DNF
```

### Server → Client

```
race:matched       { raceId, players: [{displayName, isBot}], format }
race:state         { state, ... — depends on phase }
race:countdown     { seconds: 3|2|1|0 }
race:snapshot      RaceSnapshot  (15Hz during racing phase)
race:event         (subset of snapshot.events broadcast immediately)
race:final         {
                     positions: [{kartId, displayName, pos, totalTimeMs, bestLapMs, points}],
                     myResult: { pos, totalTimeMs, bestLapMs, pointsAwarded,
                                 newCareerTotal, careerRank }
                   }
race:error         { code, message }  (e.g. 'race_cancelled', 'kicked_for_input_abuse')
```

---

## Server-side files (to be built)

```
server/models/
  CritterKartRace.js        (new)
  CritterKartQueue.js       (new)

server/services/games/critter-kart/
  lifecycle.js              (orchestrator: createRace, startRace, finishRace, settleRace)
  matchmaking.js            (queue ticker + start-with-bots logic)
  physics.js                (server-side kart sim — 20Hz)
  track.js                  (track segment definition; reuse client's track data — pull into shared module)
  bots.js                   (bot AI — same difficulty levels as client's single-player bots)
  validate.js               (input range checks; cheat detection)
  index.js                  (public API surface)

server/socket-io/
  critter-kart.js           (socket.io namespace + handlers; mirror of pool's pattern)
```

Existing `server/services/games/critter-kart-standalone/standaloneLeaderboard.js` STAYS — it's the career-aggregate writer. Multiplayer just calls into `submitRace()` from there at race-end.

---

## Client-side changes (`arcade/critter-kart` branch)

Fish-claude scaffolded `src/games/critter-kart/net/` already. The multiplayer mode wires that up:

```
src/games/critter-kart/
  net/
    socket.ts               (already scaffolded — connect, auth, reconnect)
    input.ts                (capture local input → InputFrame stream → socket)
    snapshot.ts             (consume RaceSnapshot, schedule render updates)
    prediction.ts           (local-kart prediction + reconciliation with server truth)
    interpolation.ts        (remote-karts smooth between snapshots)

  CritterKartScreen.jsx     (gain a `mode` prop / URL param: 'solo' | 'multi')
  GameCanvas.tsx            (in multi mode, kart updates come from snapshot.ts not local physics)
```

URL contract:
- Solo: `/play/critter-kart/launch?session=<jwt>`
- Multiplayer: `/play/critter-kart/launch?race=<raceId>&session=<jwt>`

URL with `race` param skips the menu, connects directly to that race.

---

## Bot UX

`/critterkart` becomes a 3-button menu (DM):

```
🏎️  Critter Kart

[ 🏁 Quick Race        ]  → POST /api/games/critter-kart/queue/join
                            bot replies with queue status,
                            DMs again when race ready
[ 🤖 Solo vs Bots      ]  → existing single-player launch URL
[ 🏆 Leaderboard       ]  → /leaderboardcritterkart inline
```

Quick Race flow:
1. Player taps button → POST /api/queue/join → bot replies "🔎 Looking for racers… (in queue)"
2. Queue ticker matches → server emits race:matched
3. Bot DMs all matched players: "🏁 Race ready! [Join Race ↗]" — button URL includes raceId + session
4. Players tap → game opens, connects, race runs
5. After race: bot can optionally DM "You finished 2nd! +12 career points. [Race Again]" — nice-to-have, not v1

In v1, the "Quick Race" entry might just open the launch URL with `?queue=1` and let the hub UI handle the wait-state visually. Less moving parts for first ship.

---

## Wager hooks (planning ahead, not building yet)

When wagered ships, this design supports it cleanly:

1. **Queue → wagered queue.** Player taps "Wagered Race (0.05 SOL)". Hub initiates an escrow-v2 deposit (mirrors pool's pattern). Player joins a wager-tier queue.
2. **Race created with `wager: { lamports, escrowMatchId }`.** Escrow holds 6× lamports.
3. **Anti-cheat hardens:**
   - Server-side input signing per frame.
   - Full input log persisted for dispute review.
   - Detected cheats → forfeit, no payout, ban applied.
4. **Settlement on race finish:**
   - Server calls escrow-v2 `settleMatch` with the 1st-place winner.
   - 90/7/3 split: 90% to winner, 7% treasury, 3% ops.
   - Free-mode bots in a wager race are NOT allowed — wager queues only start with all-human matches (or timeout-cancel + refund).
5. **Disconnect = forfeit** in wagered mode. Strict, so people can't quit when losing.

All of that bolts onto the v1 architecture without rewriting it.

---

## Implementation plan — 3 sessions

### Session 1 — Server foundation (~half a working session for me)

- `CritterKartRace.js`, `CritterKartQueue.js` Mongo models
- `lifecycle.js` (createRace, startRace stub, finishRace, settleRace)
- `matchmaking.js` (queue ticker)
- `validate.js` (input range checks)
- `index.js` (public API)
- Wire socket.io namespace + minimal handlers (`joinQueue`, `joinRace`, `ready`)
- `submitRace` integration with the existing career writer

Smoke-test: two test clients can join queue, get matched, transition to countdown state, settle a fake race (no real physics yet). Career doc updated for both.

### Session 2 — Physics + state sync (~1 full session)

- `physics.js` — kart physics tick (port from Fish's client physics, simplify to server scope)
- `track.js` — track segments shared between client and server
- `bots.js` — bot AI (port from client)
- Snapshot generation at 15Hz
- Input application at 20Hz
- Race completion → submitRace call → career update

Smoke-test: race full 3 laps end-to-end with 6 bots, server-side. No client rendering yet — just verify positions/laps/finish work.

### Session 3 — Client integration + bot UX (~1 session)

- Wire `net/socket.ts` + `net/input.ts` + `net/snapshot.ts` in CritterKartScreen
- Multiplayer mode toggle (URL param)
- Bot menu — Quick Race button
- Notification flow (in-game socket OR bot DM, pick one)
- First two-human end-to-end test on preview deploy

Ship to preview. Get JJ + Fish to playtest. Iterate.

---

## Open follow-ups (post-v1)

1. **Replay system** — record input streams during racing, allow re-simulate for dispute / highlight reel.
2. **Friend lobby** — TG group `/critterkart-race @friend1 @friend2 ...` skips the queue.
3. **Custom tracks** — beyond v1's single track.
4. **Spectator mode** — watch a race in progress (read-only socket).
5. **Tournament bracket** — pool already has this pattern; reusable.

---

— main-claude (Opus 4.7 / 1M context), 2026-06-04
