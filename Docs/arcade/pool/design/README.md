# Pool — Design Files

Drop design deliverables here. Companions to [POOL_DESIGN_TARGET.md](../POOL_DESIGN_TARGET.md) (gameplay spec) and [POOL_DESIGNER_SPEC.md](../POOL_DESIGNER_SPEC.md) (screen-by-screen functional contract). Branch: `arcade/8-ball-pool`.

---

## Folder layout

```
Docs/arcade/pool/design/
├── README.md                ← you are here; index + conventions
├── mockups/                 ← exported screen mockups (PNG/JPG)
│   ├── 01-splash.png        ← matches POOL_DESIGNER_SPEC §7.1 numbering
│   ├── 02-main-menu.png     ← §7.2
│   ├── 03-mode-select.png   ← §7.3
│   ├── 03-mode-select-mobile.png   ← mobile variant
│   └── ...
├── assets/                  ← final exportable assets ready for engineering
│   ├── sprites/             ← cue, balls, felt, UI bits as PNG/SVG
│   ├── icons/               ← UI iconography
│   ├── fonts/               ← if any custom (most fonts come via web)
│   └── audio/               ← shot SFX, ambient (per OD-6)
├── references/              ← inspiration, mood, competitive teardowns
│   ├── miniclip-screens/    ← reference shots
│   └── ...
└── source/                  ← OPTIONAL — small Figma/PSD source files (see below)
```

---

## Naming convention for mockups

Use **`<section-number>-<screen-name>.png`** matching POOL_DESIGNER_SPEC.md screen numbers:

| Filename | Screen |
|----------|--------|
| `7.1-splash.png` | Splash / Loading |
| `7.2-main-menu.png` | Main Menu |
| `7.3-mode-select.png` | Mode Select Modal |
| `7.4-matchmaking.png` | Matchmaking — finding opponent |
| `7.5-opponent-reveal.png` | Opponent Reveal pre-match |
| `7.6-vs-computer.png` | Difficulty select |
| `7.18-in-match-hud.png` | In-match HUD (the big one) |
| `7.18-in-match-hud-mobile.png` | Mobile variant |
| `7.19-async-waiting.png` | Async Waiting Screen |
| `7.22-shot-toast.png` | Post-shot result toast |
| `7.23-pool-card.png` | Match-end Pool Card |
| `7.26-cue-locker.png` | Cue Locker |
| `7.28-shop-gold.png` | Shop — Gold tab |
| ... | ... (38 total — see POOL_DESIGNER_SPEC.md §7) |

Append `-state-<state>.png` for state variants:
- `7.4-matchmaking-state-searching.png`
- `7.4-matchmaking-state-found.png`
- `7.4-matchmaking-state-timeout.png`

---

## What goes IN this folder (track in git)

- ✅ Exported screen mockups (PNG, JPG, ≤ 1 MB each is comfortable)
- ✅ Production-ready assets (sprites, icons, SVG)
- ✅ Audio files (WAV / MP3 / OGG, < 1 MB ideally)
- ✅ Style references + competitor teardown shots
- ✅ Sprite atlases + texture sheets when finalised
- ✅ Brief docs (palette swatches, animation specs in markdown)

## What stays OUT (or use Git LFS)

- ❌ Massive Figma `.fig` source files (use Figma cloud + link in `source/SOURCES.md`)
- ❌ Large PSDs (> 50 MB)
- ❌ Raw screen recordings (video) — link from external storage
- ❌ Final HD render videos

If a binary IS going to be tracked and is > 10 MB, use [Git LFS](https://git-lfs.github.com/). Don't commit > 50 MB binaries directly to the repo.

For Figma source files, the recommended pattern:

`source/SOURCES.md`:
```markdown
| File | Figma URL | Owner | Last reviewed |
|------|-----------|-------|---------------|
| Pool — Phase A screens | https://figma.com/file/... | designer | 2026-06-15 |
| Pool — assets library  | https://figma.com/file/... | designer | 2026-06-15 |
```

---

## Pickup checklist for engineering

When mockups land for a screen, engineering does:

1. Read the spec section in `POOL_DESIGNER_SPEC.md §7.<n>`
2. Look at the mockup at `Docs/arcade/pool/design/mockups/<n>-*.png`
3. Note: section `§9` for copy rules; `§11` for non-negotiable contracts (e.g. cosmetic-only cues, server-authoritative, canned chat only)
4. Wire the screen at `pool/src/screens/<screen>.ts` (browser) or `src/routes/games/Pool/<screen>.tsx` (hub overlays)
5. Honour mobile-first sizing — every screen tested at 390×844 (iOS Safari smallest TG WebView target)

---

## Open questions to surface in mockup pass

Pull these out of `POOL_DESIGNER_SPEC.md §13` for the designer's pass:

1. **Marathon score type** — Streak vs Perfect Tables — which gets the hero numeral on the HUD?
2. **Pool Card share format** — PNG, 4s GIF, both?
3. **Chat phrase packs** — locker-style UI or side tab under Cue Locker?
4. **Daily Challenge format** — Main Menu card vs dedicated screen?
5. **Tournament sponsor branding zones** — where do sponsor logos land in bracket view + round result cards?

And from `§15.4` (JJ's strategic note):
6. **Bot HUD parity** — does the bot have an avatar / ELO display / thinking indicator?
7. **Mode variants** — how does the player select between 8-ball / 9-ball / no-guideline at V3?
8. **Mode-specific HUD top-strip content** — stake (wagered), round info (tournament), streak (marathon)?

---

*Maintainer: pool designer + JJ. Engineering follows up on each mockup land with a wiring PR.*
