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

    // The realistic soldier's Mixamo bind pose is a T-pose (arms straight out).
    // These offsets are composed into the captured rest pose so the neutral stance
    // hangs naturally; all procedural animations then layer on arms-down.
    // Tunable [boneName, axis, angleRadians] — mirror L/R signs. (Old blocky
    // mannequin rested arms-down already, so it just used [] / no offsets.)
    this.restOffsets = [
      ['UpperArm.L', 'z', 1.3],
      ['UpperArm.R', 'z', 1.3],
    ];
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

        // Clone material and set team color. The soldier's PBR texture only tints
        // subtly via .color, so add a low-intensity emissive accent so RED vs BLUE
        // reads clearly at gameplay distance (RESEARCH "Team Color Approach").
        child.material = child.material.clone();
        child.material.color.setHex(teamColor);
        child.material.emissive = new THREE.Color(teamColor);
        child.material.emissiveIntensity = 0.18;
      }
    });

    if (!skeleton) {
      throw new Error('No skeleton found in cloned scene');
    }

    // Build bone lookup map
    const bones = {};
    skeleton.bones.forEach(bone => {
      bones[bone.name] = bone;
      // Capture the bind/rest orientation. The procedural animations apply rotations
      // as deltas ON TOP of this rest pose (Mixamo bones have non-zero rest rotations,
      // unlike the old mannequin which rested at identity). See _resetBones / _rot.
      bone.userData.restQuat = bone.quaternion.clone();
    });
    if (bones['Root']) {
      bones['Root'].userData.restPos = bones['Root'].position.clone();
    }

    // three.js GLTFLoader strips '.' from node names (UpperArm.L -> UpperArmL),
    // but the procedural animation code references the dotted names. Alias the
    // dotted keys to the actual de-dotted bones so all lookups resolve.
    const DOT_ALIASES = {
      'Shoulder.L': 'ShoulderL', 'Shoulder.R': 'ShoulderR',
      'UpperArm.L': 'UpperArmL', 'UpperArm.R': 'UpperArmR',
      'ForeArm.L': 'ForeArmL', 'ForeArm.R': 'ForeArmR',
      'Hand.L': 'HandL', 'Hand.R': 'HandR',
      'Thigh.L': 'ThighL', 'Thigh.R': 'ThighR',
      'Shin.L': 'ShinL', 'Shin.R': 'ShinR',
      'Foot.L': 'FootL', 'Foot.R': 'FootR',
    };
    Object.entries(DOT_ALIASES).forEach(([dotted, actual]) => {
      if (!bones[dotted] && bones[actual]) bones[dotted] = bones[actual];
    });

    // Compose arms-down (and any other) corrections into the captured rest pose.
    this.restOffsets.forEach(([name, axis, angle]) => {
      const bone = bones[name];
      if (!bone || !bone.userData.restQuat) return;
      const e = new THREE.Euler(axis === 'x' ? angle : 0, axis === 'y' ? angle : 0, axis === 'z' ? angle : 0);
      const q = new THREE.Quaternion().setFromEuler(e);
      bone.userData.restQuat.multiply(q);
      bone.quaternion.copy(bone.userData.restQuat);
    });

    // No scaling — model is built at 1.8m in Blender, exported 1:1

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
    // Restore each bone to its captured rest orientation (NOT identity — Mixamo
    // bones rest at non-zero rotations). Animations layer deltas on top via _rot.
    Object.values(bones).forEach(bone => {
      if (bone.userData.restQuat) {
        bone.quaternion.copy(bone.userData.restQuat);
      } else {
        bone.rotation.set(0, 0, 0);
      }
    });

    if (bones['Root']) {
      if (bones['Root'].userData.restPos) {
        bones['Root'].position.copy(bones['Root'].userData.restPos);
      } else {
        bones['Root'].position.set(0, 0, 0);
      }
    }
  }

  /**
   * Apply a rotation delta about a bone's LOCAL axis, on top of its current
   * (rest) orientation. This replaces the old `bone.rotation.axis = v` absolute
   * sets so animations compose correctly with non-identity Mixamo rest poses.
   * Same-axis calls compose additively (so `= a` then `+= b` becomes two _rot calls).
   */
  _rot(bone, axis, angle) {
    if (!bone) return;
    if (!this._rotE) {
      this._rotE = new this.THREE.Euler();
      this._rotQ = new this.THREE.Quaternion();
    }
    this._rotE.set(axis === 'x' ? angle : 0, axis === 'y' ? angle : 0, axis === 'z' ? angle : 0);
    this._rotQ.setFromEuler(this._rotE);
    bone.quaternion.multiply(this._rotQ);
  }

  /** Set Root vertical offset relative to its rest hip height (crouch/bob). */
  _rootY(bones, offset) {
    const root = bones['Root'];
    if (!root) return;
    const base = root.userData.restPos ? root.userData.restPos.y : 0;
    root.position.y = base + offset;
  }

  /**
   * STATE 1: IDLE
   * Subtle breathing animation on chest
   */
  _animateIdle(bones, time) {
    const breathFreq = 0.3; // Slow breathing
    const breathAmp = 0.02;
    const breathCycle = Math.sin(time * breathFreq * Math.PI * 2);

    this._rot(bones['Chest'], 'x', breathCycle * breathAmp);
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
    this._rot(bones['Thigh.L'], 'x', Math.sin(t) * legAmp);
    this._rot(bones['Thigh.R'], 'x', Math.sin(t + Math.PI) * legAmp);
    this._rot(bones['Shin.L'], 'x', -Math.abs(Math.sin(t)) * legAmp * 0.8);
    this._rot(bones['Shin.R'], 'x', -Math.abs(Math.sin(t + Math.PI)) * legAmp * 0.8);

    // Arms swing opposite to legs
    this._rot(bones['UpperArm.L'], 'x', Math.sin(t + Math.PI) * armAmp);
    this._rot(bones['UpperArm.R'], 'x', Math.sin(t) * armAmp);

    // Body bob (vertical)
    this._rootY(bones, Math.abs(Math.sin(t * 2)) * bobAmp);

    // Chest twist (counter-rotates with leg swing)
    this._rot(bones['Chest'], 'y', Math.sin(t) * twistAmp);
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
    this._rot(bones['Spine'], 'z', leanAmount);

    // Side-step shuffle (reduced arm swing)
    this._rot(bones['Thigh.L'], 'x', Math.sin(t) * 0.25);
    this._rot(bones['Thigh.R'], 'x', Math.sin(t + Math.PI) * 0.25);

    // Minimal arm swing during strafe
    this._rot(bones['UpperArm.L'], 'x', Math.sin(t + Math.PI) * 0.15);
    this._rot(bones['UpperArm.R'], 'x', Math.sin(t) * 0.15);
  }

  /**
   * STATE 4: JUMP
   * Tuck legs, arms slightly out
   */
  _animateJump(bones, velocity) {
    // Tuck legs (bend thighs up, shins more)
    this._rot(bones['Thigh.L'], 'x', 0.4);
    this._rot(bones['Thigh.R'], 'x', 0.4);
    this._rot(bones['Shin.L'], 'x', -0.5);
    this._rot(bones['Shin.R'], 'x', -0.5);

    // Arms slightly out for balance
    this._rot(bones['UpperArm.L'], 'z', 0.2);
    this._rot(bones['UpperArm.R'], 'z', -0.2);
  }

  /**
   * STATE 5: CROUCH
   * Lower root, bend legs more. If moving, run at 60% amplitude.
   */
  _animateCrouch(bones, speed, time) {
    // Lower root position
    this._rootY(bones, -0.3);

    // Bend legs (thighs and shins)
    this._rot(bones['Thigh.L'], 'x', -0.6);
    this._rot(bones['Thigh.R'], 'x', -0.6);
    this._rot(bones['Shin.L'], 'x', -0.8);
    this._rot(bones['Shin.R'], 'x', -0.8);

    // If moving while crouching, add walk cycle at reduced amplitude
    if (speed >= 0.5) {
      const freq = speed * 1.2;
      const t = time * freq * Math.PI * 2;
      const amp = 0.6; // 60% of normal run amplitude

      // Leg swing on top of crouch bend (same-axis _rot composes additively)
      this._rot(bones['Thigh.L'], 'x', Math.sin(t) * 0.3 * amp);
      this._rot(bones['Thigh.R'], 'x', Math.sin(t + Math.PI) * 0.3 * amp);

      // Arm swing
      this._rot(bones['UpperArm.L'], 'x', Math.sin(t + Math.PI) * 0.25 * amp);
      this._rot(bones['UpperArm.R'], 'x', Math.sin(t) * 0.25 * amp);
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
    this._rot(bones['UpperArm.R'], 'x', -recoil * 0.15);
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
    this._rot(bones['UpperArm.L'], 'y', cycle * 0.8);
    this._rot(bones['UpperArm.L'], 'z', cycle * 0.5);

    // Right arm lowers slightly
    this._rot(bones['UpperArm.R'], 'x', cycle * 0.3);
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
      this._rot(bones['UpperArm.R'], 'x', -windupT * 0.6);
      this._rot(bones['UpperArm.R'], 'y', -windupT * 0.4);
    } else if (t < 0.75) {
      // Slash: fast forward swing
      const slashT = (t - 0.5) / 0.25;
      this._rot(bones['UpperArm.R'], 'x', -0.6 + slashT * 1.2); // -0.6 to +0.6
      this._rot(bones['UpperArm.R'], 'y', -0.4 + slashT * 0.8); // -0.4 to +0.4
    } else {
      // Recover: return to neutral
      const recoverT = (t - 0.75) / 0.25;
      this._rot(bones['UpperArm.R'], 'x', 0.6 * (1 - recoverT));
      this._rot(bones['UpperArm.R'], 'y', 0.4 * (1 - recoverT));
    }
  }
}
