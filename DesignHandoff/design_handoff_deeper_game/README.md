# Handoff: DEEPER — Retro Mining Game UI

## Overview
**DEEPER** is a 2D "dig down, sell, upgrade, repeat" mining game in the lineage of *Motherload* / *SteamWorld Dig*. You pilot a drilling pod beneath the surface, mine ores/gems/fossils, manage fuel and hull, dock at the surface to sell your cargo, and spend the proceeds on upgrades from outpost vending machines. This bundle is the **complete front-end UI for the game's screens (menus, shops, HUD, leaderboards, collection, game-over)** plus a playable proof-of-concept dig loop.

The aesthetic is a deliberate **late-90s pre-rendered CGI arcade** look: chunky riveted-steel housings, glowing green CRT phosphor menus, gold treasure type, dark earthy backgrounds. Imagery is rendered CGI (AI-generated machine "shells") with live UI composited on top via percentage-positioned overlays.

## About the Design Files
The files in this bundle are **design references created in HTML/CSS/JS** — prototypes that show the intended look, layout, copy, and behavior of each screen. **They are not the production codebase.** The task is to **recreate these designs in the target game/app environment** — e.g. a game engine (Unity, Godot, PixiJS, Phaser), a React/Vue web app, or whatever stack the team chooses — using that environment's established patterns. Where the team already has an engine, match its scene/UI conventions; if starting fresh, pick the most appropriate framework and implement the designs there.

Two of the eight HTML files are **internal art-direction references**, not game screens (see "Files" below): the Style Frames gallery and the DALL·E Prompt Pack.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interactions are all specified and present in the files. Recreate the UI to match — exact hex values, font stacks, and layout ratios are listed in **Design Tokens** below and inline in each file. The procedural canvas art (tiles, ore icons, the dig world) is a *reference implementation* of the intended style, not necessarily the final renderer — a real engine would likely use sprite atlases, but the visual target (palette, lighting, chunkiness) should be preserved.

---

## Screens / Views

### 1. Main Menu — `DEEPER Main Menu.html`
- **Purpose:** Title screen + primary navigation hub.
- **Layout:** Full-bleed CGI hero background (`uploads/Drill_HOMESCREEN.png`) with a multi-stop dark scrim. Left-aligned column at `padding: 6vh 0 0 6vw`: the **DEEPER** wordmark + tagline. A CGI **CRT monitor shell** (`art/menu-monitor.png`) is fixed to the right (`right: 4vw; top: 6vh; width: min(400px,38vw,52vh)`), and the menu links are composited *inside* the monitor glass via an absolutely-positioned `.crt-menu` box (`left:16.6%; top:34%; width:62%; height:47%`).
- **Components:**
  - **Wordmark** "DEEPER": Oxanium 800, `letter-spacing:.13em`, `clamp(58px,9.5vw,122px)`, gold vertical gradient text (`#ffe487→#f2c33d→#b9791f→#7c4d12`), double drop-shadow.
  - **Tagline** "DIG · SELL · UPGRADE · REPEAT": Share Tech Mono, `letter-spacing:.5em`, green `#6fe88a` with glow.
  - **Menu items** (`.mi`): Share Tech Mono, green phosphor `#5fe87a` with text-glow + 2px black shadow; size is container-relative (`4.3cqw`). Hover = `filter:brightness(1.4)`. "LAST RUN" uses dimmed variant `.mi.dim` (`#3f9e52`).
  - **Status plate** (bottom-left): two pill chips "PROTOTYPE v0.1" / "DEPTH RECORD: 388 ft".
- **Menu → destinations:** NEW GAME→Dig View · LOAD GAME→`#` *(not yet wired — see Open Items)* · DAILY DIG→Leaderboard `?tab=daily` · OUTPOST→Outpost Shop · COLLECTION→Collection · RANKINGS→Leaderboard · LAST RUN→Game Over.

