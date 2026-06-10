# Handoff: 8-Ball Pool — Stylised 3D Table Viewer

## Overview
A real-time 3D pool-table scene for a premium, skill-only 8-ball web game (working brand: **Hustle Hall / SolShot**). It renders a stylised-realistic American pool table — cobalt/green felt, satin cherry rails, glossy resin balls in an 8-ball rack, a cue with aim line, dark closed pocket throats — under a warm overhead lamp, wrapped in a 2D HUD (scorebar, ball-chip tray, power meter, spin control). The table loads from a GLB model that is reskinned and cleaned up at runtime; felt colour, wood finish, and camera angle are live-switchable.

This is the **v4** design — the agreed direction. Earlier explorations (a full arena scene; a fully-procedural table) are **not** in this bundle.

## About the Design Files
The files in this bundle are a **working design reference built in HTML + Three.js** — a functional prototype that demonstrates the intended look, materials, lighting, and behaviour. They are **not** meant to be dropped into production as-is.

The task is to **recreate this scene inside the target codebase's environment** using its established patterns. The real game is a TypeScript fork of a Classic-8-Ball-Pool engine; the 3D presentation layer should be implemented with that project's module/build setup and asset pipeline. Treat `pool-scene-v4.js` as the authoritative spec for *geometry decisions, material values, lighting, and the runtime mesh-cleanup logic* — port the logic, don't necessarily ship the file verbatim.

If you are building fresh with no environment, use **Three.js (r0.160+) with ES modules and an import map or a bundler**, which is what the prototype uses.

## Fidelity
**High-fidelity (hifi).** Colours, materials, lighting, camera framing, and HUD styling are final and intentional. Match them precisely. The one area that is *approximate by nature* is the runtime cleanup of the third-party GLB (net removal, pocket-cup fitting) — those routines are tuned to this specific model and use tolerances; if you swap the model or rebuild the table as native geometry, re-derive them.

---

## The Scene

### Render setup
- **Three.js** `0.160.0` (import map: `three` + `three/addons/`).
- `WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })`, `setPixelRatio(min(devicePixelRatio, 2))`.
- `outputColorSpace = SRGBColorSpace`; `toneMapping = ACESFilmicToneMapping`; `toneMappingExposure = 1.15`.
- `shadowMap.enabled = true`, type `PCFSoftShadowMap`.
- Scene background: `#14192A` (`--slate-deep`).
- Camera: `PerspectiveCamera(40, aspect, 0.1, 200)`. `OrbitControls` with damping `0.08`, `maxPolarAngle ≈ π·0.49`, `minDistance 2.5`, `maxDistance 30`.

### Lighting (one warm-lamp story; keep it consistent)
- `HemisphereLight(0x8d9cb8, 0x1e2026, 0.9)` — sky/ground fill.
- `AmbientLight(0x404550, 0.5)` — floor lift so pockets/rails never crush to black.
- **Key spotlight** `SpotLight(0xfff3dd, 300, 60, 0.85, 0.45, 1.1)` at `(-1, 14, 1)`, target = table centre. `castShadow`, `shadow.mapSize 2048²`, `bias -0.0003`, `radius 6`. This is the overhead-lamp pool of light — the brand's signature warmth.
- A cool directional fill `DirectionalLight(0xbcd0ff, ~0.35)` from one side so the rails read.
- A soft dark-gradient floor disc sits under the table to ground the shadow.

### Table model & runtime cleanup
Source asset: `assets/pool_table_traditional.glb` (~7 MB, Sketchfab "traditional pool table", 20k tris, baked PBR textures incl. an **alpha-blended** base map). The prototype reskins it at load:

1. **Strip props** — hide `ceiling_light_low`, `pool_cue`, `pool_cue001` nodes (table + balls only).
2. **Fix the export** — the FBX→GLB has negative scale, so set `material.side = DoubleSide` and `material.shadowSide = DoubleSide`; soften baked grain with `normalScale *= 0.45`.
3. **Critical fix:** the GLB ships `alphaMode: BLEND`, which self-sorts incorrectly on a 20k-tri mesh (see-through felt, phantom black wedges). Force **opaque with a cutout**: `material.transparent = false; material.alphaTest = 0.5; material.depthWrite = true`. *This single setting fixes the worst artifacts — do the equivalent in any engine.*
4. **Normalise** — scale so the long side = 11.2 world units, centre on origin, base on `y=0`.
5. **Remove the net bags** (`stripNetFaces`) — drop triangles whose UVs fall in the woven-net atlas block (`u 0.73–0.87, v 0.53–0.95`) or are majority-low-alpha. Leaves clean openings.
6. **Dark pocket throats** (`addPocketCups`) — stripping nets left see-through holes; ray-cast the felt to find each of the 6 pocket centres, then drop in an **unlit dark cup** (open `CylinderGeometry`, top r≈0.40–0.44, bottom r≈0.28–0.32, depth 0.56, rim just below cloth) with a vertical gradient texture (`#241E18` rim → `#050403` deep) + a flat near-black floor disc. Unlit (`MeshBasicMaterial`) so the lamp never washes them grey — reads as a closed ball-return pocket.
7. **Re-rack for 8-ball** — identify each ball's number from its UV atlas cell, then place into a standard 8-ball triangle on the foot spot (8 centre of row 3, solid+stripe rear corners); cue ball on the head spot.

