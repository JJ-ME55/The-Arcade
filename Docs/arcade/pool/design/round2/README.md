# Side Pocket — Build & Wiring Handoff

A skill-only online 8-ball pool game. This package is the **design source of truth** plus a
**vision spec for the engineers wiring the backend**. The HTML/JSX here are high-fidelity,
interactive **design prototypes** — not production code. Recreate them in your real stack
(the game engine is already a TypeScript fork; see "Engine"), using these files for exact
look, copy, flow, and interaction intent.

> Read this whole file before estimating. The "Details people get wrong" section near the end
> exists because several things here are deliberate and easy to undo by accident.

---

## 0. How to use this bundle

- **`Side Pocket — Web (all screens).html`** — self-contained desktop build (1440×900). Open in any
  browser, offline OK. Pan/zoom design canvas; click any artboard's expand icon to view it full-screen.
- **`Side Pocket — Mobile (all screens).html`** — self-contained mobile build, **landscape**.
- **`source/`** — the raw HTML/JSX/CSS. Lift exact hex, spacing, copy, and component structure here.
- Everything is a **mock**: timers don't count down, balls don't move, matchmaking is staged. The
  prototypes show the intended *state* of each screen, not live behaviour.

---

## 1. Product in one paragraph + the hard rules

Side Pocket is a **members-club** themed 8-ball game where **outcomes are decided by skill only**.
There is **no wagering, no loot, no pay-to-win**. Ranking is Elo + win-rate; cosmetics are earned, not
bought-to-win. Ten monetisation patterns are **explicitly rejected** and must not be reintroduced:

1. Cues that refund losses · 2. Stat-affecting cues · 3. Wagered/coin tables · 4. Dual hard/soft
currency used as stakes · 5. Gacha/surprise cue boxes · 6. Spin-&-win / scratch sinks · 7. Paid
battle/elite pass · 8. VIP point ladder · 9. **Coin-balance matchmaking** (matchmake on **Elo only**) ·
10. Free-text chat / emoji packs (**canned phrases only, no emoji anywhere**).

If a feature request smells like one of these, escalate before building it.

---

## 2. Platforms, orientation, scaling

| Surface | Frame | Notes |
|---|---|---|
| **Web / desktop** | 1440×900 reference | Mouse-driven. Scales fluidly; keep the table centred. |
| **Mobile** | Landscape only | Touch. Held portrait → show the **"Turn to Play" rotate gate** (see `RotateScreen`). |
| **Tablet / foldable** | Landscape | Same layouts; more breathing space around the table. |