### 2. The Dig (gameplay) — `DEEPER Dig View.html`
- **Purpose:** The core playable loop — drill through a tile grid, collect ore, manage fuel, dock to sell.
- **Layout:** Top **HUD bar** (riveted steel gradient, `flex` row) + a flex-grow `.stage` holding a `<canvas id="world">` that is letterbox-scaled to fit.
- **HUD components (left→right):** FUEL gauge (`.bar.fuel`, orange gradient, width-driven), HULL gauge (`.bar.hull`, blue gradient), spacer, **DEPTH** readout (gold mono, `<b>FT`), spacer, **CARGO** `n/12`, **CASH** `$n` (green mono), **DOCK · SELL** button (gold, disabled unless at surface with cargo), OUTPOST link, MENU link.
- **Canvas world:** 48px tiles, 20 cols × 40 rows, rows 0–1 sky, row 2 grass-topped surface. Procedurally generated (seed `4471`). Tile types: `sky / dirt / stone / empty`, with embedded `ore`. Pod drills down & sideways, thrusts up through cleared tunnels.
- **Controls:** Arrow keys / WASD. Down/side = drill (costs fuel); up = thrust through empty tiles only; cannot drill upward. Stone with `hp>1` takes two hits.
- **Toasts:** centered top, fade in/out over 1.8s; gold variant for gold/diamond pickups.
- **Breach (out-of-fuel) overlay:** `.breach` radial-red vignette, italic skewed "Fuel Spent" headline, depth line, RUN SUMMARY (→Game Over) + RETRY buttons. Writes `localStorage.deeper_last_run = {depth, cash}`.
- **Sell on dock:** sums cargo value, refills fuel to 100, clears cargo, toasts total.

### 3. Outpost Shop — `DEEPER Outpost Shop.html`
- **Purpose:** Three vending machines for upgrades, fuel, and selling ore. Tabbed.
- **Layout:** Centered column. Blurred procedural background canvas + radial scrim. A row of three `.tab` buttons (Lucide icons) switches between three `.machine` panels. Each machine is a CGI shell PNG used as a `background-image` with `aspect-ratio` locked, and all interactive UI is composited as absolutely-positioned `.ov` overlays measured in **container query units (`cqw`)** so everything scales with the shell.
  - **AutoBuy 2000** (`uploads/Junk_Yard_Shop.png`, `1536/1024`): category rail (DRILL/FUEL/CARGO/HULL/ENGINE/RADIATOR/SCANNER/EXIT) drawn as Lucide-icon buttons positioned along the machine's button strip; an LCD category label; cash readout `$12,450`; a "CURRENT" sprite cell + name; a 3×2 grid of upgrade cells, each showing a sprite from `art/sprites/<cat>_<n>.png` with a price tag ($1,200→$64,000).
  - **Propellant Vendor 12000** (`uploads/Fuel_Screen.png`, `1455/1081`): a fully CSS-built **fuel gauge instrument** (housing / glass / animated liquid column / tick rail, with a `.low` red state ≤2L), an LCD `n / 10 L`, cash readout, and buttons `$5 / $10 / $25 / $50 / FILL TANK` that raise the liquid.
  - **Mineral Processor 3000** (`uploads/mineral_processing.png`, `1536/1024`): a sell table (Cargo Bay / Qty / Value / Total) with per-row ore icons rendered to `<canvas>` via the art engine, a grand total, and a `[ SELL ALL ]` button.
- **Note:** Prices, cash, and cargo contents here are **static mock data** — wire to real game state.

### 4. Collection ("The Vault") — `DEEPER Collection.html`
- **Purpose:** A discoverable encyclopedia of every collectible: Ores & Metals (8), Gems & Rare (6), Fossils & Relics (8) = **22 total**.
- **Layout:** Sticky header (back-to-menu, "THE VAULT / COLLECTION" title, progress ring `found / total` + gold progress bar). Tab row per category. Responsive card `grid` (`repeat(auto-fill,minmax(154px,1fr))`).
- **Cards:** square thumbnail (`art/world/<ore_|gem_|fossil_><key>.png`), tier pill, name + depth-found + value. **Locked** items (`got<=0`) render grayscale/darkened, show "???", "UNDISCOVERED", and a 🔒 overlay, and are not clickable.
- **Lightbox:** click an unlocked card → modal with large art, name, class label, flavor text, and 3 stats (VALUE / FOUND AT / COLLECTED). Close via ✕, backdrop click, or Esc.
- **Data:** all 22 items (key, name, value, depth, count, description) are defined in the `DATA` object in the inline script — lift this verbatim as the collectibles catalog.