> If you rebuild the table as native/authored geometry instead of importing this GLB, you can skip steps 1–6 entirely — just model clean rails, a felt bed, soft-rubber cushions, dark leather/recessed pockets, and matte felt. Steps exist only to tame a third-party asset.

### Balls
- `SphereGeometry(R, 48, 32)`, `MeshPhysicalMaterial({ roughness 0.16, clearcoat 1, clearcoatRoughness 0.04 })` — glossy resin.
- Per-ball equirectangular canvas texture: solid (1–7), black (8), white centre stripe band (9–15), ivory number disc with IBM Plex Mono numeral. Cue ball ivory with a red spot.

### Cue + aim line
- Two-tone satin cue (light shaft `#C9A063`, dark wrap, ivory ferrule, blue tip), lying behind the cue ball tilted ~8° up at the butt.
- Dashed white aim line (`LineDashedMaterial`, opacity ~0.5) from cue ball toward the rack.

---

## Live controls — `window.pool`
The scene exposes a tiny API the HUD/Tweaks layer drives:
```js
window.pool.setFelt(hex)    // re-hues the felt region (see palette below)
window.pool.setWood(name)   // 'Cherry' | 'Oak' | 'Walnut' | 'Black'
window.pool.setCamera(name) // 'Overhead' | 'Player' | 'Cinematic'
```
Keyboard: `1` Overhead · `2` Player · `3` Cinematic. A `pool-ready` event fires on `window` once the model is loaded and processed.

### Recolouring (how it works)
Felt and wood are recoloured on the **GPU** via `material.onBeforeCompile`, injecting an HSL re-hue after `#include <map_fragment>`. The original baked texture (and its shading/AO) stays pristine; colour swaps are just uniform writes (cheap, instant, no texture re-bake). Two classifiers run per fragment:
- **Felt** = saturated green-hued texels (`s > 0.10`, hue 0.18–0.52) → remapped to the chosen felt hue/sat with baked lightness preserved.
- **Wood** = everything else except ivory sights (`s<0.18, l>0.60`) → flattened to a **satin** finish: baked grain compressed to a whisper (`l = 0.55 + 1.6·bakedL`), then tinted to the chosen wood colour. This satin treatment is **always on** (incl. Cherry) — it's what kills the noisy baked grain.

> Colour uniforms are re-asserted every frame as a guard against orphaned uniforms when the program recompiles (the `alphaTest` change forces one recompile during load). If you port this, either re-assert after first render or set uniforms directly in `onBeforeCompile`.

### Felt palette (Tweaks options)
| Swatch | Hex | Note |
|---|---|---|
| Tournament green | `#2F7D46` | **current default** (user-set) |
| Cobalt blue | `#2A6FDB` | brand felt |
| Burgundy | `#6E1D2A` | deep wine |
| Charcoal | `#26282E` | rich dark |

### Wood finishes (Tweaks options)
| Name | Hex | Note |
|---|---|---|
| Cherry | `#7A1A10` | deep rich stained red |
| Oak | `#9A6E40` | warm light |
| Walnut | `#46291B` | mid brown |
| Black | `#161310` | rich near-black |

### Camera presets
- **Overhead** — top-down `(0, 11.8, 0.01)` → target origin. The play view.
- **Player** — low behind the cue ball, ~1.7 units up, looking down the table.
- **Cinematic** — 3/4 hero angle `(-7.4, 4.4, 5.4)`-ish, slightly above the rails (default on load).
Transitions tween position + target over ~0.9s with an ease-in-out.

---

## HUD (2D DOM overlay)
A fixed, pointer-events-gated overlay (`#hud`, `z-index 10`) on top of the canvas. All chrome uses the SolShot/Hustle Hall design system. Fonts: **Inter** (body/labels), **IBM Plex Mono** (numbers/score/power). No emoji, ever.

