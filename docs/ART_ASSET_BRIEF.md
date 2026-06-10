# DEEPER — Art & Asset Brief

> **Purpose of this document.** A complete, production-ready specification of every visual
> asset *DEEPER* needs, the art direction they must hit, and the exact technical format the
> finished files must be delivered in so they drop straight into the engine. Written against
> the **actual current build** (Phaser 3 + TS, all art procedurally generated today). Anyone
> — a human illustrator, an AI image pipeline, or me upgrading the procedural generators —
> can work from this.

---

## 0. TL;DR for whoever is producing art

- **Game:** a fast, greedy, single-player **mining-descent** game. Dig down, get rich, climb
  back before fuel/cargo/hull run out. Lineage: Miniclip's *Motherload* — but cleaner,
  faster, richer, more addictive.
- **Look we're chasing:** **tactile industrial, stylised-real.** Bold readable silhouettes,
  rich material surfaces inside them, one consistent top-left light, jewel-bright treasure
  glowing out of desaturated earth and oppressive dark. *Not* pixel-art. *Not* photoreal.
- **The grid is 48×48 world units.** Author/deliver everything at **4× (so a tile master is
  192×192px)**; the engine downsamples to the grid, which keeps it razor-crisp when the
  canvas upscales on desktop / hi-DPI.
- **Deliver:** PNG-24 + straight alpha, sRGB, one folder per category, named to the key table
  in §9, **plus** a packed atlas if you can (TexturePacker → Phaser JSON-Hash). Tiles that
  repeat must be **seamless**; stone/boulder masses must use the **autotile masks** in §3.2.
- **Priorities:** build **P0 (the hero set)** first — it defines the whole look. See §8.

---

## 1. What this game *is* (so the art serves it)

The sacred loop: **dig → fill cargo → fly up → sell → upgrade → go deeper.** Every screen and
sprite exists to make that loop tenser and more seductive. Three feelings the art must deliver,
in priority order:

1. **Tactile heft.** The pod is a *heavy industrial machine*, not a cute spaceship. Digging is
   physical — tiles crunch and shatter, dust kicks, the hull rocks. Weight and impact sell the
   fantasy of *boring through the earth*.
2. **Greed & glitter.** Treasure must *seduce*. Ore and gems literally shine through the
   darkness and pull the player down. The escalation — **deeper = rarer = richer = shinier** —
   has to be obvious and mouth-watering at a glance (a diamond should stop your breath; coal
   should look like a chore).
3. **The dread of the deep.** The surface is calm and warm; the deep is oppressive, dark,
   alien and a little dangerous (lava, gas, crushing boulders, the cold). That contrast — cosy
   vs. hostile — is the emotional spine of the descent.

**Readability is non-negotiable.** This is a fast action-economy game played at speed, often
on a phone. Silhouettes and colour must communicate *instantly*: is that ore worth stopping
for? Is that tile hard? Is that lava? Detail lives *inside* clear shapes, never muddying them.

---

## 2. Art direction

