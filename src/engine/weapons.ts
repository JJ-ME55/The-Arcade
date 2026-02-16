type Vec3 = { x: number; y: number; z: number };

// Weapon types
export enum WeaponType {
  AK47 = 'AK47',
  M4A1 = 'M4A1',
  PISTOL = 'PISTOL',
  KNIFE = 'KNIFE',
}

// Weapon state machine
export enum WeaponState {
  IDLE = 'IDLE',
  FIRING = 'FIRING',
  RELOADING = 'RELOADING',
  DRAWING = 'DRAWING',
  KNIFE_ATTACK = 'KNIFE_ATTACK',
}

// Weapon configuration
export interface WeaponConfig {
  type: WeaponType;
  fireRate: number;      // Time between shots (seconds)
  baseDamage: number;    // Base damage per hit
  magazine: number;      // Magazine capacity
  reserve: number;       // Reserve ammo capacity
  reloadTime: number;    // Reload duration (seconds)
  drawTime: number;      // Draw animation time (seconds)
  movementSpeed: number; // Movement speed modifier (u/s)
  hasAmmo: boolean;      // Does this weapon use ammo?
}

// Weapon configurations (CS:S authentic from CONTEXT.md)
const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.AK47]: {
    type: WeaponType.AK47,
    fireRate: 0.1,        // 600 RPM
    baseDamage: 36,
    magazine: 30,
    reserve: 90,
    reloadTime: 2.5,
    drawTime: 0.7,
    movementSpeed: 215,
    hasAmmo: true,
  },
  [WeaponType.M4A1]: {
    type: WeaponType.M4A1,
    fireRate: 0.09,       // 667 RPM
    baseDamage: 32,
    magazine: 30,
    reserve: 90,
    reloadTime: 3.1,
    drawTime: 0.7,
    movementSpeed: 221,
    hasAmmo: true,
  },
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    fireRate: 0.15,       // ~400 RPM
    baseDamage: 25,
    magazine: 20,
    reserve: 120,
    reloadTime: 2.2,
    drawTime: 0.5,
    movementSpeed: 240,
    hasAmmo: true,
  },
  [WeaponType.KNIFE]: {
    type: WeaponType.KNIFE,
    fireRate: 0.4,        // Swing time
    baseDamage: 40,       // Left-click damage
    magazine: 0,
    reserve: 0,
    reloadTime: 0,
    drawTime: 0.25,
    movementSpeed: 250,
    hasAmmo: false,
  },
};

// Fire result
export interface FireResult {
  weaponType: WeaponType;
  shotIndex: number;
  damage: number;
}

// Knife attack result
export interface KnifeResult {
  isBackstab: boolean;
  damage: number;
}

// Weapon system class
export class WeaponSystem {
  currentWeapon: WeaponType;
  state: WeaponState;
  stateTime: number;

  // Ammo tracking per weapon
  private ammo: Map<WeaponType, { magazine: number; reserve: number }>;

  // Spray pattern tracking
  shotsFired: number;
  lastShotTime: number;

  // Reload state
  private ammoRefilled: boolean;

  constructor(startingWeapon: WeaponType = WeaponType.AK47) {
    this.currentWeapon = startingWeapon;
    this.state = WeaponState.IDLE;
    this.stateTime = 0;
    this.shotsFired = 0;
    this.lastShotTime = 0;
    this.ammoRefilled = false;

    // Initialize ammo for all weapons
    this.ammo = new Map();
    for (const type of Object.values(WeaponType)) {
      const config = WEAPON_CONFIGS[type];
      this.ammo.set(type, {
        magazine: config.magazine,
        reserve: config.reserve,
      });
    }
  }

  // Update state machine
  update(dt: number, currentTime: number): void {
    this.stateTime += dt;

    // Check for spray reset (0.45s of no firing)
    if (currentTime - this.lastShotTime > 0.45) {
      this.shotsFired = 0;
    }

    switch (this.state) {
      case WeaponState.DRAWING:
        const config = this.getWeaponConfig();
        if (this.stateTime >= config.drawTime) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.RELOADING:
        const reloadConfig = this.getWeaponConfig();

        // Ammo refills at 50% through animation (CS:S Decision D8)
        if (!this.ammoRefilled && this.stateTime >= reloadConfig.reloadTime * 0.5) {
          const ammoState = this.ammo.get(this.currentWeapon)!;
          const needed = reloadConfig.magazine - ammoState.magazine;
          const toReload = Math.min(needed, ammoState.reserve);

          ammoState.magazine += toReload;
          ammoState.reserve -= toReload;
          this.ammoRefilled = true;
        }

        // Complete reload
        if (this.stateTime >= reloadConfig.reloadTime) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.FIRING:
        const fireConfig = this.getWeaponConfig();
        if (this.stateTime >= fireConfig.fireRate) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.KNIFE_ATTACK:
        // Knife swing duration
        const knifeSwingTime = 0.4;
        if (this.stateTime >= knifeSwingTime) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.IDLE:
        // Check for auto-reload when magazine empty
        if (this.canReload()) {
          const ammoState = this.ammo.get(this.currentWeapon)!;
          if (ammoState.magazine === 0) {
            this.startReload();
          }
        }
        break;
    }
  }

