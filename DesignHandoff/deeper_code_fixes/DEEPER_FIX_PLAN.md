# DEEPER — "Make It Match" Fix Plan

A complete, prioritized pass to bring the build up to the intended look: **gritty late-90s CGI arcade**, warm earthy palette, consistent across every screen. Work top-to-bottom; each item names the exact file(s) and the concrete change.

**Companion files in this bundle**
- `theme.ts` — drop-in replacement for `src/ui/theme.ts` (warm palette). Do this first.
- `DEEPER Gameplay Target.html` — the visual target for the dig screen. Open it in a browser; everything in Priority 1 is built and labelled there. Read its `<script>` for exact colours/values.

**The core diagnosis.** The game currently has *two* visual languages: the CGI screens (Main Menu, Leaderboard, Game Over, Collection) look great; the **gameplay + utility screens** (Dig, Workshop, Season, Settings, How-To) look flat, cool-toned and toy-like. The fixes below collapse that gap.

---

## Priority 0 — Global palette (do first, ~20 min)

### 0.1 Replace `src/ui/theme.ts`
Use the bundled `theme.ts`. It changes only the `COL` values: warm near-black backgrounds, bronze-steel panels, exact `#ffcf57` gold, phosphor-green accent (was teal), and **fuel=orange / hull=blue** to match the dig HUD. No call-sites change.

### 0.2 `index.html` — the page backdrop is still cool purple
- Body background → `radial-gradient(ellipse 70% 55% at 50% 28%, #241c12 0%, #120d08 50%, #07050300 78%, #040302 100%)`
- `#boot-loader` background → `radial-gradient(circle at 50% 35%, #1c160e 0%, #060403 70%)`; its `.sub` colour → `#6b6256`
- `<meta name="theme-color">` → `#060403`

### 0.3 De-hardcode colours that bypass `COL`
Swapping `theme.ts` won't fix values written as raw hex. Fix these:
- `src/ui/hud.ts` → `bar()`: track is `0x20202e` (navy). Change to `0x14110b` (warm). The white gloss `0xffffff,0.18` → drop to `0.10`.
- `src/scenes/Game.ts` → `drawSurface()`: building fills `0x3a5f4a / 0x4a3f6a / 0x5a4a3a` (see 1.7).
- Grep the repo for `0x2`, `0x1c1c`, `#…` literals in `src/ui` and `src/scenes` and route through `COL`.

---

## Priority 1 — Gameplay overhaul (the big one)

> Target reference: `DEEPER Gameplay Target.html`. The lessons are from *Motherload*: **continuous solid soil with carved-out pockets (not floating blocks), a trailing tunnel, opaque rim-lit ore, depth darkening, and a corner HUD that keeps the field clear.**

### 1.1 World model — `src/world/world.ts`
- The default state of every below-surface tile is **solid soil**. "Open space" is created by **carving empty pockets** — organic blobs spanning 1–3 tiles, placed at low density — plus whatever the pod has dug.
- The pod's dug path becomes **empty tiles** → that *is* the trailing tunnel; it renders identically to a pre-existing pocket.
- **Stop** seeding grey "stone blocks" as the common texture. Stone should be **rare and faceted**, an obstacle — not the default look. Right now the underground reads as scattered grey blobs; it should read as one continuous earth face.

