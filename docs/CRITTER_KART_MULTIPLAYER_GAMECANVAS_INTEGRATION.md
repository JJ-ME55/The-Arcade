# Critter Kart — GameCanvas multiplayer integration

> **For JJ:** the ONE edit needed in `GameCanvas.tsx` to make multiplayer
> actually drive remote karts from server snapshots. Everything else
> (socket layer, queue/race handshake, MultiplayerProvider wiring) is
> done — this is the last mile.
>
> Apply this edit, push to `arcade/critter-kart`, the preview Vercel
> rebuilds, and `/critterkart → Quick Race` in the bot races for real
> against another human (or bot-fills after 30s).

---

## Context — what's already done

| Layer | Where | Status |
|---|---|---|
| Server: 60Hz physics tick, 20Hz snapshots, kart-kart collisions, lap tracking, AI takeover on disconnect | `JJ-ME55/SolShot:server/services/games/critter-kart/sim/runner.js` + `server/socket-io/critter-kart.js` | ✅ Shipped (Session 2b) |
| Wire protocol — `race:input` / `race:snapshot` typed contract | `src/games/critter-kart/net/protocol.ts` | ✅ Shipped (Session 2c) |
| Network client — socket.io connection, 30Hz input loop, snapshot ring buffer | `src/games/critter-kart/net/client.ts` | ✅ Shipped (Session 2c) |
| Multiplayer context + `useMultiplayerSync` hook | `src/games/critter-kart/game/multiplayer/context.tsx` | ✅ Shipped (Session 2c) |
| URL-param entry layer — auto-queue or join from `?queue=1` / `?race=<id>` | `src/games/critter-kart/MultiplayerLayer.tsx` | ✅ Shipped (Session 2c) |
| `CritterKartScreen.jsx` wraps `<App>` in `<MultiplayerLayer>` | same | ✅ Shipped (Session 2c) |
| Bot `/critterkart` — 2-button menu (Quick Race + Solo) | `JJ-ME55/SolShot:server/services/arcadeBot.js` | ✅ Shipped (Session 2c) |
| Render `npm install socket.io-client` | The Arcade `package.json` | **⚠ MANUAL (see below)** |
| GameCanvas wired to multiplayer state | `src/games/critter-kart/GameCanvas.tsx` | **⚠ This doc's subject** |

---

## Prereq: install socket.io-client

```bash
cd /c/Users/johnk/The-Arcade-git
npm install socket.io-client@^4.7.0
git add package.json package-lock.json
```

Without this, the dynamic `import('socket.io-client')` inside
`net/client.ts` throws and multiplayer silently falls back to
single-player (MultiplayerLayer shows the error overlay for 3.5s, then
just plays solo). Game itself never breaks.

---

## The GameCanvas edit

You need ~25 added lines + 1 added import. Single block, placed inside
the rAF tick loop. Per-tick logic does two things:

