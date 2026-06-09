# DEEPER — Iron-Clad Session-by-Session Build Plan
### A deep, tactical, single-player high-score mining game for TheArcadeGG

**Working title:** DEEPER
**Genre:** Single-player high-score mining roguelite (Motherload lineage)
**Stack:** Phaser 3 + TypeScript + Vite · seeded `simplex-noise` + `alea` · Supabase leaderboard (HMAC Edge Function) · nipplejs/rex touch
**World model (decided):** ONE deep procedural map with **biome bands at depth** — not multiple maps. Motherload-pure verticality, biome variety supplies content breadth.
**Sequencing decided:** Phase A proves **core dig/sell/upgrade feel + mobile touch parity** before anything else. Leaderboard, meta, seasonal content layer on after the loop is fun.
**Session sizing:** each session below is estimated in **hours**, not fixed-length. Stack sessions into whatever block you have.

---

## 0. Guiding principles (read once, then never violate)

1. **The loop is sacred.** Dig → fill cargo → fly up → sell → upgrade → go deeper. If a feature doesn't make that loop tenser or more rewarding, it waits.
2. **Determinism is the spine.** The world is `f(seed, depth)`. Everything competitive (daily seeds, replay anti-cheat, shareable runs) depends on the generator being 100% deterministic. No `Math.random()` anywhere in gameplay — only the seeded PRNG.
3. **Mobile is not a port, it's a constraint.** Build touch input in Phase A. If it doesn't feel good on a phone, it isn't done.
4. **Score everything from day one.** Even before there's a leaderboard, the run must produce a single integer score. That number is the product.
5. **Content is data, not code.** Ores, biomes, upgrades, hazards, events, seasonal items — all defined in typed config tables (JSON/TS), so you (or Claude Code) can add content without touching engine code.
6. **Ship the vertical slice early, then widen.** A complete-but-small game beats a half-built big one.

---

## PHASE A — CORE FEEL + MOBILE PARITY (the part that proves the game)
*Goal: a fun 60fps dig/sell/upgrade loop that feels good on a phone and produces a score. Nothing competitive yet.*

### Session A1 — Project skeleton & boot (2–3 hrs)
- Scaffold from `phaserjs/template-vite` (MIT). TypeScript strict mode on.
- Set up Vite, ESLint/Prettier, folder structure: `/scenes`, `/systems`, `/config`, `/entities`, `/ui`, `/net`.
- Phaser `Scale.FIT` + `CENTER_BOTH`; lock viewport meta tag; `canvas { touch-action:none }`, `body { overscroll-behavior:none }`.
- Scenes stubbed: `Boot → Preload → MainMenu → Game → GameOver`.
- **Done when:** blank game scene renders identically on desktop and a real phone, no scroll/zoom.

### Session A2 — Tile world core + camera (3–4 hrs)
- Tile grid data model: 2D array of tile-type IDs. World is N columns wide, effectively unbounded deep.
- **Chunked rendering**: only instantiate tile sprites within camera + margin; recycle (object pool) off-screen tiles. This is the single most important perf decision — do it now, not later.
- Camera follows pod, vertical scroll, clamped horizontally.
- Surface row + sky above, solid dirt below.
- **Done when:** you can scroll a 2000-row deep world at 60fps on mid-range mobile with stable memory.

