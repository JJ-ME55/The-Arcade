/**
 * FirstPersonWeapon - Manages the first-person weapon view with separate scene and camera
 *
 * Features:
 * - Two-pass rendering (prevents wall clipping via depth clearing)
 * - Gun bob synced to movement speed
 * - Visual recoil on fire with spring-back
 * - Muzzle flash sprite with procedural texture
 * - Weapon switching (rifle, pistol, knife)
 * - Team color customization for FP arms
 */

export class FirstPersonWeapon {
  constructor(THREE, renderer) {
    this.THREE = THREE;
    this.renderer = renderer;

    // Weapon scene (separate from world scene)
    this.weaponScene = new THREE.Scene();

    // Weapon camera (near=0.01, far=2.0 for close-up weapon view only)
    const aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera = new THREE.PerspectiveCamera(75, aspect, 0.01, 2.0);

    // Track loaded assets
    this.fpArmsModel = null;
    this.handRBone = null;
    this.weaponModels = {}; // { rifle: Model, pistol: Model, knife: Model }
    this.currentWeaponName = null;
    this.currentWeaponModel = null;

    // Visual state
    this.weaponGroup = null; // Parent group holding FP arms (positioned relative to camera)
    this.bobTime = 0;
    this.bobOffset = new THREE.Vector3(0, 0, 0);
    this.recoilOffset = 0; // 0-1, springs back to 0
    this.muzzleFlash = null;
    this.flashTimer = 0;

    // Weapon-specific offsets (tuned for Hand.R bone attachment)
    // Weapons built along X-axis in Blender, need -90deg Y rotation to point forward (-Z)
    this.weaponOffsets = {
      rifle:  { pos: [0, 0, -0.15], rot: [0, -Math.PI/2, 0] },
      pistol: { pos: [0, 0, -0.08], rot: [0, -Math.PI/2, 0] },
      knife:  { pos: [0, 0, -0.05], rot: [Math.PI/2, -Math.PI/2, 0] },
    };

    // Reload animation state
    this.reloadAnim = null; // { keyframes, time, duration, ammoRefillTime }

    // CS:S-style reload keyframes: [time(0-1), posOffset(x,y,z), rotOffset(x,y,z)]
    // Positions/rotations are offsets from the idle weapon group position
    this.reloadKeyframes = {
      rifle: {
        tactical: [  // 2.5s - mag still has rounds, no bolt pull
          { t: 0.00, pos: [0, 0, 0],          rot: [0, 0, 0] },
          { t: 0.15, pos: [0.08, -0.2, 0.02], rot: [-0.1, 0.05, -0.3] },  // Lower + tilt left
          { t: 0.28, pos: [0.08, -0.28, 0.02],rot: [-0.1, 0.05, -0.35] }, // Mag out
          { t: 0.50, pos: [0.08, -0.22, 0],   rot: [-0.05, 0.03, -0.3] }, // Mag in
          { t: 0.75, pos: [0.04, -0.08, 0],   rot: [0, 0, -0.1] },        // Rising
          { t: 1.00, pos: [0, 0, 0],          rot: [0, 0, 0] },            // Ready
        ],
        empty: [  // 3.1s - empty mag, bolt pull needed
          { t: 0.00, pos: [0, 0, 0],          rot: [0, 0, 0] },
          { t: 0.12, pos: [0.08, -0.2, 0.02], rot: [-0.1, 0.05, -0.3] },
          { t: 0.22, pos: [0.08, -0.28, 0.02],rot: [-0.1, 0.05, -0.35] },
          { t: 0.42, pos: [0.08, -0.22, 0],   rot: [-0.05, 0.03, -0.3] }, // Mag in
          { t: 0.52, pos: [0.06, -0.18, -0.08],rot: [-0.08, 0.02, -0.25]},// Bolt pull back
          { t: 0.58, pos: [0.08, -0.2, 0.02], rot: [-0.05, 0.03, -0.28]}, // Bolt snap forward
          { t: 0.78, pos: [0.04, -0.08, 0],   rot: [0, 0, -0.1] },
          { t: 1.00, pos: [0, 0, 0],          rot: [0, 0, 0] },
        ],
        tacticalTime: 2.5,
        emptyTime: 3.1,
        ammoRefillAt: 0.50, // Ammo updates at 50% through animation
      },
      pistol: {
        tactical: [
          { t: 0.00, pos: [0, 0, 0],           rot: [0, 0, 0] },
          { t: 0.20, pos: [0.12, -0.3, 0.02],  rot: [-0.15, 0.08, -0.45] }, // Lower more
          { t: 0.32, pos: [0.12, -0.35, 0.02], rot: [-0.15, 0.08, -0.5] },  // Mag out
          { t: 0.55, pos: [0.12, -0.28, 0],    rot: [-0.1, 0.05, -0.42] },  // Mag slap in
          { t: 0.78, pos: [0.04, -0.08, 0],    rot: [0, 0, -0.15] },
          { t: 1.00, pos: [0, 0, 0],           rot: [0, 0, 0] },
        ],
        empty: [
          { t: 0.00, pos: [0, 0, 0],           rot: [0, 0, 0] },
          { t: 0.18, pos: [0.12, -0.3, 0.02],  rot: [-0.15, 0.08, -0.45] },
          { t: 0.28, pos: [0.12, -0.35, 0.02], rot: [-0.15, 0.08, -0.5] },
          { t: 0.48, pos: [0.12, -0.28, 0],    rot: [-0.1, 0.05, -0.42] },  // Mag in
          { t: 0.58, pos: [0.08, -0.22, -0.12],rot: [-0.12, 0.04, -0.4] },  // Slide pull
          { t: 0.65, pos: [0.12, -0.26, 0.02], rot: [-0.08, 0.06, -0.42] }, // Slide snap
          { t: 0.82, pos: [0.04, -0.08, 0],    rot: [0, 0, -0.15] },
          { t: 1.00, pos: [0, 0, 0],           rot: [0, 0, 0] },
        ],
        tacticalTime: 1.5,
        emptyTime: 2.2,
        ammoRefillAt: 0.50,
      },
    };

    // Lighting for weapon scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.weaponScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(1, 1, 1);
    this.weaponScene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
      this.weaponCamera.updateProjectionMatrix();
    });
  }

  /**
   * Load FP arms and weapon models
   * @param {string} armsUrl - Path to fp_arms.glb
   * @param {Object} weaponUrls - { rifle: 'rifle.glb', pistol: 'pistol.glb', knife: 'knife.glb' }
   */
  async load(armsUrl, weaponUrls) {
    const THREE = this.THREE;
    const loader = new (await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader();

    // Load FP arms
    console.log('Loading FP arms...');
    const armsGltf = await loader.loadAsync(armsUrl);
    this.fpArmsModel = armsGltf.scene;

    // Find Hand.R bone for weapon attachment
    this.handRBone = null;
    this.fpArmsModel.traverse((obj) => {
      if (obj.isBone && obj.name === 'Hand.R') {
        this.handRBone = obj;
      }
    });

    // Fallback: try getObjectByName
    if (!this.handRBone) {
      this.handRBone = this.fpArmsModel.getObjectByName('Hand.R');
    }

    if (!this.handRBone) {
      console.error('Hand.R bone not found in fp_arms.glb -- check bone names');
      console.log('Available bones:');
      this.fpArmsModel.traverse((obj) => {
        if (obj.isBone) console.log('  -', obj.name);
      });
    } else {
      console.log('Hand.R bone found:', this.handRBone.name);
    }

    // Create weapon group and position in bottom-right of view
    // Must be child of weaponCamera so it follows camera rotation
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0.15, -0.15, -0.35);
    this.weaponGroup.add(this.fpArmsModel);
    this.weaponCamera.add(this.weaponGroup);
    this.weaponScene.add(this.weaponCamera);

    // Load weapon models
    console.log('Loading weapons...');
    for (const [name, url] of Object.entries(weaponUrls)) {
      const weaponGltf = await loader.loadAsync(url);
      this.weaponModels[name] = weaponGltf.scene;
      console.log(`Loaded weapon: ${name}`);
    }

    // Create muzzle flash sprite
    this._createMuzzleFlash();

    console.log('FirstPersonWeapon loaded successfully');
  }

  /**
   * Create procedural muzzle flash sprite
   */
  _createMuzzleFlash() {
    const THREE = this.THREE;

    // Procedural radial gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const flashTexture = new THREE.CanvasTexture(canvas);

    const flashMaterial = new THREE.SpriteMaterial({
      map: flashTexture,
      blending: THREE.AdditiveBlending,
      color: 0xffaa44,
      transparent: true,
      depthTest: false,
    });

    this.muzzleFlash = new THREE.Sprite(flashMaterial);
    this.muzzleFlash.scale.set(0.12, 0.12, 1);
    this.muzzleFlash.visible = false;

    // Position at muzzle (relative to weapon model, will be adjusted per weapon)
    this.weaponGroup.add(this.muzzleFlash);
  }

  /**
   * Switch to a different weapon
   * @param {string} name - 'rifle', 'pistol', or 'knife'
   */
  switchWeapon(name) {
    if (!this.weaponModels[name]) {
      console.error(`Weapon '${name}' not loaded`);
      return;
    }

    // Remove previous weapon from Hand.R bone
    if (this.currentWeaponModel && this.handRBone) {
      this.handRBone.remove(this.currentWeaponModel);
    }

    // Get new weapon model
    const weaponModel = this.weaponModels[name];

    // Apply weapon-specific offset
    const offset = this.weaponOffsets[name];
    weaponModel.position.set(...offset.pos);
    weaponModel.rotation.set(...offset.rot);

    // Attach to Hand.R bone
    if (this.handRBone) {
      this.handRBone.add(weaponModel);
    } else {
      console.warn('Hand.R bone not found, adding weapon to weapon group directly');
      this.weaponGroup.add(weaponModel);
    }

    this.currentWeaponName = name;
    this.currentWeaponModel = weaponModel;

    // Position muzzle flash based on weapon
    this._updateMuzzleFlashPosition(name);

    console.log(`Switched to weapon: ${name}`);
  }

  /**
   * Update muzzle flash position based on current weapon
   */
  _updateMuzzleFlashPosition(weaponName) {
    if (!this.muzzleFlash) return;

    // Muzzle positions (relative to weaponGroup, barrel end along -Z forward)
    const muzzlePositions = {
      rifle:  [0, -0.04, -0.55],
      pistol: [0, -0.02, -0.40],
      knife:  [0, 0, 0],
    };

    const pos = muzzlePositions[weaponName] || [0, 0, -0.5];
    this.muzzleFlash.position.set(...pos);
  }

  /**
   * Update weapon animation (bob, recoil, muzzle flash)
   * @param {number} dt - Delta time in seconds
   * @param {Object} state - { speed, onGround, crouching }
   */
  update(dt, state) {
    const THREE = this.THREE;

    // Smooth speed to prevent bob jitter from frame-to-frame speed fluctuation
    if (!this._smoothSpeed) this._smoothSpeed = 0;
    const targetSpeed = (state.onGround && state.speed > 0.5) ? state.speed : 0;
    this._smoothSpeed += (targetSpeed - this._smoothSpeed) * Math.min(1, dt * 8);

    // Gun bob (smooth sinusoidal, driven by smoothed speed)
    if (this._smoothSpeed > 0.3) {
      this.bobTime += dt * 5.0; // Constant bob frequency
      const amp = Math.min(this._smoothSpeed / 5.0, 1.0);
      const bobX = Math.sin(this.bobTime) * 0.004 * amp;
      const bobY = Math.abs(Math.sin(this.bobTime * 2)) * 0.003 * amp;
      this.bobOffset.set(bobX, bobY, 0);
    } else {
      this.bobOffset.multiplyScalar(0.85);
      if (this.bobOffset.lengthSq() < 0.000001) {
        this.bobOffset.set(0, 0, 0);
        this.bobTime = 0;
      }
    }

    // Recoil spring-back (slower decay = more visible kick)
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - 5.0 * dt);
    }

    // Apply bob + recoil to weapon group
    if (this.weaponGroup) {
      // Hip-fire position (bottom-right) vs ADS position (centered)
      const hipPos = new THREE.Vector3(0.15, -0.15, -0.35);
      const adsPos = new THREE.Vector3(0.0, -0.12, -0.30);
      const aiming = state.aiming ? 1 : 0;

      // Smooth ADS transition
      if (!this._adsBlend) this._adsBlend = 0;
      this._adsBlend += (aiming - this._adsBlend) * Math.min(1, dt * 12);

      const basePos = hipPos.lerp(adsPos, this._adsBlend);

      // Bob offset (reduced when aiming)
      const bobScale = 1 - this._adsBlend * 0.8;
      basePos.add(this.bobOffset.clone().multiplyScalar(bobScale));

      // Recoil offset (reduced when aiming)
      const recoilScale = 1 - this._adsBlend * 0.5;
      const recoilZ = this.recoilOffset * 0.15 * recoilScale;
      basePos.z += recoilZ;

      // Reload animation offset
      let reloadRotX = 0, reloadRotY = 0, reloadRotZ = 0;
      if (this.reloadAnim) {
        this.reloadAnim.time += dt;
        const progress = Math.min(this.reloadAnim.time / this.reloadAnim.duration, 1);

        // Trigger ammo refill at mid-point
        if (!this.reloadAnim.ammoRefilled && this.reloadAnim.time >= this.reloadAnim.ammoRefillAt) {
          this.reloadAnim.ammoRefilled = true;
          if (this.reloadAnim.onAmmoRefill) this.reloadAnim.onAmmoRefill();
        }

        // Sample keyframes
        const sample = this._sampleReloadKeyframes(this.reloadAnim.keyframes, progress);
        basePos.x += sample.pos[0];
        basePos.y += sample.pos[1];
        basePos.z += sample.pos[2];
        reloadRotX = sample.rot[0];
        reloadRotY = sample.rot[1];
        reloadRotZ = sample.rot[2];

        // Complete
        if (progress >= 1) {
          if (this.reloadAnim.onComplete) this.reloadAnim.onComplete();
          this.reloadAnim = null;
        }
      }

      this.weaponGroup.position.copy(basePos);

      // Combined rotation: recoil + reload
      const recoilRotX = this.recoilOffset * 0.25 * recoilScale;
      this.weaponGroup.rotation.set(
        recoilRotX + reloadRotX,
        reloadRotY,
        reloadRotZ
      );
    }

    // Muzzle flash timer
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.muzzleFlash.visible = false;
      }
    }
  }

  /**
   * Start reload animation
   * @param {boolean} isEmpty - True if magazine was fully emptied (bolt pull / slide rack)
   * @param {Function} onAmmoRefill - Called when ammo should update (mid-animation)
   * @param {Function} onComplete - Called when reload animation finishes
   */
  startReload(isEmpty, onAmmoRefill, onComplete) {
    const weaponName = this.currentWeaponName;
    const kfData = this.reloadKeyframes[weaponName];
    if (!kfData) return;

    const type = isEmpty ? 'empty' : 'tactical';
    const keyframes = kfData[type];
    const duration = isEmpty ? kfData.emptyTime : kfData.tacticalTime;

    this.reloadAnim = {
      keyframes,
      duration,
      time: 0,
      ammoRefillAt: kfData.ammoRefillAt * duration,
      ammoRefilled: false,
      onAmmoRefill,
      onComplete,
    };
  }

  /**
   * Cancel reload animation (e.g., weapon switch)
   */
  cancelReload() {
    this.reloadAnim = null;
  }

  /**
   * Check if currently in reload animation
   */
  isReloading() {
    return this.reloadAnim !== null;
  }

  /**
   * Interpolate between reload keyframes using smoothstep
   */
  _sampleReloadKeyframes(keyframes, t) {
    // Find surrounding keyframes
    let a = keyframes[0], b = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        a = keyframes[i];
        b = keyframes[i + 1];
        break;
      }
    }

    // Normalized progress between the two keyframes
    const range = b.t - a.t;
    const local = range > 0 ? (t - a.t) / range : 1;
    // Smoothstep for natural easing
    const s = local * local * (3 - 2 * local);

    return {
      pos: [
        a.pos[0] + (b.pos[0] - a.pos[0]) * s,
        a.pos[1] + (b.pos[1] - a.pos[1]) * s,
        a.pos[2] + (b.pos[2] - a.pos[2]) * s,
      ],
      rot: [
        a.rot[0] + (b.rot[0] - a.rot[0]) * s,
        a.rot[1] + (b.rot[1] - a.rot[1]) * s,
        a.rot[2] + (b.rot[2] - a.rot[2]) * s,
      ],
    };
  }

  /**
   * Trigger fire effect (recoil + muzzle flash)
   */
  fire() {
    // Don't fire during weapon switch or if no weapon loaded
    if (!this.currentWeaponName) return;

    // Knife doesn't have recoil or muzzle flash, just a slash motion (future task)
    if (this.currentWeaponName === 'knife') {
      console.log('Knife slash (future: add slash animation)');
      return;
    }

    // Instant recoil kick
    this.recoilOffset = 1.0;

    // Show muzzle flash for 50ms
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = true;
      this.muzzleFlash.material.rotation = Math.random() * Math.PI * 2; // Random rotation
      this.flashTimer = 0.05; // 50ms
    }

    console.log(`Fired ${this.currentWeaponName}`);
  }

  /**
   * Render the weapon scene (two-pass rendering)
   * @param {THREE.Quaternion} mainCameraQuaternion - Main camera's quaternion for syncing
   */
  render(mainCameraQuaternion) {
    // Sync weapon camera rotation with main camera
    this.weaponCamera.quaternion.copy(mainCameraQuaternion);

    // Clear depth buffer (keeps color, weapon renders on top)
    this.renderer.clearDepth();

    // Render weapon scene
    this.renderer.render(this.weaponScene, this.weaponCamera);
  }

  /**
   * Set team color on FP arms
   * @param {number} hex - Color hex value (e.g., 0xff0000 for red)
   */
  setTeamColor(hex) {
    const THREE = this.THREE;

    if (!this.fpArmsModel) {
      console.warn('FP arms not loaded yet');
      return;
    }

    this.fpArmsModel.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        // Clone material if shared (prevents affecting other instances)
        if (!obj.material.userData.cloned) {
          obj.material = obj.material.clone();
          obj.material.userData.cloned = true;
        }
        obj.material.color.setHex(hex);
      }
    });

    console.log(`Set FP arms team color to: #${hex.toString(16)}`);
  }
}
