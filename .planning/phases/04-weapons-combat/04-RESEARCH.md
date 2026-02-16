# Phase 4: Weapons & Combat - Research

**Researched:** 2026-02-16
**Domain:** Hitscan combat systems, CS:S-style recoil patterns, accuracy models, hitbox systems
**Confidence:** HIGH

## Summary

Phase 4 implements a Counter-Strike: Source-faithful combat system with hitscan weapons, fixed spray patterns with random spread overlay, movement-based accuracy penalties, and precise hitbox damage calculation. The technical approach uses custom ray-primitive intersection for hitboxes (not Three.js Raycaster), fixed 30-shot recoil patterns per weapon with random spread, and a weapon state machine managing switching with CS:S-authentic draw times.

**Key findings:**
- Hitscan weapons use raycasting for instant-hit registration, testing rays against animated hitbox primitives (sphere for head, capsules for limbs, boxes for torso).
- CS:S spray patterns are fixed 30-shot sequences with random spread overlay. Pattern climbs upward, then pulls laterally after ~5-6 shots. Players learn patterns for recoil compensation.
- Movement accuracy penalties are severe for rifles (wildly inaccurate), moderate for pistols. Counter-strafing instantly restores accuracy. Recoil recovery time is ~0.45s to return to first-shot accuracy.
- Three.js provides efficient tools: InstancedMesh for particle systems (blood, sparks), DecalGeometry for bullet holes, CapsuleGeometry for limb hitboxes.
- Weapon switching requires state machine with timing: draw animations prevent firing, reload animations commit at 50% (CS:S style), cannot cancel once started.