  // Can fire check
  canFire(): boolean {
    if (this.state !== WeaponState.IDLE) return false;
    if (this.currentWeapon === WeaponType.KNIFE) return false;

    const config = this.getWeaponConfig();
    const ammoState = this.ammo.get(this.currentWeapon)!;

    return ammoState.magazine > 0 && this.stateTime >= config.fireRate;
  }

  // Can reload check
  canReload(): boolean {
    if (this.state !== WeaponState.IDLE) return false;
    if (this.currentWeapon === WeaponType.KNIFE) return false;

    const config = this.getWeaponConfig();
    const ammoState = this.ammo.get(this.currentWeapon)!;

    return ammoState.magazine < config.magazine && ammoState.reserve > 0;
  }

  // Can switch check
  canSwitch(): boolean {
    // Can switch during IDLE or FIRING, but not during RELOADING or DRAWING
    return this.state === WeaponState.IDLE || this.state === WeaponState.FIRING;
  }

  // Fire weapon
  fire(currentTime: number): FireResult | null {
    if (!this.canFire()) return null;

    const config = this.getWeaponConfig();
    const ammoState = this.ammo.get(this.currentWeapon)!;

    // Consume ammo
    ammoState.magazine -= 1;

    // Update spray tracking
    this.shotsFired += 1;
    this.lastShotTime = currentTime;

    // Enter firing state
    this.state = WeaponState.FIRING;
    this.stateTime = 0;

    return {
      weaponType: this.currentWeapon,
      shotIndex: this.shotsFired - 1, // 0-indexed for pattern lookup
      damage: config.baseDamage,
    };
  }

  // Start reload
  startReload(): boolean {
    if (!this.canReload()) return false;

    this.state = WeaponState.RELOADING;
    this.stateTime = 0;
    this.ammoRefilled = false;
    this.shotsFired = 0; // Reset spray pattern on reload

    return true;
  }

  // Switch weapon
  switchWeapon(type: WeaponType): boolean {
    if (!this.canSwitch()) return false;
    if (this.currentWeapon === type) return false;

    this.currentWeapon = type;
    this.state = WeaponState.DRAWING;
    this.stateTime = 0;
    this.shotsFired = 0; // Reset spray pattern on switch

    return true;
  }

  // Knife attack
  knifeAttack(isRightClick: boolean): KnifeResult | null {
    if (this.currentWeapon !== WeaponType.KNIFE) return null;
    if (this.state !== WeaponState.IDLE) return null;

    this.state = WeaponState.KNIFE_ATTACK;
    this.stateTime = 0;

    if (isRightClick) {
      // Right-click: backstab (instant kill if from behind)
      return {
        isBackstab: true,
        damage: 180, // High enough to kill through armor
      };
    } else {
      // Left-click: normal swing
      return {
        isBackstab: false,
        damage: 40,
      };
    }
  }

  // Get movement speed for current weapon
  getMovementSpeed(): number {
    return this.getWeaponConfig().movementSpeed;
  }

  // Get current weapon config
  getWeaponConfig(): WeaponConfig {
    return WEAPON_CONFIGS[this.currentWeapon];
  }

  // Get current ammo state
  getAmmo(): { magazine: number; reserve: number } {
    return { ...this.ammo.get(this.currentWeapon)! };
  }

  // Reset all ammo (for round start)
  resetAll(): void {
    for (const type of Object.values(WeaponType)) {
      const config = WEAPON_CONFIGS[type];
      this.ammo.set(type, {
        magazine: config.magazine,
        reserve: config.reserve,
      });
    }

    this.state = WeaponState.IDLE;
    this.stateTime = 0;
    this.shotsFired = 0;
    this.lastShotTime = 0;
    this.ammoRefilled = false;
  }
}

export default WeaponSystem;
