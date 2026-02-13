# STATE.md

## Project Reference

**Core value:** The FPS gameplay must feel smooth, responsive, and skill-rewarding -- authentic CS:S movement and gunplay in the browser. If the game doesn't feel good to play, nothing else matters.

**Current focus:** Phase 1 planned. Ready to execute Phase 1: Movement Engine.

## Current Position

**Phase:** 1 of 9 -- Movement Engine
**Plan:** 3 plans in 3 waves (01-01, 01-02, 01-03)
**Status:** Planned
**Progress:** [..........] 0/81 requirements

## Phase Overview

| Phase | Name | Reqs | Status |
|-------|------|------|--------|
| 1 | Movement Engine | 8 | Planned (3 plans) |
| 2 | Map & Environment | 6 | Not Started |
| 3 | Player Models & First-Person View | 8 | Not Started |
| 4 | Weapons & Combat | 11 | Not Started |
| 5 | Match Flow & HUD | 12 | Not Started |
| 6 | Audio | 6 | Not Started |
| 7 | Multiplayer | 6 | Not Started |
| 8 | Website, Matchmaking & Staking | 20 | Not Started |
| 9 | Practice Mode & Launch Polish | 4 | Not Started |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 0 |
| Plans failed | 0 |
| Requirements done | 0/81 |
| Current streak | 0 |

## Accumulated Context

### Key Decisions
- Roadmap derived from 81 requirements across 11 categories, organized into 9 phases by dependency and delivery boundary
- Phase structure follows risk-first ordering: movement engine is the make-or-break foundation, validated before any other investment
- Research identified floating-point determinism, escrow stuck states, P2P cheating, WebRTC failures, and movement feel as top risks
- Audio separated into its own phase (Phase 6) because spatial audio is a complete subsystem that depends on weapon fire and footstep events but is not required for core gameplay verification
- Website, matchmaking, and staking combined into one large phase (Phase 8, 20 reqs) because they form a single delivery boundary -- the "product loop" from landing page to payout only works when all three are present
- Practice mode separated into Phase 9 because it requires all game systems working but is independent of multiplayer/staking -- it is the final accessibility layer

### Architecture Notes
- Game engine is standalone TypeScript, zero React dependency, communicates via event bus
- Fixed-timestep 64Hz simulation with accumulator pattern, separate from render rate
- Custom physics (no library) -- CS:S Quake-derived acceleration model (~200-300 lines of vector math)
- Raw Three.js (not R3F) for render performance in competitive FPS
- Custom ray-primitive intersection for hitscan (not Three.js Raycaster)
- WebRTC DataChannels: unreliable/unordered for game input, reliable/ordered for control messages
- Anchor escrow with timeout-refund escape hatch is non-negotiable before accepting real funds

### Research Flags
- Phase 1 research COMPLETE: CS:S movement algorithm documented, standard floating-point math chosen, Three.js patterns identified
- Phase 7 NEEDS research: WebRTC TURN providers (2026 pricing), Supabase Realtime guarantees, cross-browser determinism
- Phase 8 NEEDS research: Anchor 0.32.1 PDA patterns, 2v2 escrow design, Cloudflare Worker secrets management

### Todos
- (none yet)

### Blockers
- (none)

## Session Continuity

**Last action:** Phase 1 planned with 3 plans in 3 sequential waves
**Next action:** Execute Phase 1 via `/gsd:execute-phase 1` -- start with Plan 01-01 (project bootstrap + engine core)
**Open questions:** None blocking. Game name and token name remain TBD per PROJECT.md constraints.

---
*Last updated: 2026-02-13 (Phase 1 planning complete)*
