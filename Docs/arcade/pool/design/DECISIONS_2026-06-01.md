# Side Pocket — Locked decisions (2026-06-01)

Single canonical decision log after Round 2 designer handoff + JJ Q&A. Anything not in this doc is *not* locked — escalate before building.

Companion docs:
- [POOL_DESIGN_TARGET.md](../POOL_DESIGN_TARGET.md) — gameplay rules + locked match-flow parameters
- [POOL_DESIGNER_SPEC.md](../POOL_DESIGNER_SPEC.md) — screen-by-screen engineering contract
- [TRICK_SHOT_LIBRARY_v0.md](./TRICK_SHOT_LIBRARY_v0.md) — Marathon mode setup catalogue
- [round2/README.md](./round2/README.md) — designer's source of truth

---

## 1. Identity

| What | Decision |
|---|---|
| **Game name** | **Side Pocket** (rebranded from "Pool" / "8-Ball Pool") |
| **Code identifiers** | Keep as `pool*` / `poolMatchmaking` / etc. — code is descriptive of what it does; renaming would churn git history for cosmetic gain |
| **Branch** | `arcade/8-ball-pool` stays (no rename; matches the engine fork's name) |
| **Hub route** | `/play/side-pocket/launch` — rename from `/play/pool/launch` is acceptable scope, no urgency |
| **Doc filenames** | `POOL_*.md` stays — same logic as code identifiers |
| **Integration shape** | **B** — iframe at `/play/side-pocket/launch` inside The Arcade hub. May branch to own domain (`sidepocket.gg`) later; not now. |

## 2. Modes shipping in V1 / V2

| Mode | Status | Notes |
|---|---|---|
| **Play 1v1 — Free** | V1 must-have | Default, gold/lime chrome |
| **Play 1v1 — Wagered (SOL)** | V1 must-have | Sub-toggle on Play 1v1. Brass+ink chrome. Surgical sub-mode, not default. |
| **Tournaments — Free (TKT entry)** | V1 must-have | 8-player single-elim, QF → SF → Final |
| **Tournaments — Wagered** | V3+ | Deferred per JJ |
| **Vs Computer** | V1 must-have | 4 difficulties. Reconciles with the designer's "Practice" — same mode, easiest bot = practice |
| **Marathon (trick-shot lives)** | V1 must-have | **REFRAMED**: was bot-ladder, now trick-shot lives mode (see §5) |
| **Private 1v1** | V1 must-have | Invite link `sp.gg/r/XXXXXX`, TG share, QR (mobile), 30-min TTL. No stakes. |

## 3. Wagering — surgical sub-mode, not default

| Rule | Value |
|---|---|
| Wagered modes at V1 | **1v1 only** (no wagered tournaments) |
| Stake tiers | **0.01 / 0.05 / 0.1 / 0.5 / 1 / 5 SOL** |
| Split | **90 / 7 / 3 BPS** (winner / treasury / ops) → **1.8× pot to winner** |
| Anti-smurf gate | **Wagered locked until rankedCount ≥ 25**. Already enforced in `PoolElo.canWagerAboveLowStake` |
| Settlement | On-chain escrow → broadcast Solscan link on Pool Card |
| Matchmaking | **Elo-only**, never balance/queue on currency |
| Visual treatment | Brass + ink weight (NOT casino-flashy). Stake chip "X SOL ON THE TABLE · POT 2X" centred top in match |
| UI entry | Sub-toggle on the existing Play 1v1 modal (one entry, two modes) |

## 4. Currency model

| Currency | Source | Sink | Notes |
|---|---|---|---|
| **SOL** | Wagered match winnings + cosmetic store top-ups | Wagered stakes + cosmetic purchases | On-chain via Privy wallet |
| **TKT** (Tickets) | Earned through gameplay (per The Arcade canonical doc) | Tournament entry + cosmetic shop | NOT staked on matches. Arcade-wide currency. |
| **G** (Gold) | Match wins + marathon rewards + daily challenges | Pool-specific cosmetics + base catalogue | Pool-only. Closed-loop. |

**Wallet never gates matchmaking.** Currency questions roll up to the Arcade canonical doc economy decisions.

## 5. Marathon — REFRAMED to trick-shot lives mode

**What it WAS (we built):** bot ladder — each consecutive win raises bot ELO, streak counter, per-difficulty leaderboards.

**What it IS now (locked):**
- 3 lives at start (cue-ball icons in HUD)
- Curated trick-shot setups from a server-held catalogue
- Each setup: cue ball + object balls in specified positions, with a win condition (e.g. "pot the 8-ball legally in the labelled pocket")
- Miss / foul = −1 life. Same setup can be **retried in place** OR **skipped** (no points, advance).
- 0 lives = run ends. **Bank Streak** locks score and exits any time.
- Win-condition pocket marked with a gold ring on the felt
- Streak milestone TKT bonuses at 5, 10, 20 completed setups
- **NO difficulty floor / NO Easy-Hard picker** (was removed deliberately by designer to avoid leaderboard fragmentation)
- **ONE leaderboard** — daily / weekly / all-time scopes
- Internal tier ladder rises automatically as run progresses (server-held)
- Trick-shot library authored by Claude — see [TRICK_SHOT_LIBRARY_v0.md](./TRICK_SHOT_LIBRARY_v0.md)

## 6. Matchmaking — simplified for cold-start

- **Elo-based pairing**, ±100 initial band, +50 per 10s expansion, ±400 cap
- **At max expansion: fallback to ANY available player in mode** (no Elo gate). Better to play someone too strong/weak than not at all in early days.
- Wagered: tighter band (±50 initial, ±250 cap), same fallback
- **NO rooms** — no schema, no queue partitioning. Was an earlier idea, abandoned to avoid extra work given cold-start player pool reality.
- Any "room" visual in the designs (Break Room → Penthouse) is **cosmetic ambient theming only**

## 7. Match flow — locked parameters (unchanged from earlier rounds)

| Param | Value |
|---|---|
| Turn timer (sync, live) | **45s** |
| Async (correspondence) turn window | **12h** |
| Match wall-clock cap | **72h** |
| Default match format | **BO1** (BO3 / BO5 selectable per mode/tournament) |
| Sync timeout behaviour | **Pure skip** — opponent shoots from current cue position (friendlier than ball-in-hand) |

## 8. Rules — conventional American 8-ball only

- American 8-ball only at V1. UK rack (red/yellow no-number) deferred — not a V1 toggle.
- Tournament size: **8-player only** at V1. Never expands to 16/32 in V1 UI.
- Tournament rounds: 3 (QF → SF → Final). "Three back-to-back games for the winner."
- Best of 1 default for ranked; BO3 for tournament Finals.

## 9. Prestige

- **Prestige structure DEFERRED** — game-theory decision per JJ, "critical to competitive nature". Stay on flat 6-tier model (Unranked / Bronze / Silver / Gold / Platinum / Diamond) until decided.
- Designer's spec calls for 5 tiers × 4 divisions (Bronze I–IV, Silver I–IV, etc.) — note this as the likely future shape but don't refactor `PoolElo` yet.

## 10. Spin physics

- **KEEP wired** — we already built full sidespin + topspin/backspin physics
- Spin response matches where user picks the impact point on the white ball (already implemented via `widgetPointToSpin` → `cueBall.shoot(p, r, sX, sY)`)
- Designer Settings will offer "English physics ON/OFF" — OFF reduces it to display-only for casual play. Default: ON.

## 11. UI — interaction model (locked)

| Surface | Aim | Power | Spin | Shoot |
|---|---|---|---|---|
| **Mobile** | Tap on felt = aim direction; hold-and-move = fine scrub | Rail slider (vertical) with chunky yellow PILL thumb wider than the track | Tap cue-ball node, drag contact dot | Release slider OR explicit Shoot button (pick one — settings option) |
| **Web** | Mouse position over felt sets cue line | Click-drag POWER bar (pill thumb) | Click cue-ball node, drag dot | Shoot button OR pull-back release |
| **No cue-hand mirror** | Dropped entirely | — | — | — |

## 12. UI — aim guides (locked)

- **Dashed cue-ball-to-contact line** (always on, baseline)
- **Dashed ghost ball at the contact point**
- **Faint rail reflection line** when applicable
- Player-toggleable in Settings: **ON / SHORT / OFF**

## 13. UI — stamps (Abril Fatface, gold/red gradient, no heavy stroke)

| Stamp | When |
|---|---|
| `BREAK!` | Start of rack |
| `SOLIDS` / `STRIPES` | First legal pot assigns group |
| `FOUL!` | General foul |
| `SCRATCH` | Cue ball pocketed |
| `8 ON BREAK · RE-RACK` | Legal break sinks the 8 |
| `8 EARLY · DEFEAT` | Illegal early 8-ball pot |
| `VICTORY!` / `DEFEAT` | Rack end |
| `COMPLETED` / `MISSED` / `RUN ENDED` / `BANKED` | Marathon mode |
| `CHAMPION` | Tournament winner |

Each ~1.5s overlay: slam-in 200ms, hold 1s, fade-out 300ms.

## 14. Chat — canned phrases only

**No emoji anywhere**, ever. Strip emoji from any existing default phrase set.

Canned phrases at V1:
- Nice shot.
- Good game.
- Sorry, gotta run.
- Rematch?
- Hello.
- GLHF.

V3: cosmetic phrase packs (still no emoji).

## 15. Onboarding

- **4-step tutorial** — aim · power · spin · shoot
- Show once per account, skippable
- Designer specced this in Round 2 — included in V1 scope (no longer deferred)

## 16. Telegram launch

- TG bot launches Side Pocket inside TG WebView with `?session=<jwt>` per existing pattern (basketball/keepies/free-kicks)
- TG-launched UI gets a small TG mark next to player name in masthead
- "Back to Arcade" button replaced by "Back to chat" on TG-launched sessions
- Session via signed bot link (already wired in @TheArcadeGG_Bot)

## 17. Engineering implications of these decisions

### Backend (SolShot main, mostly done)
- ✅ Wagered escrow wrapper exists; designer confirmed surgical sub-mode keeps it relevant
- ✅ Anti-smurf gate (25 ranked matches) wired in `PoolElo.canWagerAboveLowStake`
- ⚠ **Marathon refactor needed**: `MarathonRun.startingDifficulty` → drop the required field, single leaderboard, internal auto-ladder
- ⚠ **Matchmaking fallback**: `poolMatchmaking.js` should fall back to "take any" instead of timeout
- ⚠ **Trick-shot catalogue**: server holds the setup library (positions + win conditions + scoring weights)
- Tournament engine ready (8-player path covered; 16/32 paths dormant but harmless)

### Client (`pool/` on `arcade/8-ball-pool`)
- ✅ Server-authoritative sim shipped (browser uses sim core, no drift)
- ✅ Spin physics wired
- ✅ Mobile-responsive canvas + touch
- ✅ Exit button on iframe wrapper
- ⚠ All 30 screens from Round 2 need wiring — substantial frontend work post-design
- ⚠ Mobile aim model needs update: tap-to-aim + hold-and-move, NOT drag-anywhere-on-felt
- ⚠ Power UI: chunky yellow PILL thumb wider than rail track
- ⚠ Aim guides: dashed line + ghost ball + rail reflection

## 18. Open questions (deliberately not decided yet)

| # | Question | Owner |
|---|---|---|
| 1 | Prestige structure — 5 tiers × 4 divisions vs flat 6? | JJ (game-theory call, defer) |
| 2 | Trick-shot stamp character — match stamps vs game-show style? | Designer's call |
| 3 | Wagered visual weight — darker members-club vs cobalt+brass with gold-leaf accents? | Designer's call |
| 4 | Tournament — should TKT prize amounts scale with player ELO? Or flat per tournament type? | JJ at V3 |
| 5 | Daily challenges — what exactly is the format? Single-setup trick shot? Vs computer at fixed difficulty? Separate from Marathon? | Deferred — needs its own pass |

---

*Maintainer: JJ. Last updated 2026-06-01. Update policy: append decisions, never delete; mark superseded inline if reversed.*