### 2.1 The one-liner
**"Tactile industrial, stylised-real."** Think the chunky, confident readability of a premium
mobile game (Alto's Odyssey, Forager, Dome Keeper, *Deep Town*) crossed with the material
richness and dramatic underground lighting of a high-end 2D production. Jewels in the dirt.

### 2.2 Pillars (enforce these on every asset)
- **Bold silhouette first.** Every object reads from its outline alone. Generous forms, no
  fussy filigree that dies on a small phone tile.
- **Rich surface, inside the shape.** Soft gradients, subtle grain, a specular glint or two,
  gentle ambient occlusion. "High spec" = believable *material* (wet rock, brushed metal,
  faceted crystal), **not** more lines.
- **One light, always.** A single **key light from the top-left**; forms get a lighter
  top-left and a darker bottom-right. Underground, everything non-emissive falls toward
  shadow (the engine paints a darkness overlay), so **emissive things — ore glow, gem facets,
  lamp, flame, lava, UI accents — must pop against it.** Bake light *into* the texture
  consistently; never light an object from the wrong side.
- **Earth desaturated, treasure saturated.** The dirt/rock palette is muted and tonal; ore,
  gems, the pod's gold hull, the lamp and UI gold are the saturated punctuation. The contrast
  *is* the appeal.
- **Material honesty by tier.** Tier-0 metals look dull and common; mid metals look refined;
  gems are translucent and faceted; the capstone (Aurelium) is radiant, almost holy.
- **A journey of palettes.** Each depth band is a distinct *world* with its own colour story
  (see §3.1). Descending should feel like travelling somewhere new every few hundred metres.
- **Premium, springy UI.** Dark glass panels, gold accents, soft shadows, rounded corners,
  juicy micro-animation (press-bounce, count-up, shine sweeps). Confident, modern, expensive.

### 2.3 Anti-goals (please avoid)
- ❌ **Pixel art / dithering.** We upscale via canvas resize; we want vector-clean / painterly
  edges that stay crisp at any resolution. (This is why we author at 4×.)
- ❌ **Photorealism.** Kills readability, performance and clean scaling.
- ❌ **Muddy mid-tones & low contrast.** Treasure must separate from dirt instantly.
- ❌ **Inconsistent light direction** or per-object outline weights.
- ❌ **Hard tile seams / a "grid" read.** Terrain must look like continuous earth and rock.
  (We just rebuilt the tile system specifically to kill the minesweeper-grid look — see §3.2.)

### 2.4 Line & form language
- **Outlines:** optional and *soft* — a darker tint of the fill (≈ ×0.6), ~2px at base scale,
  used to seat objects, not cartoon them. Treasure/items may carry a slightly crisper rim.
- **Corner radius:** everything is gently rounded; nothing razor-sharp except gem facets and
  the drill tip.
- **Scale discipline:** the pod is ~1 tile wide; ore/specials sit *inside* a tile as embedded
  overlays (≈60% of the cell) so the wall still reads around them.

---

## 3. Terrain & world (the bulk of what's on screen)

The world is a single deep shaft, **48px tiles**, changing character through **7 depth bands**.
Terrain types: `Dirt` (soft), `Stone` (medium), `HardStone` (hard), `Boulder` (round, falls),
`Bedrock` (indestructible), `Lava` (fluid hazard), `Gas` (pocket hazard), plus `Empty`/`Sky`.

### 3.1 The 7 biome bands (palette is the source of truth)

Each band needs: a **background gradient** (top→bottom), a **dirt** set, a **stone** set, a
**hard-stone** set, and an **accent** (for crystal glints/cracks). Current palette per band —
treat these as the canonical colour story; refine hues but keep the *journey* and the contrast:

| # | Band | Starts | Mood / story | Dirt | Stone | Accent |
|---|------|--------|--------------|------|-------|--------|
| 1 | **Topsoil** | 0 m | Warm brown earth, grass cap, daylight | `#7a5230` | `#6a6258` | grass `#9be36b` |
| 2 | **Clay Sediment** | 130 m | Redder packed clay, first gas wisps | `#9a4f30` | `#7a5246` | `#e0a060` |
| 3 | **Bedrock Strata** | 330 m | Cold grey stone, the light fades | `#5c5c6a` | `#4a4a5a` | `#8fa0c0` |
| 4 | **Crystal Caverns** | 650 m | Violet dark, glittering crystal veins | `#453a6e` | `#382e5c` | cyan `#7df2ff` |
| 5 | **Magma Shelf** | 1050 m | Hot red-black, lava glow, heat haze | `#6e2e22` | `#55241c` | `#ff7a2a` |
| 6 | **Frozen Deep** | 1550 m | Blue-ice, frost, brittle, cold-blue light | `#2f5e72` | `#274e60` | `#b6f0ff` |
| 7 | **The Core** | 2150 m | Near-black, molten gold seams, ominous | `#322414` | `#281d10` | gold `#ffd24d` |

> Full palettes (incl. edge tints + bg gradients) live in `src/config/biomes.ts` and are the
> authoritative reference. **Bands cross-fade** over ~120 m, so adjacent palettes should sit
> next to each other without a jarring jump.

### 3.2 Terrain tiles — the rules that keep it from looking like a grid

- **Dirt — seamless.** Each biome's dirt must **tile seamlessly in all directions** (no visible
  cell edges, no repeating hotspot). Deliver **3 variants** per biome for natural variation.
  Texture = flat earth + low-contrast organic mottle + fine grain + the odd embedded pebble.
  *Keep contrast low so boundaries never read.*
