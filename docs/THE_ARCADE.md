# The Arcade — Canonical Document

> **Status:** Living document. Replaces no prior doc; consolidates the canonical positions scattered across them.
> **Owner:** JJ.
> **Last updated:** 2026-05-29.
>
> **Iteration policy — every material change goes in §15 Changelog. No exceptions.**
>
> - Edit in place when a position lands.
> - Add a one-line entry to the **Changelog** at the bottom with the date + nature of the change. This is a **hard commitment** — if you edit and don't log, you've broken the doc's discoverability promise to the next reader.
> - Do not delete superseded text — strike it through or move to **§14 Superseded**.
> - This document is the single reference; everything else points back to it.

---

## 1. One-line thesis

The Arcade is a **Solana-native, multi-game skill arcade** — quiet cream-paper editorial brand on the outside, hardened multi-currency economy on the inside — that lets small studios plug into real on-chain rails (ownership, prizes, cross-game value) **without** each game launching its own coin.

The radical part is not the closed in-game currency (V-Bucks is closed and nobody calls it novel). It's the **shared, robust arcade economy** that a small studio can plug into to get the benefits of on-chain rails without the fragile, speculative per-game token.

---

## 2. What The Arcade IS

- **A web hub at** [the-arcade-eta.vercel.app](https://the-arcade-eta.vercel.app) (custom domain pending — see Open Questions). Vite + React + TS.
- **A Telegram launcher** `@TheArcadeGG_Bot` — multi-game launcher running on the SolShot server.
- **A roster of skill games** sharing identity, leaderboards, chrome, and (in V3) economy.
- **Parent brand above SolShot** — SolShot (the artillery game) is one product underneath; it keeps its own domain (`solshot.gg`) and its own bot (`@SolShotGG_bot`).
- **Mobile-first.** TG WebView + Safari/Chrome on phone are the primary surfaces. Desktop is supported but secondary.

## 3. What The Arcade is NOT (locked anti-positions)

- **NOT a casino.** The aesthetic, copy, and economy are deliberately editorial / fairground, not dark-glow casino. We push back on dark-mode requests.
- **NOT a generic Web3 dApp.** Crypto is the plumbing; the surface is "skill games + cabinets + tickets."
- **NOT a token-launch project.** No tradable arcade token. See §6 (Economy) for why.
- **NOT a per-game silo.** Identity, tickets, and prize counter cross every cabinet. Standalone game URLs exist only as the Render-deploy fallback; the canonical home is the hub.
- **NOT a market for shop items.** The redemption shop is a curated counter, not an exchange.

---

## 4. Brand Identity — v2 locked

The hackathon-era fire-gradient retro-coin-op brand (Fish's v1 design, 2026-05-19) was superseded by the **v2 cream-paper editorial pack** delivered 2026-05-26 and integrated across 8 phases through 2026-05-28.

If you find yourself referencing "fire palette" or "arcade-yellow / arcade-orange / arcade-red" — that is v1 and superseded. The current brand is below.

### 4.1 Colour tokens (live in `src/styles/tokens.css`)

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#15203A` | Primary text, borders, the dominant ink |
| `--ink-deep` | `#0E1A2E` | Deepest navy — ticker bg, hero panels |
| `--ink-rich` | `#1F2E55` | Mid navy |
| `--ink-70` | `rgba(21,32,58,0.72)` | Secondary text |
| `--ink-45` | `rgba(21,32,58,0.45)` | Tertiary text, meta labels |
| `--paper` | `#FBFCFE` | Near-white surface — masthead, vitrines, slips |
| `--cream` | `#F4F1EA` | Warmer paper (reserved) |
| `--bg` | `#EFF2F7` | Page background — cool blue-grey |
| `--blue` | `#3866C8` | Primary brand blue — active states, ticks |
| `--blue-bright` | `#5B86E0` | Brighter blue — accents, signet gradient |
| `--cobalt` | `#2D4FAA` | Cobalt — signet gradient endpoint |
| `--brass` | `#C8A063` | v2 brass — coin warm, NOT olive |
| `--brass-deep` | `#9B7A4A` | Deeper brass — TKT figures, brackets |
| `--brass-glint` | `#E8C879` | Brass highlight — corner brackets, signet ring |
| `--win` | `#3F7D38` | Win green |
| `--lose` | `#C44A3A` | Lose red, LIVE pill |
| `--hair` | `rgba(21,32,58,0.22)` | Hairline separators |

**The brass rule (critical):** brass is reserved for money, tickets, ceremonial seals, identity rings, corner brackets, and shelf tacks. **Never** for body text, large numerals (other than ticket counts), nav active states, headlines, or backgrounds. If you reach for brass for visual interest, you are using it wrong.

### 4.2 Typography

```
display   "Krona One",     "Big Shoulders Display", sans-serif
body      "DM Sans",       Inter, system-ui, sans-serif
mono      "IBM Plex Mono", ui-monospace, monospace
```

Page hero is Krona One 88px (uppercase, line-height 0.86). Featured cabinet headline 82px. Body 14–15px DM Sans. Mono everything else (labels, prices, ticker, balance chips). Full type scale in [`design_handoff_the_arcade/README.md`](../../The_Arcade_Design_Package/design_handoff_the_arcade/README.md) §Type Scale.

### 4.3 Diegetic anchors (signature components)

The brand is grounded in physical objects the design borrows from. Each maps to a reusable component:

| Anchor | Where it lives | Component |
|---|---|---|
| **Cabinet** | Featured slot on dashboard | Auto-cycling 380px hero card |
| **Vitrine (display case)** | Prize counter | Brass-cornered glass-sheen frame |
| **Hang tag** | Each prize price | Rotated paper card on brass pin + ink string |
| **Banking slip** | Wallet hero | Brass-cornered paper form with rotated "PAID IN" stamp |
| **Brass corner brackets** | Vitrines, banking slips | 16–20px L-shaped SVG with screws + glint |
| **Paper shelf + brass tacks** | Prize counter, dashboard prize section | 3px paper strip with shadow + brass disc tacks |
| **Signet panel** | Identity in masthead | 40px disc, brass ring, status dot, PFP slot |
| **Ticker** | Below masthead | 28px ink-deep strip, red LIVE pill, scrolling text |
| **Floor stats strip** | Below masthead, above ticker | 32px cream strip with label/value pairs |
| **Section primitive** | Every product section | Krona One title + mono "· sub" + ink hairline |

### 4.4 Locked anti-conventions (Things explicitly NOT in this design)

- **No dark mode.** The cream-paper register IS the entire identity. A dark variant would erase the brand.
- **No drop shadows on cards.** Hairline rules and section borders only.
- **No rounded corners on UI chrome.** Tags rotate ±2–3° instead of rounding.
- **No emoji icons in product chrome.** All glyphs are custom SVG. (Score-submit error messages are an exception — they are user-facing diagnostics, not chrome.)
- **No glow / gradient game tiles in chrome.** Game art is provided by studios; our chrome stays neutral. **The contrast between quiet cream-paper editorial chrome and loud studio game art is the intentional design move.**
- **No felt.** Replaced by paper shelves in v2.
- **No big circular profile avatar in the header.** The signet panel is the design choice.
- **Brass is not a primary surface colour.** It is a material applied to specific functional elements.

### 4.5 Logo

`ref/arcade-logo-blue.png` is the canonical lockup — blue hex-controller mark + "ARCADE" wordmark. Four variants: `blue` (default), `allblue` (on navy/dark), `mono` (when blue too loud), `brass` (ceremonial). Lockup aspect ratio ≈ 5.18:1. Render at native pixel ratio; do not redraw as SVG without designer review.

### 4.6 Tagline

> **· Play · Wager · Win · On Solana ·**

Currently rendered on the pre-auth Cabinet landing. The earlier all-caps "PLAY. WAGER. WIN. ON SOLANA." treatment was v1; the punctuation-bracketed lowercase rhythm matches the v2 register.

---

## 5. Game Roster

### 5.1 Live now (4 games)

| Game | Slug | Genre | Stack | Where it lives |
|---|---|---|---|---|
| **SolShot** | `solshot` | Artillery | React + Phaser 3 (CRA) | Deep-links to `solshot.gg` from the arcade hub |
| **Basketball Hoops** | `basketball` | Sports (timed) | Phaser 3 | Inline at `/play/basketball` (legacy at `sol-shot-basketball.vercel.app`) |
| **Keepie Uppies** | `keepie-uppies` | Skill (endurance) | Phaser 3 | Inline at `/play/keepie-uppies` (legacy at `sol-shot-keepie-uppies.vercel.app`) |
| **Free Kicks** | `free-kicks` | Sports (lives-based) | Vite + Three.js | Inline at `/play/free-kicks` (legacy at `solshot-free-kicks-iota.vercel.app`) |

All four have JWT-gated Mongo leaderboards. TG bot mints a 30-day session JWT (was 24h until 2026-05-28); arcade hub reads it via `sessionStorage`. Scores POST to `solshot.onrender.com/api/games/<slug>/score`. Both bot users and direct web visitors converge on the same Mongo. See §10 (Tech) for the wire.

### 5.2 Pipeline (decisions deferred per Next_Steps_Games.docx)

**Tier 1 — Multiplayer PvP (requires Phase 0 infrastructure):**
- **8 Ball Pool** (henshmi/Classic-Pool-Game, MIT) — turn-based PvP, brand recognition lift
- **Top-down PvP shooter** (moddio2 Phaser, MIT) — real-time PvP complement to SolShot
- **Multiplayer Snake** (simondiep/node-multiplayer-snake, MIT) — fastest to ship

**Tier 2 — Solo-skill (matches existing leaderboard pattern):**
- **2048** (gabrielecirulli/2048, MIT) — number tile, mobile-perfect
- **Tetris** (jakesgordon/javascript-tetris, MIT) — falling tile, daily-pot
- **Bubble Shooter** (rembound/Bubble-Shooter-HTML5, MIT) — aim + shoot, daily-pot

Tier 1 is blocked on decisions about Tickets currency, monorepo policy, and stack flexibility. Tier 2 ships on the existing pattern (Phaser + standalone leaderboard service + Render endpoints).

### 5.3 Stack policy (current state — needs a call)

The original spec called for Phaser-only across the catalogue. Free Kicks (Vite + Three.js, separate repo fork) **broke that lock** when it shipped 2026-05-19 without issue. The pragmatic position right now is **multi-stack support**. A retroactive lock + port of Free Kicks is on the table but has not been revisited.

---

## 6. Economy — The V3 Three-Tier Model

> Authoritative sources:
> - [`SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md`](../../SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md) — three-tier model + non-negotiable rules
> - [`The-Arcade/notes/ARCADE_AVATAR_LAYER_V3.md`](../../notes/ARCADE_AVATAR_LAYER_V3.md) — avatar + item + in-house marketplace
> - [`SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md`](../../SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md) — Bitrefill / MoonPay / V3 shop cashout stack
>
> **Status: ECONOMY ACCEPTED AND LOCKED** at principle level (28–29 May 2026). Implementation is V3 work and NOT BUILT. Do not build before V3 (after V1 mainnet ships and V2 4+ player support lands).
>
> **Stress-test caveat:** specific numbers below (1–3 Tickets per game, 100 Tickets per placement, 10–25% grinder/skill ratio, weekly emission caps, etc.) are **illustrative placeholders plucked to demonstrate rough ideas**. They need stress-testing against botting + gaming-the-system + adversarial modelling before any value gets baked in. The *shape* is locked; the *numbers* tune on live data + red-team work.

The economic core is what makes the arcade worth plugging into. It decouples "on-chain economy" from "tradable speculative token."

### 6.1 The three tiers

**Tier 1 — In-game currency (per game)**
- Closed. Non-tradable. Never leaves the game.
- Rewards skill — you win, you earn it, you spend it inside that game on entries, unlocks, cosmetics, lives.
- No outside price → no speculation, ever.
- The role $SHOT was originally pitched for. **$SHOT becomes this** — an internal balance, not a launched token. The Pump.fun launch path is **abandoned, not deferred.**

**Tier 2 — Tickets (arcade-wide)**
- **Buyable with crypto. Earnable by playing. NOT sellable. NOT tradable.**
- The **one-way valve** is the entire safety mechanism: crypto flows in, Tickets become an internal arcade balance, value never flows back out through the currency. Nobody speculates on an asset they can never sell at a profit → no mercenary capital, no farming, no spiral.
- Spendable across any cabinet, or swappable into a game's Tier 1 currency. This cross-game utility is what makes the economy worth plugging into.
- Named "Tickets" deliberately — the fairground/arcade metaphor is speculation-resistant *semantically* (nobody expects arcade tickets to moon) and signals "this is a game, not an investment." Cultural + regulatory cover for free.
- Live abbreviation: `TKT`. Already wired into masthead chips, prize tags, dashboard fixtures.

**Tier 3 — Redemption shop (the fairground counter)**
- The only place internal value touches real-world value → single point of failure, must be hardened hardest.
- **Curated, administered shop, NEVER a market.** Fixed inventory, fixed prices, capped supply, weekly resets. No chart, no float, no order book.
- Tiered by cost and by real value (see §6.3 below).
- Already designed: the **Prize Counter** page (`/prizes`) with three stacked vitrines (one per cabinet), 4 prizes on a paper shelf, brass corner brackets.

### 6.2 How Tickets are earned (the hybrid)

Two pools, doing two different jobs:

**Participation floor — 1–3 Tickets per game, regardless of result.**
- Abundant, broadly distributed, effort-proportional.
- The **retention mechanism** — every player, including the bad ones, is always progressing toward something.
- Abundance also = safety: low value-per-Ticket means speculation never gets a foothold.

**Leaderboard bonus — ~100 Tickets for placement.**
- Rewards skill, makes being good materially better.
- **CRITICAL RULE: leaderboard ranks on a SKILL-RATE metric, not cumulative volume.** Win rate, accuracy, ELO, average placement — NEVER "most games" or "most wins."
  - Cumulative board = bot's dream. The heaviest grinder tops it AND collects the floor → bots sweep both pools.
  - Rate-based board = bot-resistant. A sharp player on 10 games can outrank a grinder on 50.

**Target ratio (tune on live data):** a dedicated grinder maxing the floor earns roughly **10–25%** of what a top-placement skilled player earns. The exact ⅓ + 100 values are placeholders — tune against live behaviour, not from the armchair.

### 6.3 Shop tiering (retention + safety are the same wall)

- **Low Ticket cost = pure sink, zero real-world value.** Avatars, skins, name colours, emotes, banners, "played 50 games" badges. **Mostly soulbound / non-transferable** so there is no resale leak. Costs nothing to emit. The grinder lands here — meaningful identity/progression reward that is economically free and un-sellable.
  - Calibration: the cheapest meaningful cosmetic must be reachable by a casual player in **days, not months**. The bad player should taste a reward early — just never a *valuable* one.
- **High Ticket cost = real-value items** (gift-card vouchers via Tillo/Tango/Runa, premium passes, scarce cosmetics). Gated far enough up that a pure grinder cannot casually reach them — requires real skill (stacked leaderboard bonuses) or real money (buying Tickets). Value-out stays gated behind effort/spend that exceeds the value itself, which keeps the treasury solvent.

Two structural extensions of the shop tiering are documented in §6.4 and §6.5 below: the **avatar + item layer** (which adds an in-house tradable cosmetic market on top of Tier 1) and the **civilian cashout stack** (which is how players actually convert in-arcade value back to real money). Read both before V3 implementation.

### 6.4 Avatar & item layer (the in-house cosmetic market)

> Authoritative source: [`The-Arcade/notes/ARCADE_AVATAR_LAYER_V3.md`](../../notes/ARCADE_AVATAR_LAYER_V3.md). Status: aligned 28 May 2026 (JJ + Fish). V3 work.

The avatar is the player's persistent arcade-wide identity. Items are off-chain cosmetic assets that layer onto it. Together they form a **second high-margin revenue stream** alongside wagering and Ticket sales.

**The model:**
- Every player has a base character (human male / female / animal / etc.) plus layered items (hats, glasses, balaclavas, chains, shoes, crowns, outfits, masks).
- **The avatar is a render, not an asset.** It is just whichever items are equipped, drawn together. It is not minted as one object.
- Items are **off-chain database entries** owned by a player account. **Not NFTs. Not on-chain.**
- Three flavours: standard (replenishable), limited editions (capped runs), one-of-a-kind tournament prizes (single-issue).
- **All items are purely cosmetic.** Zero gameplay impact. (The 8 Ball cue rule — money never buys aim.)

**Acquisition + sale:**
- **Acquired** via shop purchase (Tickets or SOL), play earnings, tournament prizes, sign-up grants, or other-player resale.
- **Sold** only via our **in-house marketplace.** Players list items for Tickets or SOL. **We take a fee on every trade.**
- **No Tensor. No external marketplaces.** Items are not NFTs, so they cannot leave the arcade. Solana royalty enforcement is dead post-royalty-wars; in-house marketplace captures the full equivalent of marketplace fee + royalty.

**Why no NFTs (the call that took the most thinking):**
- Avatar-as-NFT → anyone assembling a similar loadout mints a near-identical NFT → scarcity evaporates.
- Items-as-NFT → flooded marketplace of "human + crown" mints; royalties leak via Tensor; the truly 1:1 items (Jigsaw mask, tourney hats) are 1:1 *because we say so*, not because a blockchain says so.
- **No on-chain minting at all** — chosen. Trades stay where the fees stay.

**What we lose:** the on-chain "true ownership" narrative. **What we gain:** 100% of every trade fee, full control of supply and scarcity, no royalty leak, simpler legal surface, genuinely-1:1 prizes.

**SOL : Ticket ratio across the shop = the de facto Ticket exchange rate.** Every shop item carries both a SOL price and a Ticket price; the ratio is set by us and must be applied consistently across the shop or we accidentally fragment into multiple inconsistent rates.

**Tension with Rule 4 (acknowledged):** the North Star says real-value goods must be soulbound or modelled. The avatar layer deliberately introduces tradable cosmetics. This is not a contradiction *if* the marketplace is fully in-house and administered — the leak only exists where secondary trading happens somewhere we don't control. Treasury modelling at V3 implementation must account for the fact that some items will recirculate at SOL prices we don't set (i.e. resale is a variable, not a constant).

### 6.5 Civilian cashout stack

> Authoritative source: [`SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md`](../../SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md). Status: V1 path defined, V3 path locked.

The **civilian onboarding gate**: until a casual user can convert winnings to real-world value without navigating crypto, the arcade is a product for people who already have wallets. Solving this is mass-market gating.

**The V1 → V3 stack:**

| Phase | Primary cashout | Secondary | Reasoning |
|---|---|---|---|
| **V1 (now)** | **Bitrefill deep-link** — pick a gift card (Amazon UK, Steam, Just Eat, Spotify, Argos, ~600 brands), pay in SOL via the `solana:` URI, code arrives by email in seconds | Manual wallet export to a CEX | ~20 min eng cost. Zero regulatory exposure. No KYC under ~$1000. ~60s end-to-end. ~2–5% affiliate commission to us on every redemption. |
| **V1.x (weeks 2–8)** | Bitrefill + add MoonPay Sell (Privy native hook) for users who specifically want bank withdrawal | Manual wallet export | MoonPay = regulated entity carries the burden. KYC + 1–3 day settlement = fine for users who want fiat, not for casual £5 players. |
| **V2 (5+ player)** | Same as V1.x | — | No new cashout work; focus on game-side scope. |
| **V3 (arcade economy)** | **In-app Tickets shop** — Tillo / Tango / Runa gift-card APIs, full retail margin captured (no affiliate cut), branded UX, regulatory gate cleared | Bitrefill + MoonPay remain available | Margin capture + brand control. Requires UK Gambling Commission consultation, GDPR review, AML/KYC vendor verification. |

**The V1 framing for civilians:**

> "Cash out instantly to 600+ gift cards (Amazon, Steam, Just Eat, Spotify...). Or send to any wallet. Or, if you've earned more than you expected, MoonPay's bank withdrawal is one click away."

That's a more complete story than any single Solana wager product has today. The 5-friends-in-a-TG-chat scenario (each puts £5 in via Apple Pay → 5-player wagered match → winner takes ~£22.50 of SOL) only closes if cashout is friction-free at the end. Bitrefill makes the 30-second "where's my £22?" question have a 60-second answer.

**Treasury solvency for V3 (the load-bearing constraint):**

```
total_ticket_revenue_per_period  >  total_real_value_emitted_per_period
```

Where revenue = Ticket purchases (Apple Pay → SOL → Tickets) + diverted wagering rake. Emission = sum of all gift-card / prize payouts at face value plus the wholesale markup we pay the voucher vendor. If this flips, gift card redemptions start failing — reputational ruin. Safeguards: weekly emission cap, daily dashboard, soulbound cosmetics as the safety release valve (cost zero to emit).

**Regulatory gates for V3 (locked before any V3 cash-equivalent prize ships):**
- UK Gambling Commission consultation — Tickets + leaderboards + cashout next to SOL wagering may classify as a sweepstakes or skill-based prize promotion.
- GDPR review for the voucher delivery email pipeline.
- AML/KYC vendor verification.

These gates are why V3's real-prize tier is locked out of V1/V2.

### 6.6 The five non-negotiable rules

1. **One-way valve.** Tickets are buyable and earnable, never sellable, never tradable.
2. **Rate-based leaderboards.** Skill bonus ranks on rate/skill metrics, never cumulative volume.
3. **Shop is administered, not a market.** Fixed inventory, fixed prices, capped supply.
4. **Real-value goods are soulbound, modelled, OR confined to the in-house marketplace.** No uncontrolled secondary market on shop items. The original North Star text said "soulbound or modelled"; §6.4 documented the addition: the in-house cosmetic marketplace is an *administered* secondary market, so it satisfies the spirit (no leak we don't control) while violating the letter (cosmetics are tradable). Treasury modelling must include in-house resale as a variable.
5. **Treasury solvency on real-value out.** If real-world-equivalent value is in the shop (gift cards, USDC, capped NFTs), cap it globally per period and price so real revenue (Ticket purchases + wagering rake) exceeds total real-value emitted.

### 6.7 SOL wagering — keep it firewalled

SolShot wagering continues to exist alongside the Ticket economy. It is a **separate value-out system** and must NOT touch Tickets or shop:

- **Wagering** = PvP, SOL escrow, 90/7/3 split, peer-to-peer transfer, house takes rake. Self-balancing by construction — the house never pays out more than players put in.
- **Tickets / shop** = treasury-to-player flow. NOT self-balancing — treasury can go insolvent if emission > revenue.
- **Do not connect them.** No wagering winnings → Tickets. No Tickets → wagering entries.

If they touch, an exploiter farms the self-balancing system to feed the non-self-balancing one and drains the treasury.

### 6.8 Why pay-to-win does NOT apply

You can buy Tickets and swap into Tier 1 in-game currency or into cosmetics. But neither buys **aim, weapons, damage, accuracy, or any in-match outcome.** Buying Tickets gets you more *attempts* and more *status*, never more *skill* — you still have to win. Same line as Fortnite (cosmetics + access only), reinforced by the 8 Ball lesson (introducing higher-power cues for purchase broke the community's trust; cosmetic tournament cues — pure flex — were what worked).

### 6.9 The SDK question (V4+ only)

The economy will lend itself to an SDK for indie devs — but **not for the reason you would pitch first**. The seductive (wrong) pitch is "plug in for crypto rails without launching a token." This attracts the exact mercenary-token crowd we are avoiding. The real draw is **"we handle the wallet, onboarding, payments, treasury, prize compliance, and player liquidity — you bring a game."** Same deal as Miniclip/Roblox.

The SDK's pitch should **hide the crypto, not lead with it** — same principle as "skill not earn," applied to the B2B layer.

---

## 7. How games feed each other (the cross-game loop)

### 7.1 Live today

| Connection | Surface | Status |
|---|---|---|
| Shared identity (TG ID or Privy callsign) | Every game's submit, every leaderboard | ✅ Live (Privy currently off) |
| Per-game leaderboards (top-N) | `/leaderboard/<game>` + dashboard "Top Scores" widget | ✅ Live (rev. 2026-05-28) |
| Overall cross-game leaderboard | `/leaderboard` Overall tab — ranks by total plays across all 3 wired games | ✅ Live (rev. 2026-05-28) |
| Time-windowed boards (24h / 7d / all) | `/leaderboard` time filter | ✅ Live (rev. 2026-05-28) |
| Personal standing card | `/leaderboard` right rail | ✅ Live for bot users (rev. 2026-05-28) |
| Shared chrome (masthead, ticker, signet) | Every page | ✅ Live |
| Bot ↔ web convergence on same Mongo | All games | ✅ Live |

### 7.2 V3 (designed, not built)

| Connection | Surface | Status |
|---|---|---|
| Tickets earned per game | All games, every play | 🟡 Designed — needs server `tickets_ledger` collection |
| Tickets spendable across games | Tier 1 currency swap | 🟡 Designed |
| Cross-game prize pool | Prize Counter shop | 🟡 Designed — vitrines already built (placeholder) |
| Live wager feed | Dashboard right rail | 🟡 Placeholder — needs `/api/arcade/wagers/recent` endpoint |
| Continue Playing | Dashboard centre column | 🟡 Placeholder — needs `/api/arcade/continue-playing/:uid` |
| Friends Only leaderboard | `/leaderboard` right rail | 🟡 Placeholder — needs social graph |
| Tier / XP progression ("Floor Member") | Signet panel | 🟡 Placeholder — needs XP rules |

### 7.3 The loop the brand promises (design intent)

> Play → earn Tickets → spend Tickets on cabinet-specific cosmetics → cosmetics surface in your signet / profile / share cards → other players see them → they want to play → loop.

The chrome already supports the loop visually (masthead chip showing `SOL 4.21` + `TKT 1,840`, vitrines showing prizes per cabinet, signet showing tier). The economy plumbing underneath is V3 work.

---

## 8. Surfaces — the 5 product screens × 2 platforms

The product has **5 screens × 2 platforms = 10 surfaces**. All 10 are built and live. Reference implementations + token contracts live in [`The_Arcade_Design_Package/design_handoff_the_arcade/`](../../The_Arcade_Design_Package/design_handoff_the_arcade/).

### 8.1 Dashboard (`/play`)

Three-column desktop layout: `180px (nav rail) | 1fr (centre) | 268px (right)`. Mobile single-column, sections stacked.

| Region | Component | State |
|---|---|---|
| Centre | Featured Cabinet — 380px hero, auto-cycles 4.5s, 4 games, blue accent rule | ✅ Live with real hero art |
| Centre | The Floor — 4-column cabinet grid, current featured dimmed to 55% | ✅ Live with real tile art |
| Centre | Coming Up — flat row with date pills | ✅ Live (static) |
| Left rail | Browse categories | ✅ Live (static) |
| Left rail | Who's Playing — circular avatars | ✅ Live (static — needs friends API) |
| Right rail | Top Scores — auto-syncs with featured cabinet | ✅ Live (real Mongo data) |
| Right rail | Prize Counter Mini — 4 prizes, 2 shelves | ✅ Live (placeholder prizes) |
| Right rail | Live Wagers — 5 rows | 🟡 Placeholder (needs wager event feed) |

### 8.2 Game Detail (`/play/<slug>`)

Editorial detail page. Centre column: breadcrumb → marquee → how-to-play → payout table → your history. Right rail: **wager slip** (dominant section for V3 wager flow). Currently a Free Play CTA only.

The Free Play button routes to `/play/<slug>/launch` which mounts the game canvas full-bleed.

### 8.3 Prize Counter (`/prizes`)

- Hero: Krona One "PRIZE COUNTER" + voucher slip with the user's ticket balance.
- Filters: cabinet tabs + rarity dots.
- Three vitrines stacked vertically, one per cabinet. 4 prizes on a paper shelf each, brass corner brackets, glass sheen.
- Footer: 3-column note about One-Way Valve / Restock schedule / Ownership (NFT minting).
- All placeholder data per `MiniPrize` fixture until V3 economy lands.

### 8.4 Wallet (`/wallet`)

- Hero: full **banking slip** with brass corner brackets and rotated "PAID IN 26·05 · TELLER 01" stamp.
- Below: paper-ledger transaction history.
- Right rail: Quick Top-Up amounts, Linked Wallets list, Safety note.

SOL balance reads `—` while Privy is off. TKT balance is placeholder (V3 work).

### 8.5 Leaderboards (`/leaderboard`)

- Hero stats: **real player count** (live as of 2026-05-28), placeholder Prize Pot, placeholder Resets In.
- Filters: time window (24h / 7d / all) + cabinet tabs (Overall / SolShot / Basketball / Free Kicks / Keepie Uppies).
- Podium: type-only top-3 (no badge cards) — #01 dominant, #02 / #03 share the next row.
- Standings list: real Mongo top-10 for all 4 wired cabinets (SolShot still placeholder — different data model).
- Right rail: **Your Standing** (real for bot users) + Friends Only board (placeholder) + Prize Structure (placeholder).

### 8.6 Mobile variants

Same 5 screens, single-column, at 420px wide. Shared mobile chrome:
- `MEdHeader` — compact masthead
- `MEdTicker` — slim red-LIVE ticker
- `MEdSection` — compact section primitive
- `MEdTabBar` — 5-icon bottom tab bar (Home / Play / Prizes / Wallet / Board)

All mobile screens reserve **`paddingTop: 48`** on the root container to clear the device status bar.

### 8.7 Pre-auth Cabinet landing (`/`)

Logo + tagline + Insert Coin button. Currently bypasses auth and navigates straight to `/play` (Privy is off). When Privy comes back, this is where the modal opens.

---

## 9. Identity & Auth

### 9.1 Current state (Privy OFF)

`RequireAuth` is a bare `<Outlet/>` pass-through. `CabinetLanding`'s Insert Coin button navigates straight to `/play`. The Privy modal is dormant but the integration is intact — re-enabling is a two-file revert.

### 9.2 Identity sources

| Source | Carries | When |
|---|---|---|
| **TG session JWT** in `?session=<jwt>` URL param | `telegramUserId`, `username`, `firstName` | Bot users tapping `/<game>` in `@TheArcadeGG_Bot` |
| **Privy callsign** | `callsign` (locked 3–12 chars), wallet address | When Privy is on — direct web visitors |

The JWT is stored under `sessionStorage` as `arcade_session` (basketball + keepie-uppies) or `arcadeSession` (free-kicks, forked from separate repo). The `useMyStanding` hook reads both. 30-day TTL since 2026-05-28 (was 24h).

### 9.3 Identity merge policy

**Callsign canonical** when known. TG bot arrivals carry `telegramUserId` which resolves to callsign at read-time via the TG↔wallet binding in the `users` collection. If a user has both, both are the same person. If they have only TG, they show as `@username`. If they have only Privy, they show as their callsign.

### 9.4 Session handoff to solshot.gg

SolShot keeps its own domain. Tapping the SolShot tile in the Arcade hub:

1. Arcade calls `GET /api/arcade/session-handoff` (Privy-auth-gated).
2. Server mints a 10-min HS256 JWT.
3. Arcade redirects to `solshot.gg/?arcade_token=<jwt>`.
4. SolShot client validates via `POST /api/arcade/session-validate`, provisions a Privy session.

Endpoints live in `server/services/arcadeSession.js`.

---

## 10. Tech & Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  the-arcade-eta.         │        │  solshot.gg              │
│   vercel.app             │        │  (SolShot repo, CRA+JS)  │
│  (Arcade repo,           │        │  ────────────────────────│
│   Vite+React+TS)         │        │  - artillery game        │
│  ────────────────────────│        │  - challenge cards       │
│  - cabinet landing       │        │  - on-chain escrow       │
│  - dashboard             │        │  - prestige burns        │
│  - /play/keepie-uppies   │        │                          │
│  - /play/basketball      │        │                          │
│  - /play/free-kicks      │        │                          │
│  - /play/solshot ────────┼────────┼─→ redirect with handoff  │
│  - /leaderboard          │        │                          │
│  - /prizes               │        │                          │
│  - /wallet               │        │                          │
│  - /wager (waitlist)     │        │                          │
└────────────┬─────────────┘        └────────────┬─────────────┘
             │                                   │
             └─────────────┬─────────────────────┘
                           ▼
              ┌────────────────────────────┐
              │  SolShot server (Render)   │
              │  solshot.onrender.com      │
              │  ─────────────────────────│
              │  - Express + Socket.IO     │
              │  - @SolShotGG_bot          │
              │  - @TheArcadeGG_Bot        │
              │  - Mongo (User, Match,     │
              │    BasketballScore,        │
              │    KeepieUppiesScore,      │
              │    FreeKicksScore, ...)    │
              │  - Anchor escrow client    │
              │  - Privy server-auth       │
              │  - /api/arcade/*           │
              │  - /api/games/*            │
              └────────────────────────────┘
                          ▲
                          │ Privy app (shared appId)
                          ▼
              ┌────────────────────────────┐
              │  Privy (dashboard.privy.io)│
              │  Origins:                  │
              │   - solshot.gg             │
              │   - the-arcade-eta.        │
              │     vercel.app             │
              │   - localhost:5173         │
              └────────────────────────────┘
```

### 10.1 Repo split

- **`JJ-ME55/The-Arcade`** — client only (Vite + React + TS + Phaser). Web hub.
- **`JJ-ME55/SolShot`** — server + SolShot client + Anchor programs + bots + Mongo + escrow. The platform backend.
- **Brand hierarchy externally:** The Arcade is the parent, SolShot is one product underneath. The naming smell (the SolShot repo holds the platform backend) is acknowledged and accepted — fixing it would require renaming the repo, which alters the hackathon submission identity.

### 10.2 Live API surface (per-game leaderboards)

```
GET  /api/games/<slug>/leaderboard?limit&since    → { ok, leaderboard, totalPlayers }
GET  /api/games/<slug>/standing/<telegramUserId>  → { ok, standing | null }
POST /api/games/<slug>/score                       → { ok, newBest, bestScore, rank, totalPlayers }
GET  /api/games/leaderboard?limit&since            → cross-game overall
GET  /api/games/standing/<telegramUserId>          → cross-game standing
```

Score submission gated by HS256 JWT (per-game signing secret). Standing + leaderboard endpoints public.

### 10.3 Arcade-specific endpoints

```
POST /api/arcade/session-handoff   → mints 10-min JWT for solshot.gg redirect (Privy-auth-gated)
POST /api/arcade/session-validate  → SolShot client validates the JWT
POST /api/arcade/score             → unified score submit (Privy-auth-gated, future)
GET  /api/arcade/profile/:callsign → public profile (future)
POST /api/arcade/register          → register a callsign (Privy-auth-gated)
POST /api/wager-waitlist           → email capture, rate-limited
```

### 10.4 Vercel deployment

- One Vercel project per game URL. **Never share Vercel projects across domains** — the 2026-05-15 near-miss flipped `www.solshot.gg` to basketball for ~10 minutes when `sol-shot` project served multiple domains.
- The Arcade hub lives on JJ's Vercel account (not Fish's). The Vercel URL is `the-arcade-eta.vercel.app` (Vercel auto-suffixed `-eta` because `the-arcade.vercel.app` is owned by another account).
- Custom domain: TBD. `arcade.xyz` vs `thearcade.gg` vs alternatives. WHOIS pending.

### 10.5 Render deployment

The SolShot server auto-deploys from `main` on push (Render `autoDeploy: true`). `rootDir: server` filter ensures only `server/` changes trigger a redeploy. The Arcade client + SolShot client + Anchor programs do NOT trigger Render rebuilds.

### 10.6 Telegram bots

| Bot | Token env var | Role |
|---|---|---|
| `@SolShotGG_bot` | `TELEGRAM_BOT_TOKEN` | Game-specific, hackathon entry, group-chat matches, escrow flows. Unchanged. |
| `@TheArcadeGG_Bot` | `ARCADE_BOT_TOKEN` | Multi-game launcher. `/games` + `/<slug>` per game. Leaderboards via `/leaderboard`. |

Both bots run in the same Express process. Separate Telegraf instances. Separate webhook paths. Both share Mongo (`users` collection — TG ID ↔ wallet binding works across both).

### 10.7 Score-submit reliability (added 2026-05-28)

After Elliot's 450-point free-kicks run got lost to a silent 401:

1. **Session TTL: 24h → 30d.** Bot users get a full month per tap.
2. **Silent failures surfaced.** Game-over screens now show:
   - `session_expired` → "⚠ Score not saved — re-launch /<game> in @TheArcadeGG_Bot"
   - `network_error` → "⚠ Score not saved — network error"
   - `no_session` → silent (player chose to play without bot identity)

Pattern applied to all 3 standalone games (basketball, keepie-uppies, free-kicks).

---

## 11. Roadmap

| Phase | Scope | Timing |
|---|---|---|
| **V1** | SolShot mainnet. Just that. No economy work. | Shipping (this week, as of 2026-05-29) |
| **V2** | 4+ player support (last-man-standing). Broadens the core game. Refactor spec already exists. | After V1 stable |
| **V3** | **Arcade mega-economy.** Tickets (Tier 2), shop (Tier 3), per-game internal currencies (Tier 1). Everything in §6. | Introduced *after* there is a multi-game arcade for it to sit under and live data to tune against. |
| **V4+** | **SDK / platform.** Third-party studios ship on Arcade infrastructure. The Miniclip/Roblox deal. Marketplace for assets and skins. App store for crypto-rails games. | mid-2027+ |

**Discipline note (the whole reason V3 is locked at principle-only):** the economy is the most intellectually fun problem on the roadmap. That is exactly why it is dangerous to over-build now. The lever *this month* is retention + onboarding on what just shipped (silent submit-failure fix, hero illustrations, real leaderboards), not modelling emission schedules. The principles in §6 are locked; the *numbers* can only be learned from live behaviour. Lock the shape, close the doc, ship.

---

## 12. Open questions / unresolved decisions

### 12.1 Quick reference

| # | Question | Status | Detail |
|---|---|---|---|
| 1 | Custom domain — which TLD + name | **Open** | §12.2.1 |
| 2 | Master / overall leaderboard — necessary at all? | **Open** | §12.2.2 |
| 4 | Monorepo vs per-game repos | **Open** | §12.2.3 |
| 5 | Δ rank delta column | **Deferred** | §12.2.4 |
| 8 | Privy back-on timing | **Open** | §12.2.5 |
| 10 | Hero art commission strategy | **Open** | §12.2.6 |

### 12.2 Detailed analysis (per question)

#### 12.2.1 — Custom domain

**The question.** The brand name is locked ("The Arcade"). The remaining decision is which TLD + name to grab and what to pay.

**Why it matters.** Doesn't block V1 (we're live on `the-arcade-eta.vercel.app`). Does block any wider marketing push — landing pages, social bios, link previews, paid acquisition all want a clean canonical URL. Also feeds the BotFather `setdomain` decision for silent Privy auth via `login_url` (currently `solshot.gg`).

**Candidate domains.** Five flavours, three to seriously consider:

| Candidate | Read | Likely cost | Risk |
|---|---|---|---|
| `thearcade.gg` | Gaming-native. `.gg` is the established TLD for esports + streaming + Twitch. **Strongest brand fit.** | $50–150/yr if available; could be 4–5 figures premium | Premium names often pre-owned; needs WHOIS |
| `thearcade.com` | Boring but legitimate. The default TLD for civilian readers. | Probably owned. Acquisition cost likely $$$$. | Cost. May not be on the market. |
| `arcade.xyz` | Short, modern, crypto-adjacent. | Mid; premium names trade for $1–2k one-off | `.xyz` carries some "rug TLD" association from past cycles |
| `thearcade.io` | Tech-coded, common for crypto products. | $50+/yr, premium names higher | Generic startup feel; doesn't differentiate vs the 1000 other `.io` projects |
| `playthearcade.com` | Verb-led, civilian-friendly. | $10–20/yr likely available | Reads slightly long. Better as marketing URL than canonical. |

**Decision criteria.**
1. **Survives a 5-second pitch.** "It's thearcade dot gg" — `.gg` flows; `.com` flows; `.xyz` requires explanation.
2. **Survives 5 years.** `.gg` has staying power in gaming. `.xyz` has cycle risk.
3. **Matches the brand register** — cream-paper editorial, not casino-flashy. `.com` and `.gg` yes. `.xyz` reads techy + crypto-adjacent.
4. **Premium acquisition budget.** What is JJ willing to spend? A premium `.com` could be £5–50k. A `.gg` is likely £100–2000.

**Recommended next step.** JJ runs WHOIS on the top 3: `thearcade.gg`, `thearcade.com`, `arcade.gg`. Reports availability + ask price. Then pick. If `.gg` is available at a reasonable price, lock it. If unavailable, fall back to `thearcade.io` or `playthearcade.com`. `.xyz` is the fallback-of-fallbacks.

**Blocks.** Nothing in V1. Should resolve before a wider marketing push, and definitely before V3 economy ships — cashout vouchers reading "thearcade.gg" lands very differently than "the-arcade-eta.vercel.app."

---

#### 12.2.2 — Master / overall leaderboard — necessary at all?

**The question.** Each game has its own leaderboard (Basketball + Keepie Uppies + Free Kicks live; SolShot uses gold/prestige). A cross-game master / overall leaderboard is in-progress as a placeholder, but JJ's question is whether one is even **needed**. If we ship one, the most likely medium is **total Tickets earned**, provided we balance ticket-earning across games so no single cabinet dominates.

**Why a master LB might be necessary.**
- **Brand unity.** "The Arcade" needs a flagship board to feel like one place, not four silos.
- **The ARCADE CHAMPION promise.** Arcades have always had a "high-score initials" celebrity. Without a top-of-arcade ranking, that culture has nowhere to land.
- **V3 Ticket economy needs a participation lens.** If Tickets are the arcade-wide currency, the arcade-wide leaderboard ranks players in that currency. The two go together.

**Why it might NOT be necessary.**
- **Cross-game scoring is fundamentally apples-to-oranges.** Basketball "39" doesn't compare to keepie-uppies "208."
- **"Most plays wins" rewards grinders not skill** — and that violates Rule 2 (rate-based ranking) if it's tied to emission.
- **Per-game LBs already serve the in-cabinet competitive loop.** Most players care about being good at the game they like.
- **A master LB computed weird ways feels manufactured.** Better to have NO master LB than a bad one.
- **Cluttered UI.** Five tabs (Overall + 4 cabinets) on `/leaderboard` is already busy; the Overall tab being the most prominent forces a decision on what it shows.

**If we ship one — what's the medium?**

| Option | What it ranks | Bot resistance | Brand fit | Notes |
|---|---|---|---|---|
| A. Total plays | Most engaged players | **Low** — bots dominate | Poor | Current placeholder. Explicitly labelled as such. |
| B. **Total Tickets earned** | Most rewarded players | **Medium** (depends on emission balance) | **High** — Tickets ARE the arcade-wide currency, so this is the natural read | JJ's hypothesis. Conditional on V3 ticketing + emission balance. |
| C. Percentile rank sum (golf) | Best generalist across games | High — rate-based | Mid | Fish's v1 proposal. Cold-start noise + "100 for not playing" needs care. |
| D. Best-game-only | Best specialist in their best cabinet | High | Mid | Penalises generalists; rewards depth. |
| E. Compound (placement points + multi-game bonus) | Reward breadth and depth | High | Mid | Complex to explain to players. |

**JJ's hypothesis (B) requires "balanced ticket-earning." What does that mean?**

Per-game ticket emission has to be calibrated so a player who only plays basketball doesn't dominate over a player who only plays free-kicks just because basketball sessions are shorter, OR because basketball happens to be the most-played cabinet, OR because basketball's skill ceiling is lower.

Three things need calibrating:

1. **Tickets per minute of play, not per match.** A 3-min free-kicks run and a 10-min SolShot match should earn comparable Tickets-per-minute. Otherwise the meta becomes "play the shortest game on loop."
2. **Anti-grinder cap.** Daily Ticket cap per player, OR diminishing returns curve above N plays per game. Otherwise the meta becomes "play 18 hours straight."
3. **Leaderboard bonus uses rate-based metrics** (Rule 2). Skill bonus ranks on win rate / accuracy / placement, not "most wins."

**Recommended next step.**

1. **Don't ship a master LB in V1/V2.** The current Overall tab is plays-as-proxy and explicitly labelled. Acceptable.
2. **At V3 economy launch, ship a Tickets-earned master LB** if the emission balance work is done. If not, ship per-game LBs only and skip master.
3. **Decide whether to have a master LB at all** as part of V3 design — JJ's "query whether either necessary" framing means this is genuinely open. The answer might be "no — per-game champions only, with seasonal cross-cabinet 'Arcade Champion' events instead."

**Sub-questions if we proceed.**
- **Time-window.** Weekly champions reset? All-time only? Both views?
- **Emission balance algorithm.** Same Tickets per minute? Same per match? Game-specific multipliers?
- **Anti-grinder.** Daily cap per player? Diminishing returns curve?
- **Display.** Top 100 globally? Top 10 by region? Friends Only?

---

#### 12.2.3 — Monorepo vs per-game repos

**The question.** SolShot had to be in its own repo because hackathon submission identity. Going forward, future games could be in a monorepo. **Is there a negative to widening?**

**Current state.**
- `JJ-ME55/SolShot` — server + SolShot client + Anchor programs + bots + Mongo + escrow + standalone leaderboard services. The platform backend.
- `JJ-ME55/The-Arcade` — Arcade web hub (Vite + React + TS). Client only.
- Game scenes for basketball + keepie-uppies + free-kicks are **lifted** into `The-Arcade/src/games/`.
- Free-kicks originally lived in `JJ-ME55/solshot-free-kicks` (separate repo fork). Now duplicated into The-Arcade.
- Each game has its own legacy Vercel project (deprecation pending).

**Arguments FOR widening (monorepo).**
- **One source of truth.** Clone one thing, see everything.
- **Shared tooling.** Lint, format, CI, dependency upgrades all centralised.
- **Cross-game refactors ship in one PR.** Brand chrome change touches all games at once.
- **Faster onboarding.** Fish / next collaborator clones one repo, not five.
- **Easier to enforce brand consistency.** Shared `@arcade/chrome` package, one place to update.

**Arguments AGAINST widening (multi-repo, status quo).**
- **Build time grows linearly with games.** Already at ~40s for The-Arcade alone. Monorepo with 7+ games could hit 5–10 min builds without Turborepo / Nx tooling.
- **Coupled deploys.** One broken commit breaks all games' deploys. Mitigation: Vercel project per game with path-based triggers, but you've recreated multi-repo isolation with extra tooling.
- **Repo size + dependency pollution.** Phaser-only games inherit Three.js because free-kicks uses it. Asset bundles get heavy.
- **Permissions are coarse.** GitHub can't grant Fish write access to just `src/games/basketball/` — they get the whole repo.
- **SDK / third-party indie devs (V4+) cannot reasonably fork a monorepo.** The Miniclip/Roblox pitch is "you bring a game, we handle the rest." That requires a thin SDK target — not "fork our 2GB monorepo."

**Negatives JJ specifically asked about — explicit answers.**

| Risk | Reality |
|---|---|
| **Build time** | Real. Without tooling (Turborepo, Nx), a 7-game monorepo hits 5–10 min builds. With tooling, ~2 min via incremental builds. Adds infra cost. |
| **Deploy blast radius** | Real. A bug in basketball can fail the Arcade hub's Vercel deploy. Mitigation: per-game branches with isolated deploy targets — but that's what we have now. |
| **Game-specific dependencies pollute the root** | Real-ish. Three.js + Phaser both live in `package.json` if both are deployed. With workspaces (npm/yarn/pnpm) you can scope this. Manageable. |
| **Indie SDK story incompatibility** | Real and big. V4+ third-party studios need a thin integration target. A monorepo IS the wrong architecture for that. |
| **Permissions** | Real but solvable via PR-gating and trusted collaborators. Fish has full repo access anyway. |

**Three architectural options.**

| Option | Shape | Trade-off |
|---|---|---|
| **A. Status quo (multi-repo)** | SolShot + The-Arcade + per-game repos. Games lift into The-Arcade hub. | Current state. Doubles up on game maintenance briefly during lift, but stable. Compatible with V4+ SDK. |
| **B. Full monorepo** | One `the-arcade` repo holds platform + all games + backend. SolShot folds in. | Faster iteration. Higher tooling complexity. **Incompatible with SDK story** — third parties can't plug into a monorepo. |
| **C. Hybrid — platform monorepo + game submodules** | The Arcade web hub is one repo. Each game is its own thin repo published as an npm package (`@arcade/basketball`). Hub imports them. | Best of both worlds in theory. Real-world overhead: every game change is a publish + bump + integration test cycle. |

**Recommended next step.**

Status quo (A) is the right answer **if the SDK story (V4+) matters**. The monorepo (B) is faster for the next 2–3 games but actively blocks the V4 SDK pitch — and the V4 SDK is the venture-scale unlock.

The hybrid (C) is what big games studios actually do (Riot, Niantic) but requires CI infrastructure we don't have.

**Decision criteria for JJ.**
- **If V4 SDK is real:** stay multi-repo. Per-game repos are the right shape for "indie devs plug in."
- **If V4 SDK is aspirational and we're optimising for next-12-months velocity:** monorepo + Turborepo, and accept the rebuild cost when V4 ships.
- **The cost of being wrong.** If you go monorepo and V4 SDK lands, you split the monorepo back out — meaningful but tractable engineering work. If you stay multi-repo and V4 SDK never happens, you've paid an ongoing coordination tax but kept optionality.

**My read: stay multi-repo. The cost of preserving SDK optionality is low; the cost of removing it is high.**

---

#### 12.2.4 — Δ rank delta column (clarification)

**What it means.** The Δ column on the leaderboard shows **how a player's rank has moved since the last snapshot**. Conventions:

- `+2` = climbed 2 spots since the last snapshot
- `-1` = dropped 1 spot
- `—` = no change (or first appearance — see below)
- `NEW` = wasn't in the previous snapshot, is in this one

**How to compute it.** Server takes a snapshot of each leaderboard at a regular cadence (probably daily, midnight UTC). When rendering today's leaderboard, look up each player's rank in yesterday's snapshot and diff.

**Storage shape.** Small. Per-game `LeaderboardSnapshot` collection, one document per game per day:

```js
{
  game: 'basketball',
  takenAt: ISODate('2026-05-29T00:00:00Z'),
  ranks: [
    { telegramUserId: 5684260927, rank: 1, bestScore: 39 },
    { telegramUserId: 1054706416, rank: 2, bestScore: 33 },
    // ...
  ]
}
```

**Why JJ asked "time slots?"** — because the cadence is a decision. Daily? Weekly? Hourly?

- **Daily (recommended)** — most LBs in gaming use daily deltas. Feels right for "active competition."
- **Hourly** — too noisy. Δ flips constantly. Bad UX.
- **Weekly** — too slow. Δ rarely changes. Doesn't reward engagement.
- **Match-by-match** — possible but expensive. Triggers on every score submit.

**What "discovering how that works out" likely meant** — JJ's question about whether Δ even helps engagement. Some products use it well (Twitch leaderboards, sports rankings); some don't (Steam achievements). Cheap to ship, easy to remove.

**Recommended next step.**

1. Server: add `LeaderboardSnapshot` Mongo schema + a daily cron at 00:00 UTC.
2. Server: on each `/leaderboard` request, fetch latest snapshot, diff against current standings, attach `delta` field to each row.
3. Client: column already wired (currently shows `—`). Just consumes the field.
4. **Effort estimate.** ~2–3 hours of server work. Not blocking V1.
5. **Decide later** whether the column adds engagement or just visual noise. Easy to A/B by toggling visibility.

---

#### 12.2.5 — Privy back-on timing

**What the question means.** Currently Privy login is **disabled**:
- `CabinetLanding` (the pre-auth `/` route): "Insert Coin" button skips auth and navigates straight to `/play`.
- `RequireAuth` (the route guard): bare `<Outlet/>` pass-through; no auth check.

This means:
- **Bot users still have identity** — TG session JWT carried in the URL on game launch. Score submission works. Your Standing populates.
- **Direct web visitors have NO identity** — no callsign, no wallet, no leaderboard write, no Your Standing, no Tickets balance, no avatar (V3).

**The question.** When does the Privy login UX come back on?

**Why it was turned off.** The v2 brand integration superseded the v1 cabinet-arcade brand. The Privy modal hadn't been re-styled to match the cream-paper editorial register, and the "Insert Coin" CTA's auth handoff felt clunky against the rest of the polish. Cleaner to bypass than ship a half-baked modal.

**Why it needs to come back on.**
- **V3 economy needs identity.** Tickets are per-user. Can't earn or spend without a stable account.
- **Direct web visitors are a growing share.** Once the custom domain lands and any marketing push starts, the bot-vs-web split shifts.
- **Wallet UI (`/wallet` route) shows `—` for SOL balance** because Privy is off.

**Two UX models on the table.**

| Model | Behaviour | Pros | Cons |
|---|---|---|---|
| **A. Gate at landing** (Fish's v1 model) | "Insert Coin" → Privy modal → callsign → `/play`. No play without auth. | Clean identity-first product. Every user has a wallet. | 30-second friction at the door. Worst possible first impression for civilians. |
| **B. Lazy auth** (recommended) | Direct visitors play immediately (free-play). Prompt sign-in only when they want to **save a score, redeem Tickets, top up wallet, view standing**. | Civilians taste the product before signing in. Lowest friction. Matches the Bitrefill-style "your nan can use this" goal. | Some users never sign in. Leaderboard write is conditional. Account merge if they sign in later is a problem to handle. |

**Recommended next step.**

1. **Re-style the Privy modal** to match v2 cream-paper editorial (~2–4 hr work).
2. **Implement lazy auth (Model B).** Direct visitors play immediately; auth prompt fires on first score submit / first wallet open / first prize click.
3. **Re-enable `RequireAuth` for protected routes only** — `/wallet` and (V3) `/prizes` checkout / shop spend. `/play/*` stays open.
4. **Account merge for late sign-in.** If a user plays 5 free-play games then signs in, they get a callsign but their 5 plays were never written to Mongo (no JWT). Acceptable for V1. Reconsider if civilian retention data shows a problem.

**When?** Before V3 economy ships (Tickets need identity). Realistically: lazy-auth re-enabling can ship as a half-day V1.x task once a modal re-style lands.

---

#### 12.2.6 — Hero art commission — in-house artist vs external commission

**The question.** Three assets per game (tile 1280×800 + hero 2400×1050 + splash 1080×1920). 4 games × 3 = 12 assets immediately. Confirmed needed (§ Open Q10). **Sub-question: in-house artist vs external commission?**

**The bigger context.** This isn't just about replacing the current cropped WebPs. The Avatar Layer (V3, §6.4) is **art-heavy** — base characters, layered items (hats, glasses, shoes, masks, outfits, crowns), seasonal drops, tournament-prize 1:1 items. The Avatar V3 doc flags it explicitly: *"asset creation is the hardest part of this. A small team cannot hand-produce Fortnite volume."*

**Two models, plus a hybrid.**

| Model | Cost shape | Iteration speed | Style consistency | Scales with V3? |
|---|---|---|---|---|
| **A. External commission, per-asset** | £500–2k per hero piece. ~£8–24k for the 12 V1 hero assets. Per-asset costs for V3 items. | Slow (1–3 weeks per round). Back-and-forth via Discord/email. | **Risk of style drift** between commissions if artists rotate. | Poorly. Fortnite-volume asset libraries via external commission is bankruptcy-shaped. |
| **B. In-house artist (FTE)** | £40–60k/yr (UK indie market rate). Plus tooling, equipment, onboarding. | Fast (days, not weeks). Tight feedback loop. | **High** — one person, one style language. | **Required for V3 avatar layer.** Volume is the unlock. |
| **C. Hybrid — strong external relationship with one consistent artist** | Retainer model. £2–4k/month for guaranteed throughput + first-refusal on new work. | Mid. Faster than ad-hoc commission, slower than FTE. | High if the relationship sticks. | Tractable for early V3, FTE conversion becomes natural as volume grows. |

**Phasing options.**

| Phase | Hero art needed | Avatar art needed | Recommended model |
|---|---|---|---|
| **V1 (now → V3 launch)** | 12 hero assets (4 games × 3 formats) + future-game heroes as they ship | Zero | **A or C** — external commission. Per-asset or retained. £8–24k total for V1 catalogue. |
| **V3 (avatar layer launch)** | Continued hero assets for new games | Base characters + 50–200 launch items + ongoing drops | **B** (FTE) or **strong C** (multi-artist retainer) — volume requires it. |
| **V4+ (SDK)** | Studios bring their own art | Items pipeline scales | FTE art director + per-asset commission pool. Studios responsible for game art; we handle avatar items. |

**Recommended next step.**

1. **For V1 hero art (the 12 immediate assets):** external commission. Brief one artist on the full Game Art Brief, pay per-asset or per-game, accept ~£8–15k cost. Set a clear style guide based on what's already proven (the v2 cream-paper editorial chrome around studio-loud art).
2. **Decide V3 model later** (months out) but **start scouting an FTE candidate or retainer artist now** so the avatar pipeline isn't blocked at V3 kickoff. Avatar art is on the critical path for V3 per the Avatar Layer doc.
3. **Lock the style guide before commissioning.** Without a reference document, every commission carries style drift risk. The v2 designer pack provides chrome direction; we need a parallel "studio-art-in-our-chrome" direction for game art specifically. The Game Art Brief is a start.

**Sub-questions.**
- **Style direction owner.** Who locks the art-direction document? Fish? JJ? An external art director on a one-off engagement?
- **Pipeline.** How do new game heroes get briefed → reviewed → delivered → wired? Currently ad-hoc.
- **Asset budget.** Already locked at ~270KB per game per the brief. Holds across game count growth.
- **Avatar-style continuity.** When V3 launches, the avatar style needs to land in the same universe as the existing hero art OR be intentionally different. Decision needed before V3 starts.

---

### 12.3 Settled (moved here from open)

| # | Was | Now |
|---|---|---|
| 3 | Stack policy — Phaser-only or multi-stack? | **Locked: any stack, as long as it can be hosted.** Free Kicks (Vite + Three.js) shipping unbroken settled the precedent. Opening the stack opens up the larger indie game base. |
| 6 | Tickets — on-chain SPL or off-chain ledger? | **Locked: pure off-chain.** Per [`ARCADE_AVATAR_LAYER_V3.md`](../../notes/ARCADE_AVATAR_LAYER_V3.md) + [`CIVILIAN_CASHOUT_STRATEGY.md`](../../../SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md). The one-way valve only works if Tickets cannot leak via a secondary market — an SPL token would create one by default. |
| 7 | USDC in shop — yes/no? | **Likely NO (Bitrefill negates the need).** V1 cashout = Bitrefill deep-link. V3 cashout = in-app Tickets shop with gift-card vouchers via Tillo/Tango/Runa. USDC-as-prize was a hard regulatory gate; gift-card vouchers are already-licensed pathways. Revisit if a specific reason to emit USDC directly appears. |
| 9 | Brand-name finalisation | **Locked: "The Arcade".** Domain is the remaining sub-question (see §12.2.1). |

---

## 13. Document references (the constellation this consolidates)

Read this doc first. The docs below provide depth on specific topics:

| Doc | Lives at | Covers |
|---|---|---|
| **V3 Arcade Economy North Star** | `SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md` | The locked principle-level economy model. The source of §6 here. |
| **Arcade Avatar & Item Layer V3** | `The-Arcade/notes/ARCADE_AVATAR_LAYER_V3.md` | The avatar render + in-house cosmetic marketplace + no-NFT call. Source of §6.4 here. |
| **Civilian Cashout Strategy** | `SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md` | Bitrefill / MoonPay / V3 in-app shop cashout stack. Source of §6.5 here. |
| **v2 Designer Handoff** | `The-Arcade/The_Arcade_Design_Package/design_handoff_the_arcade/README.md` | The locked v2 brand pack. The source of §4 here. Token tables, component contracts, screen specs. |
| **Migration Playbook** | `The-Arcade/repo/docs/MIGRATION_PLAYBOOK.md` + `SolShot/Docs/ARCADE_MIGRATION_PLAYBOOK.md` | Operational rollout — pre-flight, lift moment, cutover, rollback. |
| **Arcade Bot Architecture** | `SolShot/Docs/build-notes/ARCADE_BOT.md` | `@TheArcadeGG_Bot` — bot architecture, commands, env, JWT flow. |
| **Fish Kickoff** | `The-Arcade/repo/docs/FISH_KICKOFF.md` | Onboarding doc for Fish in this repo. Quick-start. |
| **THE_ARCADE_v1_DESIGN** | `The-Arcade/repo/docs/THE_ARCADE_v1_DESIGN.md` | Fish's v1 design proposal. **Brand sections are SUPERSEDED by v2.** Useful for architectural decisions and per-game route patterns. |
| **CLAUDE_COMMS** | `The-Arcade/repo/docs/CLAUDE_COMMS.md` + `SolShot/Docs/internal/CLAUDE_COMMS.md` | Cross-session journal for decisions. Append-only. |
| **Ball Games Playbook** | `SolShot/Docs/BALL_GAMES_PLAYBOOK.md` | Ball-game physics specifics from the basketball build. |
| **Designer Brief (v1, superseded)** | `The-Arcade/designer-brief/README.md` | The original (fire-gradient) designer brief. Useful for asset-checklist patterns. Brand contents superseded. |
| **Game Art Brief** | `The-Arcade/designer-brief/GAME_ART_BRIEF.md` | Replaces §3.4 of original brief. Landscape hero composition rules. |

---

## 14. Superseded positions (kept for context)

These were positions taken at one point and have been overridden. They are preserved here because external references still point at them — readers landing on the older docs need a pointer back to current.

| Superseded position | Where it was canonical | Superseded by |
|---|---|---|
| **Fire-gradient retro coin-op brand** (yellow → orange → red, pixel fonts, scanlines) | `THE_ARCADE_v1_DESIGN.md` §Visual Identity; `designer-brief/README.md` §2; `repo/src/assets/brand/README.md` | v2 cream-paper editorial brand (§4 of this doc). Designer pack 2026-05-26 → integrated 2026-05-28. |
| **$TOKENS** as tradable arcade-wide token | `THE_ARCADE_v1_DESIGN.md` §$TOKENS Economy | **Killed.** A freely-traded arcade currency reintroduces the death-spiral risk this whole model exists to avoid. Replaced by Tickets (closed, one-way valve). |
| **$SHOT as launched on-chain SPL token** | Earlier SolShot litepaper, Pump.fun launch plan | **Abandoned, not deferred.** $SHOT becomes the in-game closed Tier 1 currency. (V3 north star §What changed.) |
| **24h session JWT TTL** | `ARCADE_BOT.md` §Trust model | 30d TTL, 2026-05-28. Silent 401s on stale sessions were lost data. |
| **Phaser-only stack policy** | Original arcade spec | **Multi-stack accepted** since Free Kicks (Vite + Three.js) shipped 2026-05-19 without issue. Open question #3 above. |
| **Cumulative-points leaderboard for cross-game Arcade Champion** | `THE_ARCADE_v1_DESIGN.md` §Arcade Champion (percentile-rank-sum) | V3 north star locks **rate-based ranking** for the skill bonus pool. Cumulative is bot-bait. The current Overall LB ranks by total plays, which is participation-flavoured — acceptable for now since there is no real prize attached. |

---

## 15. Changelog

> **House rule:** every material edit to this doc gets a row here. **Same commit. No exceptions.** Future readers grep this section to understand how positions evolved.

| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Initial canonical doc. Consolidates V3 economy north star, v2 designer handoff, migration playbooks, bot architecture, live game state, and the silent-submit-failure hotfix. | main-claude |
| 2026-05-29 | Economy status: ECONOMY ACCEPTED AND LOCKED at principle level. Added stress-test caveat at §6 header — numbers are illustrative until bot/gaming red-team work. Corrected participation floor wording: "⅓ Ticket" → "1–3 Tickets" per game. | main-claude (per JJ feedback) |
| 2026-05-29 | §6.4 NEW — Avatar & item layer (in-house off-chain cosmetic marketplace, no NFTs, no Tensor, full marketplace fee captured, items tradable for Tickets or SOL). Sourced from `notes/ARCADE_AVATAR_LAYER_V3.md`. | main-claude |
| 2026-05-29 | §6.5 NEW — Civilian cashout stack. V1 = Bitrefill deep-link (gift cards, ~20 min eng, zero reg burden). V1.x = + MoonPay Sell. V3 = in-app Tickets shop via Tillo/Tango/Runa. Sourced from `SolShot/Docs/internal/CIVILIAN_CASHOUT_STRATEGY.md`. | main-claude |
| 2026-05-29 | §6.6 Rule 4 qualified — the in-house cosmetic marketplace is an administered secondary market that satisfies the spirit (no leak we don't control) while extending the letter (cosmetics are tradable in our venue). Treasury modelling must include in-house resale as a variable. | main-claude |
| 2026-05-29 | §12 Open questions split into 12.1 (still open) + 12.2 (settled). Settled: Q3 stack policy (multi-stack accepted), Q6 Tickets shape (pure off-chain), Q7 USDC-in-shop (Bitrefill negates), Q9 brand name (The Arcade locked, domain still open). Q2 expanded — master LB necessity is the real question, Tickets earned as the likely medium if ticket-earning is balanced cross-game. Q4 expanded — monorepo question framed as "is there a negative to widening?". Q5 explained — Δ column = rank movement vs last snapshot, needs daily snapshot job. Q8 explained — Privy currently off, question is when it comes back. Q10 — hero art commission, sub-question in-house vs commission. | main-claude (per JJ feedback) |
| 2026-05-29 | Strengthened iteration policy — changelog updates are a hard commitment, same commit as the edit. | main-claude (per JJ feedback) |
| 2026-05-29 | §12 restructured. Old `12.1 Still open` / `12.2 Settled` two-table format replaced with `12.1 Quick reference` + `12.2 Detailed analysis` (per-question deep dives for Q1, Q2, Q4, Q5, Q8, Q10) + `12.3 Settled`. Per-question subsections flesh out options, trade-offs, and recommended next steps. Q2 master-LB has the deepest treatment (Tickets-earned medium, balanced-emission requirements, anti-grinder rules). Q4 monorepo has the architectural three-option breakdown + SDK-compatibility recommendation. Q10 in-house-artist-vs-commission phased by V1 / V3 / V4. | main-claude (per JJ "flesh out") |

---

*Maintainers: JJ. Reviewers: Fish, main-claude. Edit policy: append a changelog entry for every material change. Do not delete superseded text — move it to §14.*
