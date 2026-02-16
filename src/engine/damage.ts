import { WeaponType, WeaponConfig } from './weapons.js';
import { HitResult } from './combat.js';
import { HitboxZone } from './hitboxes.js';

// ========== PLAYER HEALTH CLASS ==========

export class PlayerHealth {
  hp: number = 100;
  armor: number = 100;
  hasHelmet: boolean = true;
  alive: boolean = true;

  // Tagging state
  tagSpeedMultiplier: number = 1.0;  // 1.0 = no slowdown
  tagTimeRemaining: number = 0;       // Seconds of tag remaining

  /**
   * Full reset: 100 HP, 100 armor, helmet, alive
   */
  reset(): void {
    this.hp = 100;
    this.armor = 100;
    this.hasHelmet = true;
    this.alive = true;
    this.tagSpeedMultiplier = 1.0;
    this.tagTimeRemaining = 0;
  }

  /**
   * Update tagging timer each tick
   */
  update(dt: number): void {
    if (this.tagTimeRemaining > 0) {
      this.tagTimeRemaining -= dt;

      if (this.tagTimeRemaining <= 0) {
        // Tag expired, restore normal speed
        this.tagSpeedMultiplier = 1.0;
        this.tagTimeRemaining = 0;
      }
    }
  }
}

// ========== DAMAGE RESULT TYPE ==========

export interface DamageResult {
  damageDealt: number;        // Actual HP lost
  armorDamaged: number;       // Armor points consumed
  killed: boolean;            // Did this shot kill the target?
  isHeadshot: boolean;        // Was it a headshot?
  zone: HitboxZone;           // Which zone was hit
  remainingHp: number;        // Target's HP after damage
  remainingArmor: number;     // Target's armor after damage
  tagSpeedMultiplier: number; // Speed multiplier to apply (for tagging)
}

// ========== KILL EVENT TYPE ==========

export interface KillEvent {
  killerId: string;
  victimId: string;
  weaponType: WeaponType;
  isHeadshot: boolean;
  damageDealt: number;        // Total damage of killing shot
}

// ========== DAMAGE SYSTEM CLASS ==========

export class DamageSystem {
  private players: Map<string, PlayerHealth> = new Map();
  private killEvents: KillEvent[] = [];

  /**
   * Register a new player in the system
   */
  registerPlayer(id: string): void {
    this.players.set(id, new PlayerHealth());
  }

  /**
   * Remove a player from the system
   */
  removePlayer(id: string): void {
    this.players.delete(id);
  }

  /**
   * Get player health state
   */
  getHealth(id: string): PlayerHealth | undefined {
    return this.players.get(id);
  }

  /**
   * Reset a single player's health
   */
  resetPlayer(id: string): void {
    const health = this.players.get(id);
    if (health) {
      health.reset();
    }
  }

  /**
   * Reset all players' health (round start)
   */
  resetAll(): void {
    for (const health of Array.from(this.players.values())) {
      health.reset();
    }
    this.killEvents = [];
  }

  /**
   * Update all players' tagging timers
   */
  update(dt: number): void {
    for (const health of Array.from(this.players.values())) {
      health.update(dt);
    }
  }