### 1.2 Soil — `src/world/tileRenderer.ts`
Render soil as **one continuous material**, slightly pixelated/photoreal-coarse (NOT smooth toy-cartoon). Recipe (values in the mock's `paintSoil()`):
- Base vertical gradient, **darkening with depth**: shallow `#4a3017` → deep `#1d1106` (lerp on depth 0..1).
- **Sediment strata**: ~26 faint darker horizontal bands (`rgba(0,0,0,0.06–0.13)`).
- **Grime mottling**: ~120 large soft radial blobs, mostly dark (`rgba(12,6,2,0.16)`), some warm light (`rgba(140,95,48,0.07)`).
- **Coarse grain (grit)**: dense small specks 1.2–3.6px, modest contrast (`rgba(0,0,0,0.26)` / `rgba(255,220,170,0.08)` / `rgba(110,72,36,0.28)`). Consistent across the band — not a per-tile rash.
- **Embedded pebbles**: ~hundreds of tiny rock chips (dark body + a single light glint) for realism.
- **Pixelation trick** (the mock does this): render the soil layer to an offscreen canvas at ~0.6× and blit it up with `imageSmoothingEnabled=false`. In the engine, the equivalent is a coarse grain + a low-res soil texture sampled nearest-neighbour. Keep ore/pod crisp.

### 1.3 Carved cavities (empty tiles) — `tileRenderer.ts`
An empty space is a **dark recess scooped from the soil**, not a clean tan cut-out:
- A darker soil rim around it for separation (`rgba(0,0,0,0.34)`).
- Vertical inner gradient: deep shadow at the top (`#0c0703`) → dim lit floor (`#3a2613`).
- Gritty floor speckle + a couple of fallen chips.
See `carve()` in the mock.

### 1.4 Ore — use the REAL PNGs — `tileRenderer.ts` + `src/scenes/Preload.ts`
- Render ore by **`drawImage`-ing the loaded `ore_<id>` / `gem_<id>` texture** into the tile (these are already loaded in `Preload.ts`). Do **not** redraw ore procedurally.
- **No drop shadow.** Ore is embedded *in* the dirt face, not floating in front of it. (Earlier mock had a contact-shadow ellipse — removed.)
- Ore must read **opaque and high-contrast** so it pops.
- **Coal caveat:** the current `ore_coal.png` is silver-facet-heavy with a thin dark body, so on dark loam its black mass vanishes and it looks see-through. Two real fixes (pick one or both): (a) coal spawns in the **lighter shallow strata** where its dark reads; (b) get a denser-dark-core coal render from the artist (see Asset Brief note at the end).

### 1.5 Darkness — `src/systems/darkness.ts`
- A **soft symmetric lamp glow** around the pod (radial, low alpha `~0.15`) — **not** a directional beam/cone.
- A **depth vignette**: radial dark from ~0.5×screen, plus an extra bottom gradient, so descending feels claustrophobic. Values in the mock's `darkness()`.

### 1.6 The HUD — `src/ui/hud.ts`
The bars are functional but read bright/cartoon. Two acceptable directions — the mock uses **(B)**:
- **(A) Keep horizontal bars**, but: warm track `#14110b`, **fuel = orange `COL.fuel`, hull = blue `COL.hull`**, cargo = `COL.cargo`, and **mute the fills** (no neon). 
- **(B) Vertical cylinder gauges** (recommended — the look you liked): two slim metal tubes top-left (fuel + hull), liquid fill, F/E ticks, then depth + biome beneath. Muted values from the mock:
  - fuel liquid `linear-gradient(#bb924a → #9c6c28 → #5f3f12)`, **no outer glow**, only `inset 0 -6px 10px rgba(80,48,0,.6)`.
  - hull liquid `linear-gradient(#88a6b6 → #587f92 → #2e4d5e)`, same treatment.
  - Glass gloss streak at ~13% white, not 28%. Cash/depth text glow ≤ `0 0 6px …,.18`.
- Top-right: **cash** (muted brass `#e7be4e`), a **CARGO** chip, and a **MENU** button. **Remove the SHOP button** from the in-world HUD (sell/shop happens at the surface outpost).
- Move consumables to a **bottom-centre hotbar** (see 1.8), not a right rail.

### 1.7 Surface buildings — `src/scenes/Game.ts` → `drawSurface()` (~line 274)
Currently three flat colour rectangles (`building(... 0x3a5f4a 'FUEL'` etc.) — they read as placeholders. Replace with proper little **warm-industrial structures** (reference the Motherload FUEL depot & MINERAL PROCESSING props):
- Per building: a base body with a **bevelled roof**, a **lit doorway/bay** (dark recess + warm glow), a **sign panel** (steel plate + gold Oxanium label), a couple of **lit windows**, pipes/grime. Sit them on a concrete apron above the grass line.
- Palette: warm steels/bronzes + the gold sign — same family as the menu shells. If you'd rather use art, commission/slice 3 small building sprites and `drawImage` them; the procedural recipe above is the fallback.

### 1.8 Item bar — `src/scenes/Game.ts` → `buildItemBar()` (~line 302)
Currently a vertical rail at `scale.width - 38` — it's **clipped off-screen** on desktop and cramped. Replace with a **bottom-centre hotbar** (mock's `.hotbar`):
- 4–6 slots, 70×70, dark steel, fully on-screen, centred. Each slot: an **item icon** (use the consumable art / a simple themed glyph), a **count** badge (bottom-right, gold), a **keybind** number (top-left), and a small **name** label beneath.
- Empty slots at 0.4 alpha. On narrow/portrait widths this same bar sits along the bottom — no clipping.

---

## Priority 2 — The two real bugs

### 2.1 Mobile Leaderboard renders ZERO rows — `src/scenes/Leaderboard.ts` + `src/net/leaderboard.ts`
**Symptom:** desktop shows the 12 rows; portrait/mobile shows an empty green screen (no rows, no empty-state text).
Rows come from `await getTop(this.mode, 12)` in `refresh()`. Likely causes, in order — verify each:
1. **`getTop` returns `[]`** when the backend/local store isn't seeded → only the empty-state path runs, and that text is `COL.crtDim` (very dim) so it's invisible against the CRT. **Fix:** seed a local fallback leaderboard (the mock data from the original `DEEPER Leaderboard.html`) so there's always content, and make the empty-state text `COL.crt` (bright) + larger.
2. **Async race on `scene.restart()`** (tab switch calls `setMode → scene.restart()`): if `refresh()`'s promise rejects or resolves after shutdown, rows never attach. **Fix:** wrap `getTop`/`getRank` in try/catch, and guard against building into a destroyed scene.
3. **Row clipping:** `rowH = Math.min(30, (g.y+g.h-40-y)/n)` — fine for n≤12, but confirm `g` (the glass rect from `placeShell`) is non-null on mobile; if the shell texture failed to load on a slow mobile load, the fallback rect `{x:cx-220,…}` is used and rows may land off the (smaller) portrait screen. **Fix:** confirm `shell_lb_cab` is loaded before `refresh()`, and clamp the list region to the glass.