- **Stone & Hard-stone — autotiled "rock pockets," not squares.** Stone must read as **organic
  rock embedded in the soil**, fusing into larger masses where stone meets stone and rounding
  off where it meets dirt — **never** a hard square. The engine drives this with a **16-tile
  connectivity set** per material: a 4-bit mask of which orthogonal neighbours are also rock
  (`1=top, 2=bottom, 4=left, 8=right`). Deliver **16 tiles** for `stone` and **16** for `hard`,
  **per biome**, where:
  - a side facing **rock** overflows the cell edge (so the two pockets fuse, no seam);
  - a side facing **soil** pulls in and rounds (organic lump in the earth);
  - a corner shared by two rock-facing sides is squared (so solid masses fill with no dirt
    "dots" and no grid).
  Each rock tile is **drawn on a soil base** (so exposed corners are earth, not black).
  *(This is exactly what the current generator does — see `stoneBlob()` in
  `src/core/textures.ts`. An authored 47-tile blob autotile sheet is also acceptable if you'd
  rather; tell me and I'll adapt the renderer.)*
- **Bedrock:** near-black, hard, hatched/banded; indestructible-looking; tiles seamlessly as a
  floor/wall. 1 tile per (or shared global) + subtle biome tint optional.
- **Grass cap:** the single top diggable row of Topsoil — soil with a grassy crown (blades,
  highlight). 1 tile.
- **Boulder:** a **round** loose rock that falls when unsupported. Sits on a soil base, so its
  silhouette is a circle with soft AO and a top-left highlight; needs to read both **embedded**
  and **mid-air falling**. 1 sprite (+ optional 2–3 size/shape variants), per-biome tint
  optional. **Must not look like a square.**
- **Edge relief / ambient occlusion:** where solid ground borders open tunnel, we overlay a
  soft inner shadow + rim (top-left light). Currently engine-generated as 15 mask overlays;
  authored versions welcome but **optional** — this is cheap to keep procedural.

### 3.3 Backgrounds & depth
- **Sky (surface):** dusk gradient (indigo→warm horizon) + faint stars. 1 full-screen image.
- **Biome background gradient:** 1 per band (top & bottom colour from the table), with a soft
  vignette. Full-screen, parallax-static.
- **Cave parallax layer:** a dark, slow-scrolling **seamless-tiling** texture of boulders-in-
  shadow seen "behind" tunnels, giving the dark depth. 1 tileable image (256×256 base) +
  optional per-biome tints.

---

## 4. Treasure — ores, gems, metals & special finds (the seduction)

All treasure renders as an **overlay embedded in the wall tile** (≈60% of the cell, transparent
background) **and** wants a matching **clean icon** for the HUD cargo / Collection museum.

### 4.1 Ores / minerals (13) — tiered visual language

Value scales *faster* than depth — make the eye-candy escalate hard.

| Tier | Ore | Appears | Material language |
|------|-----|---------|-------------------|
| 0 | **Coal** | 0 m | dull black-grey lumps, matte, cheap |
| 0 | **Copper** | 0 m | warm orange-brown metallic nodules, soft sheen |
| 0 | **Iron** | 40 m | dull red-brown ore flecks in rock |
| 0 | **Aluminium** | 90 m | pale silver-grey, light, low-saturation |
| 1 | **Silver** | 220 m | bright white-metal, clean specular |
| 1 | **Gold** | 320 m | rich yellow, soft glow, *desire object #1* |
| 2 | **Platinum** | 600 m | cool blue-white precious metal, premium |
| 2 | **Titanium** | 760 m | steel-blue industrial, faceted |
| 3 | **Emerald** | 1000 m | translucent green **gem facets**, inner glow |
| 3 | **Sapphire** | 1200 m | deep blue gem, brilliant facets |
| 3 | **Ruby** | 1400 m | blood-red gem, the richest of the three |
| 4 | **Diamond** | 1700 m | near-white brilliant, blinding sparkle, rare |
| 5 | **Aurelium** | 2100 m | **the jackpot** — radiant gold-white, holy aura, unmistakable |

- **Metals (tier 0–2):** read as *nuggets/veins* embedded in stone — irregular metallic blobs
  with a sheen and a glint, colour = identity. Increasing refinement/specular up the tiers.
- **Gems (tier 3–4):** read as *cut crystals* — faceted polygons, translucent, an inner glow
  colour, a bright glint. These should look *cold and expensive*.
- **Aurelium (tier 5):** breaks the rules — radiant, emits light, faint particle shimmer; when
  it's on screen the player should *gasp*. This is the "Motherlode" payoff.
- Each ore has a **core colour** and a brighter **glow colour** (in `src/config/ores.ts`) —
  the glow drives the "shines through the dark" effect, so keep glow distinctly brighter.

### 4.2 Special finds (the "what did I find?!" moments)

Embedded overlays like ores; several also want a Collection icon.

| Find | Role | Visual |
|------|------|--------|
| **Goody box** | frequent delight, drops tickets/items | wrapped present/crate with ribbon + bow, inviting |
| **Geode** | cracks open into ore | dull rock ball with a hint of crystal inside; "cracked" state shows the cavity |
| **Fossil** (8 kinds) | collectible, museum | bone/shell relief in stone — see list below |
| **Lockbox** | cash cache | banded strongbox with a lock + keyhole, gold glint |
| **Cache** | supply drop | sealed metal supply pod, blue-tech |
| **Artifact** (6 kinds) | big cash + lore | ancient/alien relics — see list below |
| **Wreck** | dead pod husk, salvage | half-buried broken pod, snapped drill, dead cockpit, cracks |

- **Fossils (8):** Ammonite, Trilobite, Fossil Fern, Dino Tooth, Dino Rib, Dino Skull, Mammoth
  Tusk, Leviathan Vertebra. Each: a pale relief embedded in dark stone + a clean museum icon.
- **Artifacts (6):** Ancient Pottery, Stone Idol, Martian Skull, Glowing Relic, *Natas' Sigil*,
  **The Motherlode**. Escalating from dusty-historical to glowing-alien to legendary.

### 4.3 Seasonal finds (4) — swappable signature treasure
One signature embedded find per season (overlay + glow): **Winterfest** Buried Gift (red gift),
**Eastertide** Painted Egg (pastel egg), **Midsummer** Sun Crystal (radiant gold crystal),
**Hallowdeep** Cursed Skull (purple skull, orange glow).

---

## 5. The pod, drills & hull (the player's machine — the hero asset)

The pod is the single most important sprite. It's a **boxy industrial mining pod** (~1 tile),
not a cute rocket: armoured hull, hazard chevrons, rivets, a glowing cockpit visor, thruster
pods, an antenna. Top-left lit. It must look *capable and heavy.*

### 5.1 Pod — components (currently separate, orientable sprites)
- **Hull body** — the chassis (default skin = industrial **gold/amber** with steel trim, hazard
  stripe on the skid plate, glowing **cyan visor**, rivets). The "face" of the game.
- **Cockpit/visor** — glowing eye; could blink/react (damage, low fuel) — nice-to-have frames.
- **Drill bit** — a *separate, orientable* sprite mounted at the pod's nose; points down/left/
  right as you dig. **7 tiers** (see §5.3).
- **Thruster flame** — additive teardrop jet from the underside when thrusting; flickers
  (scale/alpha animated at runtime). Single clean flame — **no particle splutter.**
- **Propeller/rotor** — pops out and spins on thrust (horizontal blade + hub). Optional to
  re-style; currently a metal rotor.
- **Antenna + beacon** — small mast with a red blinking tip.
- **Mount points matter:** deliver with consistent pivots so the drill sits at the nose and the
  flame at the underside. List pivots in the delivery (see §9).

### 5.2 Pod skins (cosmetic, unlockable)
Default + 4 seasonal recolours/restyles (these are *reward* skins, so make them feel special):
- **Sleigh Pod** (Winterfest, red/gold festive), **Pastel Pod** (Eastertide, soft pastel),
  **Solar Pod** (Midsummer, radiant gold), **Phantom Pod** (Hallowdeep, ghostly purple).
- Minimum: a tint/decal pass over the base hull. Ideal: bespoke silhouette tweaks.

### 5.3 Drills — 7 upgrade tiers (equippable, visible progression)
The drill is the most-upgraded item; players *see* their power grow. Each tier is a distinct
bit. Names (from `src/config/upgrades.ts`): **Stock → Tungsten → Diamond-Tip → Plasma →
Resonance → Quantum → Singularity.**
- Visual arc: a plain steel auger (Stock) → exotic, glowing, energy-wreathed (Quantum) →
  reality-bending/black-hole-tipped (Singularity). Mid-tiers add diamond grit, plasma glow,
  resonance rings.
- Each: the orientable bit sprite (nose-mounted), + a small **shop icon**.

### 5.4 Hull — the upgrade is a *stat*, but show it
Hull has 7 tiers (Stock → Ironclad → Reinforced → Steel → Composite → Energy → **Aegis**).
- Minimum deliverable: a **shop icon** per category (see §6).
- **Stretch (high impact):** **pod damage states** — clean / dented / sparking-critical
  overlays so a battered hull *looks* battered. And/or subtle hull-skin upgrades as tiers rise.

---

## 6. Shop, upgrades & consumables (icons + in-world effects)

### 6.1 Upgrade category icons (7) — for the Outpost shop
Clean, glyph-style icons on the panel, each with its identity colour:
**Drill** (amber), **Fuel Tank** (green), **Cargo Bay** (blue), **Hull** (pink/red),
**Engine** (purple), **Radiator** (orange), **Scanner** (teal). Crisp, single-focus, readable
at ~32–48px.

### 6.2 Consumable items (6) — shop icon + in-world effect
| Item | Icon | In-world effect sprite/anim |
|------|------|------------------------------|
| **Dynamite** | red stick + fuse | 3×3 blast flash + debris + shockwave |
| **Plastic Explosive (C4)** | yellow brick + detonator | bigger 5×5 blast |
| **Teleporter** | cyan warp coil | vertical blink streak / flash at origin & dest |
| **Matter Transmitter** | purple portal device | surface-return beam / dematerialise shimmer |
| **Repair Nanobots** | green hexes / capsule | swirling repair sparkle over the hull |
| **Reserve Fuel** | yellow jerry can | fuel top-up glow on the gauge |

### 6.3 Surface outpost structures (the calm hub)
The surface strip has three buildings the pod visits — give them warmth and clarity:
- **Fuel Depot** (pump/tank, green), **Processor/Refinery** (ore-sell building, industrial),
  **Outpost** (the shop hub — the home base). Plus the surface ground/horizon dressing.

---

## 7. FX, UI & screens

### 7.1 FX sprites & particles
Dig-burst, dust puff, rock debris chunks (per-material colour), sparks, **shockwave ring**,
thruster **flame**, explosion flash, **soft light brush** (the lamp/erase mask — radial white
falloff), treasure **glint/sparkle**, refuel/repair sparkles, **coin/cash burst** on sell,
heat shimmer (Magma), frost crystals (Frozen), gas cloud. Mostly small, additive-friendly,
white/tintable where possible so one sprite serves many colours.

### 7.2 UI kit (the premium layer)
- **Logo / wordmark:** "DEEPER" — heavy, industrial, with a sense of descent. Needed for splash,
  menu, app icon, marketing.
- **Type:** a strong display face for headings + a clean, legible UI face for numbers/labels
  (numbers appear constantly — fuel/cash/depth — so pick a great tabular numeral).
- **Panels & buttons:** dark glass panels, rounded, soft drop-shadow, gold/teal accent borders;
  button states (idle/hover/press) with springy feedback; toggles, sliders, tabs.
- **HUD:** **fuel** gauge (green→red), **hull** gauge (pink), **cargo** bar (blue, fills),
  **depth** readout (metres), **cash** readout (gold, counts up), the **item quick-bar** (6
  slots w/ counts + hotkeys), low-fuel / overheat / cargo-full warnings, depth/biome banner.
- **Iconography:** cores (meta-currency), tickets (arcade currency), streak/flame, goal/target,
  leaderboard medal, lock, settings gear, sound, pause.

### 7.3 Screens (every scene needs a layout/treatment)
| Scene | What it is | Art needs |
|-------|-----------|-----------|
| **Boot / Splash** | logo reveal | logo, loading shimmer |
| **Main Menu** | play / continue / modes, comeback strip | hero background (a tantalising cross-section of the deep?), big PLAY, mode cards, streak + next-goal carrot |
| **HUD (in-game)** | the play overlay | §7.2 gauges, item bar, banners |
| **Outpost Shop** | sell/refuel/repair/upgrade/items | the big modal: header w/ cash, sell/fuel/repair buttons, upgrade list rows (icon + name + tier + price), consumables list, DESCEND button |
| **Game Over** | run summary + score | score breakdown, depth/cash, PB-gap, streak/goal toasts, retry (R) / same-seed (Enter) |
| **Leaderboard** | scores | rows, medals, your-rank highlight, mode tabs |
| **Collection (museum)** | discovered ores/fossils/artifacts | grid of slots (filled vs. silhouette-locked), detail card |
| **Season / pass** | seasonal track | themed banner per season, reward track nodes (item/cores/pod/title), points bar |
| **Workshop** | spend Cores on permanent perks | perk tree/cards |
| **Settings** | audio/haptics/etc. | sliders, toggles |
| **How-to / tutorial** | teach the loop | a few clean instructional panels / callouts |

### 7.4 Branding
**App icon** (desktop/mobile/store), social/marketing key art. The icon should read at tiny
sizes — likely the pod + a gold gem, or the wordmark mark.

---

## 8. Priority tiers (build in this order)

**P0 — The Hero Set (defines the entire look; do first):**
- Pod (default hull + visor + flame + Stock & Diamond-Tip drills + propeller)
- Dirt + Stone(16) + Hard(16) + Boulder + Bedrock + Grass for **Topsoil, Sediment, Bedrock
  Strata** (bands 1–3) + their backgrounds + sky
- Tier-0/1 ores: Coal, Copper, Iron, Aluminium, Silver, Gold (overlays + icons)
- Core FX: dig-burst, dust, debris, flame, light brush, coin burst
- UI kit essentials: logo, type, HUD gauges, buttons/panels, Outpost shop, item icons (6),
  upgrade icons (7)
- Goody box

**P1 — Depth & Desire:**
- Bands 4–7 terrain + backgrounds (Crystal, Magma, Frozen, Core) + Lava + Gas
- Tier-2/3/4/5 ores: Platinum, Titanium, Emerald, Sapphire, Ruby, Diamond, **Aurelium**
- Drill tiers 3–7, hull damage states
- Specials: Geode, Lockbox, Cache, Fossils (8), Artifacts (6), Wreck
- Screens: Game Over, Leaderboard, Collection, Main Menu hero

**P2 — Live-ops & polish:**
- Seasonal: 4 finds, 4 pod skins, 4 season banners/tracks
- Workshop, Settings, How-to art
- App icon / marketing key art, extra boulder/ore variants, ambient critters/dressing

---

## 9. Delivery spec — **exactly what the output must be**

This is the part that makes the art *usable*. Please deliver to this spec.

### 9.1 Format & colour
- **PNG-24 with straight (un-premultiplied) alpha.** sRGB. No ICC weirdness.
- **Transparency:** transparent background for everything that overlays the world (pod, drills,
  ore/special overlays, FX, icons, boulder). Opaque only for full-screen backgrounds and the
  base dirt/bedrock tiles (which still must tile seamlessly).
- **No baked drop-shadows on world sprites** (the engine + darkness handle scene lighting) —
  except UI, where soft shadows are welcome.

### 9.2 Resolution & the grid
- **World grid = 48×48px (1 tile).** **Author and deliver at 4× → a tile master is 192×192px.**
  The engine downsamples to the grid; 4× gives crisp results when the canvas upscales on
  desktop/hi-DPI. (If you can only deliver 1× = 48px, that's usable but will be softer on big
  screens.)
- **Base footprints** (×4 in delivery): tiles 48 (→192); pod ≈ 48 wide (→192); ore/special
  overlays fit inside a 48 cell (→192, art ~60% of frame); FX small (deliver native); UI icons
  32–48 base (→128–192); full-screen backgrounds at **2× the design canvas** (design is
  **540×960 portrait**; deliver 1080×1920) — backgrounds don't need 4×.
- **Power-of-two friendly** frames help atlasing; pad to even dimensions.

### 9.3 Tiling & autotiles (critical)
- **Seamless tiles** (all dirt, bedrock, cave-parallax): must tile in **all four directions**
  with no visible seam or obvious repeat. Provide as single tiles (engine repeats them).
- **Stone & Hard autotile:** deliver the **16-mask set** described in §3.2 (naming below), per
  biome. Bit values: `1=top, 2=bottom, 4=left, 8=right` neighbour-is-rock. If you'd rather
  produce a standard **47-tile blob autotile sheet** or a **Wang/marching-squares** set, that's
  fine — just tell me and I'll point the renderer at it.

### 9.4 Animation
Deliver animated assets as **horizontal frame strips** (or per-frame PNGs) + a note of suggested
FPS, *or* describe the motion and let the engine animate a single sprite (current approach):
- **Flame:** single sprite, engine flickers scale/alpha (no strip needed) — *or* 4–6 frame loop.
- **Drill:** single sprite, engine spins/orients it — *or* a 3–4 frame rotation loop per tier.
- **Propeller:** single blade, engine fakes spin via scaleX — *or* 2–3 frame blur loop.
- **Visor/beacon blink, Aurelium shimmer, lava bubbling, gas drift:** 3–6 frame loops welcome.

### 9.5 Naming & packing
- **One folder per category** (`tiles/`, `ore/`, `pod/`, `specials/`, `items/`, `ui/`, `fx/`,
  `screens/`, `backgrounds/`).
- **File names map to engine texture keys.** Current keys (so authored art is a drop-in):
  - Dirt: `t_<biome>_dirt_<0..2>` — biome ∈ `topsoil, sediment, rock, crystal, magma, frozen,
    core`
  - Stone: `t_<biome>_stone_<0..15>` · Hard: `t_<biome>_hard_<0..15>` (the 16 masks)
  - Static: `t_grass`, `t_bedrock`, `t_boulder`, `t_lava`, `t_gas`
  - Ore overlays: `ore_<id>` — id ∈ `coal, copper, iron, aluminium, silver, gold, platinum,
    titanium, emerald, sapphire, ruby, diamond, aurelium`
  - Specials: `sp_<kind>` — kind ∈ `goody, geode, fossil, lockbox, cache, artifact, wreck`
  - Pod & parts: `pod`, `drill` (per tier: `drill_<0..6>`), `propellor`, `flame`
  - Backgrounds: `bg_<biome>`, `bg_sky`, `cave_bg`
  - FX: `soft, dust, spark, ring, chunk` (+ new ones, named clearly)
  - **UI / icons / screens:** no fixed keys yet — name them clearly
    (`ui_btn`, `icon_fuel`, `icon_core`, `icon_upg_drill`, `screen_menu_bg`, …) and I'll wire.
- **Atlas (preferred):** also provide a packed **TexturePacker** atlas (PNG + **Phaser 3
  JSON-Hash**), max 4096×4096 per page, with **2px extrude/bleed** and trim off for tiles.
  Individual PNGs are fine too; I'll pack them.
- **Pivots:** for `pod`, `drill`, `propellor`, `flame`, note the **anchor/mount point**
  (normalised 0–1) so they parent correctly — e.g. drill mounts at pod nose, flame at underside.

### 9.6 Source of truth & consistency
- **Palettes:** match `src/config/biomes.ts` (terrain) and `src/config/ores.ts` (treasure
  core+glow). If you propose palette changes, change them *there* and I'll regenerate — keep
  one source of truth.
- **Deliver a one-page style frame** first (the pod + a patch of Topsoil with 2–3 ores + the
  HUD) so we lock the look before mass-producing. **Don't build all 7 biomes before we've
  agreed the first one.**

---

## 10. Audio (note — currently procedural)

All SFX/music are generated at runtime today (WebAudio), so audio is **out of scope unless you
want to provide it.** If we go bespoke later, the wishlist is: drill loop (per material), thrust
loop, ore-collect chime (tiered), sell ka-ching, upgrade confirm, explosion, hull-hit, low-fuel
alarm, surface-vs-deep ambience per biome, UI clicks, and a main theme. Flag if you want this.

---

## 11. What I need back from you (the requester)

One decision changes how I prep the pipeline — **how will these assets be produced?**
1. **Human illustrator / studio** — I'll finalise the atlas pipeline & a Figma-style style frame
   spec, and wire a loader to swap procedural → authored art behind a flag.
2. **AI image generation** — I'll write per-asset prompts + a consistency kit (palette pins,
   reference frames, seed strategy) and a cleanup/atlas step.
3. **Me, upgrading the procedural generators** to this spec — no external art; I push the
   current `textures.ts` toward this brief (cheaper, fully in-engine, but bounded by what's
   reasonable to draw in code).

Tell me which (or a mix), and whether the **palettes/biome names** above are locked. Then I'll
produce the **style frame** first and we lock the look before scaling up.