  /**
   * Apply damage from a weapon hit
   * CS:S damage order (CRITICAL): base * multiplier * armor
   *
   * @param shooterId - ID of shooter
   * @param hitResult - Hit result from hitscan test
   * @param weaponConfig - Weapon configuration with base damage
   * @returns DamageResult with all damage details, or null if target not found
   */
  applyDamage(
    shooterId: string,
    hitResult: HitResult,
    weaponConfig: WeaponConfig
  ): DamageResult | null {
    const target = this.players.get(hitResult.targetId);
    if (!target || !target.alive) return null;

    // STEP 1: Base damage * hitbox multiplier
    const rawDamage = weaponConfig.baseDamage * hitResult.multiplier;

    // STEP 2: Determine if armor protects this zone
    let armorProtects = false;
    if (hitResult.armorProtected && target.armor > 0) {
      if (hitResult.zone === 'head') {
        // Head only protected if helmet present
        armorProtects = target.hasHelmet;
      } else {
        // Chest/stomach/arms protected by armor
        armorProtects = true;
      }
    }
    // Legs NEVER protected (armorProtected is false for leg zones)

    // STEP 3: Apply armor reduction if applicable
    let damageDealt: number;
    let armorConsumed: number;

    if (armorProtects) {
      // Armor absorbs 50% of damage
      const armorAbsorption = rawDamage * 0.5;
      damageDealt = rawDamage - armorAbsorption;

      // Armor durability: takes half of what it absorbs
      armorConsumed = armorAbsorption * 0.5;

      // Clamp armor consumed to remaining armor
      armorConsumed = Math.min(armorConsumed, target.armor);

      // If armor runs out mid-calculation, remaining damage goes to HP at full rate
      // (This is a simplification - CS:S has complex armor breakage, but this is close enough)
    } else {
      // No armor protection
      damageDealt = rawDamage;
      armorConsumed = 0;
    }

    // Round damage values
    damageDealt = Math.round(damageDealt);
    armorConsumed = Math.round(armorConsumed);

    // STEP 4: Apply damage to target
    target.hp -= damageDealt;
    target.armor -= armorConsumed;

    // Clamp values
    target.hp = Math.max(0, target.hp);
    target.armor = Math.max(0, target.armor);

    // STEP 5: Check for kill
    const killed = target.hp <= 0;
    if (killed) {
      target.alive = false;

      // Generate kill event
      this.killEvents.push({
        killerId: shooterId,
        victimId: hitResult.targetId,
        weaponType: weaponConfig.type,
        isHeadshot: hitResult.isHeadshot,
        damageDealt,
      });
    }

    // STEP 6: Apply tagging
    // Tag duration: 0.1s (100ms, CS:GO style)
    const tagDuration = 0.1;

    // Speed reduction scales with damage: 1.0 - min(0.8, damage/100)
    // 10 damage = 10% slow, 50 damage = 50% slow, 80+ damage = capped at 80% slow
    const tagMultiplier = 1.0 - Math.min(0.8, damageDealt / 100);

    // New hit replaces existing tag (does not stack)
    target.tagSpeedMultiplier = tagMultiplier;
    target.tagTimeRemaining = tagDuration;

    return {
      damageDealt,
      armorDamaged: armorConsumed,
      killed,
      isHeadshot: hitResult.isHeadshot,
      zone: hitResult.zone,
      remainingHp: target.hp,
      remainingArmor: target.armor,
      tagSpeedMultiplier: tagMultiplier,
    };
  }

  /**
   * Apply knife damage
   * Left-click: 40 damage flat, ignores armor
   * Right-click backstab: 200 damage (instant kill)
   *
   * @param attackerId - ID of attacker
   * @param targetId - ID of target
   * @param isBackstab - Whether this is a backstab (right-click from behind)
   * @returns DamageResult, or null if target not found
   */
  applyKnifeDamage(
    attackerId: string,
    targetId: string,
    isBackstab: boolean
  ): DamageResult | null {
    const target = this.players.get(targetId);
    if (!target || !target.alive) return null;

    // Knife damage bypasses armor completely
    const damageDealt = isBackstab ? 200 : 40;

    // Apply damage
    target.hp -= damageDealt;
    target.hp = Math.max(0, target.hp);

    // Check for kill
    const killed = target.hp <= 0;
    if (killed) {
      target.alive = false;

      // Generate kill event
      this.killEvents.push({
        killerId: attackerId,
        victimId: targetId,
        weaponType: WeaponType.KNIFE,
        isHeadshot: false, // Knife kills are never headshots
        damageDealt,
      });
    }

    // Apply tagging (even on non-lethal hits)
    const tagDuration = 0.1;
    const tagMultiplier = 1.0 - Math.min(0.8, damageDealt / 100);
    target.tagSpeedMultiplier = tagMultiplier;
    target.tagTimeRemaining = tagDuration;

    return {
      damageDealt,
      armorDamaged: 0, // Knife ignores armor
      killed,
      isHeadshot: false,
      zone: 'chest', // Arbitrary zone for knife
      remainingHp: target.hp,
      remainingArmor: target.armor,
      tagSpeedMultiplier: tagMultiplier,
    };
  }

