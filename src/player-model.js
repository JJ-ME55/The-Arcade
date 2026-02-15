import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/**
 * PlayerModel - Manages third-person mannequin loading, spawning, and procedural animation
 *
 * Animation states:
 * 1. Idle - subtle breathing
 * 2. Run - leg stride, arm swing, body bob
 * 3. Strafe - lean torso, side-step shuffle
 * 4. Jump - tuck legs, arms out
 * 5. Crouch - lower root, bend legs more
 * 6. Shooting - recoil and spring back
 * 7. Reload - left arm reaches across
 * 8. Knife swing - right arm forward slash
 */
export class PlayerModel {
  constructor(THREE) {
    this.THREE = THREE;
    this.loader = new GLTFLoader();
    this.sourceScene = null;
    this.sourceSkeleton = null;
    this.debugMode = false;
  }

  /**
   * Load mannequin GLB file
   * @param {string} url - Path to mannequin_neutral.glb
   */
  async load(url) {
    console.log(`Loading mannequin from ${url}...`);
    const gltf = await this.loader.loadAsync(url);

    this.sourceScene = gltf.scene;

    // Find skeleton in source scene
    this.sourceScene.traverse((child) => {
      if (child.isSkinnedMesh) {
        this.sourceSkeleton = child.skeleton;
        console.log(`Mannequin loaded: ${this.sourceSkeleton.bones.length} bones`);
      }
    });

    if (!this.sourceSkeleton) {
      throw new Error('No skeleton found in mannequin GLB');
    }

    return this;
  }

  /**
   * Spawn a new player instance with team color
   * @param {number} teamColor - 0xcc2200 for red, 0x2244cc for blue
   * @param {THREE.Vector3} position - World position
   * @returns {object} Instance object with { scene, skeleton, bones, teamColor }
   */
  spawn(teamColor, position) {
    const THREE = this.THREE;

    // Clone scene with skeleton
    const clonedScene = SkeletonUtils.clone(this.sourceScene);

    // Find skeleton in cloned scene
    let skeleton = null;
    clonedScene.traverse((child) => {
      if (child.isSkinnedMesh) {
        skeleton = child.skeleton;
        // Disable frustum culling (mannequin might be partially off-screen but skeleton visible)
        child.frustumCulled = false;

        // Clone material and set team color
        child.material = child.material.clone();
        child.material.color.setHex(teamColor);
      }
    });

    if (!skeleton) {
      throw new Error('No skeleton found in cloned scene');
    }

    // Build bone lookup map
    const bones = {};
    skeleton.bones.forEach(bone => {
      bones[bone.name] = bone;
    });

    // Set position
    clonedScene.position.copy(position);

    // Create debug helper (if debug mode enabled)
    let helper = null;
    if (this.debugMode) {
      helper = new THREE.SkeletonHelper(clonedScene);
      helper.material.linewidth = 2;
    }

    const instance = {
      scene: clonedScene,
      skeleton,
      bones,
      teamColor,
      helper,
      // Animation state
      animTime: 0,
      shootTime: 0,
      reloadTime: 0,
      knifeTime: 0,
    };

    if (this.debugMode) {
      console.log(`Spawned mannequin with ${skeleton.bones.length} bones:`, Object.keys(bones));
    }

    return instance;
  }

  /**
   * Update procedural animation for an instance
   * @param {object} instance - Instance returned from spawn()
   * @param {number} dt - Delta time in seconds
   * @param {object} state - Animation state object
   *   { velocity: Vector3, onGround: boolean, crouching: boolean, time: number,
   *     shooting: boolean, reloading: boolean, knifing: boolean }
   */
  updateAnimation(instance, dt, state) {
    const { bones } = instance;
    const { velocity, onGround, crouching, time, shooting, reloading, knifing } = state;

    // Calculate speed from velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const isMoving = speed >= 0.5;

    // Reset all bone rotations to default each frame (clean slate)
    this._resetBones(bones);

    // Determine dominant animation state
    if (!onGround) {
      // STATE 4: JUMP
      this._animateJump(bones, velocity);
    } else if (crouching) {
      // STATE 5: CROUCH (with optional movement)
      this._animateCrouch(bones, speed, time);
    } else if (isMoving) {
      // Check if strafe-dominant (lateral movement)
      const forwardSpeed = Math.abs(velocity.z);
      const lateralSpeed = Math.abs(velocity.x);

      if (lateralSpeed > forwardSpeed * 1.5) {
        // STATE 3: STRAFE
        this._animateStrafe(bones, velocity, speed, time);
      } else {
        // STATE 2: RUN
        this._animateRun(bones, speed, time);
      }
    } else {
      // STATE 1: IDLE
      this._animateIdle(bones, time);
    }

    // Overlay combat actions (additive over movement)
    if (shooting) {
      // STATE 6: SHOOTING
      instance.shootTime = 0;
    }
    if (instance.shootTime < 0.1) {
      this._animateShooting(bones, instance.shootTime);
      instance.shootTime += dt;
    }

    if (reloading) {
      // STATE 7: RELOAD
      instance.reloadTime = 0;
    }
    if (instance.reloadTime < 2.0) {
      this._animateReload(bones, instance.reloadTime);
      instance.reloadTime += dt;
    }

    if (knifing) {
      // STATE 8: KNIFE SWING
      instance.knifeTime = 0;
    }
    if (instance.knifeTime < 0.4) {
      this._animateKnife(bones, instance.knifeTime);
      instance.knifeTime += dt;
    }

    instance.animTime += dt;
  }