### Design tokens (from `:root`)
```
--slate:#1B2236;  --slate-deep:#14192A;  --slate-lo:#0B0F1B;
--paper:#F4ECDB;  --paper-dim:#B7AE94;
--active:#7BD53A; /* "your turn" lime */
--action:#F5A623; /* CTA orange */
--hot:#FF6B35;    /* power peak */
--mono:"IBM Plex Mono"; --body:"Inter";
```

### Components
- **Scorebar** (top centre): slate gradient pill, `border-radius 10px`, gloss-highlight inset shadow. Two player segments (`PLAYER 1` / `PLAYER 2`, weight 800, 13px, tracking .12em, uppercase) flanking a centre **RACK 1** chip. Active player segment gets the lime border + glow + lime name colour. Mono score readouts in dark inset pills.
- **Ball-chip tray** (below scorebar): rounded `999px` slate-lo bar holding 15 chips — solids 1–7 (flat colour), the 8 (black), stripes 9–15 (white chip with a colour band via `::before` clip-path). Each chip has a tiny mono numeral on a white sub-disc, inset gloss + drop shadow. Colours: `1/9 #F4B924, 2/10 #1F5BB3, 3/11 #C6312A, 4/12 #5B2680, 5/13 #E2691C, 6/14 #1E7A3A, 7/15 #6E2618, 8 #111`.
- **Power meter** (bottom right): vertical 64px slate panel, `POWER` label (800/9px/tracking .18em), an 18×118px inset track with a fill gradient (`#B07210 → #F5A623 → #FFB840 → #FF6B35`) glowing orange, a mono `%` readout, and a chunky red **STRIKE** button (gradient `#E8473e → #b5251c`, hard 3px drop shadow).
- **Spin control** (bottom left): matching 64px panel, `SPIN` label, a 42px cue-ball disc (radial ivory gradient) with crosshair guides and a draggable red spin dot, `CENTER` caption.
- **Hint line** (bottom centre): muted helper text — `Drag to orbit · Scroll to zoom · 1 Overhead 2 Player 3 Cinematic`.
- **Loading** text (`LOADING TABLE…`, mono, centred) shown until `pool-ready`, then removed.

### Casing & copy rules
ALL CAPS for labels/stamps/buttons; mono for all numbers and timers; lime = your-turn state, orange = action CTA. Headings ≤4 words, buttons ≤3 words, no emoji.

---

## Interactions & Behaviour
- **Orbit/zoom** — OrbitControls drag + wheel, clamped so you can't go under the table.
- **Camera presets** — keys 1/2/3 or `window.pool.setCamera(...)`; animated tween.
- **Tweaks panel** — felt swatch / wood radio / camera radio drive the `window.pool` API. Built on the shared `tweaks-panel.jsx` host-protocol shell (`useTweaks`, `TweaksPanel`, `TweakColor`, `TweakRadio`, `TweakSection`). In production, replace this with the app's own settings UI calling the same three methods.
- **Power / Spin / Strike** in this prototype are **visual only** — no physics is wired. They show the intended HUD; hook them to the real engine's shot input in the codebase.
- A `setInterval(renderOnce, 400)` keeps the frame fresh in throttled/hidden iframes; the main loop is the usual `requestAnimationFrame` tick. Drop the interval in production.

## State (what the real integration needs)
- `feltHex`, `woodFinish`, `cameraPreset` — the three persisted view settings (user's last felt was `#2F7D46`).
- Per-shot: power %, spin offset (x,y on the cue-ball face), active player, ball-on group (solids/stripes), pocketed sets — all owned by the **game engine**, surfaced into the HUD. None of that logic lives in this prototype.

## Files in this bundle
- `8Ball Pool v4.html` — entry point: HUD markup + styles, import map, loads the scene module and the React/Babel Tweaks panel. **Start here.**
- `pool-scene-v4.js` — the Three.js scene: load, cleanup, materials, recolour shader, pockets, balls, cue, cameras, `window.pool` API. **The authoritative spec.**
- `tweaks-panel.jsx` — the in-prototype Tweaks UI shell (dev tool; not for production).
- `assets/pool_table_traditional.glb` — the source table model. Third-party (Sketchfab); verify its licence before shipping, or replace with an authored/licensed table and skip the runtime cleanup steps.

## Assets & licensing note
The GLB is a third-party Sketchfab asset used as a base. **Confirm its licence** for your distribution, or commission/author an equivalent clean table (the prototype's procedural-table exploration shows this is viable and removes the 7 MB download + all the cleanup code). Ball-number textures and the cue are generated procedurally in-code (no external assets). Fonts are Google Fonts (Inter, IBM Plex Mono).
