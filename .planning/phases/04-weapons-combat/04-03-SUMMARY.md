---
phase: 04-weapons-combat
plan: 03
subsystem: combat-engine
tags: [typescript, damage, hp-armor, tagging, kill-events, cs-source]

# Dependency graph
requires:
  - phase: 04-01
    provides: WeaponType, WeaponConfig with baseDamage
  - phase: 04-02
    provides: HitResult with zone multipliers, HitboxZone type
provides:
  - DamageSystem with CS:S damage calculation order (base * multiplier * armor)
  - PlayerHealth tracking with HP/armor/helmet state
  - Tagging system with speed reduction proportional to damage
  - KillEvent generation with weapon type and headshot flag
affects: [04-05-integration, 05-hud-killfeed, 06-audio]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CS:S damage order: base * multiplier * armor (50% reduction when protected)"
    - "Head protection requires helmet, legs bypass armor entirely"
    - "Tagging: 0.1s duration, scales with damage (capped 80% slow)"
    - "Self-test function validates critical damage values"

key-files:
  created:
    - src/engine/damage.ts
  modified: []

key-decisions:
  - "Armor absorbs 50% of damage, consumes 25% of original damage as durability"
  - "Tagging scales linearly with damage up to 80% max slow (80+ damage)"
  - "Knife backstab deals 200 damage (instant kill regardless of armor)"
  - "Kill events include all data needed for kill feed rendering"

patterns-established:
  - "PlayerHealth class with HP/armor/helmet/alive state and tagging timer"
  - "DamageResult type carries complete damage transaction details"
  - "Self-test functions validate critical gameplay values at compile time"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 04 Plan 03: Damage Calculation & HP System Summary

**CS:S-authentic damage calculation with armor reduction, helmet mechanics, tagging on hit, and kill event generation for the kill feed pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T17:27:28Z
- **Completed:** 2026-02-16T17:30:36Z
- **Tasks:** 1 (self-test included in implementation)
- **Files modified:** 1

## Accomplishments
- Complete DamageSystem class with player health tracking for all players
- CS:S damage order correctly implemented: base * multiplier * armor (50% reduction)
- Head protection only active with helmet, legs bypass armor entirely
- Tagging system: 0.1s duration, speed reduction scales with damage (10 damage = 10% slow, capped at 80%)
- Kill events include weaponType, isHeadshot, killer/victim IDs for kill feed data pipeline
- Self-test function validates all 10 critical damage values from CONTEXT.md

## Task Commits

Implementation was atomic:

1. **Task 1: Damage Calculation, HP/Armor, Tagging, Kill Events** - `6e51da6` (feat)
   - Includes self-test function (Task 2 was combined into same commit)

## Files Created/Modified
- `src/engine/damage.ts` - DamageSystem, PlayerHealth, DamageResult, KillEvent types, applyDamage(), applyKnifeDamage(), _selfTestDamage()

## Decisions Made

**D1: Armor durability calculation**
- Armor consumes 25% of original damage (half of what it absorbs)
- Rationale: CS:S authentic behavior, armor lasts through multiple hits

**D2: Tagging speed reduction formula**
- `tagMultiplier = 1.0 - min(0.8, damageDealt / 100)`
- Linear scaling up to 80% max slow
- Rationale: Proportional penalty rewards high-damage weapons, capped to prevent full immobilization

**D3: Knife backstab damage**
- 200 damage (instant kill through any HP/armor combination)
- Rationale: Ensures backstab is always lethal even with 100HP + 100 armor

**D4: Kill event data structure**
- Include weaponType, isHeadshot, damageDealt for kill feed rendering
- Rationale: UI needs weapon icons, headshot indicators, damage numbers for kill feed

## Deviations from Plan

None - plan executed exactly as written.

## Critical Values Verified

All damage values match CONTEXT.md specifications:

| Weapon | Hit Type | Armor/Helmet | Damage | Result |
|--------|----------|--------------|--------|---------|
| AK-47 | Headshot | Yes | 72 | Survives 100HP |
| AK-47 | Headshot | No | 144 | One-tap kill |
| M4A1 | Headshot | Yes | 64 | Survives |
| M4A1 | Body | Yes | 16 | Survives |
| AK-47 | Stomach | Yes | 23 | Survives |
| AK-47 | Leg | N/A | 27 | Bypasses armor |
| Knife | Left-click | N/A | 40 | Ignores armor |
| Knife | Backstab | N/A | 200 | Instant kill |

**Tagging tests:**
- 50 damage → 0.5 speed multiplier (50% slow)
- 100 damage → 0.2 speed multiplier (80% slow, capped)
- Duration: 0.1s (100ms)

## Next Phase Readiness

**Ready for Plan 04:** Combat feedback (blood particles, muzzle flash, decals)
- DamageResult provides hitPosition and hitNormal for particle spawning
- Kill events ready for kill feed rendering in Phase 5

**Ready for Plan 05:** Full integration
- DamageSystem can be wired to hitscan hits from combat.ts
- Player health state queryable for HUD display
- Tagging speed multiplier ready for movement system integration

## Technical Notes

**Self-test function:**
- `_selfTestDamage()` exported for runtime validation
- Can be called from browser console: `import { _selfTestDamage } from './engine/damage.js'; _selfTestDamage();`
- Validates all 10 critical damage scenarios from CONTEXT.md

**CS:S damage order enforcement:**
```typescript
// CRITICAL: Order matters
rawDamage = baseDamage * multiplier;
armorProtects = zone.armorProtected && hasArmor && (zone !== 'head' || hasHelmet);
finalDamage = armorProtects ? rawDamage * 0.5 : rawDamage;
```

**Type safety:**
- All imports use `.js` extension for ES module compatibility
- HitboxZone imported from hitboxes.ts (not re-exported from combat.ts)
- Array.from() used for Map.values() iteration (TypeScript target compatibility)
