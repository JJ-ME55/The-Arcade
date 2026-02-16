---
phase: 04-weapons-combat
plan: 01
subsystem: combat-engine
tags: [typescript, weapons, recoil, accuracy, state-machine, cs-source]

# Dependency graph
requires:
  - phase: 01-movement-engine
    provides: Vec3 type pattern and plain TypeScript engine modules
provides:
  - WeaponSystem class with CS:S-authentic state machine
  - Fixed 30-shot spray patterns for AK-47 and M4A1
  - AccuracyModel with movement penalties and counter-strafe mechanics
  - Four weapon types with distinct characteristics
affects: [04-02-hitbox-hitscan, 04-03-combat-feedback, 05-hud, 06-audio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Weapon state machine with CS:S timing enforcement (draw blocks fire, reload commits)"
    - "Fixed spray patterns with random spread overlay (skill-based recoil)"
    - "Movement-based accuracy model with instant counter-strafe recovery"

key-files:
  created:
    - src/engine/weapons.ts
    - src/engine/recoil-patterns.ts
  modified: []

key-decisions:
  - "Spray pattern reset after 0.45s of no firing (CS:S authentic)"
  - "Ammo refills at 50% through reload animation (Decision D8 from Phase 3)"
  - "Reload cannot be cancelled once started (CS:S commit-style)"
  - "Per-shot delta angles in patterns rather than cumulative offsets"

patterns-established:
  - "Engine modules use plain Vec3 type, no Three.js imports"
  - "State machine prevents invalid actions (can't fire during reload/draw)"
  - "Spray tracking with automatic reset on time gap"
  - "Accuracy blends smoothly to target values for natural feel"

# Metrics
duration: 10min
completed: 2026-02-16
---

# Phase 04 Plan 01: Weapon System & Recoil Patterns Summary

**CS:S-authentic weapon state machine with fixed 30-shot spray patterns, movement-based accuracy penalties, and four distinct weapons (AK-47, M4A1, Pistol, Knife)**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-16T17:14:12Z
- **Completed:** 2026-02-16T17:24:29Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Complete weapon state machine enforcing CS:S timing rules (draw blocks fire, reload commits at 50%, can't cancel)
- Fixed 30-shot spray patterns for AK-47 (harder recoil, left pull) and M4A1 (easier control, right drift)
- AccuracyModel with severe movement penalties for rifles (near-useless while moving), moderate for pistol
- Instant counter-strafe accuracy recovery (core CS:S mechanic)
- Four weapon configurations matching CONTEXT.md values exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Weapon State Machine and Definitions** - `e08b963` (feat)
2. **Task 2: Fixed Spray Patterns and Accuracy Model** - `6f4dfd3` (feat)

**Bug fix:** `f9f7542` (fix) - Removed stateTime check from canFire() to allow first shot

## Files Created/Modified
- `src/engine/weapons.ts` - WeaponSystem class with state machine, ammo tracking, weapon configs for all four weapons
- `src/engine/recoil-patterns.ts` - AK47_PATTERN and M4A1_PATTERN (30 shots each), AccuracyModel, getRecoilAngle(), getFinalShotAngle()

## Decisions Made

**D1: Spray pattern storage format**
- Stored as per-shot delta angles rather than cumulative offsets
- Rationale: More natural for recoil system implementation, easier to reason about pattern progression

**D2: Accuracy blend speed**
- Smooth blend to target accuracy (instant for counter-strafe, gradual otherwise)
- Rationale: Provides natural gameplay feel, prevents jarring accuracy changes

**D3: Auto-reload on magazine empty**
- Weapon automatically starts reload when magazine hits 0 in IDLE state
- Rationale: CS:S behavior, prevents dead trigger pulls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed canFire() blocking first shot**
- **Found during:** Task 1 verification testing
- **Issue:** canFire() checked stateTime >= fireRate, but stateTime starts at 0, preventing first shot
- **Fix:** Removed stateTime check from canFire() - state machine handles fire rate cooldown via FIRING state
- **Files modified:** src/engine/weapons.ts
- **Verification:** Test shows fire() returns valid result on first call
- **Committed in:** f9f7542 (separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Fix was necessary for correct first-shot behavior. No scope creep.

## Issues Encountered
None - both modules compiled cleanly and passed verification tests on first attempt (after bug fix).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Phase 04-02: Hitbox Geometry & Hitscan Engine (needs weapon damage values and shot index for pattern lookup)
- Phase 04-03: Combat Visual Feedback (needs weapon types and fire events)
- Phase 05: Match Flow & HUD (needs ammo counts, weapon state for UI display)
- Phase 06: Audio (needs fire events for muzzle sound triggers)

**Blockers:** None

**Notes:**
- Weapon configs match CONTEXT.md exactly: AK-47 (36 dmg, 0.1s, 30 mag), M4A1 (32 dmg, 0.09s, 30 mag), Pistol (25 dmg, 0.15s, 20 mag), Knife (40 dmg left-click)
- Spray patterns verified: AK-47 has 30 entries with upward climb and left pull after shot 5-6, M4A1 has 30 entries with gentler climb and right drift
- AccuracyModel correctly applies movement penalty (converges to 0.1 for rifles moving, 0.4 for pistol)
- State machine prevents all invalid transitions (tested: can't fire during reload, can't switch during reload/draw)

---
*Phase: 04-weapons-combat*
*Completed: 2026-02-16*
