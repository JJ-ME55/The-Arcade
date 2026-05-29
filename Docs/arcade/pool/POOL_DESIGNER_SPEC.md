# Pool — Designer Spec (technical / functional)

> **For:** designer producing screen mockups.
> **From:** product / engineering (JJ + Claude).
> **Date:** 2026-05-29.
> **What this is:** Every screen, every CTA, every state, every currency widget. Functional contract — not visual direction.
> **What this is NOT:** Colour palette, typography, layout grid, motion language. Designer owns those — pool has its own visual language per JJ.
> **Companion docs:** [POOL_DESIGN_TARGET.md](POOL_DESIGN_TARGET.md) (gameplay spec), [POOL_DESIGN_HANDOFF.md](POOL_DESIGN_HANDOFF.md) (older brand-language brief — superseded by designer's own work).

---

## 1. Game in one paragraph

Asynchronous 8-ball pool. Lives inside The Arcade hub at `/play/pool`. Three persistent currencies (Gold pool-only, Tickets arcade-wide, SOL real crypto). Six game modes (Quick Match, Wagered Match, vs Computer, Tournament, Marathon, Practice). Server-authoritative physics. Skill-based matchmaking (ELO, never coin-balance). Match cadence: 45s sync timer per shot, 12h async window, 72h match wall-clock cap. Cues + felts are purely cosmetic — never affect gameplay.

---

## 2. Currencies — the model the designer needs to internalise

Three currencies, always visible. Display order in masthead (left → right): **SOL · TKT · G**.

### 2.1 SOL (real crypto)
- **Source:** Privy wallet (auto-created on sign-in).
- **Top up:** Apple Pay → SOL (Privy native flow) or paste address from any wallet.
- **Earned in pool:** wagered-match winnings only.
- **Spent in pool:** wagered-match stakes only.
- **Format:** `0.42 SOL` (2 decimals). Below 0.01 → `< 0.01 SOL`. Above 999 → `1.2k SOL`.
- **Convertibility:** can buy Tickets (1-way swap). Cannot buy Gold directly. Cannot be earned via Tickets or Gold conversion.

### 2.2 Tickets (TKT) — arcade-wide
- **Source:** earned by playing (1-3 per match floor + ~100 for leaderboard placement) OR bought with SOL.
- **Spent in pool:** premium cue/felt purchases, tournament entry (V3), prestige promotion (V3).
- **Spent arcade-wide:** the `/prizes` redemption shop (V3 — gift cards, premium passes).
- **Format:** `1,840 TKT`. Above 99,999 → `123k TKT`.
- **Convertibility:** buyable with SOL. **NEVER sellable** (one-way valve, non-negotiable).

### 2.3 Gold (G) — pool only
- **Source:** match wins, daily login bonus, achievement rewards, marathon high-scores.
- **Spent:** base catalogue cues + felts, free-entry tournaments, in-game consumables (chalk, hints).
- **Format:** `1,247 G`. Above 999,999 → `1.2M G`.
- **Convertibility:** buyable with Tickets (1 TKT = 100 G, indicative). **NEVER sellable**.

### 2.4 Why three currencies and what each does
- **SOL** = real-money rail. PvP stakes, cashout gate.
- **TKT** = cross-game equality. The arcade-wide "you exist here" token.
- **G** = pool-specific reward density. Every match should feel like Gold dripping in — small numbers, frequent rewards, lots of small purchases.

### 2.5 Wallet display rules
- If SOL balance = 0 and the user attempts a wagered action → top-up modal (§7.34.2).
- If TKT balance < entry cost for a Ticket-gated action → buy Tickets modal (§7.34.3).
- If G balance < cost for a Gold purchase → "Win more matches" toast + dismiss.

---

## 3. Modes — what each one is, technically

### 3.1 Quick Match (1v1 free play)
- Matchmaking: ELO-based (±100 spread, expands every 10s).
- Stake: none. No SOL escrow.
- Currency in: +10–50 G on win (variable, ELO-weighted), +1–3 TKT per match floor, +100 TKT for daily leaderboard placement.
- Currency out: 0.
- ELO impact: yes (both players gain/lose).
- Match format: BO1 default. BO3 / BO5 togglable.

### 3.2 Wagered Match (1v1 SOL stake)
- Matchmaking: ELO-based, narrower spread (±50).
- Stake: SOL only. Stake amounts: 0.01 / 0.05 / 0.1 / 0.5 / 1 / 5 SOL (tiered).
- Escrow: both players' SOL locked in on-chain escrow before match start. Anchor program `match-escrow-v3`.
- Settlement: 90% winner / 7% treasury / 3% ops (standard SolShot pattern).
- Currency in: 1.8× stake to winner (after 10% rake), +TKT floor & placement same as Quick.
- Currency out: stake amount goes into escrow.
- ELO impact: yes.
- Match format: BO1 / BO3 / BO5 selectable; higher stakes → longer formats.

### 3.3 vs Computer (4 difficulty levels)
- Opponent: AI bot, four levels (Easy / Medium / Hard / Insane).
- Stake: none.
- Currency in: +5–25 G on win against bot (lower than PvP), +1 TKT per match floor (no placement bonus — bots don't count toward leaderboard).
- ELO impact: none (separate practice ELO if implemented — not in V1 leaderboard).
- Use case: warmup, learning, daily challenges (V3).

### 3.4 Tournament
- Format: 8 / 16 / 32-player single-elimination brackets.
- Cadence: 4 active tournaments at any time (Daily, Weekly, Monthly Free, Monthly Paid).
- Entry: Gold (free tournaments) OR Tickets (paid tournaments). NEVER SOL.
- Prize pool: sum of entries × 90% (10% rake → treasury). Paid in same currency as entry.
- Prize distribution: 50/25/10/5/3/3/2/1/0.5/0.5 of pool to top 10 (8-player tourneys collapse to top 8 with redistributed weights).
- Match format: BO1 in early rounds, BO3 finals.
- ELO impact: yes (each match counts).
- All matches in a tournament must complete within a wall-clock window (24h for Daily, 7d for Weekly, etc).

### 3.5 Marathon (solo high-score)
- Format: player vs an unbroken chain of bots, each round harder than the last.
- Scoring: TWO score types, displayed separately:
  - **Streak**: consecutive wins (1 → 2 → 3 → …).
  - **Perfect Tables**: number of bots beaten without missing a single shot.
- Stake: none.
- Currency in: +G per round won (rising amounts), bonus TKT at milestone streaks (5, 10, 20, etc).
- Leaderboard: daily + weekly + all-time. Per-bot-difficulty boards too (Easy marathon ≠ Insane marathon).
- ELO impact: none.
- Session ends: when player loses a match OR voluntarily cashes out.
- Cash-out: locks in score; G rewards drop into pool wallet immediately.

### 3.6 Practice (no-stakes solo)
- Format: solo at the table, no opponent, no clock.
- Stake: none. No rewards. No ELO.
- Use case: experimenting with spin/angles, learning a felt.
- Always available, even when offline.

---

## 4. ELO + matchmaking — the technical rules

- Default starting ELO: 1000.
- K-factor: 32 (sharp early, settles fast).
- Matchmaking spread: starts at ±100, +50 every 10s, max ±400.
- New accounts: marked "Provisional" for first 10 matches — wider spread (±200), exempt from leaderboard placement bonus.
- Floor: ELO cannot drop below 200. (Prevents intentional smurf-tanking.)
- Decay: -5 ELO per week of inactivity (caps falloff so returning players don't get rusted matches).
- Display: rounded to nearest 10 (`1,247 ELO` → `1,250 ELO`).

**Anti-smurf rules:**
- New accounts cannot enter wagered matches above 0.05 SOL until 25 PvP matches played.
- New accounts cannot enter paid tournaments until 10 PvP matches played.

---

## 5. Tournament system — technical detail

### 5.1 Bracket types
- 8-player (3 rounds: QF → SF → F)
- 16-player (4 rounds)
- 32-player (5 rounds)

### 5.2 Tournament types — what's running
At any time, the system shows up to 4 tournaments:

| Type | Frequency | Entry | Bracket | Prize pool source |
|------|-----------|-------|---------|-------------------|
| Daily Free | 1 per day, midnight UTC | 100 G | 8-player | Entry × 8 × 90% |
| Daily Paid | 1 per day, 6pm UTC | 5 TKT | 16-player | Entry × 16 × 90% |
| Weekly Showcase | Every Sunday | 25 TKT | 32-player | Entry × 32 × 90% |
| Monthly Championship | 1st of month | 100 TKT | 32-player | Entry × 32 × 90% + 10,000 TKT treasury sponsor |

### 5.3 Bracket progression
- Players queue, bracket fills, tournament starts at scheduled time.
- Each round = a match. Winner advances. Loser eliminated, sees final placement.
- Round wall-clock: 1h per round (longer for Weekly/Monthly).
- If a player no-shows a round → forfeit, opponent auto-advances.

### 5.4 Prize distribution (per Miniclip pattern, modified for our brackets)
- 8-player: 1st 60%, 2nd 25%, 3rd–4th 7.5% each.
- 16-player: 1st 40%, 2nd 20%, 3rd–4th 10% each, 5th–8th 5% each.
- 32-player: 1st 30%, 2nd 15%, 3rd–4th 7.5% each, 5th–8th 3.75% each, 9th–16th 1.25% each.

### 5.5 Sponsor / event tournaments (V3.5)
Special tournaments with custom prizes (limited-edition cue, soulbound trophy, real-cash gift voucher). Designer should plan for sponsor-branding overlays on bracket pages.

---

## 6. The screens — every one we need

Each screen below specifies: **route · purpose · data · CTAs · states · currency widgets**.

### 7.1 Splash / Loading
- **Route:** entry transition into `/play/pool/launch`.
- **Purpose:** brand impression + asset load.
- **Data:** pool wordmark, loading progress (% or bar).
- **CTAs:** none (auto-advances).
- **States:** loading 0–100% → done → fades to Main Menu.
- **Currency widgets:** none.

### 7.2 Main Menu (top-level hub for pool)
- **Route:** `/play/pool/launch` post-splash.
- **Purpose:** the room. All modes radiate from here.
- **Data shown:** player handle, signet, prestige tier badge, current ELO.
- **CTAs:**
  - **PLAY** — primary, opens Mode Select modal (§7.3).
  - **VS COMPUTER** — secondary, opens difficulty modal (§7.5).
  - **TOURNAMENTS** — secondary, opens Tournament List (§7.10).
  - **MARATHON** — secondary, opens Marathon start (§7.14).
  - **PRACTICE** — tertiary, jumps straight to free-play table (§7.36).
  - **CUE LOCKER** (link in side rail) → §7.26.
  - **POOL SHOP** (link in side rail) → §7.28.
  - **PROFILE** (signet click) → §7.32.
  - **DAILY CHALLENGE** card (centre) — only shown if user hasn't completed today's challenge. CTA: **TAKE THE SHOT**.
- **States:**
  - Default
  - Daily challenge completed (badge "DONE TODAY ✓", challenge card replaced by tomorrow's preview)
  - Tournament about-to-start (live banner: "Daily Free starts in 12:34")
  - Provisional player (badge near ELO: "PROVISIONAL · 7/10")
- **Currency widgets:** masthead = SOL · TKT · G (always present).

### 7.3 Mode Select Modal (PLAY button)
- **Purpose:** pick Quick or Wagered, plus format.
- **Data shown:** current ELO, recommended stake range.
- **CTAs (top-level tabs):**
  - **QUICK MATCH** (free) — selected by default
  - **WAGERED MATCH** (real SOL)
- **CTAs (sub-controls, Wagered tab):**
  - Stake selector (radio buttons): 0.01 · 0.05 · 0.1 · 0.5 · 1 · 5 SOL
  - Format toggle: BO1 / BO3 / BO5
  - "What's the rake?" tooltip (10% — 7% treasury, 3% ops)
- **CTAs (footer):**
  - **FIND MATCH** — primary, kicks off matchmaking (§7.4).
  - **CANCEL** — closes modal.
- **States:**
  - Wagered tab + insufficient SOL → FIND MATCH disabled, "TOP UP" CTA appears next to balance.
  - Provisional player + stake > 0.05 SOL → stake disabled, tooltip "Available after 25 PvP matches".
- **Currency widgets:** masthead always; balance check inline next to stake selector.

### 7.4 Matchmaking — finding opponent
- **Route:** post-FIND MATCH press.
- **Purpose:** show search progress, allow cancel.
- **Data:** "Searching ELO 1,170–1,330 · 12s" → expands range every 10s.
- **CTAs:** **CANCEL SEARCH** (only).
- **States:**
  - Searching
  - Found → cuts to §7.5
  - Timeout (60s, no opponent) → suggestion modal: "No opponents in range. Try VS COMPUTER or relax stake?" with CTAs: KEEP SEARCHING / VS COMPUTER / CHANGE STAKE.
- **Currency widgets:** masthead. If wagered: stake amount displayed centred ("Stake: 0.05 SOL").

### 7.5 Opponent Reveal — pre-match
- **Purpose:** the staredown — both players see each other for 5s before the match starts.
- **Data:** both players' handle, signet, prestige badge, ELO, head-to-head record (if any).
- **CTAs:**
  - **READY** — confirms ready; match starts when both ready or 5s timer expires.
  - **FORFEIT** — exits the match (penalty: ELO loss + stake forfeit if wagered).
- **States:**
  - You ready, them not yet
  - Them ready, you not yet
  - Both ready (instant start)
  - Forfeit confirmation modal ("You'll lose ELO and your stake. Confirm?" YES/NO)
- **Currency widgets:** masthead always; stake centred if wagered.

### 7.6 vs Computer — difficulty select
- **Route:** post VS COMPUTER tap from main menu.
- **Purpose:** pick bot opponent.
- **Data:** 4 bot cards (Easy 600 ELO / Medium 900 / Hard 1,200 / Insane 1,500). Each shows: difficulty name, estimated reward (G).
- **CTAs:**
  - Tap a card → "PLAY EASY" / "PLAY MEDIUM" etc.
  - **BACK** — return to main menu.
- **States:** none beyond default.
- **Currency widgets:** masthead.

### 7.10 Tournament List
- **Route:** `/play/pool/tournaments`.
- **Purpose:** browse all active + upcoming tournaments.
- **Data per tournament card:**
  - Name (e.g., "Daily Free")
  - Status pill: REGISTERING / LIVE / FINISHED
  - Entry cost (100 G / 5 TKT / 25 TKT / 100 TKT)
  - Bracket size (8 / 16 / 32)
  - Prize pool total + currency
  - Top 3 prize amounts (mini display)
  - Time until start OR time remaining
  - Entrants filled (X / Y)
- **CTAs:**
  - **ENTER** (per card) — if registering and you have funds → goes to §7.11.
  - **WATCH** (per card) — if live → opens bracket spectator view (§7.13).
  - **VIEW RESULTS** (per card) — if finished → final bracket + your placement.
- **States:**
  - Empty (no active tournaments — rare): friendly empty state ("Next tournament starts in 0:30:00")
  - You're already in this tournament: ENTER button → "YOU'RE IN — VIEW BRACKET".
- **Currency widgets:** masthead; entry cost in card with currency icon.

### 7.11 Tournament Detail — pre-entry
- **Route:** `/play/pool/tournaments/<id>`.
- **Purpose:** full info + entry confirmation.
- **Data:**
  - Hero: tournament name, banner art, sponsor branding (if applicable)
  - Entry cost + your balance check
  - Bracket size + entrants filled
  - Full prize distribution table (1st: X / 2nd: Y / etc.)
  - Schedule: starts at, expected duration
  - Rules: BO1 / BO3, forfeit policy, ELO impact
  - Past winners (last 3 instances of this tournament type)
- **CTAs:**
  - **ENTER FOR [cost]** — primary; deducts entry, places you in bracket.
  - **REMIND ME** — tertiary; sends a TG ping 10 min before start.
  - **BACK**.
- **States:**
  - Insufficient funds → ENTER disabled, "TOP UP" or "WIN MORE GOLD" CTA inline.
  - Already entered → ENTER replaced by "YOU'RE IN — VIEW BRACKET".
- **Currency widgets:** masthead; entry cost prominent; balance check inline.

### 7.12 Tournament Bracket View
- **Route:** `/play/pool/tournaments/<id>/bracket`.
- **Purpose:** see your path + everyone else's progress.
- **Data:**
  - Visual bracket (8/16/32 boxes)
  - Your slot highlighted
  - Current round highlighted (live indicator on active matches)
  - Each match: two players, score, status (UPCOMING / LIVE / WON / LOST)
  - Time until next round
  - Prize pool position indicator
- **CTAs:**
  - **READY UP** — if your next match is starting, primary CTA.
  - **WATCH** (on a live match you're not in) → spectator view.
  - **BACK TO LIST**.
- **States:**
  - You eliminated → shows your final placement + prize won (if any) + "REMATCH NEXT TOURNAMENT" CTA.
  - You won the tournament → champion overlay (§7.24).
- **Currency widgets:** masthead.

### 7.13 Tournament Pre-Round Waiting Room
- **Purpose:** brief lobby before each round.
- **Data:** opponent reveal (handle, ELO, prestige), round timer (sync 30s).
- **CTAs:** **READY** — same pattern as §7.5.
- **States:** waiting / both ready / forfeit confirmation.
- **Currency widgets:** masthead.

### 7.14 Marathon — Start
- **Route:** `/play/pool/marathon`.
- **Purpose:** pick difficulty floor, see your records.
- **Data:**
  - Personal bests: Streak record, Perfect Tables record (per difficulty)
  - Daily / Weekly leaderboard top 3 (with your standing)
  - Difficulty toggle: Easy / Medium / Hard / Insane (starts the marathon at this difficulty; rises from there)
  - "What you'll earn" reward table by streak milestone
- **CTAs:**
  - **START RUN** — primary; begins marathon session.
  - **VIEW LEADERBOARD** — opens marathon-specific board.
- **States:** default; high-score-just-broken banner ("YOU SET A NEW STREAK RECORD — share?").
- **Currency widgets:** masthead.

### 7.15 Marathon — In-Session HUD
- **Purpose:** standard match HUD + marathon-specific overlays.
- **Data:**
  - Standard HUD (§7.18)
  - Streak counter: "STREAK: 7 · NEXT BONUS at 10"
  - Perfect Tables counter: "PERFECT: 3"
  - Current bot difficulty + ELO
  - Cash-out button: "BANK STREAK" (locks in score, exits marathon)
- **CTAs:** all standard match CTAs + **BANK STREAK** (top right).
- **States:** mid-shot / between bots / round-end transition.
- **Currency widgets:** masthead; G earned during marathon shown as accumulating bar at top.

### 7.16 Marathon — Round-End Card
- **Purpose:** between-bot transition.
- **Data:** "Round 7 won — Perfect table! · +25 G · Next bot: Hard 1,200 ELO · Streak now 7"
- **CTAs:** **CONTINUE** (auto-advances after 5s) or **BANK STREAK** (cash out now).
- **States:**
  - Win → continue
  - Loss → marathon over → §7.25 (marathon end card)
- **Currency widgets:** G earned this run.

### 7.18 In-Match HUD (the core gameplay screen — universal)
- **Purpose:** play pool.
- **Layout zones:**
  - **Top bar:** player blocks (you left, opponent right), centre = stake (or BO5 score / round name in non-wagered modes), shot clock when in sync mode.
  - **Mid (canvas):** the table — felt, balls, cue, aim line, pockets, cue ball spin indicator.
  - **Bottom strip:** SPIN widget (left) · POWER slider (centre) · CHAT (right of centre) · READY TO SHOOT (far right, primary).
- **Data shown:**
  - Both players: handle, signet, prestige badge, ball group (stripes/solids/open), balls remaining, win-streak indicator.
  - Active player highlight: brass/accent glow on their block.
  - Sync timer: 45s ring around cue ball + giant clock number top-centre, red at 10s.
  - Aim guide overlay: solid line to first contact + colored line for object ball deflection + dotted one-bounce.
- **CTAs:**
  - **READY TO SHOOT** — primary, transitions async → sync.
  - **SPIN widget** — tap to open cue-ball impact-point modal.
  - **POWER slider** — drag to set power.
  - **CHAT** — tap to open canned phrase wheel (§7.20).
  - **MENU** (top-right) — pause overlay with: SURRENDER · SETTINGS · BACK TO LOBBY.
- **States:**
  - Async (your turn, unlimited think)
  - Sync (45s ticking)
  - Their turn (controls dimmed, "@OpponentHandle is shooting…" overlay)
  - Async waiting (multi-hour gap, they haven't shot yet) → §7.19
  - Foul / ball-in-hand (§7.21)
  - Pause modal open
  - Surrender confirmation
- **Currency widgets:** masthead. If wagered: stake centred top.

### 7.19 Async Waiting Screen — "their turn"
- **Purpose:** what you see when you've shot and opponent has 12h to take their turn.
- **Data:**
  - Static screenshot of the table state (the last shot result frozen)
  - Opponent name + "Has up to 12h to take their turn"
  - Countdown
  - Notification preferences: "Notify me when they shoot" toggle
- **CTAs:**
  - **NOTIFY ME** — sets push notification.
  - **WATCH MORE POOL** — shows curated highlights or steers to other arcade games.
  - **BACK TO LOBBY** — leaves the screen; match continues in background.
- **States:**
  - Default
  - Opponent shooting now → cuts to live match view.
  - Opponent forfeited window → "WIN BY FORFEIT — claim your prize" CTA.
- **Currency widgets:** masthead.

### 7.20 Chat Modal — canned phrases
- **Purpose:** opponent communication, harassment-proof.
- **Data:** 8 default phrases ("Nice shot 🎱", "GG 🤝", "Sorry, AFK 🛌", "Wow 😮", "Tough break 😬", "GLHF 🍀", "Your turn 👀", "🤔") + unlocked phrase-pack additions.
- **CTAs:** tap a phrase to send. **CLOSE** dismisses.
- **States:** cooldown active (10s between sends — visible timer).
- **Currency widgets:** none.

### 7.21 Foul / Ball-in-Hand Overlay
- **Purpose:** when opponent fouls, you place the cue ball.
- **Data:** "PLACE CUE BALL, THEN SHOOT" + overlay arrow at cue ball + dragable cue ball.
- **CTAs:** drag-and-drop cue ball → "READY TO SHOOT" once placed.
- **States:** waiting-for-placement / placed-can-shoot / sync-timer-running.
- **Currency widgets:** masthead.

### 7.22 Post-Shot Result Toast
- **Purpose:** instant feedback after a shot.
- **Data:** stamped overlay ("STRIPES DOWN" / "SOLIDS DOWN" / "SCRATCH!" / "8-BALL POCKETED" / "FOUL — BALL IN HAND TO @opponent"). Sub-line: balls remaining count change.
- **CTAs:** none — auto-dismisses in 2s.
- **States:** transient overlay.
- **Currency widgets:** none.

### 7.23 Match-End — Pool Card (Quick + vs Computer)
- **Purpose:** shareable result.
- **Data:**
  - Big result: "VICTORY" / "DEFEAT"
  - Final score (5-3)
  - Duration (wall-clock + active-thinking time)
  - Shot count, best run (e.g., "Longest run: 4 balls")
  - ELO change ("+12 → 1,247 ELO")
  - Gold earned: +18 G
  - Tickets earned: +1 TKT (floor) + maybe +100 TKT (placement) ← shown as separate lines
- **CTAs:**
  - **REMATCH** — primary, instant re-queue with same opponent (if they accept).
  - **NEW MATCH** — back to lobby for fresh matchmaking.
  - **SHARE** — exports Pool Card as image (TG share / clipboard).
  - **BACK TO LOBBY** — returns to main menu.
- **States:**
  - Win
  - Loss
  - Draw (rare, 8-ball doesn't draw normally — but timeout scenarios)
  - Rematch pending (opponent hasn't responded)
  - Rematch accepted (cuts to §7.4)
- **Currency widgets:** earned rewards highlighted prominently; masthead reflects new balances.

### 7.24 Match-End — Wagered (payout reveal)
- **Purpose:** wagered match result + on-chain settlement.
- **Data:** everything from §7.23 plus:
  - Big payout reveal: "+0.18 SOL" (90% of pot — winner) or "−0.10 SOL" (loser)
  - Treasury cut shown (7%) — small italic text "treasury · 0.014 SOL"
  - Ops cut shown (3%) — small italic text "ops · 0.006 SOL"
  - On-chain settlement TX link (Solscan)
  - Updated SOL balance reveal (animated count-up)
- **CTAs:** same as §7.23 plus **VIEW ON SOLSCAN** (opens TX in new tab).
- **States:** settling (loading) → settled → rendered.
- **Currency widgets:** masthead.

### 7.25 Match-End — Marathon Run End
- **Purpose:** end of a marathon session.
- **Data:**
  - "MARATHON OVER" header
  - Final streak: 7
  - Perfect tables: 3
  - Total G earned this run
  - Highest difficulty reached
  - Personal record? (banner if so)
  - Daily / Weekly leaderboard standing
- **CTAs:**
  - **NEW RUN** — starts a fresh marathon.
  - **SHARE STREAK** — export card.
  - **BACK TO LOBBY**.
- **Currency widgets:** masthead.

### 7.26 Cue Locker
- **Route:** `/play/pool/locker/cues`.
- **Purpose:** browse owned + locked cues.
- **Data per cue:**
  - Cue thumbnail
  - Cue name
  - Rarity tier (Common / Rare / Epic / Legendary / Soulbound Limited-Edition)
  - Ownership status (OWNED / locked with unlock condition)
  - Decorative stat sheet (display-only, NEVER affects gameplay — per OD-1)
  - If owned: EQUIP button.
  - If locked: unlock condition (e.g., "Reach Bronze prestige" or "1,200 G" or "5 TKT")
- **CTAs:**
  - **EQUIP** (per owned cue) → swaps to active cue.
  - **PREVIEW** → opens detail modal (§7.30).
  - **GO TO SHOP** → §7.28 (if user wants to buy locked cue).
- **States:**
  - Default grid view
  - Filter tabs: ALL / OWNED / LOCKED / LIMITED EDITION
  - Search by name
- **Currency widgets:** masthead.

### 7.27 Felt Locker
- Same pattern as §7.26 for felt/table skins.
- Felts include: classic green, slate blue, burgundy, midnight black, custom decal felts (V3 — sponsor / event branded).

### 7.28 Pool Shop — Gold tab
- **Route:** `/play/pool/shop`.
- **Purpose:** spend Gold on base catalogue.
- **Data:**
  - Item cards (cue or felt)
  - Each card: thumbnail, name, rarity tier, Gold cost, "what it unlocks" text
  - Filter: cues / felts / consumables (chalk, hints)
  - Sort: cheapest / newest / rarest
- **CTAs:**
  - **BUY [cost] G** (per card) → confirm modal → debit + add to locker.
  - **PREVIEW** → detail modal.
- **States:**
  - Sufficient Gold: BUY active.
  - Insufficient Gold: BUY disabled with "Win 320 more G" inline.
  - Already owned: card greyed with "OWNED" stamp.
- **Currency widgets:** masthead; Gold balance prominent.

### 7.29 Pool Shop — Tickets tab
- Same pattern as §7.28 but priced in TKT.
- Premium catalogue: rarer cues, premium felts, limited editions, season passes.
- TKT prices indicative: 5 / 15 / 50 / 150 TKT.
- Limited-Edition section highlighted: "LIMITED — 4 days left" banner, supply remaining counter.
- **Soulbound on purchase** (cannot be resold by purchaser — V3 rule #4).

### 7.30 Cue / Felt Detail Modal
- **Purpose:** see full item, zoom, animation preview, story.
- **Data:**
  - Hero artwork
  - Name, rarity, edition number (for limited)
  - Decorative stat sheet (display only)
  - Drop history / earnable conditions
  - If applicable: cosmetic animation preview (e.g., "evolving cue" — V3 feature)
- **CTAs:** **EQUIP** / **BUY** / **CLOSE**.
- **Currency widgets:** masthead.

### 7.31 Prestige Tier Screen
- **Route:** `/play/pool/prestige`.
- **Purpose:** see current tier + path to next.
- **Data:** 6 tiers (Unranked / Bronze / Silver / Gold / Platinum / Diamond). For each:
  - Badge
  - Tier name
  - Unlock condition (V1: skill-gated — "Win 10 matches with 55% WR"; V3 adds: "OR burn 100 TKT")
  - Cosmetic reward (cue + felt + signet ring tint)
- **CTAs:**
  - **CLAIM** (per achieved tier) → confirm + unlock cosmetics.
  - **PROMOTE EARLY** (V3 only) — "Skip to next tier for 100 TKT" → confirm modal.
- **States:** current tier glow; locked tiers dashed/grey; claimable tier highlighted.
- **Currency widgets:** masthead.

### 7.32 Profile / Stats / History
- **Route:** `/play/pool/profile`.
- **Purpose:** full pool record for this player.
- **Data sections:**
  - Header: handle, signet, prestige tier, ELO, joined date
  - Lifetime stats: total matches, wins, losses, win rate, longest streak, longest single-turn run, total Gold won, total Tickets won, total SOL won
  - Recent matches: scrollable list (opponent, result, ELO change, stake/winnings)
  - Tournament history: entered, podiums, championships
  - Marathon records: highest streak, most perfect tables, all-time / weekly / daily standings
  - Cue collection completion: X / Y owned
- **CTAs:**
  - **VIEW MATCH** (per recent match) → match detail page (replay if recorded, full Pool Card).
  - **SHARE PROFILE** → exports profile card.
- **States:** loading / loaded / empty (new player).
- **Currency widgets:** masthead.

### 7.33 Leaderboards (pool-specific)
- **Route:** `/play/pool/leaderboard`.
- **Purpose:** competitive standing in pool, multiple boards.
- **Data tabs:**
  - **ELO** (rate-based — primary)
  - **Tickets earned** (V3 cumulative for the period)
  - **Marathon streak** (per difficulty)
  - **Tournament podiums** (most podium finishes)
- **Time window toggle:** 24h / 7d / all-time.
- **Per row:** rank, signet, handle, prestige badge, metric value, Δ since yesterday.
- **Right rail: Your Standing** (your row, what's above/below you).
- **CTAs:** **VIEW PROFILE** (tap a row) / **FRIENDS ONLY** toggle (V3).
- **States:** loading / loaded / your-rank-changed banner.
- **Currency widgets:** masthead.

### 7.34 Wallet Integration Sub-Screens

#### 7.34.1 Wallet Snapshot (sidebar / dock)
Always-available drawer triggered by tapping any currency in masthead.
- **Data:**
  - SOL balance (with USD equivalent in small text)
  - TKT balance + earn rate this week
  - G balance + earn rate this week
  - Recent transactions (last 5)
- **CTAs:**
  - **TOP UP SOL** → §7.34.2
  - **BUY TICKETS** → §7.34.3
  - **CASH OUT** → §7.34.5 (V3, V1 = Bitrefill deep link)
  - **VIEW FULL LEDGER** → routes to arcade-wide `/wallet`

#### 7.34.2 Top Up SOL Modal
- **Data:** stake-amount selector (0.05 / 0.1 / 0.5 / 1 / 5 SOL) + payment method (Apple Pay / Card via Privy / "I'll send SOL myself" copy-address option).
- **CTAs:** **PAY [amount]** → Privy flow / **CANCEL**.
- **States:** awaiting payment / processing / settled / failed.

#### 7.34.3 Buy Tickets Modal
- **Data:** Ticket-pack tiers (e.g., 100 TKT for 0.02 SOL, 500 TKT for 0.09 SOL — discount on higher tiers).
- **Each tier shows:** TKT amount, SOL cost, bonus % vs base rate.
- **CTAs:** **BUY [amount]** → confirms purchase.
- **States:** sufficient SOL / insufficient SOL (→ §7.34.2).

#### 7.34.4 Buy Gold Modal
- **Data:** Gold packs in TKT prices.
- **CTAs:** **BUY [amount] G FOR [cost] TKT**.

#### 7.34.5 Cash Out — Bitrefill (V1) / In-app shop (V3)
- **V1:** opens external Bitrefill flow with `solana:` URI prefilled, user picks gift card brand & amount, code emailed.
- **V3:** in-app gift card browser, redeem with TKT.

### 7.35 Settings
- **Route:** `/play/pool/settings`.
- **Sections + controls:**
  - **Gameplay:** Aim guideline ON/SHORT/OFF · Aiming wheel (drag-cue / dedicated wheel) · Cue sensitivity slider · English-physics enabled (V3 advanced).
  - **Audio:** Master on/off · SFX on/off · Music on/off · Volume.
  - **Visual:** Colour-blind mode · Reduced motion · Performance mode (low-end devices).
  - **Notifications:** Your turn alerts · Match expiring · Tournament starting · Marathon record broken.
  - **Account:** Linked wallet (Privy) · Signed-in handle · Sign out · Delete account.
  - **Chat:** Enabled / Disabled · Unlocked phrase packs.
  - **Privacy:** Show in leaderboards · Show in profile search.
  - **Open in Safari** (TG WebView escape hatch) — link.
- **CTAs:** **SAVE** (if dirty) / **CLOSE**.

### 7.36 Help / How to Play
- Modal launched from settings or first-time tutorial.
- Animated walkthrough: aiming, power, spin, foul rules, 8-ball win condition.
- CTAs: **NEXT** / **PREV** / **SKIP** / **CLOSE**.

### 7.37 Disconnect / Reconnect Overlay
- **Trigger:** mid-match network loss.
- **Data:** "RECONNECTING… 28s" countdown + opponent state ("opponent is still here").
- **CTAs:** **RECONNECT NOW** / **FORFEIT** (after 30s timeout).
- **States:** reconnecting / reconnected / forfeit-triggered.

### 7.38 Empty States / Errors

| State | Where | Copy | CTA |
|-------|-------|------|-----|
| No active tournaments | §7.10 | "Next tournament: 0:30:00. Quick match while you wait?" | QUICK MATCH |
| Insufficient SOL for stake | §7.3 | "You need 0.05 SOL to stake. Top up or play a free Quick Match." | TOP UP / QUICK MATCH |
| Insufficient TKT for entry | §7.11 | "Need 25 TKT — you have 18. Earn more or buy a pack." | EARN / BUY |
| Insufficient Gold | §7.28 | "Need 320 more G. Win a few matches!" | DISMISS |
| Match expired (12h timeout) | from notification | "Your opponent didn't shoot in time. You win by forfeit." | CLAIM WIN |
| Match wall-clock cap hit (72h) | from notification | "Match expired. Logged as draw — no ELO impact." | OK |
| No opponents in range | §7.4 | "No one to play right now. Switch to VS COMPUTER?" | VS COMPUTER / CHANGE STAKE |
| Match disconnected, can't reconnect | from §7.37 | "Connection lost. Match forfeited. We'll restore your stake if proven server-side issue." | OK / CONTACT SUPPORT |

---

## 8. HUD components used across multiple screens

### 8.1 Masthead (top, always)
| Slot | Content | Tap behaviour |
|------|---------|----------------|
| Left | Pool wordmark · BACK arrow (to Arcade hub) | back to `/play` |
| Centre-left | Mode label ("MAIN MENU" / "MATCHMAKING" / etc.) | none |
| Centre-right | Signet (avatar + ring) | opens profile drawer |
| Right (1) | `0.42 SOL` chip | opens wallet snapshot (§7.34.1) |
| Right (2) | `1,840 TKT` chip | opens wallet snapshot |
| Right (3) | `1,247 G` chip | opens wallet snapshot |
| Far right | Menu icon | opens pool main menu |

### 8.2 Mobile dock (bottom, on supported routes)
5 icons: HOME (back to Arcade) / PLAY / TOURNAMENTS / LOCKER / WALLET.

### 8.3 Toast system
- **Bottom-of-screen toast for transient feedback.**
- Examples: "🏆 +18 G earned · ELO +12" / "🎟️ +1 TKT (daily floor)" / "⏰ Their turn — they have 11h left".
- Auto-dismisses in 3s, swipe to dismiss early.

### 8.4 Modal system
- All modals: scrim background, centred card, close-X top-right, primary CTA bottom-right.
- Mobile: full-sheet modals.

---

## 9. Cross-cutting copy + format rules

### 9.1 Currency display
| Context | Format |
|---------|--------|
| Masthead chip | `0.42 SOL` / `1,840 TKT` / `1,247 G` |
| Earned in match (toast) | `+0.18 SOL` / `+5 TKT` / `+18 G` |
| Cost (shop, entry) | `5 TKT` / `100 G` |
| Stake (centred in match) | `Stake: 0.05 SOL` |
| Pot (centred in match) | `Pot: 0.1 SOL` |
| Empty balance | `0 SOL` (not `—`, not `Empty`) |
| Below 0.01 SOL | `< 0.01 SOL` |

### 9.2 Outcome wording
- Match win: **VICTORY** (preferred over "YOU WIN" or "WINNER").
- Match loss: **DEFEAT** (over "YOU LOSE").
- Tournament win: **CHAMPION** (over "WINNER").
- Marathon end: **RUN ENDED** (over "OVER" or "FAILED").

### 9.3 Action verbs (button copy patterns)
- Primary CTAs: short imperative — **PLAY**, **STAKE**, **ENTER**, **BUY**, **CLAIM**.
- Confirm/cancel: **YES, [verb]** / **CANCEL** (avoid bare YES/NO).
- Destructive: **SURRENDER**, **FORFEIT**, **DELETE** — always with confirm modal.

### 9.4 Number formatting
- Always thousands-separated (`1,247` not `1247`).
- ELO rounded to nearest 10 (`1,247 ELO` → display `1,250 ELO`).
- Win rate as `64%` (no decimal).
- Streaks: integers always (`7-streak`).

### 9.5 Pluralisation
- 1 match / 2 matches.
- 1 win / 2 wins.
- 1 ticket / 2 tickets (also `1 TKT` / `2 TKT` as abbrev).

### 9.6 Time formatting
- Match clocks: `0:45` (mm:ss) for shot clock; `12h 34m` for async window; `2d 14h` for tournament window.
- "Just now" for < 60s, "5 min ago" for < 60min, "2h ago" for < 24h, "Yesterday" / "2 days ago" beyond.

---

## 10. Mode interaction matrix (which currencies / leaderboards each mode touches)

| Mode | Stake currency | Reward currencies | ELO impact | Leaderboard contribution | Tournament impact |
|------|---------------|-------------------|------------|--------------------------|-------------------|
| Quick Match | None | G + TKT | Yes | ELO + Tickets-earned | None |
| Wagered Match | SOL | SOL + G + TKT | Yes | ELO + Tickets-earned | None |
| vs Computer | None | G (low) + 1 TKT floor | No | None | None |
| Tournament | G or TKT | G + TKT + prizes | Yes (each round) | ELO + Tournament-podiums | This is one |
| Marathon | None | G (rising) + TKT milestones | No | Marathon-streak board | None |
| Practice | None | None | No | None | None |

---

## 11. Critical design contracts (non-negotiable)

1. **Cues + felts are 100% cosmetic.** Decorative stat sheets are fine but stats DO NOT affect physics, accuracy, aim guideline length, or shot clock. Per OD-1 lock.
2. **Skill-based matchmaking always.** Never coin-balance-based (Miniclip antipattern).
3. **Rate-based leaderboards.** ELO, win rate, accuracy, streak — never cumulative volume.
4. **No RNG mini-games.** Spin & Win, Scratch & Win, loot boxes — all out. Skill-not-luck filter.
5. **Free-text chat never.** Canned phrases only.
6. **Server-authoritative everything.** Client sends shot params, server simulates, server decides outcome. No exceptions.
7. **One-way valve on Tickets.** Buyable + earnable + spendable, never sellable / tradeable.
8. **Treasury solvency on Ticket emission.** Sum of Ticket-out per week must be backed by Ticket-in revenue.
9. **Tournaments NEVER take SOL as entry.** Wagering is firewalled from tournaments by design (Tickets/Gold only).
10. **Marathon is firewalled from wagering.** Solo mode, no SOL stakes.

---

## 12. What the designer is asked to produce

For each screen above, produce:

1. **Mobile layout** (390×844 — iOS Safari smallest TG WebView target).
2. **Desktop layout** (1280×800 minimum).
3. **All states** (default, loading, empty, error, success, edge cases listed).
4. **Component breakdown** for engineering — what's reusable vs screen-specific.
5. **Copy decks** if any deviation from §9 patterns.

Suggested order of production (matches engineering build sequence):

| Phase | Screens |
|-------|---------|
| **Phase A (V1 must-have)** | 7.1 Splash · 7.2 Main Menu · 7.3 Mode Select · 7.4 Matchmaking · 7.5 Opponent Reveal · 7.6 vs Computer · 7.18 In-Match HUD · 7.19 Async Waiting · 7.20 Chat · 7.21 Foul · 7.22 Toast · 7.23 Pool Card · 7.35 Settings · 7.37 Reconnect · 7.38 Empty states (subset) |
| **Phase B (V2 — async PvP + wagering)** | 7.24 Wagered payout · 7.34.1 Wallet snapshot · 7.34.2 Top Up SOL · 7.32 Profile · 7.33 Leaderboards (basic) |
| **Phase C (V3 — full economy)** | 7.10 Tournament List · 7.11 Tournament Detail · 7.12 Bracket · 7.13 Tournament pre-round · 7.14 Marathon Start · 7.15 Marathon HUD · 7.16 Marathon round-end · 7.25 Marathon end card · 7.26 Cue Locker · 7.27 Felt Locker · 7.28 Shop Gold · 7.29 Shop Tickets · 7.30 Item detail · 7.31 Prestige · 7.34.3 Buy Tickets · 7.34.4 Buy Gold · 7.34.5 Cash Out |

---

## 13. Open questions for designer feedback

1. **Marathon score type — Streak vs Perfect Tables.** Designer may want to feature one prominently. Streak is simpler to communicate; Perfect Tables is more skill-elite.
2. **Pool Card share format** — image (PNG / 4:5 ratio), video clip (4s GIF), or both? Recommend PNG for V1, video for V3.
3. **Chat phrase packs** — V3 expansion. Does designer want to mock up locker-style UI for browsing/purchasing phrase packs, or roll it into Cue Locker as a side tab?
4. **Daily Challenge format** — recommended screen integration: a card on Main Menu (§7.2). Designer may want a dedicated challenge detail screen if challenges get complex.
5. **Tournament sponsor branding zones** — designer should specify where sponsor logos / themed overlays land in the bracket view and round-result cards.

---

## 14. Engineering pickup contract

When the designer delivers mockups + Figma source, engineering:

1. Wires routes per §7 (1:1 mapping from screen to route).
2. Implements state machines per §7 (each screen's States list).
3. Wires CTAs to specified actions / destinations.
4. Honours the formatting rules in §9.
5. Implements the constraint matrix in §11 — these are tested as integration contracts.

Designer + engineer alignment meeting recommended after Phase A mockups land — before Phase B begins.

---

*Maintainer: JJ. Reviewer: pool designer. Update policy: append to this doc as scope changes; never delete a screen, mark as superseded instead.*