  /**
   * Set transform (position and yaw) for an instance
   * @param {object} instance - Instance returned from spawn()
   * @param {THREE.Vector3} position - World position
   * @param {number} yaw - Y-axis rotation in radians
   */
  setTransform(instance, position, yaw) {
    instance.scene.position.copy(position);
    instance.scene.rotation.y = yaw;
  }

  /**
   * Remove instance from scene
   * @param {object} instance - Instance to remove
   */
  despawn(instance) {
    // Traverse and dispose materials/geometries
    instance.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Remove from parent (scene)
    if (instance.scene.parent) {
      instance.scene.parent.remove(instance.scene);
    }

    if (instance.helper && instance.helper.parent) {
      instance.helper.parent.remove(instance.helper);
    }
  }

  // ========== INTERNAL ANIMATION FUNCTIONS ==========

  _resetBones(bones) {
    // Reset all bone rotations to zero (neutral pose)
    Object.values(bones).forEach(bone => {
      bone.rotation.set(0, 0, 0);
    });

    // Reset root position offset (crouch uses this)
    if (bones['Root']) {
      bones['Root'].position.set(0, 0, 0);
    }
  }

  /**
   * STATE 1: IDLE
   * Subtle breathing animation on chest
   */
  _animateIdle(bones, time) {
    const breathFreq = 0.3; // Slow breathing
    const breathAmp = 0.02;
    const breathCycle = Math.sin(time * breathFreq * Math.PI * 2);

    if (bones['Chest']) {
      bones['Chest'].rotation.x = breathCycle * breathAmp;
    }
  }

  /**
   * STATE 2: RUN
   * Leg stride, arm swing, body bob, chest twist
   */
  _animateRun(bones, speed, time) {
    const freq = speed * 1.2; // Faster stride at higher speed
    const t = time * freq * Math.PI * 2;

    // Amplitude scales with speed
    const legAmp = Math.min(speed / 4.5, 1.0) * 0.5;
    const armAmp = Math.min(speed / 4.5, 1.0) * 0.35;
    const bobAmp = Math.min(speed / 4.5, 1.0) * 0.05;
    const twistAmp = Math.min(speed / 4.5, 1.0) * 0.08;

    // Legs swing (thighs forward/back, shins bend when leg is back)
    if (bones['Thigh.L']) {
      bones['Thigh.L'].rotation.x = Math.sin(t) * legAmp;
    }
    if (bones['Thigh.R']) {
      bones['Thigh.R'].rotation.x = Math.sin(t + Math.PI) * legAmp;
    }
    if (bones['Shin.L']) {
      bones['Shin.L'].rotation.x = -Math.abs(Math.sin(t)) * legAmp * 0.8;
    }
    if (bones['Shin.R']) {
      bones['Shin.R'].rotation.x = -Math.abs(Math.sin(t + Math.PI)) * legAmp * 0.8;
    }

    // Arms swing opposite to legs
    if (bones['UpperArm.L']) {
      bones['UpperArm.L'].rotation.x = Math.sin(t + Math.PI) * armAmp;
    }
    if (bones['UpperArm.R']) {
      bones['UpperArm.R'].rotation.x = Math.sin(t) * armAmp;
    }

    // Body bob (vertical)
    if (bones['Root']) {
      bones['Root'].position.y = Math.abs(Math.sin(t * 2)) * bobAmp;
    }

    // Chest twist (counter-rotates with leg swing)
    if (bones['Chest']) {
      bones['Chest'].rotation.y = Math.sin(t) * twistAmp;
    }
  }

  /**
   * STATE 3: STRAFE
   * Lean torso in direction of movement, side-step shuffle
   */
  _animateStrafe(bones, velocity, speed, time) {
    const freq = speed * 1.0;
    const t = time * freq * Math.PI * 2;

    // Lean torso in direction of lateral movement
    const leanAmount = Math.sign(velocity.x) * 0.15;
    if (bones['Spine']) {
      bones['Spine'].rotation.z = leanAmount;
    }

    // Side-step shuffle (reduced arm swing)
    if (bones['Thigh.L']) {
      bones['Thigh.L'].rotation.x = Math.sin(t) * 0.25;
    }
    if (bones['Thigh.R']) {
      bones['Thigh.R'].rotation.x = Math.sin(t + Math.PI) * 0.25;
    }

    // Minimal arm swing during strafe
    if (bones['UpperArm.L']) {
      bones['UpperArm.L'].rotation.x = Math.sin(t + Math.PI) * 0.15;
    }
    if (bones['UpperArm.R']) {
      bones['UpperArm.R'].rotation.x = Math.sin(t) * 0.15;
    }
  }

