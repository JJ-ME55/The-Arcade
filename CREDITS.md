# Credits & Asset Licenses

**DEEPER** uses **zero external art or audio assets.** Everything you see and hear is
generated procedurally at runtime:

- **Graphics** — tiles, ores, the pod, particles, UI, and biome backgrounds are drawn with
  Phaser `Graphics` / `Canvas` and baked to textures in `src/core/textures.ts`. The
  seasonal find icon is generated per active season in the Game scene.
- **Audio** — all SFX, the engine-thrust hum, and the depth-reactive ambient drone are
  synthesized live with the Web Audio API in `src/systems/audio.ts`. No audio files.

This means there are **no third-party asset licenses to track**.

## Software

- [Phaser 3](https://phaser.io) — MIT License — HTML5 game framework.
- [Vite](https://vitejs.dev) — MIT License — build tool / dev server.
- [TypeScript](https://www.typescriptlang.org) — Apache-2.0.

## Inspiration

*Motherload* by XGen Studios (and the Goldium Edition) is the north star for the core
loop, the no-dig-up rule, the triple-resource squeeze, and the exponential ore economy.
DEEPER is an original, from-scratch reimagining — no code or assets were taken from it.