### 2.2 Game Over has a big dead void — `src/scenes/GameOver.ts`
**Symptom:** the plaque sits small at the top; a large empty band; buttons stranded at the very bottom.
The plaque glass is placed at `cx, 322` (ends ~y520). The "below" block starts at `by = 600` (rewards), but the buttons are at `BASE_H-150 = 810` and `BASE_H-82 = 878` → a ~150px void between ~660 and 810.
**Fix (pick one):**
- **Tighten the stack:** start `by` at ~**560**, keep the rewards lines, then place `PLAY AGAIN` at `BASE_H-200`, the two secondary buttons at `BASE_H-130`, hint at `BASE_H-70`. Removes the gap.
- **Or grow + lower the plaque:** place it at `cx, 380` width `820` so it ends ~y620, then rewards at 640, buttons at 760/840, hint 905.
- Either way, drop a faint framed panel (`makePanel`, warm steel) behind the rewards+buttons block so the lower half reads as intentional, not empty.

---

## Priority 3 — Coherence pass (utility screens)

> Workshop / Season / Settings / How-To read as flat navy cards. They don't need full CGI shells — they need the **shared gritty kit** + consistent headers.

### 3.1 Make panels & buttons feel like steel — `src/ui/widgets.ts`
`drawPanel()` and `Button.draw()` are single flat fills. Add a cheap **bevel** (no real gradients needed in Phaser Graphics — layer fills):
1. Base fill `COL.panel`.
2. A lighter top strip (top ~40% height) in `COL.panelHi` for a lit top.
3. A 1px top inner highlight line `rgba(255,255,255,0.12)`.
4. The existing 2px border, but in `COL.border` (near-black) for the outer edge + a 1px `COL.borderHi` inner for definition.
5. Optional: a few `rgba(0,0,0,0.15)` grime specks for tooth.
This single change re-skins **every** list row, button, and panel across all utility screens at once.

### 3.2 Consistent headers
- Screen titles are inconsistent: **Workshop** uses `title(32, COL.accent)` (teal) while Settings/Season use gold. **Rule:** all screen titles use the default gold — change Workshop's `title(32, COL.accent)` → `title(32)`. Section sub-labels stay `COL.faint`; live values stay phosphor-green/gold.

### 3.3 Use the real sprites — `src/scenes/Workshop.ts`
Replace the coloured-dot bullets (`dot.fillCircle`) on each upgrade/pilot row with the **real upgrade sprites** you already load: map Fuel Cells→`up_fuel_0`, Reinforcement→`up_hull_0`, Honed Drill→`up_drill_0`, Expanded Bay→`up_cargo_0` (Nest Egg → a small gold-coin glyph). Same idea works for the Collection-style polish if any screen still uses placeholder dots.

### 3.4 Settings / Season / How-To
- After 3.1 + 3.2 these mostly come along for free (warm steel panels, gold titles).
- **Settings:** the +/- steppers and the "RESET ALL PROGRESS" row should use the new steel button style; keep the red accent stripe on destructive actions.
- **Season:** the progress bar fill → gold gradient (`#e0a72a → #ffe487`); locked rows get a steel panel + dim gold "LOCKED".

---

## Asset brief note (for the artist)
- **Coal** (`world/ore_coal.png`): needs a **denser dark core** — current render is mostly silver facets on transparent, so it disappears on dark soil. Either re-render with more opaque black rock, or accept coal only in light strata (see 1.4).
- Consider 3 small **surface-building** renders (Fuel depot, Outpost, Mineral Processor) in the menu-shell style to replace the procedural buildings in 1.7.

---

## Acceptance checklist
- [ ] No navy/teal anywhere; backgrounds warm near-black, panels bronze-steel, gold is `#ffcf57`.
- [ ] Underground reads as **continuous soil with carved pockets + a trailing tunnel**, darkening with depth — no floating grey blocks.
- [ ] Ore is the **real CGI PNGs**, opaque, **no drop shadow**; coal reads as solid.
- [ ] Pod lamp is a **soft glow**, not a beam.
- [ ] HUD is **muted** (orange fuel / blue hull), cargo + menu only, **no SHOP**; consumables in a **bottom hotbar**, nothing clipped.
- [ ] Surface buildings look like **structures**, not colour blocks.
- [ ] Leaderboard shows rows on **mobile**; Game Over has **no dead void**.
- [ ] Workshop/Season/Settings/How-To share the **steel-panel kit**, gold titles, and real sprites.
