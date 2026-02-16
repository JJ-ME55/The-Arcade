// Export all engine modules
export { default as MovementEngine } from './engine/movement';

// Weapon system
export { WeaponSystem, WeaponType, WeaponState } from './engine/weapons';
export type { WeaponConfig, FireResult, KnifeResult } from './engine/weapons';

// Recoil patterns
export { getRecoilAngle, AccuracyModel, getFinalShotAngle, AK47_PATTERN, M4A1_PATTERN } from './engine/recoil-patterns';

// Hitboxes
export { raySphereIntersect, rayCapsuleIntersect, rayBoxIntersect } from './engine/hitboxes';
export type { HitboxZone, Hitbox, HitboxSet } from './engine/hitboxes';

// Combat (hitscan)
export { testHitscan, createHitboxSet, updateHitboxPositions } from './engine/combat';
export type { HitResult } from './engine/combat';

// Damage system
export { DamageSystem, PlayerHealth } from './engine/damage';
export type { DamageResult, KillEvent } from './engine/damage';
