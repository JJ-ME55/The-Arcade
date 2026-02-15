# STATE.md

## Project Reference

**Core value:** The FPS gameplay must feel smooth, responsive, and skill-rewarding -- authentic CS:S movement and gunplay in the browser. If the game doesn't feel good to play, nothing else matters.

**Current focus:** Phase 3: Player Models & First-Person View

## Current Position

**Phase:** 3 of 9 -- Player Models & First-Person View
**Plan:** 1 of 6 in phase
**Status:** In progress
**Last activity:** 2026-02-15 - Completed 03-01-PLAN.md (Rigged Mannequin Model)
**Progress:** [##........] 10/81 requirements

## Phase Overview

| Phase | Name | Reqs | Status |
|-------|------|------|--------|
| 1 | Movement Engine | 8 | Complete |
| 2 | Map & Environment | 6 | Complete |
| 3 | Player Models & First-Person View | 8 | In Progress (1/6 plans) |
| 4 | Weapons & Combat | 11 | Not Started |
| 5 | Match Flow & HUD | 12 | Not Started |
| 6 | Audio | 6 | Not Started |
| 7 | Multiplayer | 6 | Not Started |
| 8 | Website, Matchmaking & Staking | 20 | Not Started |
| 9 | Practice Mode & Launch Polish | 4 | Not Started |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Plans completed | 5 |
| Plans failed | 0 |
| Requirements done | 10/81 |
| Current streak | 5 |

## Accumulated Context

### Key Decisions

| ID | Phase | Decision | Rationale |
|----|-------|----------|-----------|
| - | 0 | Roadmap derived from 81 requirements across 11 categories, organized into 9 phases by dependency and delivery boundary | Clear delivery boundaries, risk-first ordering |
| - | 0 | Phase structure follows risk-first ordering: movement engine is the make-or-break foundation, validated before any other investment | Research identified movement feel as top-5 project killer |
| - | 0 | Audio separated into its own phase (Phase 6) because spatial audio is a complete subsystem that depends on weapon fire and footstep events but is not required for core gameplay verification | Dependency graph analysis |
| - | 0 | Website, matchmaking, and staking combined into one large phase (Phase 8, 20 reqs) because they form a single delivery boundary -- the "product loop" from landing page to payout only works when all three are present | Product cohesion |
| - | 0 | Practice mode separated into Phase 9 because it requires all game systems working but is independent of multiplayer/staking -- it is the final accessibility layer | Dependency graph analysis |
| D1 | 02-01 | Replace procedural shaders with flat-color Principled BSDF materials for GLTF export | Blender procedural node setups don't export to GLTF; flat colors ensure Three.js compatibility |
| D2 | 02-01 | Spawn points as Empty objects with custom properties rather than hardcoded positions | Allows spawn metadata to travel with map file, extractable via Three.js userData |
| D3 | 02-01 | Use Blender 5.0 for export over 4.4 | arena_map.blend uses Zstandard compression only readable by Blender 5.0+ |
| D4 | 03-01 | Use 19-bone armature instead of planned 22 bones | Cleaner hierarchy with same animation capability; removes redundant intermediate spine bones |

### Architecture Notes
- Game engine is standalone TypeScript, zero React dependency, communicates via event bus
- Fixed-timestep 64Hz simulation with accumulator pattern, separate from render rate
- Custom physics (no library) -- CS:S Quake-derived acceleration model (~200-300 lines of vector math)
- Raw Three.js (not R3F) for render performance in competitive FPS
- Custom ray-primitive intersection for hitscan (not Three.js Raycaster)
- WebRTC DataChannels: unreliable/unordered for game input, reliable/ordered for control messages
- Anchor escrow with timeout-refund escape hatch is non-negotiable before accepting real funds
- Phase 1 implementation: movement.ts engine module + visual/main.js browser renderer (physics currently duplicated between the two -- needs consolidation in future phase)

### Research Flags
- Phase 1 research COMPLETE: CS:S movement algorithm documented, standard floating-point math chosen, Three.js patterns identified
- Phase 7 NEEDS research: WebRTC TURN providers (2026 pricing), Supabase Realtime guarantees, cross-browser determinism
- Phase 8 NEEDS research: Anchor 0.32.1 PDA patterns, 2v2 escrow design, Cloudflare Worker secrets management

### Todos
- (none yet)

### Blockers
- (none)

## Session Continuity

**Last session:** 2026-02-15
**Stopped at:** Completed 03-01-PLAN.md (Rigged Mannequin Model)
**Resume file:** None
**Next action:** Continue Phase 3 execution with plan 03-02

---
*Last updated: 2026-02-15 (Phase 3 in progress: 1/6 plans complete)*