### 5. Leaderboard / Rankings — `DEEPER Leaderboard.html`
- **Purpose:** Top-operator rankings with two tabs: ALL-TIME and DAILY DIG.
- **Layout:** Centered CGI **arcade cabinet** shell (`art/leaderboard-cab.png`, `aspect-ratio:1024/1536`, `height:min(94vh,860px)`). A gold italic "TOP OPERATORS" marquee composited at `left:24%;top:15.6%`. The scrollable score `.screen` is composited at `left:25.5%;top:28.6%;width:49%;height:48.6%`.
- **Components:** two phosphor tabs; a header row (# / OPERATOR / DEPTH FT / CASH); ranked rows (`#1` highlighted gold, `YOU` row highlighted with a "◀ YOU" suffix); a footer line (season reset / daily seed countdown). Deep-links: `?tab=daily` opens the Daily tab directly.
- **Data:** `ALL` and `DAILY` arrays are mock leaderboards — replace with live data.

### 6. Game Over / Run Summary — `DEEPER Game Over.html`
- **Purpose:** End-of-run summary plaque.
- **Layout:** Centered CGI **plaque** shell (`art/gameover-plaque.png`, `aspect-ratio:1536/1024`). Composited `.screen` at `left:23%;top:26%`.
- **Components:** "Hull **Breach**" title (silver + red gradient logo type), cause line ("CRUSHED AT 412 ft — HULL INTEGRITY 0%"), stat rows (DEPTH REACHED w/ gold "NEW RECORD"; CARGO SOLD with inline ore icons; FUEL BURNED), RUN EARNINGS total, and three actions: `[ RETRY RUN ]` (gold) / `[ OUTPOST ]` / `[ MENU ]`.
- **Data:** values are static mock; intended to read from `localStorage.deeper_last_run` written by the Dig view.

---

## Interactions & Behavior
- **Navigation:** plain `<a href>` between screens (see Main Menu map). Query param `?tab=daily` selects the Leaderboard daily tab.
- **Tabs (Shop & Leaderboard):** toggle `.on` class; show/hide the matching panel.
- **Dig loop:** keydown handler maps Arrows/WASD → `move(dx,dy)`; fuel decrements per action (0.3 thrust / 1.0 dig); reaching surface with cargo enables DOCK; fuel ≤0 triggers breach overlay.
- **Fuel gauge (Shop):** buttons call `setFuel(L+n)`; liquid column height = `L/MAX*100%` with a `.low` color swap ≤2L; CSS transition `height .5s cubic-bezier(.22,1,.36,1)`.
- **Collection lightbox:** open on card click; close on ✕ / backdrop / Esc.
- **Toasts (Dig):** appended nodes, auto-removed after 1.9s, CSS `@keyframes tfade`.
- **Animations:** toast fade (1.8s), fuel-liquid ease, HUD bar width transitions (`.25s`), card hover lift (`translateY(-3px)`, `.12s`). Honor `prefers-reduced-motion` where you re-implement these.

## State Management
State the game needs (currently mocked per-screen):
- **Run state:** `fuel` (0–100), `hull`, `depth` (ft), `cargo[]` (max 12), `cash`, `pod {c,r,dir}`, `dead`.
- **World:** seeded procedural grid (`genWorld(seed)`), tiles `{t, ore, hp, seed}`. Daily Dig uses a shared daily seed (`#4471` in mock).
- **Persistent / meta:** owned upgrade tiers per category (drill/fuel/cargo/hull/engine/radiator/scanner), wallet, collection discovery flags (`got` count per collectible), best depth record, leaderboard entries.
- **Cross-screen handoff today:** `localStorage.deeper_last_run = { depth, cash }` (Dig → Game Over). A real build should centralize run + meta state.

## Design Tokens

**Colors** (consistent CSS custom properties across all screens):
| Token | Value | Use |
|---|---|---|
| `--gold` | `#ffcf57` | treasure type, primary CTAs, depth/cash highlights |
| gold gradient | `#ffe487 → #f2c33d → #b9791f → #7c4d12` | wordmark / marquee text |
| `--crt` | `#6fe88a` (also `#5fe87a`) | green phosphor menu/CRT text |
| `--crt-dim` | `#3f9e52` | dimmed/secondary phosphor |
| `--txt` | `#e9ddc4` | warm off-white body text |
| `--muted` | `#9b8f76` | secondary/label text |
| `--red` | `#ff5d48` | breach / danger / "Breach" logo |
| `--edge` | `rgba(255,255,255,.08)` | hairline borders |
| bg darks | `#060403`, `#070504`, `#0a0805`, `#0c0a07` | page backgrounds |
| steel button | `linear-gradient(180deg,#3b352a,#1c1812)` border `#0c0a07` | `.hbtn` / `.back` |
| gold button | `linear-gradient(180deg,#ffe487,#e0a72a)` | primary CTA |

**Typography:**
- **Oxanium** (Google Fonts, weights 600/700/800) — display, wordmarks, UI buttons, headings. Italic + `skewX(-7deg)` for machine "logo" type.
- **Share Tech Mono** (Google Fonts) — all numeric readouts, CRT menus, leaderboard tables, mono labels.
- Letter-spacing is generous and intentional: `.5em` tagline, `.1–.2em` labels, `.05–.13em` headings.

**Spacing / radius / shadow:**
- Border radii: buttons `8–11px`, cards `14px`, pills/bars `99px`, lightbox art `18px`.
- Card shadow: `0 10px 26px rgba(0,0,0,.5)` + inset top highlight; hover adds gold ring.
- Machine shells use `drop-shadow(0 22–26px 44–50px rgba(0,0,0,.65–.8))`.
- **Composited overlays on machine/cabinet shells are positioned in % (and sized in `cqw`/`cqi` container-query units) relative to the shell image** — preserve these ratios exactly when re-implementing, or the UI will drift off the artwork.

## Assets

All assets are included in this bundle under `art/` and `uploads/`.

**`art/` — production-ready, wired into the live screens:**
- `menu-monitor.png`, `leaderboard-cab.png`, `gameover-plaque.png` — CGI machine/cabinet "shells" used as backgrounds with composited UI.
- `sprites/` — 42 upgrade sprites, 7 categories × 6 tiers: `<cargo|drill|engine|fuel|hull|radiator|scanner>_<0..5>.png` (transparent, used in AutoBuy shop).
- `world/` — 22 collectible icons: `ore_<key>.png` (8), `gem_<key>.png` (6), `fossil_<key>.png` (8) — used in Collection.
- **Engine JS:**
  - `deeper-core.js` — shared core (RNG `mulberry32`, ore icon renderer `renderOreIcon`, reference background `renderRef`). Loaded by **every** screen.
  - `deeper-dig.js` — dig-view world gen + tile painters + `ORE2` value table. Dig view only.
  - `deeper-scene2.js` — shared rendering helpers for Shop / Leaderboard / Game Over / Collection.
  - `deeper-paint.js`, `deeper-pixel.js`, `deeper-vector.js`, `deeper-premium.js` — **art-exploration variants used only by the Style Frames gallery.** Not used by any game screen; safe to ignore for production.

**`uploads/` — CGI source art & raw inputs (reference / higher-res source):**
- Live screen backgrounds actually referenced: `Drill_HOMESCREEN.png` (menu), `Junk_Yard_Shop.png`, `Fuel_Screen.png`, `mineral_processing.png` (shop machines).
- The remainder (`Cargo*.png`, `Drills*.png`, `Engine*.png`, `Fuel*.png`, `Hull*.png`, `Radiators*.png`, `Scanners*.png`, `Gems*/Ore*/Fossil*`, `Outpost.png`, etc.) are the **original AI-generated source renders** the `art/sprites` and `art/world` icons were sliced/derived from — kept here so a developer can re-export at higher resolution if needed.

> Note: all art here is AI-generated (DALL·E) CGI per the prompt pack. Replace or re-license as appropriate for production.

## Files
| File | Role |
|---|---|
| `DEEPER Main Menu.html` | **Game screen** — title + nav |
| `DEEPER Dig View.html` | **Game screen** — playable dig loop (canvas) |
| `DEEPER Outpost Shop.html` | **Game screen** — 3 vending machines (tabs) |
| `DEEPER Collection.html` | **Game screen** — collectibles encyclopedia |
| `DEEPER Leaderboard.html` | **Game screen** — ALL-TIME / DAILY rankings |
| `DEEPER Game Over.html` | **Game screen** — run summary plaque |
| `DEEPER Style Frames.html` | *Reference* — procedural-art style gallery (not a game screen) |
| `DEEPER DALL-E Prompt Pack.html` | *Reference* — the AI image prompts used to generate the CGI art |
| `art/`, `uploads/` | All assets (see above) |

**External dependencies:** Google Fonts (Oxanium, Share Tech Mono) via `<link>`; Lucide icons via `https://unpkg.com/lucide@latest` (Outpost Shop only). Bundle these locally for an offline/production build.

## Open Items (the only known gaps)
1. **`LOAD GAME` on the Main Menu links to `#`** — there is no save-slots / continue screen yet. Everything else is wired.
2. All numbers (cash, prices, leaderboard rows, collection counts, game-over stats) are **mock data** — connect to real game state.
3. The dig renderer is a **canvas proof-of-concept**; a production build will likely swap to a sprite/tilemap pipeline while keeping the visual target.
