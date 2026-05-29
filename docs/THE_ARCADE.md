# The Arcade — Canonical Document

> **Status:** Living document. Replaces no prior doc; consolidates the canonical positions scattered across them.
> **Owner:** JJ.
> **Last updated:** 2026-05-29.
> **Iteration policy:** Edit in place when a position lands. Add a one-line entry to the **Changelog** at the bottom with the date + nature of the change. Do not delete superseded text — strike it through or move to the **Superseded** section. This document is the single reference; everything else points back to it.

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

> Authoritative source: [`SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md`](../../SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md). Summarised here. **The economy is LOCKED at principle level and NOT BUILT.** Do not build before V3 (after V1 mainnet ships and V2 4+ player support lands).

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

**Participation floor — ~⅓ Ticket per game, regardless of result.**
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

- **Low Ticket cost = pure sink, zero real-world value.** Avatars, skins, name colours, emotes, banners, "played 50 games" badges. **Soulbound / non-transferable** so there is no resale leak. Costs nothing to emit. The grinder lands here — meaningful identity/progression reward that is economically free and un-sellable.
  - Calibration: the cheapest meaningful cosmetic must be reachable by a casual player in **days, not months**. The bad player should taste a reward early — just never a *valuable* one.
- **High Ticket cost = real-value items** (USDC prizes, scarce NFTs, premium passes). Gated far enough up that a pure grinder cannot casually reach them — requires real skill (stacked leaderboard bonuses) or real money (buying Tickets). Value-out stays gated behind effort/spend that exceeds the value itself, which keeps the treasury solvent.

### 6.4 The five non-negotiable rules

1. **One-way valve.** Tickets are buyable and earnable, never sellable, never tradable.
2. **Rate-based leaderboards.** Skill bonus ranks on rate/skill metrics, never cumulative volume.
3. **Shop is administered, not a market.** Fixed inventory, fixed prices, capped supply.
4. **Real-value goods are soulbound or modelled.** No uncontrolled secondary market on shop items.
5. **Treasury solvency on USDC-out.** If USDC is in the shop, cap it globally per period and price so real revenue (Ticket purchases + wagering rake) exceeds total USDC emitted.

### 6.5 SOL wagering — keep it firewalled

SolShot wagering continues to exist alongside the Ticket economy. It is a **separate value-out system** and must NOT touch Tickets or shop:

- **Wagering** = PvP, SOL escrow, 90/7/3 split, peer-to-peer transfer, house takes rake. Self-balancing by construction — the house never pays out more than players put in.
- **Tickets / shop** = treasury-to-player flow. NOT self-balancing — treasury can go insolvent if emission > revenue.
- **Do not connect them.** No wagering winnings → Tickets. No Tickets → wagering entries.

If they touch, an exploiter farms the self-balancing system to feed the non-self-balancing one and drains the treasury.

### 6.6 Why pay-to-win does NOT apply

You can buy Tickets and swap into Tier 1 in-game currency. But in-game currency buys **entries and cosmetics, not aim.** Buying Tickets gets you more *attempts*, never more *skill* — you still have to win. Same line as Fortnite: pay for access and cosmetics, never for the win.

### 6.7 The SDK question (V4+ only)

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

| # | Question | Blocker for | Status |
|---|---|---|---|
| 1 | Custom domain (`arcade.xyz` / `thearcade.gg` / alt) | Brand consistency | WHOIS pending |
| 2 | SolShot leaderboard tab — top prestige? deep-link out? hide? | `/leaderboard` SolShot tab UX | Needs design call |
| 3 | Stack policy — multi-stack support, or retroactive Phaser lock + port Free Kicks? | Future games' framework choice | Deferred |
| 4 | Monorepo vs per-game repos | Future game additions | Currently multi-repo (Free Kicks broke monorepo lock); pragmatic-acceptance |
| 5 | Δ rank delta column (needs daily ranking snapshots) | Leaderboard polish | Deferred |
| 6 | Tickets — separate on-chain SPL token, or pure off-chain ledger? | V3 economy implementation | Recommended on-chain SPL per V3 doc, not yet decided |
| 7 | USDC in shop — yes/no? | V3 economy implementation | Hard gate on regulatory review before shipping |
| 8 | Privy back-on timing | Direct-web identity | Off intentionally; turn back on when ready |
| 9 | Brand-name finalisation | Marketing | `@TheArcadeGG_Bot` placeholder; final name decision deferred |
| 10 | Three-asset image commission (tile + hero + splash per game) | Studio-fresh game art | Spec proposed 2026-05-28; designer not yet briefed |

---

## 13. Document references (the constellation this consolidates)

Read this doc first. The docs below provide depth on specific topics:

| Doc | Lives at | Covers |
|---|---|---|
| **V3 Arcade Economy North Star** | `SolShot/Docs/internal/V3_ARCADE_ECONOMY_NORTH_STAR.md` | The locked principle-level economy model. The source of §6 here. |
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

| Date | Change | Author |
|---|---|---|
| 2026-05-29 | Initial canonical doc. Consolidates V3 economy north star, v2 designer handoff, migration playbooks, bot architecture, live game state, and the silent-submit-failure hotfix. | main-claude |

---

*Maintainers: JJ. Reviewers: Fish, main-claude. Edit policy: append a changelog entry for every material change. Do not delete superseded text — move it to §14.*