### Session A3 — The pod: physics & movement (3–4 hrs)
- Arcade Physics body: gravity pulls pod down, thrust flies it up, drive left/right.
- **Hard rule: cannot dig up.** Can fly up through already-empty space only. This is the core tension generator (SteamWorld Dig's "risk of getting stuck").
- Tune gravity/thrust/horizontal accel until movement feels weighty but responsive.
- **Done when:** flying and falling feel good with keyboard, no tunneling through tiles.

### Session A4 — Digging mechanic (3–4 hrs)
- On dig input (down/left/right), compute adjacent tile, check it's diggable, remove it from grid + pool, snap pod into the freed cell.
- Dig has a duration scaled by tile hardness → digging is a *time cost*, not instant (creates the fuel-vs-progress tension).
- Dig animation + per-tile particle burst + dig SFX (placeholder).
- **Done when:** digging down through dirt feels satisfying and tiles never desync from physics.

### Session A5 — Fuel + cargo: the twin clocks (2–3 hrs)
- **Fuel** drains over time + per action; hits zero → run ends (stranded). This is the master clock.
- **Cargo**: finite slots; mined ore fills them; full cargo = must return to sell.
- HUD: fuel bar, cargo fill, depth meter, cash, current score.
- **Done when:** the "do I push deeper or turn back?" decision exists and feels real.

### Session A6 — Surface loop: sell + refuel + shop stub (2–3 hrs)
- Surface zone: fuel station (pay to refill), sell point (cargo → cash), shop building (stub UI).
- Basic upgrade shop with ONE upgrade working end-to-end (e.g. fuel tank capacity) to prove the data→effect pipeline.
- **Done when:** full loop closes: dig → fill → fly up → sell → buy upgrade → dig deeper with the upgrade applied.

### Session A7 — Mobile touch controls (3–4 hrs)
- nipplejs (MIT) left-thumb joystick for move/thrust; right-side action buttons (dig is contextual on joystick direction, plus dedicated buttons for items later).
- Tune dead zones; ensure joystick zone (left) never overlaps action zone (right).
- Test portrait (tall mine view) primarily; support landscape.
- **Done when:** a non-dev can pick up your phone and play the loop with no instructions.

### Session A8 — Score model + Game Over (2 hrs)
- Define the score formula (v1): `score = cash_banked + depth_bonus + ore_value_multipliers`. Lock the shape; tune numbers later.
- Game Over scene: shows score, depth reached, cause of death, "play again."
- **Done when:** every run ends in one honest integer you'd be happy to rank.

> **PHASE A GATE:** The loop is fun on a phone at 60fps and spits out a score. If it isn't fun *here*, stop and fix feel before building anything below. Everything after this is amplification of a loop that already works.

---

## PHASE B — DEPTH, CONTENT & TACTICS (the "deep & tactical" promise)
*Goal: procedural biome bands, real ore/fossil variety, hazards, and Boulder Dash tactics turn the loop into a tense descent.*

### Session B1 — Seeded deterministic generator (3–4 hrs)
- `simplex-noise` + `alea(seed)`. World = pure function of `(seed, x, y)`.
- Rip out every non-seeded random in gameplay. Add a debug overlay that prints the seed and lets you regenerate.
- **Done when:** same seed = byte-identical world, every time, on every device. (This is the anti-cheat + daily-seed foundation — do not compromise it later.)

### Session B2 — Biome bands at depth (3–4 hrs)
- Config table of depth bands, each with: name, depth range, palette/tileset, tile hardness, ore weight table, hazard profile, ambient SFX/music.
- Suggested bands (tune freely): **Topsoil → Clay/Sediment → Rock → Crystal Caverns → Magma Shelf → Frozen Deep → The Core**.
- Smooth transitions / overlap zones so bands don't feel like hard walls.
- **Done when:** descending visibly and audibly changes character every few hundred metres.

### Session B3 — Ores, metals, fossils & finds (3–4 hrs)
*Content table — this is what players are mining for. All data-driven.*

**Common metals (the economy floor):** Coal, Copper, Iron, Bronze, Aluminium.
**Mid-tier:** Silver, Gold, Platinum, Titanium.
**Rare/deep:** Emerald, Ruby, Sapphire, Diamond, **Unobtanium-style fictional capstone ore** (your "Motherlode" jackpot).
**Fossils (collection + score, not just cash):** Ammonite, Trilobite, Dino bone fragments → assemble a **museum/collection meta** (ties into B-side progression). Fossils are rarer, worth collection-points not just cash.
**Special finds (the "what else can they find" answer):**
- **Geodes** — break open for random gem (gambling micro-moment, juicy).
- **Buried artifacts / relics** — lore + collection + score spikes.
- **Gas pockets** — hazard, but vent-able for a fuel bonus if you have the right tool (risk/reward).
- **Underground caches / lockboxes** — need a key/tool, contain cash or rare items.
- **Lost equipment** — find a one-run buff item.
- **Fossilised seeds / spores** — seasonal/Easter-egg hooks (see Phase E).
- **Mineral veins** — clustered ore (vein growth via Gaussian/snake patch) rewards committing to a dig site.
- **The Core treasure** — the ultimate deep find; reaching it is a score/achievement event.
- **Weighted by depth band**: value rises with depth so risk and reward climb together.
- **Done when:** the ore-table data drives spawning, and a deep run surfaces a satisfyingly varied haul.

### Session B4 — Hazards & Boulder Dash physics (3–4 hrs)
- Cellular-automaton falling rules: a boulder with empty space below falls; rolls off the side of another boulder/gem if the diagonal is clear. Deterministic, cheap, emergent cave-ins.
- Hazards by band: loose boulders, gas pockets (ignite/explode), lava/magma (damage), cold pockets (slow), unstable ground.
- Hull/health system: hazards damage hull; hull zero = run ends. Repair at surface.
- **Done when:** dislodging a boulder can genuinely cave-in on you, and you start digging *carefully*.

### Session B5 — Tools, consumables & the deep-dig kit (2–3 hrs)
- Consumables (carry limited): Dynamite (blast stone/clusters), Teleporter (escape getting stuck — the anti-frustration safety valve), Reserve Fuel, Hull Repair Nanobots, Gas Vent tool.
- These convert "stuck = dead" into "stuck = spend a resource," which is the difference between tense and unfair.
- **Done when:** a smart player can dig aggressively because they've packed escape tools.

### Session B6 — Economy & difficulty tuning pass (3–4 hrs)
- Spreadsheet the curve: ore values, fuel costs, upgrade prices, depth bonuses. Make depth pushes exponentially rewarding but exponentially risky.
- Tune so the first 10 minutes teaches the loop and the next 20 escalate tension.
- **Done when:** "one more run" happens to *you*, the developer, unprompted.

> **PHASE B GATE:** A run is a tense, varied descent with real tactical decisions (which vein, when to turn back, spend dynamite or dig around). The game is now *deep* — even with zero online features.

---

## PHASE C — UPGRADES, PROGRESSION & SAVE STATES (the "stickiness" layer)
*Goal: in-run upgrades, persistent meta-progression, and bulletproof saves across web + phone.*

### Session C1 — Full upgrade tree (in-run / per-character) (3–4 hrs)
*Data-driven upgrade definitions: id, tier, cost, effect, prerequisites.*
- **Drill:** dig speed, dig hardness limit (access deeper tiles), multi-dig width.
- **Fuel tank:** capacity, efficiency.
- **Cargo bay:** slot count, auto-sort, ore compression.
- **Hull:** max health, hazard resistance (heat/cold/impact).
- **Engine/thrusters:** thrust power, fall-damage reduction.
- **Radiator:** heat tolerance for magma bands.
- **Scanner:** reveals nearby ore/hazards (quality-of-life power spike).
- Diminishing-returns/caps so no upgrade trivialises the game.
- **Done when:** spending cash feels like meaningful build choices, not a checklist.

### Session C2 — Meta-progression (between-run persistence) (3–4 hrs)
- Two currencies: **Cash** (in-run, resets) and a **rare meta-currency** (e.g. "Cores" / blue orbs — SteamWorld Dig model) that persists across runs.
- Meta unlocks: new starting loadouts, permanent small stat bumps (Hades Mirror / Rogue Legacy model), new tools, new cosmetic pods.
- **Mirror-of-Night-style meta board** the player invests persistent currency into.
- **Done when:** dying still feels like progress.

### Session C3 — Loadouts & character/run setup (2–3 hrs)
- Pre-run loadout pick: Prospector (cargo-focused), Driller (speed/hardness), Daredevil (fuel/thrust), etc. Unlocked via meta.
- Loadouts change run feel and give replay variety + leaderboard build-diversity.
- **Done when:** two players can chase the same seed with different strategies.

### Session C4 — Save system (local) (3–4 hrs)
- **Two save scopes:** (1) **meta save** (persistent: unlocks, meta-currency, collection/museum, settings, stats) and (2) **run save** (suspend/resume an in-progress run).
- Local persistence via IndexedDB (NOT localStorage for game state of this size; localStorage is also unavailable in some sandboxed contexts). Versioned schema + migration function from day one.
- Autosave on surface, on shop, on app-background (critical for mobile — players get interrupted).
- **Done when:** you can close the tab/app mid-run and resume exactly where you were, on the same device.

### Session C5 — Cloud save + cross-device (3–4 hrs)
- Optional account (anonymous Supabase auth is fine to start) → sync meta save to Supabase. Run saves can stay local.
- Conflict resolution: last-write-wins on meta with a timestamp, or merge unlocks (union) to avoid losing progress.
- **Done when:** unlocks earned on phone appear on desktop after login.

> **PHASE C GATE:** Players have a reason to come back tomorrow (meta-progression) and never lose progress (saves). The game is now *sticky*.

---

## PHASE D — LEADERBOARD & COMPETITION (the high-score engine + anti-cheat)
*Goal: the competitive hook that makes a high-score game a high-score game.*

### Session D1 — Supabase backend + schema (2–3 hrs)
- Tables: `scores` (run results), `daily_seeds`, `players`, `runs` (for replay validation). Row-Level Security on.
- Indexes for fast top-N and rank-around-me queries.
- **Done when:** you can insert and query a ranked board from a test client.

### Session D2 — Score submission via signed Edge Function (3–4 hrs)
- **Never let the client write scores directly.** Submission goes through a Supabase Edge Function.
- Client sends `HMAC_SHA256(payload, secret)` where secret lives only in the Edge Function. Server verifies, sanity-checks (score vs depth vs time-played vs max-possible), rejects outliers.
- Server-issued nonce to block replay of a captured request.
- **Done when:** editing client JS or replaying a captured request cannot post a fake score.

### Session D3 — Leaderboard UI (2–3 hrs)
- Global all-time board first. Rank-around-me, top-100, your-best.
- Clean mobile-first list; smooth load states.
- **Done when:** finishing a run shows where you placed and makes you want to climb.

### Session D4 — Daily-seed competitive mode (3–4 hrs)
- Everyone gets the same seeded mine each day (the determinism from B1 pays off here). Separate daily board. Shareable seed string.
- This is your core retention + virality loop — "today's seed is brutal, try it."
- **Done when:** a daily board resets cleanly at 00:00 UTC and everyone plays the identical world.

### Session D5 — Replay-validation anti-cheat for top scores (4–5 hrs)
- For top-N daily scores: client submits a compressed **input log**; server re-simulates the run headlessly against the seed and confirms the score is achievable. The gold standard, and only possible because the sim is deterministic.
- Flag/hide/ban tooling for the admin (you).
- **Done when:** a top-of-board score can be independently reproduced from its input log + seed.

> **PHASE D GATE:** There is a fair, cheat-resistant global + daily leaderboard. The product now has its competitive soul.

---

## PHASE E — LIVE CONTENT: WEEKLY CHALLENGES, SEASONS & EASTER EGGS (the Candy-Crush-style live layer)
*Goal: recurring reasons to return; seasonal freshness; delight.*

### Session E1 — Weekly challenge framework (3–4 hrs)
- Config-driven challenge definitions: a fixed seed + modifier(s) + objective + reward. (e.g. "Reach 1500m with no teleporter," "Bank £X in one cargo run," "Survive the Magma Shelf").
- Separate weekly board + completion rewards (meta-currency, cosmetic, badge).
- **Done when:** a new challenge can be authored as pure data and goes live without a code deploy.

### Session E2 — Modifier / mutator system (2–3 hrs)
- Reusable run modifiers the challenge/seasonal system composes: low-gravity, double-hazard, fragile-hull, fuel-rich, ore-rush, fog-of-war, mirror-world. (Slay-the-Spire ascension / daily-modifier model.)
- **Done when:** challenges and seasons can stack modifiers like Lego.

### Session E3 — Seasonal system & seasonal equipment (3–4 hrs)
- Season = time-boxed theme (config + start/end dates) bringing: a seasonal biome reskin, **seasonal equipment** (limited-time pods/drills/cosmetics earned via a seasonal track), and a seasonal leaderboard.
- Seasonal track (battle-pass-lite, all earnable, no money): play → earn season points → unlock seasonal gear. Some gear is cosmetic, some has mild seasonal-only effects.
- **Done when:** a season can be authored as data with a clear start/end and its own rewards.

### Session E4 — Easter eggs & secret finds (2–3 hrs)
- Candy-Crush-style delight: rare secret tiles, a hidden ultra-deep "ghost layer," a 1-in-N golden geode, konami-style inputs, dev-room seed, seasonal hidden items (the "fossilised seeds/spores" from B3 sprout into secret finds during the right season).
- Collection/museum completion rewards (ties B3 fossils + C2 meta).
- **Done when:** players are posting "did you know if you…" on socials. That's the metric.

### Session E5 — Notifications / "comeback" hooks (2 hrs, optional)
- Daily-reset reminder, weekly-challenge-live nudge, streaks. Respect platform constraints; keep it non-annoying.
- **Done when:** there's a gentle reason to open the game daily.

> **PHASE E GATE:** The game is *alive* — new things weekly, seasonal freshness, secrets to discover. This is what separates a one-week toy from a habit.

---

## PHASE F — POLISH, JUICE & SHIP (the "elite feel" tax)
*Goal: the 30-second clip looks AAA-in-spirit even though it's a browser game.*

### Session F1 — Juice pass (3–4 hrs)
- Screen shake on cave-ins/explosions, hit-stop on big impacts, tweened/eased UI, ore-collect pop + "ka-ching," depth-milestone flourishes, particle polish. Tween.js/Motion (MIT) + Phaser tweens.
- Study `grapefrukt/juicy-breakout` for patterns; apply "Art of Screen Shake" restraint.
- **Done when:** a muted 30-second clip still reads as polished.

### Session F2 — Audio pass (2–3 hrs)
- CC0 audio (Kenney/Freesound/OpenGameArt): per-biome ambient layers, pitch-varied dig SFX, ore stingers, hazard cues, music that intensifies with depth.
- **Done when:** closing your eyes, you know how deep you are.

### Session F3 — Art coherence pass (3–4 hrs)
- Lock one art style (Kenney CC0 sci-fi base, unified palette). Pod, ore icons, biome tilesets, UI all consistent. CREDITS file logging every asset license.
- **Done when:** nothing on screen looks borrowed from a different game.

### Session F4 — Onboarding & first-run experience (2–3 hrs)
- 60-second teaching of the loop without a wall of text. First run is hand-tuned, not procedural, so everyone's first 5 minutes is great.
- **Done when:** a stranger understands and enjoys the game inside 2 minutes, no instructions.

### Session F5 — Perf hardening + device matrix (3–4 hrs)
- Profile on low/mid Android + iOS Safari. Cap particles, atlas textures, pool everything, kill per-frame allocations. Confirm stable 60fps deep in the world.
- If a deep map drops frames: chunk harder or evaluate Phaser 4's GPU tilemap layer.
- **Done when:** mid-range phone holds 60fps at 3000m+.

### Session F6 — TheArcadeGG integration + launch (2–3 hrs)
- Build/bundle, embed/iframe or portal SDK as required, leaderboard wired, analytics hooks, error logging.
- Soft-launch, watch the daily board + retention, then announce.
- **Done when:** it's live, scores are flowing, and the daily board is contested.

---

## The "maps vs one deep map" verdict (you asked)
**You chose right: one deep map + biome bands.** Multiple maps/planets would *detract* from what made Motherload thrive — the single, mythic, ever-deepening shaft where "how deep did you get?" is the whole story. Biome bands give you all the content variety and visual freshness of "levels" while preserving the one-continuous-descent identity and keeping the leaderboard a single clean axis (depth + wealth). Save "multiple planets" as a *future expansion / season theme*, never as core. The deterministic generator (B1) means you can always add a second seed-space later without re-architecting.

---

## Build order at a glance
**A (feel + mobile) → B (depth + tactics) → C (progression + saves) → D (leaderboard + anti-cheat) → E (live content + seasons + eggs) → F (polish + ship).**

Ship-able checkpoints:
- **End of B** = a genuinely good offline game.
- **End of D** = a competitive high-score game (this is the real "minimum lovable product" for TheArcadeGG).
- **End of E** = a game with a reason to return forever.
- **End of F** = elite.

## Rough effort envelope (your "varies, size in hours" answer)
- Phase A: ~22–27 hrs
- Phase B: ~18–23 hrs
- Phase C: ~15–19 hrs
- Phase D: ~14–19 hrs
- Phase E: ~12–16 hrs
- Phase F: ~16–21 hrs
- **Total core build: ~97–125 focused hours** to the "elite browser high-score game" bar (not "AAA studio," which isn't the right target for this format). Tuning/playtest iteration lives *inside* B6, C2, and F — budget extra calendar time there; that's where good becomes great.

## Non-negotiables checklist (pin this)
- [ ] Determinism never broken (no `Math.random` in gameplay)
- [ ] Mobile parity proven in Phase A, not bolted on
- [ ] Every run produces one honest score
- [ ] All content is data, not code
- [ ] Scores validated server-side; top scores replay-verified
- [ ] Saves versioned + migratable from C4 onward
- [ ] Asset licenses logged in CREDITS
