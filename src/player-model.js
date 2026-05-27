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

    // Arm pose corrections (radians), tuned in-engine and baked as defaults.
    this.ikRoll = 0.20;          // front upper arm roll about its axis
    this.ikForeRoll = 1.00;      // front forearm roll about its axis
    this.ikBackRoll = 1.40;      // back (right) wrist roll — gun pinned so it doesn't move
    this.ikBackUpperRoll = 6.30; // back (right) upper-arm roll (like [ ] on the front)
    this.ikBackSwing = -0.40;    // back (right) upper-arm swing side-to-side (about world Y)
  }

  /**
   * Load mannequin GLB file
   * @param {string} url - Path to mannequin_neutral.glb
   */
  async load(url) {
    console.log(`Loading mannequin from ${url}...`);
    const gltf = await this.loader.loadAsync(url);

    this.sourceScene = gltf.scene;
    // Baked mocap locomotion clips (Idle/Walk/Run) shipped in soldier.glb. These
    // drive natural locomotion; procedural code is reserved for combat overlays.
    this.sourceAnimations = gltf.animations || [];
    console.log(`Mannequin animations: [${this.sourceAnimations.map((a) => a.name).join(', ')}]`);

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

        // Team colour, but realistic (like the key art): keep the texture + normals
        // so gear detail shows, and let scene lighting do the shading (PBR). The old
        // flat 0.18 emissive lit the whole body uniformly, killing all shadow/
        // highlight and making the soldier read as one solid block. Now: tint the
        // base colour (deepened so it looks like dyed gear, not neon), matte fabric
        // material, and only a whisper of emissive for distance readability.
        child.material = child.material.clone();
        // Deep base colour (darker = highlights/shadows pop = less flat), shaded
        // purely by scene lighting — no emissive glow flattening it.
        child.material.color.copy(new THREE.Color(teamColor).multiplyScalar(0.55));
        child.material.emissive = new THREE.Color(teamColor);
        child.material.emissiveIntensity = 0.0;
        if (child.material.metalness !== undefined) child.material.metalness = 0.15;
        if (child.material.roughness !== undefined) child.material.roughness = 0.8;
        child.material.needsUpdate = true;
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

    // Arms-down rest offset only matters for the procedural fallback (no clips).
    // When baked locomotion clips drive the pose, they define arm position.
    const hasClips = this.sourceAnimations && this.sourceAnimations.length > 0;
    if (!hasClips) {
      this.restOffsets.forEach(([name, axis, angle]) => {
        const bone = bones[name];
        if (!bone || !bone.userData.restQuat) return;
        const e = new THREE.Euler(axis === 'x' ? angle : 0, axis === 'y' ? angle : 0, axis === 'z' ? angle : 0);
        const q = new THREE.Quaternion().setFromEuler(e);
        bone.userData.restQuat.multiply(q);
        bone.quaternion.copy(bone.userData.restQuat);
      });
    }

    // Baked-clip locomotion: one AnimationMixer per instance, idle/walk/run actions
    // played simultaneously with speed-blended weights (CS-style locomotion).
    let mixer = null;
    const actions = {};
    if (hasClips) {
      mixer = new THREE.AnimationMixer(clonedScene);
      // Unarmed locomotion + armed (rifle) locomotion + directional + action clips.
      const wanted = [
        'Idle', 'Walk', 'Run',
        'Rifle_Idle', 'Rifle_Walk', 'Rifle_Run',
        'Rifle_WalkBack', 'Rifle_RunBack', 'Rifle_StrafeL', 'Rifle_StrafeR',
        'Reload', 'Fire', 'Rifle_Jump',
      ];
      wanted.forEach((clipName) => {
        const clip = this.sourceAnimations.find((c) => c.name === clipName);
        if (!clip) return;
        const action = mixer.clipAction(clip);
        action.enabled = true;
        action.setEffectiveWeight(0);
        action.play();
        actions[clipName] = action;
      });
      if (actions['Idle']) actions['Idle'].setEffectiveWeight(1);
    }

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
      mixer,
      actions,
      armed: false, // set true when a weapon is attached -> use rifle clips
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
    const { bones, mixer, actions } = instance;
    const { velocity, onGround, crouching, time, shooting, reloading, knifing } = state;

    // Calculate speed from velocity
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    // ---------- Baked-clip locomotion (CS-style) + procedural combat overlays ----------
    if (mixer && (actions.Idle || actions.Rifle_Idle)) {
      this._blendLocomotion(instance, velocity, onGround, speed);
      mixer.update(dt);

      // Keep locomotion in-place: clips may carry root translation; pin Root
      // horizontally (world position is driven externally via scene.position).
      const root = bones['Root'];
      if (root && root.userData.restPos) {
        root.position.x = root.userData.restPos.x;
        root.position.z = root.userData.restPos.z;
      }

      // Procedural overlays on top of the clip pose (additive via _rot).
      if (!onGround) {
        this._animateJump(bones, velocity);
      } else if (crouching) {
        this._animateCrouch(bones, speed, time);
      }
      if (shooting) instance.shootTime = 0;
      if (instance.shootTime < 0.1) { this._animateShooting(bones, instance.shootTime); instance.shootTime += dt; }
      if (reloading) instance.reloadTime = 0;
      if (instance.reloadTime < 2.0) { this._animateReload(bones, instance.reloadTime); instance.reloadTime += dt; }
      if (knifing) instance.knifeTime = 0;
      if (instance.knifeTime < 0.4) { this._animateKnife(bones, instance.knifeTime); instance.knifeTime += dt; }

      // FRONT (left) arm roll corrections on top of the mocap hold. [ ] = upper
      // arm, ; ' = forearm. Arm stays where the mocap puts it; this only rolls.
      if (instance.armed) {
        instance.scene.updateMatrixWorld(true);
        if (this.ikRoll) this._rollBone(bones['UpperArm.L'], bones['ForeArm.L'], this.ikRoll);
        if (this.ikForeRoll) this._rollBone(bones['ForeArm.L'], bones['Hand.L'], this.ikForeRoll);
        // Back (right) wrist roll: rolls the visible hand but pins the rifle's
        // world transform so the gun does NOT move with it.
        if ((this.ikBackRoll || this.ikBackUpperRoll || this.ikBackSwing) && instance.tpWeapon) this._rollBackHandPinGun(instance, bones);
      }

      instance.animTime += dt;
      return;
    }

    // ---------- Fallback: fully procedural (no baked clips) ----------
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

  /**
   * Aim a bone so its child-direction points at a world target. Direction-only
   * (ignores roll), so it's robust to the rig's rest/bone-roll convention.
   */
  /**
   * Roll the right wrist (Hand.R) about the forearm axis, then restore the rifle's
   * world position+orientation so the gun stays put while only the hand turns.
   */
  _rollBackHandPinGun(instance, bones) {
    const THREE = this.THREE;
    const hr = bones['Hand.R'], fr = bones['ForeArm.R'], ur = bones['UpperArm.R'];
    const gun = instance.tpWeapon;
    if (!hr || !fr || !gun) return;
    // Reset the gun to its original grip first (prevents per-frame drift/spin),
    // then capture the INTENDED world transform from the mocap-posed hand.
    if (instance.gunRestPos) gun.position.copy(instance.gunRestPos);
    if (instance.gunRestQuat) gun.quaternion.copy(instance.gunRestQuat);
    gun.updateMatrixWorld(true);
    const gunPos = gun.getWorldPosition(new THREE.Vector3());
    const gunQuat = gun.getWorldQuaternion(new THREE.Quaternion());

    // Back upper-arm side-to-side swing (rotate about world Y at the shoulder).
    if (this.ikBackSwing && ur) {
      const yq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.ikBackSwing);
      const urWorld = ur.getWorldQuaternion(new THREE.Quaternion());
      const urParentInv = ur.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      ur.quaternion.copy(urParentInv.multiply(yq.multiply(urWorld)));
      ur.updateMatrixWorld(true);
    }
    // Back UPPER-arm roll (equivalent of [ ] on the front).
    if (this.ikBackUpperRoll && ur) this._rollBone(ur, fr, this.ikBackUpperRoll);
    // Wrist roll: roll Hand.R about the forearm->hand world axis.
    if (this.ikBackRoll) {
      const axis = hr.getWorldPosition(new THREE.Vector3())
        .sub(fr.getWorldPosition(new THREE.Vector3())).normalize();
      if (axis.lengthSq() > 1e-9) {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, this.ikBackRoll);
        const hrWorld = hr.getWorldQuaternion(new THREE.Quaternion());
        const hrParentInv = hr.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        hr.quaternion.copy(hrParentInv.multiply(q.multiply(hrWorld)));
        hr.updateMatrixWorld(true);
      }
    }

    // Restore the gun's world transform (it's a child of Hand.R, so it moved).
    hr.updateMatrixWorld(true);
    gun.quaternion.copy(hr.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(gunQuat));
    gun.position.copy(hr.worldToLocal(gunPos));
    gun.updateMatrixWorld(true);
  }

  /** Roll a bone about its own (child-direction) axis by `angle` radians, world-space. */
  _rollBone(bone, childBone, angle) {
    if (!angle) return;
    const THREE = this.THREE;
    const bp = bone.getWorldPosition(new THREE.Vector3());
    const cp = childBone.getWorldPosition(new THREE.Vector3());
    const axis = cp.sub(bp).normalize();
    if (axis.lengthSq() < 1e-9) return;
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const bw = bone.getWorldQuaternion(new THREE.Quaternion());
    const newWorld = q.multiply(bw);
    const pwInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pwInv.multiply(newWorld));
    bone.updateMatrixWorld(true);
  }

  _aimBone(bone, childBone, targetWorld) {
    const THREE = this.THREE;
    const bp = bone.getWorldPosition(new THREE.Vector3());
    const cp = childBone.getWorldPosition(new THREE.Vector3());
    const cur = cp.sub(bp).normalize();
    const des = targetWorld.clone().sub(bp).normalize();
    if (cur.lengthSq() < 1e-9 || des.lengthSq() < 1e-9) return;
    const delta = new THREE.Quaternion().setFromUnitVectors(cur, des);
    const bw = bone.getWorldQuaternion(new THREE.Quaternion());
    const newWorld = delta.multiply(bw);
    const pwInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(pwInv.multiply(newWorld));
    bone.updateMatrixWorld(true);
  }

  /**
   * 2-bone IK: rotate UpperArm.L + ForeArm.L so Hand.L reaches the rifle foregrip
   * target (instance.leftHandTarget, an Object3D on the weapon). Analytic elbow
   * placement with a downward pole; aims each bone via _aimBone.
   */
  _solveLeftHandIK(instance) {
    const THREE = this.THREE;
    const b = instance.bones;
    const up = b['UpperArm.L'], fore = b['ForeArm.L'], hand = b['Hand.L'];
    const target = instance.leftHandTarget;
    if (!up || !fore || !hand || !target) return;

    instance.scene.updateMatrixWorld(true);
    const root = up.getWorldPosition(new THREE.Vector3());
    const elbow = fore.getWorldPosition(new THREE.Vector3());
    const wrist = hand.getWorldPosition(new THREE.Vector3());
    const tgt = target.getWorldPosition(new THREE.Vector3());

    const L1 = elbow.distanceTo(root);
    const L2 = wrist.distanceTo(elbow);
    if (!PlayerModel._ikLogged) {
      PlayerModel._ikLogged = true;
      const r = tgt.clone().sub(root);
      const f = (v) => v.toFixed(2);
      console.log(`[IK] shoulder=(${f(root.x)},${f(root.y)},${f(root.z)}) target=(${f(tgt.x)},${f(tgt.y)},${f(tgt.z)}) rel=(${f(r.x)},${f(r.y)},${f(r.z)}) | reach=${f(L1 + L2)} need=${f(r.length())} (model faces -Z; want rel.z<0 fwd, rel.y near 0)`);
    }
    const toT = tgt.clone().sub(root);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(L1 - L2) + 1e-4, L1 + L2 - 1e-4);
    const dir = toT.normalize();

    // Elbow pole: roughly down + toward body so the arm bends naturally.
    const pole = (instance._ikPole || (instance._ikPole = new THREE.Vector3(0, -1, 0)));
    let perp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir)));
    if (perp.lengthSq() < 1e-6) perp = new THREE.Vector3(0, 0, 1).sub(dir.clone().multiplyScalar(dir.z));
    perp.normalize();

    const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
    const angRoot = Math.acos(cosA);
    const elbowPos = root.clone()
      .add(dir.clone().multiplyScalar(Math.cos(angRoot) * L1))
      .add(perp.multiplyScalar(Math.sin(angRoot) * L1));

    this._aimBone(up, fore, elbowPos);
    this._aimBone(fore, hand, tgt);
    // Untwist the wrist IN PLACE (forearm roll about its own axis doesn't move the hand).
    this._rollBone(fore, hand, this.ikForeRoll || 0);
  }

  /**
   * Set locomotion clip weights. Unarmed: idle/walk/run by speed. Armed: a
   * directional blend (forward/back/strafe) of the rifle clips based on movement
   * direction relative to facing, with walk/run by speed. CS-style.
   */
  _blendLocomotion(instance, velocity, onGround, speed) {
    const a = instance.actions;
    const loco = ['Idle', 'Walk', 'Run', 'Rifle_Idle', 'Rifle_Walk', 'Rifle_Run',
      'Rifle_WalkBack', 'Rifle_RunBack', 'Rifle_StrafeL', 'Rifle_StrafeR'];
    loco.forEach((n) => { if (a[n]) a[n].setEffectiveWeight(0); });

    const armed = instance.armed && a.Rifle_Idle;
    const idle = armed ? a.Rifle_Idle : a.Idle;

    // Idle (or airborne -> hold idle; jump overlay handles the air pose)
    if (!onGround || speed < 0.3) { if (idle) idle.setEffectiveWeight(1); return; }

    const WALK_TOP = 1.8, RUN_TOP = 5.0;
    const runF = speed >= RUN_TOP ? 1 : (speed > WALK_TOP ? (speed - WALK_TOP) / (RUN_TOP - WALK_TOP) : 0);
    const moveW = speed >= WALK_TOP ? 1 : Math.min(1, (speed - 0.3) / (WALK_TOP - 0.3));
    if (idle) idle.setEffectiveWeight(1 - moveW);

    if (!armed) {
      if (a.Walk) a.Walk.setEffectiveWeight(moveW * (1 - runF));
      if (a.Run) a.Run.setEffectiveWeight(moveW * runF);
      return;
    }

    // Directional: movement direction in the model's local frame (faces -Z).
    const yaw = instance.scene.rotation.y;
    const c = Math.cos(-yaw), s = Math.sin(-yaw);
    const lx = velocity.x * c - velocity.z * s;
    const lz = velocity.x * s + velocity.z * c;
    const fwd = -lz, right = lx;
    const len = Math.hypot(fwd, right) || 1;
    const nf = fwd / len, nr = right / len;
    const wF = Math.max(0, nf), wB = Math.max(0, -nf), wR = Math.max(0, nr), wL = Math.max(0, -nr);
    const sum = wF + wB + wR + wL || 1;
    const fF = wF / sum, fB = wB / sum, fR = wR / sum, fL = wL / sum;

    if (a.Rifle_Walk) a.Rifle_Walk.setEffectiveWeight(moveW * fF * (1 - runF));
    if (a.Rifle_Run) a.Rifle_Run.setEffectiveWeight(moveW * fF * runF);
    if (a.Rifle_WalkBack) a.Rifle_WalkBack.setEffectiveWeight(moveW * fB * (1 - runF));
    if (a.Rifle_RunBack) a.Rifle_RunBack.setEffectiveWeight(moveW * fB * runF);
    if (a.Rifle_StrafeR) a.Rifle_StrafeR.setEffectiveWeight(moveW * fR);
    if (a.Rifle_StrafeL) a.Rifle_StrafeL.setEffectiveWeight(moveW * fL);
  }

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