1. Send local input to the server (every frame at rAF rate; the net
   layer's outbound buffer down-samples to 30Hz wire send)
2. Override remote-kart slots' `states[i]` with the latest server
   snapshot's positions before render

### Step 1 — add the import

Near the top of `src/games/critter-kart/GameCanvas.tsx`, alongside the
existing imports:

```tsx
import { useMultiplayerSync } from './game/multiplayer/context';
```

### Step 2 — call the hook inside the component

Inside the `GameCanvas` component function, near the other hooks (alongside
the existing `useRef`s):

```tsx
const multi = useMultiplayerSync();   // null when single-player
```

### Step 3 — add the per-tick block inside the rAF loop

Inside the `loop()` function (the one that calls `stepKart` for each
slot — currently around line 631 where `states[PLAYER] = stepKart(...)`
is called), wrap the per-kart step like this. **The key insight: when
multiplayer is active, REMOTE karts get their state from the snapshot
instead of from local physics. Local kart still runs Fish's local
physics so input lag stays imperceptible.**

```tsx
// === Multiplayer integration (additive) =================================
// When useMultiplayerSync returns non-null, this block:
//   1. Sends the local input frame to the server (30Hz down-sampled)
//   2. Overwrites remote-kart slots' states with the latest server
//      snapshot, so other humans' karts move authoritatively.
// When single-player → multi is null, nothing happens here.
if (multi) {
  // (a) Send local input — net layer down-samples to 30Hz
  multi.sendInput({
    steer,                                 // already-computed (post-ramp) local steer
    throttle: racing ? raw.throttle : 0,
    brake: racing ? raw.brake : 0,
    drift: !!(racing && raw.drift),
  });

  // (b) Overwrite remote kart states from the latest snapshot. Skip
  //     the local player's slot — local physics drives their kart's
  //     rendering for snappy feel (v1 thin client; reconciliation v2).
  const snap = multi.latestSnapshot;
  if (snap) {
    for (let i = 0; i < NUM; i++) {
      if (i === multi.selfSlot) continue;
      const k = multi.applyToSlot(i);
      if (!k) continue;
      states[i] = {
        ...states[i],
        x: k.x,
        z: k.z,
        y: k.y ?? states[i].y ?? 0,
        vy: k.vy ?? states[i].vy ?? 0,
        heading: k.heading,
        velHeading: k.velHeading,
        speed: k.speed,
        driftDir: k.driftDir,
        boostTimer: k.boostTimer,
        stunTimer: k.stunTimer,
        slowTimer: k.slowTimer,
        shield: k.shield,
      };
    }
  }
}
// === End multiplayer integration ========================================
```

**Place this block AFTER local input has been captured (so `steer` and
`raw` are populated) and BEFORE the per-slot `stepKart` loop runs.** That
way:
- Remote slots get their state overwritten with server truth before they
  would have been stepped locally — local step still runs for them but
  produces identical or near-identical results (server is authoritative,
  client converges). For v1 it's fine if local physics runs on top —
  the next frame's snapshot will overwrite again.
- Local slot is untouched here; the existing `states[PLAYER] = stepKart(...)`
  drives it as before.

That's the entire integration. Race-end events (`critterkart:final`)
flow through MultiplayerLayer's overlay separately — your existing
`onRaceFinish` callback in CritterKartScreen still fires when the
server emits the final positions.

---

## What's deliberately deferred to v2

| Feature | Why deferred | v2 work |
|---|---|---|
| Local-kart prediction + reconciliation | v1 thin-client: local physics drives local render; server's final positions are authoritative for leaderboard. Visual divergence between local and server is invisible to the player because their own kart is rendered locally. | Add input-buffer + rewind-and-replay when server snapshot's ackSeq lags local input seq. |
| Remote-kart interpolation between snapshots | 20Hz snapshots = 50ms apart. Remote karts will "step" 50ms at a time. Looks chunky but works. | Use the snapshot ring buffer (already exposed via `latestSnapshot` only for now) to render at intermediate t values. |
| Items (turbo/acorn/bee/mud/shield/storm) on server side | Server runs pure racing physics for now. Item spawns + projectiles + hits all client-side in v1. | Add item box state to RaceRunner; emit item:spawn / item:pickup / hit events; client renders from server events. |
| Exact identity self-match | Currently MultiplayerProvider picks "first non-bot member" as self. Works because match order is preserved. | Add `telegramUserId` to Member shape, server emits it, client matches exactly. |

---

## Testing path

1. **Solo mode** unchanged. Hit `/play/critter-kart/launch?session=<jwt>` — no `queue` or `race` param, MultiplayerLayer no-ops, Fish's game runs as today.
2. **Quick Race solo-test** — `/critterkart` in bot → tap **🏁 Quick Race**. Hub loads with `?queue=1`. MultiplayerLayer connects, shows "Finding racers…" overlay, server queues you. After 60s alone, server bot-fills 5 bots + starts the race. You drive in multiplayer mode against AI.
3. **Quick Race with another human** — two TG users both tap 🏁 Quick Race within 30s of each other. Server matches them, plus bot-fills the remaining 4 slots. Both human players see each other's karts moving from server snapshots.
4. **Race end** — server's `critterkart:final` arrives, hub's existing UI shows final positions, career stats update via `submitRace` (already wired).

---

— main-claude, 2026-06-04 (Session 2c)