**The pool table is a fixed 1500×825 (≈1.818:1) board.** It must **scale, never stretch** — letterbox it
with breathing space on any aspect. (We regressed on this once; don't let the felt go square on tablets.)

---

## 3. Screens & flow (the state machine)

```
                       ┌──────────────┐
                       │  MAIN MENU    │  Play 1v1 · Tournaments · (Practice/VS Computer)
                       └──────┬───────┘
            ┌─────────────────┼───────────────────┬──────────────┐
            ▼                 ▼                    ▼              ▼
      ROOM SELECT      VS COMPUTER           PRIVATE 1v1     TOURNAMENTS
      (skill-gated     (Play the House,      (invite link)   (bracket)
       venues)          4 difficulties)            │              │
            │                 │                    │              │
            ▼                 │                    │              │
      MATCHMAKING ────────────┘                    │              │
      (Elo ± band)                                 │              │
            ▼                                       ▼              ▼
      OPPONENT REVEAL ──────────────────────────► IN-MATCH ◄──────┘
      (tale of the tape)                          (the table)
                                                      │
                                                      ▼
                                                  MATCH RESULT
                                               (Victory / Defeat)
                                                  │        │
                                              Rematch   Back to Room
```

Meta screens (reachable from menu/HUD): **Profile** (prestige ladder, Elo, form, stats),
**Cue Locker** (cosmetic cues, skill-gated), **Leaderboards** (global/friends/season), **Settings**.

Every screen exists in this bundle. Match the transitions: menu/panel changes are snappy (~160–240ms),
reward/stamp moments use a slight overshoot pop, the opponent-reveal runs a one-shot entrance sequence.

---

## 4. Interaction model — the part most likely to be misread

### The shot (both platforms)
- **Aim** = rotate the cue direction. A dashed **aim line** projects from the cue ball through a dashed
  **ghost ball** to the contact point, plus a faint reflection line off the rail.
- **Power** = a meter the player loads before striking. Rendered as a bar with a **small yellow marker**
  at the current level (not a big knob). 0–100%.
- **Spin** = a cue-ball node (white ball with a red contact dot) for where the cue strikes the ball.
- **Shoot** = commit the stroke at the chosen aim + power (+ spin).

### Desktop (mouse)
- **Aim:** mouse position over the felt sets the cue line; the cue stick renders behind the ball along it.
- **Power:** click-drag the POWER bar in the action shelf (or pull back on the cue — pick one; the
  prototype shows the bar). Release/Shoot fires.
- **Spin:** click the cue-ball node, drag the dot to the contact point.
- **Shoot:** the **Shoot** button in the action shelf, or release after a pull-back gesture.

### Mobile (touch, landscape, two-thumb)
- **Aim:** **drag anywhere on the felt** to rotate the cue line (large drag area; fine control via slow drag).
- **Power:** a **vertical slider on the cue-hand rail** — drag up to load. Variant A reads power off the
  slider and shoots on release; Variant B has an explicit round **Shoot** button by the thumb.
- **Cue hand is mirrorable** — respect Settings → *Cue hand* (Left/Right); the slider + controls swap sides.
- **Spin:** tap the cue-ball node, drag the contact dot.
- Touch targets ≥ **44px**. HUD is intentionally minimal during play (scores + turn timer + potted balls).

> **Two gameplay layout variants** are included on mobile (Rail Slider / Thumb Dial). They're alternatives
> to evaluate, not two modes to build — pick one (or make it a setting).

### Buttons / states (all)
- Primary CTA (gold "Play/Shoot/Rematch"): hover brightens, press translates down 2px.
- Disabled = dimmed + non-interactive (no greyscale).
- "Your turn" is signalled by a **gold/lime ring + glow** on the active player's avatar; the other player rests.

---

## 5. Engine & match rules

- **Engine:** TypeScript fork of `henshmi/Classic-8-Ball-Pool` (branch `arcade/8-ball-pool`). The physics,
  collision, pocket detection, and rack already exist — we are **reskinning + wrapping it in this UI and a
  server**, not rewriting physics.
- **Rules:** standard American 8-ball. Break → open table → first legal pot assigns **solids/stripes** →
  clear your group → legally pot the **8** to win. Fouls (scratch, wrong-ball-first, no-rail, 8-early) hand
  ball-in-hand / frame per ruleset. Surface state with the **stamps**: `BREAK!`, `SOLIDS`, `STRIPES`,
  `FOUL!`, `SCRATCH`, `8 ON BREAK · RE-RACK`, `VICTORY!`, `DEFEAT`.
- **Match format:** **Best of 3** frames by default (configurable per room/tournament).
- **Potted-ball HUD:** each player's HUD shows their 7 group balls in their **real resin colours**, filling
  as they pot. (This is data from the engine — wire the actual potted set, not a count.)

### Locked match-flow parameters (do not change without product sign-off)
| Param | Value |
|---|---|
| Turn timer | **45 seconds** |
| Async (correspondence) turn window | **12 hours** |
| Match wall-clock cap | **72 hours** |
| Matchmaking | **Skill-based: Elo ± band, win-rate.** Never balance/queue on currency. |

---

## 6. Real-time architecture (suggested)

- **Live matches:** authoritative **WebSocket** session. Client sends *intent* (aim angle, power, spin,
  shoot); **server runs the physics step** and broadcasts the resulting ball trajectories + events to both
  clients. Never trust client-reported outcomes (anti-cheat for a skill-only game is essential).
- **Async / correspondence matches:** persist match state; each shot is a server-validated transaction;
  push notification on your turn; enforce the 12h/72h windows.
- **Reconnection:** match state is server-held; a dropped client rejoins to the current rack state.
- **Spectate / replay:** the shot log (below) is enough to replay a frame.

---

## 7. Data model (MongoDB — sketch, adapt to your conventions)

```
players {
  _id, handle ("jjk_55"), memberNo, createdAt,
  elo: 1250, winRate: 0.68, framesWon: 312, bestRun: 4,
  prestige: { tier: "Gold", division: 3 },         // Bronze→Diamond, divisions I–IV
  form: ["W","W","L",...],                          // last 10 ranked
  equippedCue: cueId, unlockedCues: [cueId...],
  wallet: { sol: "0.42", tkt: 1840, g: 1247 },      // see §8
  walletAddress: "<solana pubkey>" | null,
  settings: { aimGuides, shotSpeed, cueHand, sfx, ambience, volume }
}

matches {
  _id, mode: "ranked"|"private"|"vsComputer"|"tournament",
  roomId, tournamentId?, format: "bo3",
  players: [ { playerId, group: "solids"|"stripes"|null, score, potted: [ballNos] } ],
  state: "matchmaking"|"reveal"|"live"|"complete",
  turn: { activePlayerId, deadline },               // 45s / 12h
  rack: { ballPositions, cueBall, onTable: [...] },
  result: { winnerId, reason, eloDelta: {win:+22, lose:-18} },
  createdAt, wallClockDeadline                       // 72h
}

shots {                                              // append-only, per match — replay + anti-cheat
  _id, matchId, playerId, turnNo, ts,
  intent: { aimDeg, power, spin: {x,y} },
  serverResult: { events: ["pot:3","rail",...], foul?, ballsAfter }
}

rooms { _id, name, tier ("Bronze+"…"Invitation"), eloFloor, openToTier, online }
tournaments { _id, name, format: "single-elim", size: 8, tier, entry: "free"|"invite",
              bracket: [ {round:"QF1", a, b, scoreA, scoreB, winner, state} ... ], startsAt }
cues { _id, name, unlockRule ("Reach Gold","Win 50 frames","Win a Cup"), cosmeticOnly: true }
leaderboards { scope:"global"|"friends"|"season", entries:[{playerId, rank, elo, winRate}] }
```

Tournaments are **single-elimination, 8 players → QF (4) → SF (2) → Final → Champion**. The bracket screen
reads left→right; only three rounds. (No round-of-32.)

---

## 8. Wallet & currencies — confirm the economic model before building

The HUD surfaces three balances: **SOL**, **TKT**, **G**.

- **SOL** — shown next to the player identity; implies a **connected Solana wallet** (wallet-connect flow →
  read balance / use for sign-in or store purchases of **cosmetics only**).
- **TKT** — "tickets" (intended for tournament entry / non-wagered).
- **G** — soft currency (cosmetic store, daily-challenge rewards).

> **CRITICAL / likely-misunderstood:** none of these are **wagered on matches**, and **matchmaking never
> uses balances** (Elo only — rejected antipattern #9). The wallet funds *cosmetics/entry*, not stakes.
> The exact on-chain vs off-chain split, and whether SOL is purely display / auth vs spendable, is a
> **product decision we have not finalised** — confirm intended flows with the product owner before wiring
> payments. Do not infer a wagering economy from the presence of SOL.

---

## 9. Progression, rooms, cosmetics

- **Prestige ladder:** Bronze → Silver → Gold → Platinum → Diamond, divisions within. Driven by Elo/results.
- **Rooms** are skill-gated venues (Break Room = open, up to Penthouse = Invitation). Gate entry by tier;
  the room list shows live player counts and an escalating "exclusivity" feel — purely cosmetic gating,
  **no stakes**.
- **Cue Locker:** cosmetic cues unlocked by **skill milestones** (wins, tiers, cup victories). They change
  appearance only — **never stats** (rejected antipatterns #1, #2).

---

## 10. Voice & copy rules (so UI strings stay on-brand)

- Confident, punchy, pub-overheard. State changes shout (`BREAK!`, `FOUL!`, `VICTORY!`).
- ALL CAPS for stamps/wordmark/buttons; Title Case for menu items; sentence case for body/tooltips.
- Second person to the active player ("Your shot"), third-person impersonal for the other ("Player 2 to break").
- Numbers/timers are monospace (`00:42`, `1,250 ELO`). **No emoji, ever** — not in chat, menus, or pushes.
- Chat is **canned phrases only** (V1 ceiling): *Nice shot. / Good game. / Sorry, gotta run. / Rematch? /
  Hello. / GLHF.*

---

## 11. Details people get wrong (read this)

1. **The table is diegetic cobalt** (cobalt felt, cherry rails). It is **not** re-skinned to the brand's
   green/brass — chrome (HUD/menus) is brand-coloured, the **felt stays cobalt**. Two surfaces, don't bleed.
2. **Scale, never stretch** the board. Keep 1.818:1, centre it, letterbox the rest.
3. **Ball numbers are intentionally small** and scale with the ball. Don't bump them up.
4. **Power indicator = small yellow marker above the bar.** Not a big knob, not discrete blocks.
5. **Potted-ball HUD uses real ball colours** from the live potted set, not a generic count.
6. **No hint chrome on the felt** ("drag to aim", "pull to shoot" were removed on purpose — keep the felt clean).
7. **Wood rails are a mitered picture-frame** — no dark seams at the corners.
8. **Matchmaking is Elo-only.** Wallet/currency must never influence queue or pairing.
9. **Spin node is present in the UI.** Confirm whether V1 wires english into the engine or the node is
   display-only for now — this was toggled during design and needs a product call.
10. **Mobile is landscape-only** with a rotate gate; **cue hand is mirrorable** (Settings).
11. **Async + live are both intended** (45s live turns; 12h async turns; 72h wall-clock). Build the timer/
    deadline logic server-side.

---

## 12. Assets still to produce (not blockers for wiring)

- Photoreal **room renders** for each venue (escalating exclusivity — hints are in the room-select code).
- Bespoke **cue artwork** (currently CSS-rendered).
- Player **avatars** (currently initialled discs).
- Prestige **badge art** (currently gradient chips).

---

## 13. File map (`source/`)

- `Home Screen Directions.html` — desktop canvas entry (loads everything below).
- `Side Pocket — Mobile.html` — mobile canvas entry.
- `PoolTable.jsx` — the locked cobalt SVG table (felt, cherry rails, cushions, pockets, diamonds, balls, cue, aim). **Shared by web + mobile.**
- `HUD.jsx` — match HUD primitives (player block w/ potted balls, power bar, turn-timer ring, result overlay).
- `SidePocketGame.jsx` — desktop match view (table + brass HUD + power/shoot). *(merged build of PoolTable + the desktop match UI)*
- `MobileGame.jsx` — mobile gameplay (table + minimal HUD + rail power + spin). *(merged build of PoolTable + the mobile UI)*
- `SidePocketApp.jsx`, `SidePocketScreens2.jsx` — desktop Side Pocket screens (menu, room select, matchmaking, reveal, result, tournaments, profile, locker, leaderboards, settings).
- `MobileFrame.jsx`, `MobilePlay.jsx`, `MobileMeta.jsx` — mobile device frame + screens.
- CSS: `sp_*.css` (desktop screens incl. `sp_game.css`), `mobile_*.css` (mobile), `kit.css` + `colors_and_type.css` (design tokens / table styles).
- `design-canvas.jsx`, `image-slot.js` — presentation scaffolding only; **do not ship**.

> Tokens (colours, type, spacing) live in `colors_and_type.css` + the `--c-*` brand vars at the top of each
> `sp_*` / `mobile_*` sheet. Lift exact values from there.

---

# ROUND 2 — V2.0 screens (added)

Round 2 adds the V2.0 surfaces. **Open `Side Pocket — Round 2 (all screens).html`** (self-contained) to see them; source is in `source/` (`round2_canvas.jsx` is the runnable merge; the `Round2*.jsx` files are the readable per-feature sources; CSS is `sp_wager/marathon/states/async/tour2/chrome.css`). Everything reuses the locked Round 1 table, HUD, stamp, and tokens — **one package**.

## Three top-level changes from Round 1
1. **SOL wagering is IN** as a deliberate **sub-mode** (1v1 only in V1; wagered tournaments are V3+). Most play stays skill-only/free. Free = gold/lime chrome; **Wagered = brass+ink** weight.
2. **Marathon** is a **trick-shot lives mode** (replaces the bot ladder): 3 lives, curated setups, miss = −1 life, bank to lock score.
3. **Rooms are NOT real** — no room schema, no queue partitioning. Matchmaking is **Elo-band + expansion** (after 60s, take whoever's available). Any "room" visual is **cosmetic ambient theming only**.

## Wagered 1v1 (#1–#6)
- **Stake tiers:** 0.01 / 0.05 / 0.1 / 0.5 / 1 / 5 SOL. Winner gets **1.8× the stake** (2× pot − **10% rake**). Rake splits **7% treasury + 3% ops** (shown to the player for transparency).
- **Escrow:** stake is held until the frame settles; on-chain payout with a **Solscan** link on the Pool Card.
- **Provisional gate (anti-smurf):** wagered play unlocks **after 25 ranked matches**.
- **Insufficient balance** → **Top Up** (Privy: Apple Pay / card / paste-from-wallet).
- **In-match:** a brass+ink **stake chip** on the felt ("X SOL ON THE TABLE · POT 2X"). The wagered **Pool Card** is the Round 1 Match Result screen + a payout breakdown (never a separate modal).
- **Matchmaking still Elo-only** — wallet/balance must NOT influence pairing.

## Marathon (#7–#12)
- **3 lives** (cue-ball icons). Each completed setup earns **G**; milestone bonuses at streaks of 5/10/20.
- **No difficulty floor / no Easy-Hard-Insane** — that was removed deliberately: tiered floors would fragment into 4 separate leaderboards. **One leaderboard.** Difficulty rises automatically as the run progresses (the run's internal tier ladder).
- Miss/foul → **−1 life**; the same setup can be **retried in place** OR **skipped** for no points. Out of lives → Run End. **Bank Streak** locks the score and exits any time.
- Win-condition pocket is marked with a **gold ring** on the felt.

## Match states (#13/#14/#19/#20)
- Foul/scratch raise a **referee stamp** + "ball in hand to @opponent". Ball-in-hand = draggable cue ball ("place the cue ball · then shoot"; kitchen tinted gold when the break-kitchen rule applies).
- **Reconnect:** 30s overlay, opponent status, forfeit option in the final seconds.
- **Stamp set (locked):** BREAK! · SOLIDS · STRIPES · FOUL! · SCRATCH · 8 ON BREAK·RE-RACK · 8 EARLY·DEFEAT · VICTORY! · DEFEAT. Each ~1.5s (slam 200ms / hold 1s / fade 300ms).

## Async, invite, tournaments, settings
- **Async (#15/#16):** 12h-per-turn / 72h wall-clock; frozen-table waiting screen + notify toggle; expiry → win-by-forfeit claim.
- **Private invite (#17/#18):** one-time link `sp.gg/r/XXXXXX`, Telegram share, QR (mobile), 30-min TTL; waiting-for-opponent seats.
- **Tournaments (#24/#25/#26):** pre-round waiting room (opponent + H2H + live bracket + Ready Up), round result with **prize-tier movement (TKT)**, champion card. Single-elim 8 → QF/SF/Final (unchanged).
- **Settings → Game (#21):** Aim guideline On/Short/Off, **English physics On/Off** (off = display-only spin), cue/felt theme (placeholder), SFX/ambience/volume, **aim-assist sensitivity (mobile)**.
- **Cue equip (#22):** confirm modal + "Equipped" stamp (cosmetic only).
- **Wagered room badge (#23):** a "◎ Wagered tables" badge on venue cards (cosmetic theming, not a real room).
- **Chrome (#27–#30):** Telegram-launch cue (TG mark by name + Back-to-chat; session via signed bot link), splash/loading, empty/error states (no tournaments / matchmaking timeout / deposit failed / settlement settling), 4-step onboarding (aim · power · spin · shoot).

## Round 2 LOCKED design decisions (don't drift)
- **Match-end stamp font = Abril Fatface** (Victory/Defeat/Completed/Missed/Run Ended/Champion). NOT Bowlby/bold. **No heavy text-stroke** — the gold/red gradient must read.
- **Power indicator = a chunky yellow PILL, wider than the rail track** (corrected from "marker above the bar").
- **Table stays cobalt, fixed 1.818:1, contained (scale never stretch).**
- **Mobile is landscape; tap the felt to aim, hold-and-move to fine-scrub** (no "drag anywhere to rotate"); **no cue-hand mirror toggle** (dropped).
- **Wallet never gates matchmaking.** Wagering funds the pot only; treasury/ops cuts are transparent.

## Round 2 interaction notes for the backend
- Wagered match lifecycle: confirm → **escrow both stakes** → play (server-authoritative) → settle → **payout 1.8× to winner**, treasury 7% + ops 3% to house wallets → emit Solscan tx. Handle settlement retry + the "settling/refresh" state.
- Provisional flag on `players` (`rankedCount < 25` ⇒ wagered locked).
- Marathon: server holds the setup catalogue + per-run tier ladder, lives, streak, score, G rewards, and the single leaderboard (daily/weekly/all-time scopes).