  /**
   * STATE 4: JUMP
   * Tuck legs, arms slightly out
   */
  _animateJump(bones, velocity) {
    // Tuck legs (bend thighs up, shins more)
    if (bones['Thigh.L']) {
      bones['Thigh.L'].rotation.x = 0.4;
    }
    if (bones['Thigh.R']) {
      bones['Thigh.R'].rotation.x = 0.4;
    }
    if (bones['Shin.L']) {
      bones['Shin.L'].rotation.x = -0.5;
    }
    if (bones['Shin.R']) {
      bones['Shin.R'].rotation.x = -0.5;
    }

    // Arms slightly out for balance
    if (bones['UpperArm.L']) {
      bones['UpperArm.L'].rotation.z = 0.2;
    }
    if (bones['UpperArm.R']) {
      bones['UpperArm.R'].rotation.z = -0.2;
    }
  }

  /**
   * STATE 5: CROUCH
   * Lower root, bend legs more. If moving, run at 60% amplitude.
   */
  _animateCrouch(bones, speed, time) {
    // Lower root position
    if (bones['Root']) {
      bones['Root'].position.y = -0.3;
    }

    // Bend legs (thighs and shins)
    if (bones['Thigh.L']) {
      bones['Thigh.L'].rotation.x = -0.6;
    }
    if (bones['Thigh.R']) {
      bones['Thigh.R'].rotation.x = -0.6;
    }
    if (bones['Shin.L']) {
      bones['Shin.L'].rotation.x = -0.8;
    }
    if (bones['Shin.R']) {
      bones['Shin.R'].rotation.x = -0.8;
    }

    // If moving while crouching, add walk cycle at reduced amplitude
    if (speed >= 0.5) {
      const freq = speed * 1.2;
      const t = time * freq * Math.PI * 2;
      const amp = 0.6; // 60% of normal run amplitude

      // Leg swing on top of crouch bend
      if (bones['Thigh.L']) {
        bones['Thigh.L'].rotation.x += Math.sin(t) * 0.3 * amp;
      }
      if (bones['Thigh.R']) {
        bones['Thigh.R'].rotation.x += Math.sin(t + Math.PI) * 0.3 * amp;
      }

      // Arm swing
      if (bones['UpperArm.L']) {
        bones['UpperArm.L'].rotation.x = Math.sin(t + Math.PI) * 0.25 * amp;
      }
      if (bones['UpperArm.R']) {
        bones['UpperArm.R'].rotation.x = Math.sin(t) * 0.25 * amp;
      }
    }
  }

  /**
   * STATE 6: SHOOTING
   * Quick recoil on right upper arm, spring back over 0.1s
   */
  _animateShooting(bones, shootTime) {
    if (!bones['UpperArm.R']) return;

    const duration = 0.1;
    const t = shootTime / duration; // 0 to 1

    // Spring recoil (quick snap back, then settle)
    const recoil = Math.exp(-t * 8) * Math.cos(t * 20);
    bones['UpperArm.R'].rotation.x -= recoil * 0.15;
  }

  /**
   * STATE 7: RELOAD
   * Left arm reaches across body, cycles over 2s
   */
  _animateReload(bones, reloadTime) {
    const duration = 2.0;
    const t = reloadTime / duration; // 0 to 1
    const cycle = Math.sin(t * Math.PI); // 0 -> 1 -> 0

    // Left arm reaches across
    if (bones['UpperArm.L']) {
      bones['UpperArm.L'].rotation.y = cycle * 0.8;
      bones['UpperArm.L'].rotation.z = cycle * 0.5;
    }

    // Right arm lowers slightly
    if (bones['UpperArm.R']) {
      bones['UpperArm.R'].rotation.x = cycle * 0.3;
    }
  }

  /**
   * STATE 8: KNIFE SWING
   * Right arm forward slash: wind-up, slash, recover (0.4s total)
   */
  _animateKnife(bones, knifeTime) {
    if (!bones['UpperArm.R']) return;

    const duration = 0.4;
    const t = knifeTime / duration; // 0 to 1

    // Three phases: wind-up (0-0.2), slash (0.2-0.3), recover (0.3-0.4)
    if (t < 0.5) {
      // Wind-up: pull arm back
      const windupT = t / 0.5;
      bones['UpperArm.R'].rotation.x = -windupT * 0.6;
      bones['UpperArm.R'].rotation.y = -windupT * 0.4;
    } else if (t < 0.75) {
      // Slash: fast forward swing
      const slashT = (t - 0.5) / 0.25;
      bones['UpperArm.R'].rotation.x = -0.6 + slashT * 1.2; // -0.6 to +0.6
      bones['UpperArm.R'].rotation.y = -0.4 + slashT * 0.8; // -0.4 to +0.4
    } else {
      // Recover: return to neutral
      const recoverT = (t - 0.75) / 0.25;
      bones['UpperArm.R'].rotation.x = 0.6 * (1 - recoverT);
      bones['UpperArm.R'].rotation.y = 0.4 * (1 - recoverT);
    }
  }
}