  /**
   * Get all kill events since last clear
   */
  getKillEvents(): KillEvent[] {
    return [...this.killEvents];
  }

  /**
   * Clear kill events (called after processing)
   */
  clearKillEvents(): void {
    this.killEvents = [];
  }
}

// ========== SELF-TEST FUNCTION ==========

/**
 * Self-test function to verify critical damage values
 * Returns true if all tests pass, false otherwise
 */
export function _selfTestDamage(): boolean {
  console.log('=== DAMAGE SYSTEM SELF-TEST ===');

  const system = new DamageSystem();
  system.registerPlayer('shooter');
  system.registerPlayer('target');

  let allPassed = true;

  // Helper to create mock HitResult
  function createHitResult(
    zone: HitboxZone,
    multiplier: number,
    armorProtected: boolean
  ): HitResult {
    return {
      targetId: 'target',
      zone,
      multiplier,
      distance: 10,
      hitPosition: { x: 0, y: 0, z: 0 },
      hitNormal: { x: 0, y: 1, z: 0 },
      isHeadshot: zone === 'head',
      armorProtected,
    };
  }

  // Helper to run test
  function runTest(
    name: string,
    setup: () => void,
    weaponConfig: WeaponConfig,
    hitResult: HitResult,
    expectedDamage: number,
    expectedKill: boolean
  ): boolean {
    // Reset target
    system.resetPlayer('target');
    setup();

    const result = system.applyDamage('shooter', hitResult, weaponConfig);

    if (!result) {
      console.error(`[FAIL] ${name}: No damage result returned`);
      return false;
    }

    const passed = result.damageDealt === expectedDamage && result.killed === expectedKill;

    if (passed) {
      console.log(`[PASS] ${name}: ${result.damageDealt} damage, killed=${result.killed}`);
    } else {
      console.error(
        `[FAIL] ${name}: Expected ${expectedDamage} damage, killed=${expectedKill}. ` +
        `Got ${result.damageDealt} damage, killed=${result.killed}`
      );
    }

    return passed;
  }

  // Mock weapon configs
  const AK47: WeaponConfig = {
    type: WeaponType.AK47,
    baseDamage: 36,
    fireRate: 0.1,
    magazine: 30,
    reserve: 90,
    reloadTime: 2.5,
    drawTime: 0.7,
    movementSpeed: 215,
    hasAmmo: true,
  };

  const M4A1: WeaponConfig = {
    type: WeaponType.M4A1,
    baseDamage: 32,
    fireRate: 0.09,
    magazine: 30,
    reserve: 90,
    reloadTime: 3.1,
    drawTime: 0.7,
    movementSpeed: 221,
    hasAmmo: true,
  };

  // TEST 1: AK-47 headshot with helmet -> 72 damage (survives 100HP)
  allPassed = runTest(
    'AK-47 headshot WITH helmet',
    () => {},
    AK47,
    createHitResult('head', 4.0, true),
    72, // 36 * 4.0 * 0.5 = 72
    false
  ) && allPassed;

  // TEST 2: AK-47 headshot no helmet -> 144 damage (kill from 100HP)
  allPassed = runTest(
    'AK-47 headshot NO helmet',
    () => {
      const target = system.getHealth('target')!;
      target.hasHelmet = false;
    },
    AK47,
    createHitResult('head', 4.0, true),
    144, // 36 * 4.0 * 1.0 = 144
    true
  ) && allPassed;

  // TEST 3: M4A1 headshot with helmet -> 64 damage (survives)
  allPassed = runTest(
    'M4A1 headshot WITH helmet',
    () => {},
    M4A1,
    createHitResult('head', 4.0, true),
    64, // 32 * 4.0 * 0.5 = 64
    false
  ) && allPassed;

  // TEST 4: M4A1 body with armor -> 16 damage
  allPassed = runTest(
    'M4A1 body shot WITH armor',
    () => {},
    M4A1,
    createHitResult('chest', 1.0, true),
    16, // 32 * 1.0 * 0.5 = 16
    false
  ) && allPassed;

  // TEST 5: AK-47 stomach with armor -> 23 damage (36 * 1.25 * 0.5 = 22.5 -> 23)
  allPassed = runTest(
    'AK-47 stomach WITH armor',
    () => {},
    AK47,
    createHitResult('stomach', 1.25, true),
    23, // 36 * 1.25 * 0.5 = 22.5 -> rounded to 23
    false
  ) && allPassed;

  // TEST 6: AK-47 leg -> 27 damage (no armor reduction for legs)
  allPassed = runTest(
    'AK-47 leg shot (no armor)',
    () => {},
    AK47,
    createHitResult('leg_l', 0.75, false), // armorProtected = false for legs
    27, // 36 * 0.75 = 27
    false
  ) && allPassed;

  // TEST 7: Knife left-click -> 40 damage (ignores armor)
  system.resetPlayer('target');
  const knifeLeft = system.applyKnifeDamage('shooter', 'target', false);
  if (knifeLeft && knifeLeft.damageDealt === 40 && !knifeLeft.killed) {
    console.log(`[PASS] Knife left-click: 40 damage, no kill`);
  } else {
    console.error(
      `[FAIL] Knife left-click: Expected 40 damage, no kill. ` +
      `Got ${knifeLeft?.damageDealt} damage, killed=${knifeLeft?.killed}`
    );
    allPassed = false;
  }

  // TEST 8: Knife backstab -> 200 damage (instant kill)
  system.resetPlayer('target');
  const knifeBack = system.applyKnifeDamage('shooter', 'target', true);
  if (knifeBack && knifeBack.damageDealt === 200 && knifeBack.killed) {
    console.log(`[PASS] Knife backstab: 200 damage, instant kill`);
  } else {
    console.error(
      `[FAIL] Knife backstab: Expected 200 damage, instant kill. ` +
      `Got ${knifeBack?.damageDealt} damage, killed=${knifeBack?.killed}`
    );
    allPassed = false;
  }

  // TEST 9: Tagging with 50 damage -> 0.5 speed multiplier
  system.resetPlayer('target');
  const tagResult = system.applyDamage(
    'shooter',
    createHitResult('chest', 1.0, false),
    { ...AK47, baseDamage: 50 } // Mock 50 damage weapon
  );
  const target = system.getHealth('target')!;
  if (tagResult && target.tagSpeedMultiplier === 0.5 && target.tagTimeRemaining === 0.1) {
    console.log(`[PASS] Tagging 50 damage: 0.5 speed multiplier, 0.1s duration`);
  } else {
    console.error(
      `[FAIL] Tagging 50 damage: Expected 0.5 multiplier, 0.1s duration. ` +
      `Got ${target.tagSpeedMultiplier} multiplier, ${target.tagTimeRemaining}s duration`
    );
    allPassed = false;
  }

  // TEST 10: Tagging with 100 damage -> 0.2 speed multiplier (capped at 80%)
  system.resetPlayer('target');
  const tagResult2 = system.applyDamage(
    'shooter',
    createHitResult('chest', 1.0, false),
    { ...AK47, baseDamage: 100 } // Mock 100 damage weapon
  );
  const target2 = system.getHealth('target')!;
  const expectedMultiplier = 1.0 - 0.8; // Capped at 80% slow = 0.2 speed
  if (tagResult2 && target2.tagSpeedMultiplier === expectedMultiplier) {
    console.log(`[PASS] Tagging 100 damage: ${expectedMultiplier} speed multiplier (capped at 80% slow)`);
  } else {
    console.error(
      `[FAIL] Tagging 100 damage: Expected ${expectedMultiplier} multiplier (capped). ` +
      `Got ${target2.tagSpeedMultiplier} multiplier`
    );
    allPassed = false;
  }

  console.log('==============================');
  console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

  return allPassed;
}
