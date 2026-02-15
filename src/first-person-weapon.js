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
    this.weaponOffsets = {
      rifle:  { pos: [0, 0, -0.15], rot: [0, 0, 0] },
      pistol: { pos: [0, 0, -0.08], rot: [0, 0, 0] },
      knife:  { pos: [0, 0, -0.05], rot: [Math.PI/2, 0, 0] },
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
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(0.15, -0.15, -0.35);
    this.weaponGroup.add(this.fpArmsModel);
    this.weaponScene.add(this.weaponGroup);

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

    // Muzzle positions (relative to weaponGroup, approximate barrel end)
    const muzzlePositions = {
      rifle:  [0.15, -0.05, -0.6],
      pistol: [0.15, -0.05, -0.5],
      knife:  [0, 0, 0], // No flash for knife
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

    // Gun bob (only when moving on ground)
    if (state.onGround && state.speed > 0.5) {
      // Faster bob at higher speed
      this.bobTime += dt * state.speed * 1.5;

      const speedFactor = Math.min(state.speed / 4.5, 1.0);
      const bobX = Math.sin(this.bobTime * Math.PI * 2) * 0.008 * speedFactor;
      const bobY = Math.abs(Math.sin(this.bobTime * Math.PI * 2)) * 0.006 * speedFactor;

      this.bobOffset.set(bobX, bobY, 0);
    } else {
      // Smoothly lerp bob back to zero when not moving
      this.bobOffset.lerp(new THREE.Vector3(0, 0, 0), 0.15);
      if (this.bobOffset.lengthSq() < 0.00001) {
        this.bobOffset.set(0, 0, 0);
        this.bobTime = 0;
      }
    }

    // Recoil spring-back
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - 10.0 * dt);
    }

    // Apply bob + recoil to weapon group
    if (this.weaponGroup) {
      // Base position
      const basePos = new THREE.Vector3(0.15, -0.15, -0.35);

      // Bob offset
      basePos.add(this.bobOffset);

      // Recoil offset (push back in Z, rotate up in X)
      const recoilZ = this.recoilOffset * 0.08;
      basePos.z += recoilZ;

      this.weaponGroup.position.copy(basePos);

      // Recoil rotation (kick up)
      const recoilRotX = this.recoilOffset * 0.12;
      this.weaponGroup.rotation.x = recoilRotX;
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
