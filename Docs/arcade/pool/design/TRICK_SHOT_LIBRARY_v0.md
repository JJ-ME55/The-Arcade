# Side Pocket — Trick-Shot Library v0

Initial trick-shot setup catalogue for Marathon mode. 30 setups across 4 tiers. Authored 2026-06-01.

## Format

Each setup describes:
- **id** — stable string identifier
- **name** — display name (Abril Fatface caps in the UI)
- **tier** — difficulty band (1-4)
- **balls** — initial ball positions as `[{ id, color, x, y }]` in the same coordinate space as `pool/src/game.config.ts` (1500×825 table; cushion inset ~26)
- **winCondition** — what counts as success (see condition types below)
- **timeLimitMs** — soft hint for the player (UI counts down; doesn't fail on timeout, just informs)
- **goldReward** — base G for completion
- **hint** — one-line plain-English instruction shown on Setup Preview card

Win-condition types the server needs to recognise:

| Type | Description |
|---|---|
| `pot_8_ball` | Player must legally pot the 8-ball |
| `pot_target_ball:<n>` | Pot the specific numbered ball (e.g. `pot_target_ball:3`) |
| `pot_in_pocket:<n>:<p>` | Pot ball `<n>` specifically in pocket `<p>` (0=TL, 1=TM, 2=TR, 3=BL, 4=BM, 5=BR) |
| `pot_all_remaining` | Pot every visible non-cue, non-8 ball |
| `pot_multiple:<n>` | Pot ≥ N balls in one shot |
| `bank_minimum:<n>` | Cue ball or target ball must hit ≥ N cushions before the winning pot |
| `no_scratch` | Implicit on every setup — cue ball pocketed = fail |
| `no_wrong_first_touch` | Implicit on most — cue ball must first touch the target ball |

Multiple conditions per setup combine with AND.

Table coordinate reference:
- (0, 0) = top-left
- (1500, 825) = bottom-right
- Standard rack apex (8-ball) = (1090, 413)
- Standard break cue ball = (413, 413)
- Pockets at TL(60,60) TM(750,30) TR(1440,60) BL(60,795) BM(750,825-30) BR(1440,795) — approximate, lift exact from rack.js

---

## Tier 1 — Basic (skill-floor; eight setups, ~1-2 cushions max)

### T1-01 — Open the Door
- **tier:** 1
- **goldReward:** 8
- **timeLimitMs:** 30000
- **balls:** cue at (413, 413), 8-ball at (1000, 413), all other balls cleared
- **winCondition:** `pot_target_ball:8` + `pot_in_pocket:8:2` (top-right corner)
- **hint:** "Pot the 8 in the top-right corner. Straight line, no funny business."

### T1-02 — Two-Ball Train
- **tier:** 1
- **goldReward:** 10
- **timeLimitMs:** 30000
- **balls:** cue at (300, 413), 3-ball at (700, 413), 5-ball at (1100, 413)
- **winCondition:** `pot_target_ball:5` + `pot_in_pocket:5:5` (bottom-right corner)
- **hint:** "Combo. Cue → 3 → 5 → corner pocket."

### T1-03 — Long Rail
- **tier:** 1
- **goldReward:** 10
- **timeLimitMs:** 30000
- **balls:** cue at (200, 600), 4-ball at (200, 100), nothing else
- **winCondition:** `pot_target_ball:4` + `pot_in_pocket:4:0` (top-left corner)
- **hint:** "Long rail shot — pot the 4 in the top-left."

### T1-04 — Side Pocket Drop
- **tier:** 1
- **goldReward:** 8
- **timeLimitMs:** 30000
- **balls:** cue at (300, 413), 7-ball at (700, 200), nothing else
- **winCondition:** `pot_target_ball:7` + `pot_in_pocket:7:1` (top-middle pocket)
- **hint:** "Drop the 7 into the side pocket."

### T1-05 — Stop Shot
- **tier:** 1
- **goldReward:** 10
- **timeLimitMs:** 30000
- **balls:** cue at (700, 413), 1-ball at (1100, 413)
- **winCondition:** `pot_target_ball:1` + `pot_in_pocket:1:5` (bottom-right)
- **hint:** "Use backspin to stop the cue ball after potting the 1."

*(Designer's intent: this teaches the spin widget. Player needs spinY = -1 to make the cue stop after impact.)*

### T1-06 — Cut to the Corner
- **tier:** 1
- **goldReward:** 10
- **timeLimitMs:** 30000
- **balls:** cue at (400, 600), 2-ball at (800, 400)
- **winCondition:** `pot_target_ball:2` + `pot_in_pocket:2:2` (top-right)
- **hint:** "Cut the 2 into the top-right corner."

### T1-07 — Clean Break
- **tier:** 1
- **goldReward:** 12
- **timeLimitMs:** 30000
- **balls:** standard 8-ball rack (use `getStandardRack()` from `rack.js`)
- **winCondition:** `pot_multiple:1` (any single ball potted on break)
- **hint:** "Break the rack and pot at least one ball."

### T1-08 — Frozen Pair
- **tier:** 1
- **goldReward:** 12
- **timeLimitMs:** 30000
- **balls:** cue at (400, 413), 6-ball at (700, 400), 9-ball at (732, 400) (frozen to 6)
- **winCondition:** `pot_target_ball:9` + `pot_in_pocket:9:2` (top-right)
- **hint:** "Hit the 6 squarely. The 9 should kick into the corner."

---

## Tier 2 — Intermediate (eight setups; 2-3 cushions, basic spin, light combos)

### T2-01 — One-Rail Bank
- **tier:** 2
- **goldReward:** 18
- **timeLimitMs:** 35000
- **balls:** cue at (700, 413), 4-ball at (1100, 200)
- **winCondition:** `pot_target_ball:4` + `pot_in_pocket:4:5` (bottom-right) + `bank_minimum:1`
- **hint:** "Bank the 4 off the top rail into the bottom-right pocket."

### T2-02 — Three-Ball Combo
- **tier:** 2
- **goldReward:** 22
- **timeLimitMs:** 40000
- **balls:** cue at (300, 413), 1-ball at (600, 413), 3-ball at (900, 413), 5-ball at (1100, 413)
- **winCondition:** `pot_target_ball:5` + `pot_in_pocket:5:5`
- **hint:** "Chain combo: cue → 1 → 3 → 5 → corner."

### T2-03 — Through the Gauntlet
- **tier:** 2
- **goldReward:** 20
- **timeLimitMs:** 40000
- **balls:** cue at (200, 413), 4-ball at (1300, 413), obstacles: 6-ball at (700, 350), 7-ball at (700, 480)
- **winCondition:** `pot_target_ball:4` + `pot_in_pocket:4:2` (top-right)
- **hint:** "Thread the 4 between the obstacles. Don't touch the others."

### T2-04 — Cue Ball Position
- **tier:** 2
- **goldReward:** 20
- **timeLimitMs:** 35000
- **balls:** cue at (400, 600), 2-ball at (800, 400), 8-ball at (1100, 400)
- **winCondition:** pot the 2 (any pocket) AND end with the cue ball within 200px of the 8-ball
- **hint:** "Pot the 2 — then leave yourself shape on the 8."

*(Engineering note: this requires a post-shot positional check. Server validates final cue ball position vs the 8-ball position.)*

### T2-05 — Frozen Cushion Escape
- **tier:** 2
- **goldReward:** 22
- **timeLimitMs:** 35000
- **balls:** cue at (60+16, 413) (frozen to left cushion), 9-ball at (1400, 413)
- **winCondition:** `pot_target_ball:9` + `pot_in_pocket:9:2`
- **hint:** "Cue ball's on the rail. Get it clean and pot the 9."

### T2-06 — Cut into Side
- **tier:** 2
- **goldReward:** 20
- **timeLimitMs:** 35000
- **balls:** cue at (300, 200), 3-ball at (700, 300), 5-ball at (700, 100)
- **winCondition:** `pot_target_ball:5` + `pot_in_pocket:5:1` (top-middle)
- **hint:** "Cut the 5 backwards into the top-middle side pocket."

### T2-07 — Two-Ball Same Shot
- **tier:** 2
- **goldReward:** 24
- **timeLimitMs:** 35000
- **balls:** cue at (400, 413), 1-ball at (1300, 100), 2-ball at (1300, 700) (both close to corner pockets on the same side)
- **winCondition:** `pot_multiple:2` (any two balls in one shot)
- **hint:** "Both corners. One shot."

### T2-08 — Off the Eight
- **tier:** 2
- **goldReward:** 20
- **timeLimitMs:** 35000
- **balls:** cue at (300, 413), 8-ball at (700, 413), 3-ball at (1100, 413)
- **winCondition:** `pot_target_ball:3` + first-ball-contact must be 8-ball (NOT a foul because the 3 is the only object and it's the open-table-after-clearing convention) AND `pot_in_pocket:3:5`
- **hint:** "Glance off the 8 to pot the 3. Don't sink the 8."

*(Engineering note: this is a contrived setup — relaxing the first-touch rule for the trick shot's purposes. Catalogue can do this via an explicit `firstTouchAny: true` override.)*

---

## Tier 3 — Hard (eight setups; multi-rail, requires English, awkward angles)

### T3-01 — Two-Rail Bank
- **tier:** 3
- **goldReward:** 32
- **timeLimitMs:** 45000
- **balls:** cue at (400, 600), 8-ball at (400, 200)
- **winCondition:** `pot_target_ball:8` + `pot_in_pocket:8:5` (bottom-right) + `bank_minimum:2`
- **hint:** "Bank the 8 off two rails into the bottom-right."

### T3-02 — Three-Rail Length
- **tier:** 3
- **goldReward:** 38
- **timeLimitMs:** 50000
- **balls:** cue at (200, 100), 1-ball at (1300, 200)
- **winCondition:** `pot_target_ball:1` + `pot_in_pocket:1:0` (top-left) + `bank_minimum:3`
- **hint:** "Three rails. The long bank — patience."

### T3-03 — Back Cut
- **tier:** 3
- **goldReward:** 30
- **timeLimitMs:** 45000
- **balls:** cue at (1200, 600), 4-ball at (700, 400)
- **winCondition:** `pot_target_ball:4` + `pot_in_pocket:4:2` (top-right corner — opposite direction from natural)
- **hint:** "Back-cut the 4 into the top-right. Counter-natural angle."

### T3-04 — Massé
- **tier:** 3
- **goldReward:** 40
- **timeLimitMs:** 50000
- **balls:** cue at (700, 413), obstacle: 9-ball at (900, 413), target: 3-ball at (1100, 413)
- **winCondition:** `pot_target_ball:3` + first-ball-contact must be 3-ball (curving around the 9)
- **hint:** "Curve the cue ball around the 9. Heavy side-spin."

*(Uses our full sidespin physics. This is the showcase shot that proves the engine.)*

### T3-05 — Long Table Pot the 8
- **tier:** 3
- **goldReward:** 30
- **timeLimitMs:** 40000
- **balls:** cue at (100, 100), 8-ball at (1400, 700), several distracting balls around the rack area
- **winCondition:** `pot_target_ball:8` + `pot_in_pocket:8:5`
- **hint:** "Length of the table. Pot the 8 in the bottom-right."

### T3-06 — Frozen 8
- **tier:** 3
- **goldReward:** 34
- **timeLimitMs:** 45000
- **balls:** cue at (400, 413), 8-ball at (1440, 413-16) (frozen to top cushion near top-right pocket)
- **winCondition:** `pot_target_ball:8` + `pot_in_pocket:8:2`
- **hint:** "Pot the 8 — it's frozen to the cushion. Find a hit that drops it."

### T3-07 — Three Balls One Shot
- **tier:** 3
- **goldReward:** 42
- **timeLimitMs:** 45000
- **balls:** cue at (400, 413), 1-ball at (700, 600), 3-ball at (700, 226), 5-ball at (1100, 413)
- **winCondition:** `pot_multiple:3` (any three balls in one shot)
- **hint:** "Three balls. One shot. Power + spread."

### T3-08 — Draw Back Position
- **tier:** 3
- **goldReward:** 32
- **timeLimitMs:** 40000
- **balls:** cue at (700, 413), 1-ball at (1100, 413), 3-ball at (300, 413)
- **winCondition:** `pot_target_ball:1` + `pot_in_pocket:1:5` AND cue ball must end within 200px of the 3-ball
- **hint:** "Pot the 1 — then draw the cue back for the 3."

*(Heavy backspin to make cue reverse after potting the 1.)*

---

## Tier 4 — Expert (six setups; the famous shots, full physics, tight margins)

### T4-01 — The Z
- **tier:** 4
- **goldReward:** 60
- **timeLimitMs:** 60000
- **balls:** cue at (300, 700), 5-ball at (1100, 100), obstacle: 6-ball at (700, 413)
- **winCondition:** `pot_target_ball:5` + `pot_in_pocket:5:2` + `bank_minimum:2`
- **hint:** "Z-pattern. Two rails, over the obstacle, into the corner."

### T4-02 — Big Massé
- **tier:** 4
- **goldReward:** 70
- **timeLimitMs:** 60000
- **balls:** cue at (700, 413), four blocker balls in a tight ring around (900, 413), target: 8-ball at (1300, 600)
- **winCondition:** `pot_target_ball:8` + `pot_in_pocket:8:5`
- **hint:** "Massé around the blockers. Pot the 8 in the corner."

### T4-03 — Jump Shot
- **tier:** 4
- **goldReward:** 65
- **timeLimitMs:** 60000
- **balls:** cue at (400, 413), 9-ball at (700, 413) (blocker), target: 3-ball at (1100, 413)
- **winCondition:** `pot_target_ball:3` + first-ball-contact must be 3-ball (NOT the 9 — must jump over)
- **hint:** "Jump the 9. First contact must be the 3."

*(Engineering note: real jump-shots require 3D physics we don't have. V1 trick: provide a "jump" toggle in the shot params that the sim treats as "ignore the first blocker if the angle is steep enough". Document as a deliberate compromise.)*

### T4-04 — The Machine Gun
- **tier:** 4
- **goldReward:** 80
- **timeLimitMs:** 60000
- **balls:** cue at (400, 413), 5 balls arranged in a tight line at (800-1200, 413), targets are all of them
- **winCondition:** `pot_multiple:4` (pot ≥ 4 of the 5 lined-up balls in one shot)
- **hint:** "Power shot down the line. Pot at least four."

### T4-05 — The Cradle
- **tier:** 4
- **goldReward:** 75
- **timeLimitMs:** 60000
- **balls:** cue at (700, 413), 8-ball + cluster of 4 balls arranged so they all sit in a frozen cluster around (1100, 413). Target: pot ALL of them in one shot.
- **winCondition:** `pot_all_remaining` (the cluster of 5 specific balls)
- **hint:** "Cluster of five. Break it cleanly. All in."

### T4-06 — Mirror Shot
- **tier:** 4
- **goldReward:** 65
- **timeLimitMs:** 60000
- **balls:** cue at (100, 413), 8-ball at (700, 413), 3-ball at (1300, 413)
- **winCondition:** `pot_target_ball:3` + `pot_in_pocket:3:5` + `bank_minimum:3` (bank cue ball off three rails before potting the 3 by mere cue-to-3 contact — counter-intuitive routing)
- **hint:** "Bank the cue three times, then graze the 3 into the bottom-right."

*(The cue ball does the bank, the 3-ball is barely tapped. Tests fine cue-control.)*

---

## Scoring summary

| Tier | Setup count | Base G range per success | Time hint |
|---|---|---|---|
| 1 | 8 | 8-12 | 30s |
| 2 | 8 | 18-24 | 35-40s |
| 3 | 8 | 30-42 | 40-50s |
| 4 | 6 | 60-80 | 60s |

**Streak bonuses on top of base G:**
- 3-in-a-row → +5 G
- 5-in-a-row → +15 G + 5 TKT
- 10-in-a-row → +30 G + 15 TKT
- 20-in-a-row → +60 G + 50 TKT

**Perfect-run bonus** (zero misses across the entire run before banking): +50 G + 25 TKT.

## Server-held catalogue shape

When wiring into the backend, store as a single JSON catalogue (e.g. `server/services/pool/marathon-catalogue.js`) keyed by `id`. Server picks setups for each run from this catalogue per the auto-ladder algorithm:

```
runLogic:
  startingTierMix = [T1, T1, T2]           # opening 3 setups
  ladderAdvance = every 3 completed setups, shift the mix up one tier
  beyond run length 15 = recycle T4 setups indefinitely
```

So a player who completes 15 setups will have seen:
- Setups 1-3 from T1 (easy entry)
- Setups 4-6 from T1+T2 mix
- Setups 7-9 from T2+T3 mix
- Setups 10-12 from T3+T4 mix
- Setups 13+ from T4 only

This keeps the curve steep but earnable, and means the leaderboard's "highest streak" is genuinely meaningful — surviving 15+ setups requires Tier 4 competence.

## What's NOT in v0

Things deferred to v1+ of the catalogue:
- Seasonal trick shots (themed setups for events)
- Player-authored shots (community submissions, V4+)
- Variable rack starting positions for randomness within a setup (the 8-ball-on-break setup picks one of N legal break positions)
- Two-player co-op trick shots (V3+)

---

*Author: Claude. Initial draft for Side Pocket Marathon mode. Designer reviews stamps/timer copy; product reviews G values + leaderboard balance.*