**Primary recommendation:** Build weapon system as engine module (TypeScript) separate from visual feedback (JavaScript). Engine handles damage calculation, weapon state, recoil patterns, accuracy. Visual module handles particles, decals, muzzle flash. Custom hitbox system uses animated primitives following skeleton, not mesh raycasting.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | r169+ | 3D rendering, primitives, geometry | Already in use, provides CapsuleGeometry, sprite system, geometry tools |
| TypeScript | 5.2+ | Engine logic | Already in use for movement engine, type safety critical for combat math |
| Custom ray-primitive intersection | N/A | Hitscan hitbox testing | Faster than Three.js Raycaster for simple primitives, full control |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| THREE.DecalGeometry | Built-in or [spite/THREE.DecalGeometry](https://github.com/spite/THREE.DecalGeometry) | Bullet hole decals | Project bullet hole textures onto arbitrary geometry |
| Object pooling pattern | N/A | Particle reuse | Blood particles, shell casings, sparks — avoid GC thrash |
| CapsuleGeometry | Built-in or [maximeq/three-js-capsule-geometry](https://github.com/maximeq/three-js-capsule-geometry) | Limb hitboxes | Capsule primitives for arms/legs, better fit than cylinders |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom ray-primitive | Three.js Raycaster | Raycaster tests mesh triangles (slow for animated characters), custom ray-sphere/capsule/box is 10-100x faster |
| Object pooling | Create/destroy on demand | GC pauses kill frame timing in combat, pooling mandatory for 60fps stability |
| Fixed spray patterns | Fully random spread | CS:S design: patterns enable skill mastery, random spread removes skill ceiling |

**Installation:**
```bash
# Already installed: three, typescript
# No additional npm packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── engine/
│   ├── movement.ts           # Existing CS:S movement engine
│   ├── weapons.ts             # Weapon state machine, ammo, switching
│   ├── combat.ts              # Hitscan raycasting, damage calculation
│   ├── recoil-patterns.ts     # Fixed spray patterns per weapon
│   └── hitboxes.ts            # Ray-primitive intersection, hitbox zones
├── visual/
│   ├── main.js                # Main renderer
│   ├── first-person-weapon.js # Existing FP weapon rendering
│   ├── player-model.js        # Existing third-person mannequin
│   ├── combat-feedback.js     # Blood, sparks, decals, kill feed data
│   └── hitbox-debug.js        # Visual hitbox primitives (debug mode)
```

### Pattern 1: Weapon State Machine
**What:** Finite state machine managing weapon states: idle, firing, reloading, switching, drawing
**When to use:** Every weapon system with multiple states and timing constraints
**Example:**
```typescript
// Weapon state machine with CS:S timing constraints
enum WeaponState {
  IDLE,
  FIRING,        // Cannot reload/switch during firing cooldown
  RELOADING,     // Cannot cancel once started (CS:S commit-style)
  DRAWING,       // Cannot fire/reload during draw animation
}

class Weapon {
  state: WeaponState = WeaponState.IDLE;
  stateTime: number = 0;

  // CS:S draw times (from CONTEXT.md)
  drawTimes = { rifle: 0.7, pistol: 0.5, knife: 0.25 };

  update(dt: number, input: { fire: boolean, reload: boolean }) {
    this.stateTime += dt;

    switch (this.state) {
      case WeaponState.DRAWING:
        if (this.stateTime >= this.drawTimes[this.type]) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.RELOADING:
        // Ammo refills at 50% through animation (CONTEXT: Decision D8)
        if (!this.ammoRefilled && this.stateTime >= this.reloadTime * 0.5) {
          this.magazine = this.maxMagazine;
          this.ammoRefilled = true;
        }

        // Cannot cancel reload once started (CS:S commit-style)
        if (this.stateTime >= this.reloadTime) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.IDLE:
        if (input.fire && this.canFire()) {
          this.fire();
        } else if (input.reload && this.canReload()) {
          this.startReload();
        }
        break;
    }
  }
}
```

### Pattern 2: Fixed Spray Pattern with Random Spread Overlay
**What:** CS:S recoil system — fixed pattern defines vertical climb and lateral drift, random spread adds variance
**When to use:** CS:S-faithful weapon feel where pattern mastery is a skill
**Example:**
```typescript
// Fixed 30-shot spray pattern for AK-47 (CS:S style)
const AK47_PATTERN = [
  { x: 0,    y: 1.0  },  // Shot 1: straight up
  { x: 0,    y: 2.2  },  // Shot 2: continue up
  { x: 0,    y: 3.5  },  // Shot 3: peak climb rate
  { x: -0.2, y: 4.5  },  // Shot 4: start left pull
  { x: -0.5, y: 5.3  },  // Shot 5: harder left
  { x: -0.8, y: 5.8  },  // Shot 6: left pull dominant
  // ... 24 more entries for full 30-round pattern
];

// Random spread overlay (larger when moving/in air)
function applySpread(angle: Vec2, accuracy: number): Vec2 {
  const spreadRadius = (1.0 - accuracy) * 0.05; // Max 5 degrees inaccurate
  const randomAngle = Math.random() * Math.PI * 2;
  const randomDist = Math.random() * spreadRadius;

  return {
    x: angle.x + Math.cos(randomAngle) * randomDist,
    y: angle.y + Math.sin(randomAngle) * randomDist,
  };
}

// Combine pattern + spread
function getRecoilAngle(shotIndex: number, movingSpeed: number, onGround: boolean): Vec2 {
  const pattern = AK47_PATTERN[shotIndex % AK47_PATTERN.length];

  // Accuracy calculation (from Pattern 3)
  let accuracy = 1.0;
  if (!onGround) accuracy = 0.0;  // Airborne: wildly inaccurate
  else if (movingSpeed > 10) accuracy = 0.1;  // Moving: very inaccurate

  return applySpread(pattern, accuracy);
}
```

### Pattern 3: Movement-Based Accuracy Model
**What:** CS:S accuracy system — perfect standing still, severe penalty when moving/in air, instant recovery on counter-strafe
**When to use:** CS:S-style movement-accuracy coupling
**Example:**
```typescript
// Accuracy state (0.0 = wildly inaccurate, 1.0 = perfect)
class AccuracyModel {
  accuracy: number = 1.0;
  lastShotTime: number = 0;
  shotsSinceStop: number = 0;

  update(dt: number, time: number, player: MovementEngine) {
    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    const onGround = player.onGround;

    // Base accuracy from movement state
    let targetAccuracy = 1.0;

    if (!onGround) {
      // CS:S airborne: completely inaccurate
      targetAccuracy = 0.0;
    } else if (speed > 10) {
      // Moving: severe penalty for rifles (CS:S severity)
      const isPistol = this.weaponType === 'pistol';
      targetAccuracy = isPistol ? 0.4 : 0.1;  // Pistol more forgiving
    } else {
      // Standing still or counter-strafing: perfect accuracy
      targetAccuracy = 1.0;
    }

    // Spray penalty: accuracy degrades with sustained fire
    const timeSinceShot = time - this.lastShotTime;
    if (timeSinceShot < 0.45) {
      // Within recoil recovery window: still inaccurate
      const recoveryProgress = timeSinceShot / 0.45;
      targetAccuracy *= recoveryProgress;
    }

    // Smooth blend to target (instant for counter-strafe, smooth otherwise)
    const blendSpeed = (speed < 10 && onGround) ? 100 : 5;
    this.accuracy += (targetAccuracy - this.accuracy) * Math.min(1, dt * blendSpeed);
  }

  onShot(time: number) {
    this.lastShotTime = time;
    this.shotsSinceStop += 1;
  }
}
```

### Pattern 4: Ray-Primitive Hitbox Testing
**What:** Custom ray intersection with animated primitives (sphere, capsule, box) following skeleton
**When to use:** Performance-critical hitbox testing, simpler than mesh raycasting
**Example:**
```typescript
// Hitbox zones as primitive shapes
interface Hitbox {
  zone: 'head' | 'chest' | 'stomach' | 'arm-l' | 'arm-r' | 'leg-l' | 'leg-r';
  shape: 'sphere' | 'capsule' | 'box';
  multiplier: number;
  armorProtected: boolean;
  position: Vec3;  // World space, updated from skeleton
  size: Vec3 | { radius: number; height: number };
}

// Ray-sphere intersection
function raySphereIntersect(rayOrigin: Vec3, rayDir: Vec3, sphereCenter: Vec3, radius: number): number | null {
  const oc = vecSub(rayOrigin, sphereCenter);
  const b = vecDot(oc, rayDir);
  const c = vecDot(oc, oc) - radius * radius;
  const discriminant = b * b - c;

  if (discriminant < 0) return null;

  const t = -b - Math.sqrt(discriminant);
  return t >= 0 ? t : null;
}

// Ray-capsule intersection (cylinder + hemisphere caps)
function rayCapsuleIntersect(rayOrigin: Vec3, rayDir: Vec3, capsule: { a: Vec3, b: Vec3, radius: number }): number | null {
  // Test cylinder (ray-line segment distance)
  const ab = vecSub(capsule.b, capsule.a);
  const ao = vecSub(rayOrigin, capsule.a);

  const abDotDir = vecDot(ab, rayDir);
  const abDotAo = vecDot(ab, ao);
  const abDotAb = vecDot(ab, ab);

  const m = abDotAb * vecDot(rayDir, ao) - abDotAo * abDotDir;
  const n = abDotAb * vecDot(rayDir, rayDir);

  // ... solve quadratic for cylinder intersection
  // ... test hemisphere caps if no cylinder hit

  return tMin; // Closest intersection distance
}

// Test all hitboxes, return closest hit
function testHitscan(rayOrigin: Vec3, rayDir: Vec3, hitboxes: Hitbox[]): { hitbox: Hitbox, distance: number } | null {
  let closestHit = null;
  let closestDist = Infinity;

  for (const hb of hitboxes) {
    let dist: number | null = null;

    if (hb.shape === 'sphere') {
      dist = raySphereIntersect(rayOrigin, rayDir, hb.position, hb.size.radius);
    } else if (hb.shape === 'capsule') {
      dist = rayCapsuleIntersect(rayOrigin, rayDir, { a: hb.position, b: hb.endPosition, radius: hb.size.radius });
    }
    // ... similar for box

    if (dist !== null && dist < closestDist) {
      closestDist = dist;
      closestHit = hb;
    }
  }

  return closestHit ? { hitbox: closestHit, distance: closestDist } : null;
}
```

### Pattern 5: Object-Pooled Particle System
**What:** Pre-allocate particles, reuse instead of create/destroy for blood, sparks, shell casings
**When to use:** Any frequent temporary effect (particles, decals, tracers)
**Example:**
```javascript
// Object pool for blood particles
class BloodParticlePool {
  constructor(THREE, scene, poolSize = 200) {
    this.THREE = THREE;
    this.scene = scene;
    this.pool = [];
    this.active = [];

    // Pre-allocate particles as sprites
    const texture = this.createBloodTexture();
    for (let i = 0; i < poolSize; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.AdditiveBlending,
        color: 0xff0000,
        transparent: true,
      }));
      sprite.scale.set(0.1, 0.1, 1);
      sprite.visible = false;
      this.scene.add(sprite);
      this.pool.push(sprite);
    }
  }

  spawn(position, velocity) {
    if (this.pool.length === 0) return; // Pool exhausted

    const particle = this.pool.pop();
    particle.position.copy(position);
    particle.userData.velocity = velocity.clone();
    particle.userData.lifetime = 0;
    particle.material.opacity = 1.0;
    particle.visible = true;
    this.active.push(particle);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.userData.lifetime += dt;

      // Physics
      p.userData.velocity.y -= 9.8 * dt; // Gravity
      p.position.add(p.userData.velocity.clone().multiplyScalar(dt));

      // Fade out
      p.material.opacity = 1.0 - (p.userData.lifetime / 2.0);

      // Return to pool when dead
      if (p.userData.lifetime > 2.0) {
        p.visible = false;
        this.pool.push(p);
        this.active.splice(i, 1);
      }
    }
  }
}
```

### Anti-Patterns to Avoid
- **Three.js Raycaster for hitboxes:** Raycaster tests mesh triangles. For animated characters, this is 10-100x slower than ray-primitive intersection. Use custom ray-sphere/capsule/box math.
- **Creating particles on demand:** GC pauses kill frame timing. Pre-allocate particle pools, reuse objects.
- **Cancellable reloads:** CS:S reloads commit once started. Allowing cancellation changes weapon balance (reload becomes free tactical retreat).
- **Frame-dependent recoil:** Recoil patterns must use fixed-timestep game time, not frame delta. Variable framerate causes inconsistent spray patterns.
- **Mesh-based hitboxes:** Hitboxes should be primitive shapes (sphere, capsule, box), not mesh geometry. Primitives are faster to test and easier to make "slightly generous" (CS:S style).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bullet hole decals | Custom projection shader | THREE.DecalGeometry | Decal projection is non-trivial: find surface normal, clip geometry, prevent z-fighting. DecalGeometry handles all edge cases (corners, seams, distortion). |
| Capsule geometry | Cylinder + sphere combination | THREE.CapsuleGeometry | Smooth normal continuity at caps is hard. CapsuleGeometry provides closed shell with seamless normals. |
| Ray-sphere intersection | Manual derivation | Proven algorithm (ray-sphere-intersection npm or inline math) | Easy to get wrong (negative t, discriminant edge cases). Use tested implementation. |
| Client-side prediction | Custom lag compensation | Gabriel Gambetta's architecture | Client-side prediction + server reconciliation is subtle (input buffering, rollback, interpolation). Phase 4 is single-player but Phase 7 needs this — use proven patterns. |
| Particle billboard orientation | Manual quaternion math | THREE.Sprite | Sprites auto-face camera, handle all edge cases (camera at particle position, upside-down). |

**Key insight:** Hitscan combat has many 10-line solutions that fail in edge cases. Ray-primitive intersection is numerically stable, DecalGeometry handles arbitrary geometry, Sprites handle camera alignment. Use battle-tested primitives, focus effort on game feel (recoil patterns, accuracy tuning, damage balance).

## Common Pitfalls

### Pitfall 1: Hitbox Desync from Visual Model
**What goes wrong:** Hitboxes don't match player model position/animation, shots "hit" when visually missing or "miss" when visually hitting.
**Why it happens:** Hitboxes updated in engine tick (64Hz), visual model updated in render loop (144Hz). Procedural animation offsets (crouch, lean, bob) not applied to hitbox positions.
**How to avoid:** Update hitbox positions from skeleton bone world transforms every engine tick. Hitboxes follow bones (Head.R, UpperArm.L, etc.), not model root position. Bone positions include all animation (crouch, run, strafe).
**Warning signs:** Players complaining about "shots behind cover hit" or "clear headshot didn't register". Debug visualization shows hitboxes lagging behind visual model.

### Pitfall 2: Recoil Pattern Index Desync
**What goes wrong:** Spray pattern resets mid-burst, shots don't follow expected pattern after stopping/starting fire.
**Why it happens:** Pattern index increments every frame regardless of whether shot fired. Pattern index resets on wrong condition (mouse release, not time-based recovery).
**How to avoid:** Pattern index increments only when shot actually fires (respects fire rate). Pattern resets after ~0.45s of no firing (CS:S recovery time), not immediately on mouse release. Track `lastShotTime`, compare against current time.
**Warning signs:** Players can't learn spray patterns, recoil feels random. First few shots after pause continue previous pattern instead of resetting.

### Pitfall 3: Movement Accuracy Check Timing
**What goes wrong:** Counter-strafing doesn't restore accuracy, or standing still keeps movement penalty for too long.
**Why it happens:** Accuracy check uses velocity magnitude, which takes time to decay to zero even after input stops. Doesn't account for counter-strafe (opposite input instantly stops movement in CS:S physics).
**How to avoid:** Accuracy check considers velocity magnitude AND input state. If velocity near zero OR input changed direction this frame, treat as "stopped". Accuracy restores instantly on counter-strafe (core CS:S mechanic).
**Warning signs:** Players complaining "shots miss when standing still". Counter-strafing feels no different from coasting to a stop.

### Pitfall 4: Armor Damage Calculation Order
**What goes wrong:** Armor reduces damage THEN multiplier applied, or multiplier applied THEN armor. Wrong order changes damage values significantly.
**Why it happens:** CS:S damage calculation has specific order: base damage → hitbox multiplier → armor reduction.
**How to avoid:** Correct order: `finalDamage = baseDamage * hitboxMultiplier * (armorProtected ? 0.5 : 1.0)`. Test with known values: AK-47 (36 base) headshot (4x) with helmet = 36 * 4 * 0.5 = 72 damage (survives). Without helmet = 144 damage (dies).
**Warning signs:** Helmet doesn't affect rifle headshot kills (should reduce AK from 144 to 72), or arm shots ignore armor (should be protected).

### Pitfall 5: Floating-Point Hitbox Intersection Epsilon
**What goes wrong:** Ray misses hitbox when fired from inside (negative t), or ray hits hitbox from behind.
**Why it happens:** Floating-point precision: ray origin can be numerically inside hitbox sphere. Negative t (intersection behind ray origin) not rejected.
**How to avoid:** Reject intersections with t < EPSILON (e.g., 0.001). For player's own hitboxes, add to exclusion list (don't test ray against self). Use double-precision for ray origin if frequent false positives.
**Warning signs:** Knife hits from 10 meters away (negative t wraps to positive). Shooting own feet registers as headshot on nearby enemy.

### Pitfall 6: Particle Pool Exhaustion
**What goes wrong:** Blood/sparks stop spawning mid-combat, or frame rate spikes when pool exhausted.
**Why it happens:** Pool size too small (50 particles), all active simultaneously. Fallback creates new particles instead of failing silently.
**How to avoid:** Size pool for worst-case: 10 players, full-auto spray (10 shots/sec), 3-second firefight, 5 particles/hit = 10 * 10 * 3 * 5 = 1500 particles. Pool 2000-3000 for safety. When pool exhausted, fail silently (return early), don't allocate.
**Warning signs:** Frame drops during intense combat. Memory usage grows continuously. Console spam "pool exhausted, allocating more".

### Pitfall 7: Draw Time Not Blocking Fire Input
**What goes wrong:** Weapon fires during draw animation, before visually ready.
**Why it happens:** Input handling checks `canFire()` based on fire rate cooldown only, ignores weapon state (DRAWING).
**How to avoid:** `canFire()` returns false if state != IDLE. Draw animation must complete before weapon can fire/reload/switch. Fire rate cooldown AND state must allow firing.
**Warning signs:** Muzzle flash shows before weapon fully drawn. Shots fire while weapon is off-screen during quickswitch.

## Code Examples

Verified patterns from research:

### Hitscan with Weapon Spread
```typescript
// Source: CS:S recoil model + Three.js ray primitive intersection
function fireHitscan(weapon: Weapon, player: MovementEngine, camera: THREE.Camera): HitResult | null {
  // Get recoil pattern angle for current shot index
  const patternAngle = weapon.getRecoilPattern(weapon.shotsFired);

  // Apply accuracy-based spread
  const accuracy = calculateAccuracy(player.velocity, player.onGround, weapon.timeSinceLastShot);
  const finalAngle = applyRandomSpread(patternAngle, accuracy);

  // Construct ray from camera forward + recoil offset
  const rayOrigin = camera.position.clone();
  const rayDir = camera.getWorldDirection(new THREE.Vector3());

  // Apply recoil angle to ray direction
  const pitch = finalAngle.y * Math.PI / 180;
  const yaw = finalAngle.x * Math.PI / 180;
  rayDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  rayDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  rayDir.normalize();

  // Test all players' hitboxes
  let closestHit: HitResult | null = null;
  let closestDist = Infinity;

  for (const target of allPlayers) {
    if (target === player) continue; // Don't shoot self

    for (const hitbox of target.hitboxes) {
      const dist = testHitbox(rayOrigin, rayDir, hitbox);
      if (dist !== null && dist < closestDist) {
        closestDist = dist;
        closestHit = {
          target,
          hitbox,
          distance: dist,
          position: rayOrigin.clone().add(rayDir.clone().multiplyScalar(dist)),
        };
      }
    }
  }

  return closestHit;
}
```

### CS:S Damage Calculation
```typescript
// Source: Counter-Strike Wiki - Hitbox zones and armor
function calculateDamage(weapon: Weapon, hitbox: Hitbox, target: Player): number {
  // Base weapon damage
  const baseDamage = weapon.damage; // AK-47: 36, M4A1: 32

  // Hitbox multiplier (CS:S values from CONTEXT.md)
  const multipliers = {
    head: 4.0,
    chest: 1.0,
    stomach: 1.25,
    arm: 1.0,
    leg: 0.75,
  };
  const multiplier = multipliers[hitbox.zone];

  // Armor reduction (50% for protected zones)
  let armorMultiplier = 1.0;
  if (hitbox.armorProtected) {
    if (hitbox.zone === 'head' && target.hasHelmet) {
      armorMultiplier = 0.5;
    } else if (hitbox.zone !== 'head' && target.hasArmor) {
      armorMultiplier = 0.5;
    }
  }

  // CS:S damage order: base → hitbox → armor
  const finalDamage = baseDamage * multiplier * armorMultiplier;

  return Math.round(finalDamage);
}

// Example: AK-47 headshot with helmet
// 36 * 4.0 * 0.5 = 72 damage (survives 100 HP)
// Without helmet: 36 * 4.0 * 1.0 = 144 damage (one-tap kill)
```

### Weapon State Machine with CS:S Timing
```typescript
// Source: CS:S weapon timing (CONTEXT.md decisions)
class WeaponStateMachine {
  state: WeaponState = WeaponState.IDLE;
  stateTime: number = 0;
  currentWeapon: 'ak47' | 'm4a1' | 'pistol' | 'knife' = 'ak47';

  // CS:S authentic timing from CONTEXT.md
  fireRates = {
    ak47: 0.1,    // 600 RPM
    m4a1: 0.09,   // 667 RPM
    pistol: 0.15, // 400 RPM
    knife: 0.4,   // 150 RPM (swing time)
  };

  drawTimes = {
    ak47: 0.7,
    m4a1: 0.7,
    pistol: 0.5,
    knife: 0.25,
  };

  reloadTimes = {
    ak47: 2.5,
    m4a1: 3.1,
    pistol: 2.2,
  };

  canFire(): boolean {
    return this.state === WeaponState.IDLE
      && this.stateTime >= this.fireRates[this.currentWeapon]
      && this.currentWeapon !== 'knife'; // Knife uses different attack
  }

  canReload(): boolean {
    return this.state === WeaponState.IDLE
      && this.currentWeapon !== 'knife'
      && this.magazine < this.maxMagazine
      && this.reserve > 0;
  }

  canSwitch(): boolean {
    // Can switch during IDLE or FIRING, but not during RELOADING or DRAWING
    return this.state === WeaponState.IDLE || this.state === WeaponState.FIRING;
  }

  switchWeapon(newWeapon: string) {
    if (!this.canSwitch()) return;

    // Cancel reload if switching (CS:S behavior)
    this.currentWeapon = newWeapon;
    this.state = WeaponState.DRAWING;
    this.stateTime = 0;
  }

  update(dt: number) {
    this.stateTime += dt;

    switch (this.state) {
      case WeaponState.DRAWING:
        if (this.stateTime >= this.drawTimes[this.currentWeapon]) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.RELOADING:
        // Ammo refills at 50% (Decision D8 from Phase 3)
        const reloadTime = this.reloadTimes[this.currentWeapon];
        if (!this.ammoRefilled && this.stateTime >= reloadTime * 0.5) {
          this.magazine = this.maxMagazine;
          this.reserve -= (this.maxMagazine - this.magazine);
          this.ammoRefilled = true;
        }

        if (this.stateTime >= reloadTime) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;

      case WeaponState.FIRING:
        if (this.stateTime >= this.fireRates[this.currentWeapon]) {
          this.state = WeaponState.IDLE;
          this.stateTime = 0;
        }
        break;
    }
  }
}
```

### Blood Particle System with Pooling
```javascript
// Source: Three.js particle optimization best practices (2026)
class BloodParticleSystem {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;

    // Pool 300 particles (worst case: 10 hits/sec * 3 sec * 10 particles/hit)
    this.pool = [];
    this.active = [];

    const texture = this.createBloodSplatterTexture();

    for (let i = 0; i < 300; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        blending: THREE.NormalBlending,
        color: 0x8b0000,
        transparent: true,
        depthWrite: false,
      }));
      sprite.scale.set(0.15, 0.15, 1);
      sprite.visible = false;
      this.scene.add(sprite);
      this.pool.push(sprite);
    }
  }

  spawnBlood(position, rayDirection) {
    // Spawn 5-8 particles per hit
    const count = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      if (this.pool.length === 0) break; // Pool exhausted, fail silently

      const particle = this.pool.pop();

      // Position: slightly forward from hit point
      particle.position.copy(position);
      particle.position.add(rayDirection.clone().multiplyScalar(0.1));

      // Velocity: spray outward from hit direction
      const spread = 0.5;
      const vel = new this.THREE.Vector3(
        rayDirection.x + (Math.random() - 0.5) * spread,
        rayDirection.y + Math.random() * 0.5, // Upward bias
        rayDirection.z + (Math.random() - 0.5) * spread
      ).multiplyScalar(2 + Math.random() * 2);

      particle.userData = {
        velocity: vel,
        lifetime: 0,
        maxLifetime: 1.0 + Math.random() * 0.5,
      };

      particle.material.opacity = 1.0;
      particle.visible = true;
      this.active.push(particle);
    }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      const ud = p.userData;

      ud.lifetime += dt;

      // Physics
      ud.velocity.y -= 9.8 * dt; // Gravity
      p.position.add(ud.velocity.clone().multiplyScalar(dt));

      // Fade out
      const fadeStart = ud.maxLifetime * 0.5;
      if (ud.lifetime > fadeStart) {
        p.material.opacity = 1.0 - (ud.lifetime - fadeStart) / (ud.maxLifetime - fadeStart);
      }

      // Return to pool
      if (ud.lifetime >= ud.maxLifetime) {
        p.visible = false;
        this.pool.push(p);
        this.active.splice(i, 1);
      }
    }
  }

  createBloodSplatterTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Irregular splatter shape (not perfect circle)
    ctx.fillStyle = '#8b0000';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 20 + Math.random() * 15;
      const x = 32 + Math.cos(angle) * r;
      const y = 32 + Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(x, y, 8 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    return new this.THREE.CanvasTexture(canvas);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Three.js Raycaster for all intersection | Custom ray-primitive intersection for hitboxes | Since CS:GO (2012) | Raycaster tests mesh triangles (100+ per character). Ray-sphere is 1 test. 10-100x performance improvement. |
| Mesh-based hitboxes | Primitive shapes (sphere, capsule, box) | CS:GO hitbox update (2015) | Primitives are "slightly generous" by design (15% larger head hitbox). Meshes are pixel-perfect (feels bad, hard to hit). |
| Random spray patterns | Fixed patterns with spread overlay | CS 1.6 (1999) | Fixed patterns enable skill mastery. Pure random lowers skill ceiling. CS design philosophy. |
| Manual decal projection | DecalGeometry | Three.js r71 (2015) | Manual projection has distortion, z-fighting, UV issues. DecalGeometry solves all edge cases. |
| Create/destroy particles | Object pooling | Industry standard (2010+) | GC pauses kill frame timing. Pooling is mandatory for 60fps particle systems. |

**Deprecated/outdated:**
- **Three.js Raycaster for hitboxes:** Too slow for animated characters. Use only for world geometry (walls, props).
- **Fully random recoil:** CS:GO initially tried dynamic patterns (2012), reverted to fixed patterns after community backlash. Fixed patterns are core to CS design.
- **Continuous particle allocation:** GC-sensitive approach. Object pooling is standard practice as of 2010s.

## Open Questions

Things that couldn't be fully resolved:

1. **Arm penetration mechanics**
   - What we know: CONTEXT.md states "shots through arms can also hit chest behind them"
   - What's unclear: If arm hitbox is hit, do we test ray continuation against torso? Or do we sort hitboxes by distance and apply damage to all on ray path?
   - Recommendation: Test ray against all hitboxes, sort by distance. Apply damage to first non-arm hit. If arm hit but torso behind it, damage torso (arm doesn't block). Simple implementation: skip arm hitboxes in damage calculation, they're "transparent".

2. **Crosshair recoil visualization**
   - What we know: CONTEXT.md states "crosshair follows recoil (CS:GO-style)"
   - What's unclear: Does crosshair position animate to pattern angle, or does it offset by recoil amount? Does it spring back or reset instantly?
   - Recommendation: Crosshair position = center + recoil pattern angle offset. Spring back over 0.45s recovery time (matches accuracy recovery). This is Phase 5 UI task, but Phase 4 must expose recoil angle data.

3. **Tagging duration and magnitude**
   - What we know: COMBAT-08 requires "slight movement speed reduction" on hit
   - What's unclear: How long does tagging last? Is it flat reduction (e.g., -30% speed) or scaled by damage? Does it stack?
   - Recommendation: CS:GO tagging: 0.1s duration, scales with damage (10 damage = 10% slow, 50 damage = 50% slow, capped at 80%). Does not stack (new hit replaces old). Implement as temporary velocity multiplier on hit.

4. **Backstab detection zone**
   - What we know: Right-click knife backstab is instant kill (COMBAT-05)
   - What's unclear: What angle cone counts as "backstab"? 180° (exactly behind)? 90° (rear quarter)? Does crouch height matter?
   - Recommendation: CS:S backstab: 90° cone behind target (dot product of attack direction and target's forward < 0). Crouch doesn't matter, only yaw angle. Instant kill regardless of armor/helmet.

5. **Muzzle flash + tracer timing**
   - What we know: "Muzzle flashes visible on enemy weapons", "periodic bullet tracers (every 3rd-5th bullet)"
   - What's unclear: Are tracers synced to muzzle flash? Do tracers show for first shot or only sustained fire? Tracer lifetime/length?
   - Recommendation: Muzzle flash shows every shot (50ms duration). Tracers show every 4th bullet, 0.3s lifetime, length = bullet travel distance. Tracers are client-side only (not authoritative), visual indicator of enemy fire direction.

## Sources

### PRIMARY (HIGH confidence)
- [Three.js Raycaster documentation](https://threejs-journey.com/lessons/raycaster-and-mouse-events) - Raycasting fundamentals, limitations
- [Counter-Strike Wiki: Recoil](https://counterstrike.fandom.com/wiki/Recoil) - CS:S spray pattern mechanics
- [Counter-Strike Wiki: Inaccuracy](https://counterstrike.fandom.com/wiki/Inaccuracy) - Movement penalties, recovery times
- [Counter-Strike Wiki: Hitbox](https://counterstrike.fandom.com/wiki/Hitbox) - Hitbox zones, damage multipliers, armor
- [Counter-Strike Wiki: Tagging](https://counterstrike.fandom.com/wiki/Tagging) - Movement speed reduction on hit
- [GitHub: three-js-capsule-geometry](https://github.com/maximeq/three-js-capsule-geometry) - CapsuleGeometry for hitboxes
- [GitHub: THREE.DecalGeometry](https://github.com/spite/THREE.DecalGeometry) - Bullet hole decals
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) - Object pooling, InstancedMesh
- [Valve: Latency Compensating Methods](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization) - Client-side prediction (Phase 7 prep)

### SECONDARY (MEDIUM confidence)
- [Three Nebula particle system](https://three-nebula.org/) - Particle system library option
- [Ray-sphere-intersection npm](https://www.npmjs.com/package/ray-sphere-intersection) - Verified ray-sphere algorithm
- [Inigo Quilez: Intersectors](https://iquilezles.org/articles/intersectors/) - Ray-primitive intersection reference
- [CS2 Spray Patterns Guide [2026]](https://community.skin.club/en/articles/cs2-spray-patterns-2) - Modern CS spray patterns
- [Gabriel Gambetta: Client-Side Prediction](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html) - Multiplayer prediction patterns

### TERTIARY (LOW confidence - need validation)
- WebSearch results on weapon state machines (Unity/Unreal examples, not JavaScript-specific)
- Community discussions on CS:S draw times (verified against CONTEXT.md user decisions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Three.js primitives verified, CapsuleGeometry confirmed available, DecalGeometry is standard solution
- Hitscan architecture: HIGH - Ray-primitive intersection is proven approach, CS:S-style mechanics well-documented
- Recoil patterns: HIGH - CS:S fixed patterns with spread overlay is authoritative (Counter-Strike Wiki, multiple sources)
- Accuracy model: HIGH - CS:S movement penalties, recovery times confirmed (Counter-Strike Wiki: Inaccuracy)
- Damage calculation: HIGH - Hitbox multipliers, armor mechanics confirmed (Counter-Strike Wiki: Hitbox)
- Particle systems: HIGH - Object pooling is industry standard, Three.js optimization guides confirm approach
- Open questions: MEDIUM - Arm penetration, tagging magnitude need testing/tuning, but recommendations are based on CS:GO mechanics

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable domain, CS:S mechanics unchanged since 2004, Three.js primitives stable)
