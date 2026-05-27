// Import engine modules
import { WeaponSystem, WeaponType } from '../src/engine/weapons.js';
import { testHitscan, createHitboxSet, updateHitboxPositions } from '../src/engine/combat.js';
import { ZONE_MULTIPLIERS } from '../src/engine/hitboxes.js';
import { getRecoilAngle, AccuracyModel, getFinalShotAngle } from '../src/engine/recoil-patterns.js';
import { DamageSystem } from '../src/engine/damage.js';
import CombatFeedback from '../src/combat-feedback.js';
import { ArenaNavMesh } from '../src/navmesh.js';
import { Bot } from '../src/bot.js';
import { SoundFX } from '../src/audio.js';

export default class MovementVisualizer {
  constructor(opts = {}) {
    this.THREE = opts.THREE;
    this.GLTFLoader = opts.GLTFLoader;
    this.Octree = opts.Octree;
    this.Capsule = opts.Capsule;
    this.PlayerModel = opts.PlayerModel;
    this.FirstPersonWeapon = opts.FirstPersonWeapon;
    this.RagdollSystem = opts.RagdollSystem;
    this.container = opts.container || document.body;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this._initThree();
    this._initScene();
    this._initLighting();
    this._initInput();
    this._initPlayer();
    this._loadMap(); // Async - will call start() when ready

    this.last = performance.now();
    this.acc = 0;
    this.tickRate = 64;
    this.dt = 1 / this.tickRate;
  }

  _initThree() {
    const THREE = this.THREE;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.autoClear = false; // Two-pass rendering (world + weapon)
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    });
  }

  _initScene() {
    const THREE = this.THREE;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88aacc); // Overcast blue-grey

    // Status element
    this.statusEl = document.getElementById('status') || (() => {
      const d = document.createElement('div');
      d.style.position = 'absolute';
      d.style.left = '8px';
      d.style.top = '44px';
      d.style.color = '#fff';
      d.style.fontFamily = 'monospace';
      d.style.zIndex = '10';
      d.style.background = 'rgba(0,0,0,0.35)';
      d.style.padding = '6px';
      d.style.borderRadius = '4px';
      d.style.whiteSpace = 'pre';
      document.body.appendChild(d);
      return d;
    })();

    // Combat debug HUD (toggled with backtick key)
    this.debugHudEnabled = false;
    this.debugDamageLog = []; // Last 5 hits: { zone, damage, remainingHp, targetId, time }
    this.debugHitIndicator = null; // { zone, time } - brief flash showing hit zone
    this.debugHitIndicatorDuration = 0.8; // seconds

    // Store original mannequin positions for respawn
    this.mannequinOriginalPositions = {};

    this.debugHudEl = (() => {
      const d = document.createElement('div');
      d.style.position = 'absolute';
      d.style.left = '8px';
      d.style.top = '180px';
      d.style.color = '#0f0';
      d.style.fontFamily = 'Courier New, monospace';
      d.style.fontSize = '12px';
      d.style.lineHeight = '1.4';
      d.style.zIndex = '20';
      d.style.background = 'rgba(0,0,0,0.7)';
      d.style.padding = '8px 12px';
      d.style.borderRadius = '4px';
      d.style.whiteSpace = 'pre';
      d.style.border = '1px solid rgba(0,255,0,0.3)';
      d.style.display = 'none'; // Hidden by default
      d.style.minWidth = '340px';
      document.body.appendChild(d);
      return d;
    })();

    // Config adjusted to meter scale (map is in Blender meters, not HU)
    this.cfg = {
      groundAccel: 100.0,
      groundFriction: 12.0,
      airAccel: 10.0,
      maxSpeed: 4.5,      // m/s (was 215 HU/s)
      gravity: -20.0,     // m/s^2 (CS:S uses faster-than-real for snappy feel)
      jumpImpulse: 5.6,   // m/s (was 270 HU/s)
    };
  }

  _initLighting() {
    const THREE = this.THREE;

    // Hemisphere light for base fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.6);
    this.scene.add(hemiLight);

    // Main directional light from above-diagonal
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(50, 100, 50);
    dirLight1.castShadow = false;
    this.scene.add(dirLight1);

    // Fill light from opposite side to eliminate dark corners
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-50, 80, -50);
    dirLight2.castShadow = false;
    this.scene.add(dirLight2);

    // Additional fill light from another angle
    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight3.position.set(50, 60, -50);
    dirLight3.castShadow = false;
    this.scene.add(dirLight3);
  }

  async _loadMap() {
    const THREE = this.THREE;
    const GLTFLoader = this.GLTFLoader;
    const Octree = this.Octree;

    const loader = new GLTFLoader();
    const mapStartTime = performance.now();

    try {
      // Update status
      if (this.statusEl) {
        this.statusEl.textContent = 'Loading map...';
      }

      // Load map
      const gltf = await loader.loadAsync('arena_map.glb?v=' + Date.now());
      const mapLoadTime = performance.now() - mapStartTime;
      console.log(`Map loaded in ${mapLoadTime.toFixed(1)}ms`);

      // Add map to scene
      this.scene.add(gltf.scene);
      this.mapScene = gltf.scene; // environment-only ref for bullet/wall raycasts

      // Add grid line overlay to all materials (dev texture look)
      this._addGridLines(gltf.scene);

      // Count meshes and materials for debugging
      let meshCount = 0;
      const materials = new Set();
      gltf.scene.traverse((obj) => {
        if (obj.isMesh) {
          meshCount++;
          if (obj.material) materials.add(obj.material.uuid);
        }
      });
      console.log(`Map: ${meshCount} meshes, ${materials.size} unique materials`);

      // Build Octree for collision
      const octreeStartTime = performance.now();
      this.worldOctree = new Octree();
      this.worldOctree.fromGraphNode(gltf.scene);
      const octreeBuildTime = performance.now() - octreeStartTime;
      console.log(`Octree built in ${octreeBuildTime.toFixed(1)}ms`);

      // Hide collision-only meshes (invisible walls for railing collision)
      gltf.scene.traverse((obj) => {
        if (obj.isMesh && obj.material && obj.material.name === 'Collision') {
          obj.visible = false;
        }
      });

      // Bake navigation mesh for bot AI (walkable surface from arena geometry).
      this.navMesh = new ArenaNavMesh();
      const navOk = await this.navMesh.build(gltf.scene, this.THREE);
      if (navOk) {
        this.navDebugMesh = this.navMesh.buildDebugMesh(this.THREE);
        if (this.navDebugMesh) {
          this.navDebugMesh.visible = false; // toggle with N
          this.scene.add(this.navDebugMesh);
        }
      }

      // Extract spawn points
      this._extractSpawnPoints(gltf.scene);

      // Position player at their corner spawn (navmesh-snapped).
      if (this.spawnRed) {
        this.pos.copy(this._playerSpawnPos());
        this.pos.y += 1.0; // Raise player to standing position above spawn point
        console.log(`Player spawned at corner: (${this.pos.x.toFixed(2)}, ${this.pos.y.toFixed(2)}, ${this.pos.z.toFixed(2)})`);
      } else {
        console.warn('No spawn points found, using fallback position');
      }

      // Load mannequin if PlayerModel is provided
      if (this.PlayerModel) {
        if (this.statusEl) {
          this.statusEl.textContent = 'Loading mannequin...';
        }

        const mannequinStartTime = performance.now();
        this.playerModelManager = new this.PlayerModel(this.THREE);
        await this.playerModelManager.load('soldier.glb');
        const mannequinLoadTime = performance.now() - mannequinStartTime;
        console.log(`Mannequin loaded in ${mannequinLoadTime.toFixed(1)}ms`);

        // Debug: measure actual mannequin size and hierarchy in Three.js
        {
          const scene = this.playerModelManager.sourceScene;
          const bbox = new this.THREE.Box3().setFromObject(scene);
          const size = new this.THREE.Vector3();
          bbox.getSize(size);
          console.log(`[DEBUG] Mannequin GLB bbox: min=(${bbox.min.x.toFixed(3)}, ${bbox.min.y.toFixed(3)}, ${bbox.min.z.toFixed(3)}) max=(${bbox.max.x.toFixed(3)}, ${bbox.max.y.toFixed(3)}, ${bbox.max.z.toFixed(3)})`);
          console.log(`[DEBUG] Mannequin GLB size: w=${size.x.toFixed(3)} h=${size.y.toFixed(3)} d=${size.z.toFixed(3)}`);
          // Dump full scene hierarchy with transforms
          scene.traverse((obj) => {
            const s = obj.scale;
            const p = obj.position;
            const isSkinned = obj.isSkinnedMesh ? ' [SKINNED]' : '';
            const isBone = obj.isBone ? ' [BONE]' : '';
            const isMesh = obj.isMesh ? ' [MESH]' : '';
            if (s.x !== 1 || s.y !== 1 || s.z !== 1 || p.x !== 0 || p.y !== 0 || p.z !== 0 || isSkinned || isBone) {
              console.log(`[DEBUG]   ${obj.name}${isMesh}${isSkinned}${isBone} pos=(${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}) scale=(${s.x.toFixed(3)},${s.y.toFixed(3)},${s.z.toFixed(3)})`);
            }
          });
          // Check bone world positions
          const skeleton = this.playerModelManager.sourceSkeleton;
          if (skeleton) {
            skeleton.bones.forEach(bone => {
              const wp = new this.THREE.Vector3();
              bone.getWorldPosition(wp);
              if (bone.name === 'Head' || bone.name === 'Root' || bone.name === 'Foot.L') {
                console.log(`[DEBUG] Bone ${bone.name} worldPos=(${wp.x.toFixed(3)}, ${wp.y.toFixed(3)}, ${wp.z.toFixed(3)})`);
              }
            });
          }
        }

        // Spawn test mannequins (now soldiers via soldier.glb)
        this._spawnTestMannequins();
      }

      // Load first-person weapon view if FirstPersonWeapon is provided
      if (this.FirstPersonWeapon) {
        if (this.statusEl) {
          this.statusEl.textContent = 'Loading weapons...';
        }

        const weaponStartTime = performance.now();
        this.fpWeapon = new this.FirstPersonWeapon(this.THREE, this.renderer);
        await this.fpWeapon.load(
          'fp_arms.glb',
          {
            rifle: 'rifle.glb', bullpup: 'bullpup.glb', smg: 'smg.glb',
            sniper: 'sniper.glb', shotgun: 'shotgun.glb',
            pistol: 'pistol.glb', revolver: 'revolver.glb', knife: 'knife.glb',
          }
        );
        this.fpWeapon.switchWeapon('rifle'); // Default weapon visual
        const weaponLoadTime = performance.now() - weaponStartTime;
        console.log(`FP weapon loaded in ${weaponLoadTime.toFixed(1)}ms`);
      }

      // Arm the third-person soldiers: attach a rifle to the right hand bone so
      // opponents are visibly armed. Bone-child => follows the hand through anim.
      if (this.GLTFLoader) {
        try {
          const tpGltf = await new this.GLTFLoader().loadAsync('rifle.glb?v=' + Date.now());
          this.tpRifleProto = tpGltf.scene;
          // Hand.R lives under the soldier's 0.01 node scale, so scale ~100 to
          // restore real weapon size. pos is in bone-local units (1 = ~0.01m world).
          this.tpWeaponXform = { scale: 100, pos: [-2, 24, 0], rot: [0.20, -3.17, 1.40] };
          // Foregrip target for left-hand IK, in gun-local metres (tunable in-game).
          // -X is forward along the barrel (the +X end is the stock); -Y is down.
          this.foregripOffset = [-0.28, -0.03, 0];
          [this.testMannequinRed, this.testMannequinBlue, this.testMannequinGreen]
            .forEach((s) => this._armSoldier(s));
        } catch (e) {
          console.warn('TP weapon load failed:', e);
        }
      }

      // Opponent bot AI: now that soldiers are spawned, armed, and the navmesh is
      // baked, wrap each in a Bot that roams the arena (perception/combat next).
      this._initBots();

      // Initialize ragdoll physics if RagdollSystem is provided
      if (this.RagdollSystem) {
        if (this.statusEl) {
          this.statusEl.textContent = 'Loading physics...';
        }

        try {
          const ragdollStartTime = performance.now();
          this.ragdollSystem = new this.RagdollSystem(this.THREE);
          await this.ragdollSystem.init();
          const ragdollLoadTime = performance.now() - ragdollStartTime;
          console.log(`Ragdoll physics initialized in ${ragdollLoadTime.toFixed(1)}ms`);
        } catch (e) {
          console.warn('Rapier.js failed to initialize, ragdoll disabled:', e);
          this.ragdollSystem = null;
        }
      }

      // Initialize combat systems
      if (this.statusEl) {
        this.statusEl.textContent = 'Initializing combat systems...';
      }

      // Weapon system
      this.weaponSystem = new WeaponSystem(WeaponType.AK47);

      // Accuracy model
      this.accuracyModel = new AccuracyModel();

      // Damage system
      this.damageSystem = new DamageSystem();
      this.damageSystem.registerPlayer('local');
      this.damageSystem.registerPlayer('mannequin_red');
      this.damageSystem.registerPlayer('mannequin_blue');
      this.damageSystem.registerPlayer('mannequin_green');

      // Combat feedback (visual effects)
      this.combatFeedback = new CombatFeedback(this.THREE, this.scene);

      // Initialize hitbox sets for mannequins
      this.hitboxSets = {
        mannequin_red: createHitboxSet('mannequin_red'),
        mannequin_blue: createHitboxSet('mannequin_blue'),
        mannequin_green: createHitboxSet('mannequin_green'),
      };

      console.log('Combat systems initialized');

      // Initialize ammo HUD with weapon system
      this._updateAmmoHUD();

      // Update status
      if (this.statusEl) {
        this.statusEl.textContent = 'Map loaded. Click to play.';
      }

      // Start game loop
      this.start();
    } catch (error) {
      console.error('Error loading map:', error);
      if (this.statusEl) {
        this.statusEl.textContent = 'Error loading map. Check console.';
      }
    }
  }

  _extractSpawnPoints(scene) {
    const THREE = this.THREE;
    let redSpawn = null;
    let blueSpawn = null;

    scene.traverse((obj) => {
      // Check userData.spawnTeam or object name
      const isRedSpawn = obj.userData.spawnTeam === 'red' || obj.name.toLowerCase().includes('spawn_red');
      const isBlueSpawn = obj.userData.spawnTeam === 'blue' || obj.name.toLowerCase().includes('spawn_blue');

      if (isRedSpawn && !redSpawn) {
        redSpawn = obj.position.clone();
        console.log(`Found red spawn at: (${redSpawn.x.toFixed(2)}, ${redSpawn.y.toFixed(2)}, ${redSpawn.z.toFixed(2)})`);
      }
      if (isBlueSpawn && !blueSpawn) {
        blueSpawn = obj.position.clone();
        console.log(`Found blue spawn at: (${blueSpawn.x.toFixed(2)}, ${blueSpawn.y.toFixed(2)}, ${blueSpawn.z.toFixed(2)})`);
      }
    });

    // Fallback positions (from 02-01 SUMMARY: Blender Y/Z -> Three.js Z/-Y conversion)
    // Blender spawn_red at (0, -23, 0) -> Three.js (0, 0, 23)
    // Blender spawn_blue at (0, 28, 0) -> Three.js (0, 0, -28)
    this.spawnRed = redSpawn || new THREE.Vector3(0, 0, 23);
    this.spawnBlue = blueSpawn || new THREE.Vector3(0, 0, -28);

    if (!redSpawn || !blueSpawn) {
      console.warn('Using fallback spawn positions');
    }
  }

  /**
   * Opponent spawn positions: the FAR end of the map (blue spawn area), spread
   * out, so the round starts with the enemy team across the arena from the player.
   */
  /** A spawn point offset from `base` by (dx,dz), snapped onto the navmesh. */
  _cornerSpawn(base, dx, dz) {
    const THREE = this.THREE;
    const p = base.clone();
    p.x += dx; p.z += dz;
    if (this.navMesh && this.navMesh.ready) {
      const snapped = this.navMesh.closestPoint(p, THREE);
      if (snapped) return snapped;
    }
    return p;
  }

  /** Player (red team) spawn: bottom-right corner, in the building. */
  _playerSpawnPos() {
    const base = this.spawnRed ? this.spawnRed.clone() : new this.THREE.Vector3(0, 0, 23);
    return this._cornerSpawn(base, 15, -1); // +X (right) corner of the red end
  }

  /** Enemy (blue team) spawns: right up in the top-right corner, fanned inward. */
  _botSpawnPositions() {
    const THREE = this.THREE;
    const base = this.spawnBlue ? this.spawnBlue.clone() : new THREE.Vector3(0, 0, -28);
    base.x += 18; // hard into the +X (right) edge
    base.z -= 1;  // hard toward the -Z (top) edge
    // Fan the squad inward (-X / +Z) from the corner so none clip the walls.
    return {
      mannequin_blue: this._cornerSpawn(base, 0, 0),
      mannequin_red: this._cornerSpawn(base, -3, 1.5),
      mannequin_green: this._cornerSpawn(base, -1.5, 3),
    };
  }

  _spawnTestMannequins() {
    const pos = this._botSpawnPositions();

    this.testMannequinRed = this.playerModelManager.spawn(0xcc2200, pos.mannequin_red.clone());
    this.scene.add(this.testMannequinRed.scene);
    if (this.testMannequinRed.helper) this.scene.add(this.testMannequinRed.helper);

    this.testMannequinBlue = this.playerModelManager.spawn(0x2244cc, pos.mannequin_blue.clone());
    this.scene.add(this.testMannequinBlue.scene);
    if (this.testMannequinBlue.helper) this.scene.add(this.testMannequinBlue.helper);

    this.testMannequinGreen = this.playerModelManager.spawn(0x22cc44, pos.mannequin_green.clone());
    this.scene.add(this.testMannequinGreen.scene);
    if (this.testMannequinGreen.helper) this.scene.add(this.testMannequinGreen.helper);

    this.mannequinOriginalPositions.red = pos.mannequin_red.clone();
    this.mannequinOriginalPositions.blue = pos.mannequin_blue.clone();
    this.mannequinOriginalPositions.green = pos.mannequin_green.clone();
    console.log('Opponents spawned at far end of map');
  }

  /**
   * Create a roaming Bot for each spawned soldier. Bots own movement + animation
   * from here on, replacing the hardcoded per-mannequin updateAnimation calls.
   */
  _initBots() {
    if (!this.navMesh || !this.navMesh.ready || !this.playerModelManager) return;
    this.bots = [];
    const make = (instance, id) => {
      if (!instance) return;
      this.bots.push(new Bot(this.THREE, this.playerModelManager, instance, this.navMesh, { id }));
    };
    make(this.testMannequinRed, 'mannequin_red');
    make(this.testMannequinBlue, 'mannequin_blue');
    make(this.testMannequinGreen, 'mannequin_green');
    // Bots shoot an AK-class weapon; applyDamage only needs type + baseDamage.
    this._botWeaponConfig = { type: WeaponType.AK47, baseDamage: 20 };
    this.roundActive = true;
    this.roundEndTimer = 0;
    console.log(`Bots initialized: ${this.bots.length} roaming`);
  }

  /**
   * Round flow: while active, end the round once every opponent is dead, then
   * count down and respawn both sides for the next round.
   */
  _updateRound(dt, aliveCount) {
    if (this.roundActive) {
      if (aliveCount === 0) {
        this.roundActive = false;
        this.roundEndTimer = 3.0;
        this._showBanner('ROUND WON — respawning…');
      }
    } else {
      this.roundEndTimer -= dt;
      if (this.roundEndTimer <= 0) this._startRound();
    }
  }

  /** Start a fresh round: reset + reposition the player and respawn the enemy squad. */
  _startRound() {
    const THREE = this.THREE;
    // Reset & reposition the player at their corner spawn.
    if (this.damageSystem) this.damageSystem.resetPlayer('local');
    if (this.spawnRed) {
      this.pos.copy(this._playerSpawnPos());
      this.pos.y += 1.0;
      this.vel.set(0, 0, 0);
    }
    if (this.weaponSystem) { this.weaponSystem.resetAll(); this._updateAmmoHUD(); }

    this._spawnBotSquad();
    this.roundActive = true;
    this._showBanner('');
    console.log('New round started');
  }

  /**
   * (Re)spawn the three opponents at the far end, armed, with fresh health,
   * hitboxes, and Bot controllers. Removes any leftover soldier scenes first.
   */
  _spawnBotSquad() {
    // Clear any dead bodies still toppling/lingering from the previous round.
    if (this.dyingSoldiers) {
      for (const d of this.dyingSoldiers) {
        if (d.instance.scene.parent) d.instance.scene.parent.remove(d.instance.scene);
        if (d.instance.helper && d.instance.helper.parent) d.instance.helper.parent.remove(d.instance.helper);
      }
      this.dyingSoldiers.length = 0;
    }
    const positions = this._botSpawnPositions();
    const slots = [
      ['mannequin_red', 0xcc2200, 'testMannequinRed'],
      ['mannequin_blue', 0x2244cc, 'testMannequinBlue'],
      ['mannequin_green', 0x22cc44, 'testMannequinGreen'],
    ];
    for (const [id, color, prop] of slots) {
      const old = this[prop];
      if (old) {
        if (old.scene && old.scene.parent) old.scene.parent.remove(old.scene);
        if (old.helper && old.helper.parent) old.helper.parent.remove(old.helper);
      }
      const inst = this.playerModelManager.spawn(color, positions[id].clone());
      this.scene.add(inst.scene);
      if (inst.helper) this.scene.add(inst.helper);
      if (this.tpRifleProto) this._armSoldier(inst);
      this[prop] = inst;
      if (this.damageSystem) this.damageSystem.resetPlayer(id);
    }
    this.hitboxSets = {
      mannequin_red: createHitboxSet('mannequin_red'),
      mannequin_blue: createHitboxSet('mannequin_blue'),
      mannequin_green: createHitboxSet('mannequin_green'),
    };
    this._initBots();
  }

  /** Centered round banner; pass an empty string to hide it. */
  _showBanner(text) {
    if (!this._bannerEl) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:18%;left:0;right:0;text-align:center;' +
        'pointer-events:none;z-index:60;font:700 34px system-ui,sans-serif;' +
        'color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.8);letter-spacing:1px;';
      this.container.appendChild(el);
      this._bannerEl = el;
    }
    this._bannerEl.textContent = text || '';
    this._bannerEl.style.display = text ? 'block' : 'none';
  }

  /**
   * Begin a "clean collapse" death: keep the soldier mesh in its current (frozen)
   * pose and topple the whole model to the ground over ~0.5s, then linger + remove.
   * No per-limb physics — reliable and always on-model.
   */
  _startDeathCollapse(instance) {
    const THREE = this.THREE;
    if (!this.dyingSoldiers) this.dyingSoldiers = [];
    const scene = instance.scene;
    scene.visible = true;
    const startQuat = scene.quaternion.clone();
    // Topple about a random world-horizontal axis so bodies fall varied directions.
    const r = Math.random() * Math.PI * 2;
    const axis = new THREE.Vector3(Math.cos(r), 0, Math.sin(r));
    const endQuat = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2).multiply(startQuat);
    this.dyingSoldiers.push({
      instance,
      t: 0,
      dur: 0.5,
      startQuat,
      endQuat,
      startY: scene.position.y,
      endY: scene.position.y + 0.2, // lift so the toppled body rests on the floor
      linger: 6.0,
      settled: false,
    });
  }

  /** Advance death collapses each frame; remove bodies after they linger. */
  _updateDeathCollapses(dt) {
    if (!this.dyingSoldiers || !this.dyingSoldiers.length) return;
    for (let i = this.dyingSoldiers.length - 1; i >= 0; i--) {
      const d = this.dyingSoldiers[i];
      d.t += dt;
      if (d.t < d.dur) {
        const k = d.t / d.dur;
        const e = k * k; // accelerate into the ground like a topple
        d.instance.scene.quaternion.copy(d.startQuat).slerp(d.endQuat, e);
        d.instance.scene.position.y = d.startY + (d.endY - d.startY) * e;
      } else if (!d.settled) {
        d.instance.scene.quaternion.copy(d.endQuat);
        d.instance.scene.position.y = d.endY;
        d.settled = true;
      }
      d.linger -= dt;
      if (d.linger <= 0) {
        const s = d.instance.scene;
        if (s.parent) s.parent.remove(s);
        if (d.instance.helper && d.instance.helper.parent) d.instance.helper.parent.remove(d.instance.helper);
        this.dyingSoldiers.splice(i, 1);
      }
    }
  }

  /** Line-of-sight test from a bot's eye to a target, blocked by arena geometry. */
  _botCanSee(eye, target) {
    if (!this.mapScene) return true;
    const THREE = this.THREE;
    if (!this._botRay) { this._botRay = new THREE.Raycaster(); this._botRayDir = new THREE.Vector3(); }
    this._botRayDir.subVectors(target, eye);
    const dist = this._botRayDir.length();
    if (dist < 0.001) return true;
    this._botRayDir.divideScalar(dist);
    this._botRay.set(eye, this._botRayDir);
    this._botRay.far = dist;
    const hits = this._botRay.intersectObject(this.mapScene, true);
    // Blocked if any wall is meaningfully closer than the player.
    for (const h of hits) {
      if (h.distance < dist - 0.3) return false;
    }
    return true;
  }

  /** A bot pulled the trigger: muzzle flash + tracer, then a distance-based hit roll. */
  _botFire(bot, muzzle) {
    const THREE = this.THREE;

    const dist = muzzle.distanceTo(this.pos);
    // Imperfect aim: per-bot skill, falling off with distance. Bots miss a lot
    // (capped well below aimbot territory so firefights are survivable).
    const hitChance = THREE.MathUtils.clamp((bot.aimSkill || 0.2) - dist * 0.005, 0.03, 0.28);
    const isHit = Math.random() < hitChance;

    // Tracer endpoint: dead-on for a hit, splayed wide for a miss so the volley
    // visibly sprays around the player instead of looking laser-perfect.
    const end = this._botTracerEnd || (this._botTracerEnd = new THREE.Vector3());
    end.copy(this.pos);
    if (isHit) {
      end.x += (Math.random() - 0.5) * 0.15; // subtle jitter so hits aren't robotic
      end.y += (Math.random() - 0.5) * 0.15;
      end.z += (Math.random() - 0.5) * 0.15;
    } else {
      const spread = 0.5 + dist * 0.07; // miss cone widens with range
      end.x += (Math.random() - 0.5) * 2 * spread;
      end.y += (Math.random() - 0.5) * 2 * spread + 0.3;
      end.z += (Math.random() - 0.5) * 2 * spread;
    }
    if (this.combatFeedback) {
      this.combatFeedback.showEnemyMuzzleFlash(muzzle);
      this.combatFeedback.spawnTracer(muzzle, end);
    }
    // Enemy gunshot, quieter and attenuated by distance.
    if (this.sfx) this.sfx.gunshot(THREE.MathUtils.clamp(0.5 - dist * 0.008, 0.06, 0.5));

    if (!isHit || !this.damageSystem) return; // missed shot — no damage

    const zone = this._botPickZone();
    const hit = {
      targetId: 'local',
      zone,
      multiplier: ZONE_MULTIPLIERS[zone],
      distance: dist,
      hitPosition: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
      hitNormal: { x: 0, y: 1, z: 0 },
      isHeadshot: zone === 'head',
      armorProtected: zone !== 'leg_l' && zone !== 'leg_r',
    };
    const result = this.damageSystem.applyDamage(bot.id, hit, this._botWeaponConfig);
    if (!result) return;

    this._flashDamage();
    if (result.killed) this._onPlayerKilled(bot);
  }

  /** Weighted body-zone selection for incoming bot fire (mostly torso). */
  _botPickZone() {
    const r = Math.random();
    if (r < 0.05) return 'head';
    if (r < 0.55) return 'chest';
    if (r < 0.72) return 'stomach';
    if (r < 0.86) return Math.random() < 0.5 ? 'arm_l' : 'arm_r';
    return Math.random() < 0.5 ? 'leg_l' : 'leg_r';
  }

  /** Brief red screen vignette when the player takes damage. */
  _flashDamage() {
    if (!this._dmgFlashEl) {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;' +
        'box-shadow:inset 0 0 140px 40px rgba(200,0,0,0.0);transition:box-shadow 0.45s ease-out;';
      this.container.appendChild(el);
      this._dmgFlashEl = el;
    }
    const el = this._dmgFlashEl;
    el.style.transition = 'none';
    el.style.boxShadow = 'inset 0 0 140px 40px rgba(200,0,0,0.55)';
    // next frame, fade it out
    requestAnimationFrame(() => {
      el.style.transition = 'box-shadow 0.45s ease-out';
      el.style.boxShadow = 'inset 0 0 140px 40px rgba(200,0,0,0.0)';
    });
  }

  /** Player died to a bot: reset health and respawn back at the player spawn. */
  _onPlayerKilled(bot) {
    console.log(`KILLED by ${bot.id}!`);
    this.damageSystem.resetPlayer('local');
    if (this.spawnRed) {
      this.pos.copy(this.spawnRed);
      this.pos.y += 1.0;
      this.vel.set(0, 0, 0);
    }
    this._showBanner('YOU DIED');
    clearTimeout(this._deathBannerT);
    this._deathBannerT = setTimeout(() => {
      if (this.roundActive) this._showBanner('');
    }, 1500);
  }

  _respawnMannequins() {
    if (!this.playerModelManager || !this.damageSystem) return;

    const THREE = this.THREE;

    // Clean up any existing ragdolls
    if (this.ragdollSystem && this.ragdollSystem.ragdolls) {
      // Force-remove all active ragdolls
      while (this.ragdollSystem.ragdolls.length > 0) {
        const ragdoll = this.ragdollSystem.ragdolls.pop();
        this.ragdollSystem.removeRagdoll(ragdoll);
      }
    }

    // Reset health for all mannequins
    this.damageSystem.resetPlayer('mannequin_red');
    this.damageSystem.resetPlayer('mannequin_blue');
    this.damageSystem.resetPlayer('mannequin_green');

    // Re-spawn red mannequin if missing (killed/ragdolled)
    if (!this.testMannequinRed) {
      const redPos = this.mannequinOriginalPositions.red || this.spawnRed.clone();
      this.testMannequinRed = this.playerModelManager.spawn(0xcc2200, redPos.clone());
      this.scene.add(this.testMannequinRed.scene);
      if (this.testMannequinRed.helper) {
        this.scene.add(this.testMannequinRed.helper);
      }
      this.testMannequinRedVel = new THREE.Vector3(0, 0, 2);
    }

    // Re-spawn blue mannequin if missing
    if (!this.testMannequinBlue) {
      const bluePos = this.mannequinOriginalPositions.blue || this.spawnBlue.clone();
      this.testMannequinBlue = this.playerModelManager.spawn(0x2244cc, bluePos.clone());
      this.scene.add(this.testMannequinBlue.scene);
      if (this.testMannequinBlue.helper) {
        this.scene.add(this.testMannequinBlue.helper);
      }
    }

    // Re-spawn green mannequin if missing
    if (!this.testMannequinGreen) {
      const greenPos = this.mannequinOriginalPositions.green || this.spawnRed.clone();
      this.testMannequinGreen = this.playerModelManager.spawn(0x22cc44, greenPos.clone());
      this.scene.add(this.testMannequinGreen.scene);
      if (this.testMannequinGreen.helper) {
        this.scene.add(this.testMannequinGreen.helper);
      }
    }

    // Re-initialize hitbox sets
    this.hitboxSets = {
      mannequin_red: createHitboxSet('mannequin_red'),
      mannequin_blue: createHitboxSet('mannequin_blue'),
      mannequin_green: createHitboxSet('mannequin_green'),
    };

    // Reset weapon ammo too
    if (this.weaponSystem) {
      this.weaponSystem.resetAll();
      this._updateAmmoHUD();
    }

    console.log('Mannequins respawned with full HP/armor');

    // Add to damage log
    this.debugDamageLog.push({
      zone: 'SYSTEM',
      damage: 0,
      remainingHp: 100,
      targetId: 'RESPAWN',
      time: performance.now() / 1000,
    });
    if (this.debugDamageLog.length > 5) {
      this.debugDamageLog.shift();
    }
  }

  _addGridLines(scene) {
    // Add world-space grid lines to all materials via onBeforeCompile
    // Recreates the dev-texture block pattern lost during flat-color GLB export
    const processed = new Set();

    const applyGrid = (mat) => {
      if (!mat || processed.has(mat.uuid)) return;
      processed.add(mat.uuid);

      mat.onBeforeCompile = (shader) => {
        shader.uniforms.gridSize = { value: 4.0 };

        // Vertex: compute world position
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vGridWorldPos;`
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvGridWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
        );

        // Fragment: draw thin white grid lines at 4-unit intervals
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `#include <common>\nvarying vec3 vGridWorldPos;\nuniform float gridSize;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `vec3 gCoord = abs(fract(vGridWorldPos / gridSize + 0.5) - 0.5) * gridSize;
           float gMin = min(min(gCoord.x, gCoord.y), gCoord.z);
           float gLine = 1.0 - smoothstep(0.0, 0.06, gMin);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), gLine * 0.3);
           #include <dithering_fragment>`
        );
      };
      mat.needsUpdate = true;
    };

    let meshCount = 0;
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      meshCount++;
      // Handle both single materials and material arrays (multi-material meshes)
      if (Array.isArray(obj.material)) {
        obj.material.forEach(applyGrid);
      } else {
        applyGrid(obj.material);
      }
    });
    console.log(`Grid lines: applied to ${processed.size} materials across ${meshCount} meshes`);
  }

  _initPlayer() {
    const THREE = this.THREE;
    const Capsule = this.Capsule;

    // Player capsule for collision (1.8m tall, 0.35m radius)
    // Capsule: start = bottom sphere center, end = top sphere center, radius
    // Total height = distance(start, end) + 2*radius
    // start.y = 0.35 (radius above ground), end.y = 1.45 (1.8 - 0.35)
    this.playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(0, 1.45, 0),
      0.35
    );

    // Player state
    this.pos = new THREE.Vector3(0, 1.0, 23); // Will be overridden by spawn point
    this.vel = new THREE.Vector3(0, 0, 0);
    this.onGround = false;
    this.jumpBufferTime = 0; // Jump buffering: queues jump for 100ms
    this.crouchJumpOffset = 0; // Vertical offset when crouch-jumping

    // First-person camera control
    this.camera_yaw = 0;   // Y rotation (left/right)
    this.camera_pitch = 0; // X rotation (up/down)
    this.mouse_sens = 0.003;

    // Eye heights
    this.eyeHeightStanding = 1.6; // m above feet
    this.eyeHeightCrouching = 1.0; // m above feet
    this.playerHeightStanding = 1.8; // m
    this.playerHeightCrouching = 1.2; // m

    // Audio: real samples when present (visual/sounds/), else synthesized fallback.
    this.sfx = new SoundFX();
    this.sfx.registerSamples({
      rifle:    ['sounds/rifle.mp3', 'sounds/rifle.wav', 'sounds/rifle.ogg'],
      bullpup:  ['sounds/bullpup.mp3', 'sounds/bullpup.wav', 'sounds/bullpup.ogg'],
      smg:      ['sounds/smg.mp3', 'sounds/smg.wav', 'sounds/smg.ogg'],
      shotgun:  ['sounds/shotgun.mp3', 'sounds/shotgun.wav', 'sounds/shotgun.ogg'],
      sniper:   ['sounds/sniper.mp3', 'sounds/sniper.wav', 'sounds/sniper.ogg'],
      pistol:   ['sounds/pistol.mp3', 'sounds/pistol.wav', 'sounds/pistol.ogg'],
      revolver: ['sounds/revolver.mp3', 'sounds/revolver.wav', 'sounds/revolver.ogg'],
    });

    // Request pointer lock
    document.addEventListener('click', () => {
      document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
      document.body.requestPointerLock();
      if (this.sfx) this.sfx.resume(); // unlock AudioContext on user gesture
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement || document.mozPointerLockElement) {
        // Clamp deltas to prevent browser pointer-lock glitches (sudden 180 spins)
        const mx = Math.max(-150, Math.min(150, e.movementX));
        const my = Math.max(-150, Math.min(150, e.movementY));
        this.camera_yaw -= mx * this.mouse_sens;
        this.camera_pitch -= my * this.mouse_sens;
        // Clamp pitch to prevent flipping
        this.camera_pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera_pitch));
      }
    });

    // Full-auto firing: hold left mouse to keep shooting
    this.fireHeld = false;
    this.fireTimer = 0;

    // Weapon-specific movement speeds (CS:S values converted from HU/s to m/s)
    this.WEAPON_SPEED_MS = {
      [WeaponType.AK47]: 4.51,   // 215 HU/s
      [WeaponType.M4A1]: 4.63,   // 221 HU/s
      [WeaponType.PISTOL]: 5.03, // 240 HU/s
      [WeaponType.KNIFE]: 5.24,  // 250 HU/s
    };

    document.addEventListener('mousedown', (e) => {
      if (!document.pointerLockElement) return;
      if (e.button === 0) {
        this.fireHeld = true;
        // Fire immediately on first click
        if (this.fpWeapon) {
          try { this._fireWeapon(); } catch (e) { console.error('_fireWeapon error:', e); }
        }
        this.fireTimer = 0;
      }
      if (e.button === 2 && this.fpWeapon) {
        this.aiming = true;
        this._updateCrosshairScale();
        this._updateScope();
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fireHeld = false;
      if (e.button === 2) { this.aiming = false; this._updateCrosshairScale(); this._updateScope(); }
    });
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // ADS state
    this.aiming = false;
    this.adsFov = 45;          // Zoomed-in FOV (normal ironsights)
    this.normalFov = 75;       // Normal FOV
    this.scopeFov = 21;        // Sniper scope (~4x magnification of normalFov)
    this.scoped = false;       // true while aiming the sniper (scope overlay active)
    this.currentFov = 75;

    // CS:S-style viewpunch recoil system
    // punchAngle accumulates on fire, decays exponentially each frame
    this.punchAngle = { x: 0, y: 0 };  // Current viewpunch (pitch, yaw)
    this.punchDecay = 18;               // Exponential decay rate (CS:GO default)

    // Ammo HUD element
    this.ammoEl = document.getElementById('ammo');

    // Crosshair: shrink to half size when aiming down sights for finer aim.
    this.crosshairEl = document.getElementById('crosshair');
    if (this.crosshairEl) this.crosshairEl.style.transition = 'transform 0.12s ease-out';
  }

  _updateCrosshairScale() {
    if (!this.crosshairEl) return;
    this.crosshairEl.style.transform = this.aiming ? 'scale(0.5)' : 'scale(1)';
  }

  /**
   * Sniper scope: while aiming the sniper, zoom 4x and overlay a scope view
   * (black tube + reticle). The HUD stays; the FP weapon and normal crosshair
   * hide so you're "looking through the scope".
   */
  _updateScope() {
    const isSniper = this.weaponSystem &&
      this.weaponSystem.currentWeapon === WeaponType.SNIPER;
    this.scoped = !!(this.aiming && isSniper);
    this._ensureScopeOverlay();
    if (this.scopeEl) this.scopeEl.style.display = this.scoped ? 'block' : 'none';
    if (this.crosshairEl) this.crosshairEl.style.visibility = this.scoped ? 'hidden' : 'visible';
    if (this.fpWeapon && this.fpWeapon.weaponGroup) {
      this.fpWeapon.weaponGroup.visible = !this.scoped; // hide the gun while scoped
    }
  }

  /** Build the sniper scope overlay once (circular tube vignette + reticle). */
  _ensureScopeOverlay() {
    if (this.scopeEl) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:45;pointer-events:none;display:none;';
    // Black scope tube: transparent circular lens centred, solid black outside.
    const mask = document.createElement('div');
    mask.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,' +
      ' rgba(0,0,0,0) 0 36vh, rgba(0,0,0,0.35) 36vh 37vh, #000 37.6vh);';
    // Thin reticle ring at the lens edge.
    const ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;left:50%;top:50%;width:72vh;height:72vh;' +
      'transform:translate(-50%,-50%);border:2px solid rgba(0,0,0,0.85);border-radius:50%;';
    // Crosshair lines (span the lens, thin, with a small centre gap via two halves).
    const mk = (css) => { const d = document.createElement('div'); d.style.cssText = 'position:absolute;background:rgba(0,0,0,0.85);' + css; return d; };
    const vTop = mk('left:50%;top:calc(50% - 36vh);width:1.5px;height:calc(36vh - 14px);transform:translateX(-50%);');
    const vBot = mk('left:50%;top:calc(50% + 14px);width:1.5px;height:calc(36vh - 14px);transform:translateX(-50%);');
    const hLeft = mk('top:50%;left:calc(50% - 36vh);height:1.5px;width:calc(36vh - 14px);transform:translateY(-50%);');
    const hRight = mk('top:50%;left:calc(50% + 14px);height:1.5px;width:calc(36vh - 14px);transform:translateY(-50%);');
    const dot = mk('left:50%;top:50%;width:3px;height:3px;border-radius:50%;transform:translate(-50%,-50%);');
    el.append(mask, ring, vTop, vBot, hLeft, hRight, dot);
    this.container.appendChild(el);
    this.scopeEl = el;
  }

  _initInput() {
    this.input = { forward: 0, right: 0, jumpPressed: false, jumpHeld: false, crouch: false };
    const keys = {};
    window.addEventListener('keydown', (e) => {
      const prev = !!keys[e.code];
      if (e.code === 'Space') this.input.jumpHeld = true;
      if (e.code === 'ShiftLeft') this.input.crouch = true;
      if (e.code === 'Space' && !prev) this.input.jumpPressed = true;

      // Weapon switching (1=rifle toggle AK/M4, 2=pistol, 3=knife)
      // Temporary number-key weapon switch for inspecting guns; the buy menu
      // becomes the real selector once it's in. Pistol/revolver/knife (one-handed)
      // are pulled from the playable set for now — code/models kept for later.
      if (this.fpWeapon && this.weaponSystem) {
        const quickKeys = {
          Digit1: WeaponType.AK47, Digit2: WeaponType.M4A1, Digit3: WeaponType.SMG,
          Digit4: WeaponType.SHOTGUN, Digit5: WeaponType.SNIPER,
        };
        if (quickKeys[e.code]) this._switchWeapon(quickKeys[e.code]);
      }

      // Reload
      if (e.code === 'KeyR' && this.weaponSystem) this._startReload();

      // Ragdoll test trigger (T key)
      if (e.code === 'KeyT' && this.ragdollSystem && this.testMannequinRed) {
        this.ragdollSystem.spawnRagdoll(
          this.testMannequinRed,
          new this.THREE.Vector3(0, 2, -3),
          this.scene
        );
        this.testMannequinRed = null;
      }

      // Debug HUD toggle (backtick key)
      if (e.code === 'Backquote') {
        this.debugHudEnabled = !this.debugHudEnabled;
        if (this.debugHudEl) {
          this.debugHudEl.style.display = this.debugHudEnabled ? 'block' : 'none';
        }
      }

      // Mannequin respawn (Y key)
      if (e.code === 'KeyY') {
        this._respawnMannequins();
      }

      // [FP TUNE] G cycles target: ARMS, GUN, then each arm piece. Arrows = x/z,
      // PgUp/Dn = y, IJKL/UO = rot x/y/z, -/= = scale. Rotating FP_upper_* swings
      // the whole arm at the shoulder; FP_lower_* hinges the forearm at the elbow.
      const FP_TARGETS = ['ARMS', 'GUN', 'FP_upper_R', 'FP_fore_R', 'FP_hand_R', 'FP_upper_L', 'FP_fore_L', 'FP_hand_L'];
      const fpTargetObj = (nm) => {
        if (!this.fpWeapon) return null;
        if (nm === 'ARMS') return this.fpWeapon.fpArmsModel;
        if (nm === 'GUN') return this.fpWeapon.currentWeaponModel;
        return this.fpWeapon.fpArmsModel ? this.fpWeapon.fpArmsModel.getObjectByName(nm) : null;
      };
      if (e.code === 'KeyG' && this.fpWeapon) {
        this.fpTuneIdx = ((this.fpTuneIdx || 0) + 1) % FP_TARGETS.length;
        const nm = FP_TARGETS[this.fpTuneIdx];
        console.log('FP tune target:', nm, fpTargetObj(nm) ? '(found)' : '(NOT FOUND)');
      }
      // [P] dump every FP transform at once so nothing gets dropped on bake.
      if (e.code === 'KeyP' && this.fpWeapon) {
        const f = (o) => o ? `pos[${o.position.x.toFixed(3)},${o.position.y.toFixed(3)},${o.position.z.toFixed(3)}] rot[${o.rotation.x.toFixed(2)},${o.rotation.y.toFixed(2)},${o.rotation.z.toFixed(2)}] scale${o.scale.x.toFixed(3)}` : 'none';
        console.log(`=== FP DUMP [weapon: ${this.fpWeapon.currentWeaponName}] ===\n` + FP_TARGETS.map((n) => '  ' + n + ' ' + f(fpTargetObj(n))).join('\n'));
      }
      {
        const name = FP_TARGETS[this.fpTuneIdx || 0];
        const wg = fpTargetObj(name);
        if (wg) {
          let t = true;
          if (e.code === 'ArrowUp') wg.position.z -= 0.02;
          else if (e.code === 'ArrowDown') wg.position.z += 0.02;
          else if (e.code === 'ArrowLeft') wg.position.x -= 0.02;
          else if (e.code === 'ArrowRight') wg.position.x += 0.02;
          else if (e.code === 'PageUp') wg.position.y += 0.02;
          else if (e.code === 'PageDown') wg.position.y -= 0.02;
          else if (e.code === 'KeyI') wg.rotation.x += 0.1;
          else if (e.code === 'KeyK') wg.rotation.x -= 0.1;
          else if (e.code === 'KeyJ') wg.rotation.y += 0.1;
          else if (e.code === 'KeyL') wg.rotation.y -= 0.1;
          else if (e.code === 'KeyU') wg.rotation.z += 0.1;
          else if (e.code === 'KeyO') wg.rotation.z -= 0.1;
          else if (e.code === 'Minus') wg.scale.multiplyScalar(0.9);
          else if (e.code === 'Equal') wg.scale.multiplyScalar(1.1);
          else t = false;
          if (t) console.log(`FP[${this.fpWeapon.currentWeaponName}/${name}] pos=[${wg.position.x.toFixed(2)},${wg.position.y.toFixed(2)},${wg.position.z.toFixed(2)}] rot=[${wg.rotation.x.toFixed(2)},${wg.rotation.y.toFixed(2)},${wg.rotation.z.toFixed(2)}] scale=${wg.scale.x.toFixed(3)}`);
        }
      }

      // Navmesh overlay toggle (N key)
      if (e.code === 'KeyN' && this.navDebugMesh) {
        this.navDebugMesh.visible = !this.navDebugMesh.visible;
        console.log('Navmesh debug:', this.navDebugMesh.visible ? 'ON' : 'OFF');
      }

      // Hitbox wireframe overlay toggle (H key)
      if (e.code === 'KeyH') {
        this.hitboxDebugEnabled = !this.hitboxDebugEnabled;
        if (this.hitboxDebugGroup) {
          this.hitboxDebugGroup.visible = this.hitboxDebugEnabled;
        }
        console.log('Hitbox debug:', this.hitboxDebugEnabled ? 'ON' : 'OFF');
      }

      keys[e.code] = true;
      this._updateAxis(keys);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.input.jumpHeld = false;
      if (e.code === 'ShiftLeft') this.input.crouch = false;
      keys[e.code] = false;
      this._updateAxis(keys);
    });
  }

  _updateAxis(keys) {
    this.input.forward = (keys['KeyW'] ? 1 : 0) + (keys['KeyS'] ? -1 : 0);
    this.input.right = (keys['KeyD'] ? 1 : 0) + (keys['KeyA'] ? -1 : 0);
  }

  _simulateTick(dt) {
    const THREE = this.THREE;
    const cfg = this.cfg;
    const pos = this.pos;
    const vel = this.vel;

    // Update combat systems each tick
    const currentTime = performance.now() / 1000;
    if (this.weaponSystem) {
      this.weaponSystem.update(dt, currentTime);
    }

    const speed = Math.hypot(vel.x, vel.z);
    const timeSinceLastShot = this.weaponSystem ? (currentTime - this.weaponSystem.lastShotTime) : 999;
    if (this.accuracyModel && this.weaponSystem) {
      this.accuracyModel.update(
        dt,
        speed * 47.7, // Convert m/s to HU/s for accuracy model (expects HU/s)
        this.onGround,
        this.input.crouch,
        timeSinceLastShot,
        this.weaponSystem.currentWeapon
      );
    }

    if (this.damageSystem) {
      this.damageSystem.update(dt);
    }

    // Update hitbox positions from mannequin bone transforms
    this._refreshHitboxes();

    // Hitbox wireframe overlay (toggle with H)
    if (this.hitboxSets) {
      this._updateHitboxDebug(this.hitboxSets);
    }

    // Jump buffering: queue press for 100ms so landing doesn't eat inputs
    if (this.input.jumpPressed) {
      this.jumpBufferTime = 0.1;
      this.input.jumpPressed = false;
    }
    if (this.jumpBufferTime > 0) this.jumpBufferTime -= dt;

    // Calculate camera-relative wish direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera_yaw);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera_yaw);
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, this.input.forward);
    wishDir.addScaledVector(right, this.input.right);
    wishDir.y = 0;

    let wishspeed = 0;
    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
      // Use weapon-specific movement speed
      if (this.weaponSystem) {
        wishspeed = this.WEAPON_SPEED_MS[this.weaponSystem.currentWeapon] || cfg.maxSpeed;
      } else {
        wishspeed = cfg.maxSpeed;
      }
    }

    // Apply tagging speed reduction
    if (this.damageSystem) {
      const localHealth = this.damageSystem.getHealth('local');
      if (localHealth) {
        wishspeed *= localHealth.tagSpeedMultiplier;
      }
    }

    // Crouch slows movement by 25%
    if (this.input.crouch) wishspeed *= 0.75;

    // Ground friction
    if (this.onGround) {
      const speed = Math.hypot(vel.x, vel.z);
      if (speed > 0) {
        const drop = Math.max(speed, cfg.groundFriction) * cfg.groundFriction * dt;
        const newSpeed = Math.max(0, speed - drop);
        const scale = newSpeed / speed;
        vel.x *= scale;
        vel.z *= scale;
      }

      // Ground acceleration
      const currentSpeed = vel.x * wishDir.x + vel.z * wishDir.z;
      let addSpeed = wishspeed - currentSpeed;
      if (addSpeed > 0) {
        let accelSpeed = cfg.groundAccel * wishspeed * dt;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;
        vel.x += wishDir.x * accelSpeed;
        vel.z += wishDir.z * accelSpeed;
      }

      // Jump (uses buffer)
      if (this.jumpBufferTime > 0) {
        vel.y = cfg.jumpImpulse;
        this.onGround = false;
        this.jumpBufferTime = 0;
      } else {
        // Light ground-contact: keeps capsule pressed to surface without
        // stealing too much forward momentum on slopes (was -2.0, too aggressive)
        vel.y = -0.5;
      }
    } else {
      // Air acceleration
      const currentSpeed = vel.x * wishDir.x + vel.z * wishDir.z;
      let addSpeed = wishspeed - currentSpeed;
      if (addSpeed > 0) {
        let accelSpeed = cfg.airAccel * wishspeed * dt;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;
        vel.x += wishDir.x * accelSpeed;
        vel.z += wishDir.z * accelSpeed;
      }

      // Gravity (air only — on ground, vel.y=-0.5 handles surface contact)
      vel.y += cfg.gravity * dt;
    }

    // Integrate velocity
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;

    // Collision detection and resolution
    this._resolveCollision();

    // Safety net: respawn if fallen far below the map
    if (pos.y < -50) {
      pos.copy(this.spawnRed);
      pos.y += 1.0;
      vel.set(0, 0, 0);
      this.onGround = false;
    }
  }

  _resolveCollision() {
    const pos = this.pos;
    const vel = this.vel;
    const capsuleRadius = 0.35;
    const isCrouching = this.input.crouch;
    const playerHeight = isCrouching ? this.playerHeightCrouching : this.playerHeightStanding;

    // Crouch-jump: when crouching in air, pull feet UP (raise capsule bottom)
    // This gives extra clearance to hop onto boxes/ledges
    const crouchJumpOffset = (isCrouching && !this.onGround)
      ? (this.playerHeightStanding - this.playerHeightCrouching)
      : 0;

    // Fix crouch-jump landing: when offset drops to 0, the capsule bottom
    // extends down by the offset amount. Raise pos.y to compensate so we
    // don't clip through the floor.
    const prevOffset = this.crouchJumpOffset || 0;
    if (prevOffset > 0 && crouchJumpOffset === 0) {
      pos.y += prevOffset;
    }

    // Save integrated position (before collision corrections) for step-up
    const integratedPos = pos.clone();

    // Multiple collision iterations to handle corners
    let onGround = false;
    let hitWall = false;
    for (let i = 0; i < 5; i++) {
      this.playerCollider.start.set(pos.x, pos.y + capsuleRadius + crouchJumpOffset, pos.z);
      this.playerCollider.end.set(pos.x, pos.y + crouchJumpOffset + playerHeight - capsuleRadius, pos.z);

      const result = this.worldOctree.capsuleIntersect(this.playerCollider);

      if (result) {
        pos.addScaledVector(result.normal, result.depth);

        const velIntoSurface = vel.dot(result.normal);
        if (velIntoSurface < 0) {
          vel.addScaledVector(result.normal, -velIntoSurface);
        }

        if (result.normal.y > 0.5) {
          onGround = true;
        } else if (Math.abs(result.normal.y) < 0.3) {
          hitWall = true;
        }
      }
    }

    // Step-up: when grounded and blocked by a wall (ramp base lip, small step),
    // try resolving from an elevated position. Source engine does this with
    // sv_stepsize (18 units). We use 0.35m (capsule radius).
    if (onGround && hitWall) {
      const STEP_HEIGHT = 0.35;
      const normalPos = pos.clone();
      const normalVel = vel.clone();

      // Start from integrated position, elevated by step height
      pos.copy(integratedPos);
      pos.y += STEP_HEIGHT;
      vel.copy(normalVel);

      // Run collision at elevated position
      let stepOnGround = false;
      for (let i = 0; i < 5; i++) {
        this.playerCollider.start.set(pos.x, pos.y + capsuleRadius + crouchJumpOffset, pos.z);
        this.playerCollider.end.set(pos.x, pos.y + crouchJumpOffset + playerHeight - capsuleRadius, pos.z);
        const r = this.worldOctree.capsuleIntersect(this.playerCollider);
        if (r) {
          pos.addScaledVector(r.normal, r.depth);
          const vIn = vel.dot(r.normal);
          if (vIn < 0) vel.addScaledVector(r.normal, -vIn);
          if (r.normal.y > 0.5) stepOnGround = true;
        }
      }

      // Drop back down to find ground surface
      pos.y -= STEP_HEIGHT;
      for (let i = 0; i < 3; i++) {
        this.playerCollider.start.set(pos.x, pos.y + capsuleRadius + crouchJumpOffset, pos.z);
        this.playerCollider.end.set(pos.x, pos.y + crouchJumpOffset + playerHeight - capsuleRadius, pos.z);
        const r = this.worldOctree.capsuleIntersect(this.playerCollider);
        if (r) {
          pos.addScaledVector(r.normal, r.depth);
          if (r.normal.y > 0.5) stepOnGround = true;
        } else {
          break;
        }
      }

      // Use step-up result only if it placed us higher (actually stepped up)
      if (stepOnGround && pos.y > normalPos.y + 0.05) {
        onGround = true;
      } else {
        // Step-up didn't help, revert to normal collision result
        pos.copy(normalPos);
        vel.copy(normalVel);
      }
    }

    this.onGround = onGround;
    this.crouchJumpOffset = crouchJumpOffset;

    this.playerCollider.start.set(pos.x, pos.y + capsuleRadius + crouchJumpOffset, pos.z);
    this.playerCollider.end.set(pos.x, pos.y + crouchJumpOffset + playerHeight - capsuleRadius, pos.z);
  }

  // Debug wireframe overlay of the live hitboxes (toggle with H). Red=head,
  // green=torso, blue=limbs. Lets us confirm head/chest/limb alignment vs the model.
  _updateHitboxDebug(hitboxSets) {
    const THREE = this.THREE;
    if (!this.hitboxDebugGroup) {
      this.hitboxDebugGroup = new THREE.Group();
      this.hitboxDebugGroup.visible = !!this.hitboxDebugEnabled;
      this.scene.add(this.hitboxDebugGroup);
      this.hitboxDebugMeshes = {};
    }
    if (!this.hitboxDebugEnabled) return;
    const colorFor = (z) => (z === 'head' ? 0xff2222 : (z === 'chest' || z === 'stomach') ? 0x22ff22 : 0x3399ff);
    const up = new THREE.Vector3(0, 1, 0);
    for (const [setId, set] of Object.entries(hitboxSets)) {
      for (const hb of set) {
        const key = setId + '_' + hb.zone;
        let mesh = this.hitboxDebugMeshes[key];
        if (!mesh) {
          let geo;
          if (hb.shape === 'sphere') geo = new THREE.SphereGeometry(hb.radius, 12, 10);
          else if (hb.shape === 'box') geo = new THREE.BoxGeometry(hb.halfExtents.x * 2, hb.halfExtents.y * 2, hb.halfExtents.z * 2);
          else geo = new THREE.CylinderGeometry(hb.radius, hb.radius, 1, 10, 1, true);
          mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: colorFor(hb.zone), wireframe: true, depthTest: false, transparent: true, opacity: 0.8 }));
          mesh.renderOrder = 999;
          this.hitboxDebugGroup.add(mesh);
          this.hitboxDebugMeshes[key] = mesh;
        }
        if (hb.shape === 'capsule') {
          if (!hb.endA || !hb.endB) continue;
          const va = new THREE.Vector3(hb.endA.x, hb.endA.y, hb.endA.z);
          const vb = new THREE.Vector3(hb.endB.x, hb.endB.y, hb.endB.z);
          const dir = vb.clone().sub(va);
          const len = dir.length() || 0.01;
          mesh.position.copy(va).add(vb).multiplyScalar(0.5);
          mesh.scale.set(1, len, 1);
          mesh.quaternion.setFromUnitVectors(up, dir.normalize());
        } else {
          mesh.position.set(hb.center.x, hb.center.y, hb.center.z);
        }
      }
    }
  }

  // Attach a clone of the rifle to a soldier's right-hand bone (third-person).
  _armSoldier(instance) {
    if (!instance || !this.tpRifleProto || !instance.bones) return;
    const handR = instance.bones['Hand.R'];
    if (!handR) { console.warn('arm: Hand.R not found'); return; }
    if (instance.tpWeapon && instance.tpWeapon.parent) instance.tpWeapon.parent.remove(instance.tpWeapon);
    const w = this.tpRifleProto.clone(true);
    const x = this.tpWeaponXform;
    w.scale.setScalar(x.scale);
    w.position.set(x.pos[0], x.pos[1], x.pos[2]);
    w.rotation.set(x.rot[0], x.rot[1], x.rot[2]);
    w.traverse((c) => { if (c.isMesh) c.frustumCulled = false; });
    handR.add(w);
    instance.tpWeapon = w;
    // Original grip transform (local to Hand.R) — used to re-pin the gun each
    // frame when the back-hand wrist roll is applied, so it can't drift/spin.
    instance.gunRestPos = w.position.clone();
    instance.gunRestQuat = w.quaternion.clone();
    instance.armed = true; // use the rifle (weapon-carry) mocap clips

    // Foregrip target for left-hand IK: a point on the rifle (forward along the
    // barrel, in gun-local metres) that the left hand will be solved onto.
    const fg = this.foregripOffset || [0.2, 0, 0];
    const grip = new this.THREE.Object3D();
    grip.position.set(fg[0], fg[1], fg[2]);
    w.add(grip);
    instance.leftHandTarget = grip;
  }

  _extractBoneWorldPositions(instance) {
    const bonePositions = {};
    if (!instance || !instance.bones) return bonePositions;

    for (const [name, bone] of Object.entries(instance.bones)) {
      const worldPos = new this.THREE.Vector3();
      bone.getWorldPosition(worldPos);
      bonePositions[name] = { x: worldPos.x, y: worldPos.y, z: worldPos.z };
    }

    return bonePositions;
  }

  _switchWeapon(weaponType) {
    if (!this.weaponSystem) return;

    // Use WeaponSystem to switch
    const success = this.weaponSystem.switchWeapon(weaponType);
    if (!success) return;

    // Update FP weapon visual
    const visualName = this._weaponTypeToVisualName(weaponType);
    if (this.fpWeapon && visualName) {
      // Drop any in-progress reload so it doesn't keep dipping the new weapon.
      this.fpWeapon.cancelReload();
      this.fpWeapon.switchWeapon(visualName);
    }

    this._updateAmmoHUD();
    this._updateScope(); // un-scope if we switched away from the sniper
  }

  /**
   * Sync each live mannequin's hitboxes to its CURRENT bone world positions.
   * Called every sim tick AND right before the player's hitscan, so a fast scoped
   * shot at a moving target tests where the model actually is this instant (not a
   * tick behind, which made far/zoomed headshots on moving bots slip through).
   */
  _refreshHitboxes() {
    if (!this.hitboxSets) return;
    const pairs = [
      [this.testMannequinRed, 'mannequin_red'],
      [this.testMannequinBlue, 'mannequin_blue'],
      [this.testMannequinGreen, 'mannequin_green'],
    ];
    for (const [inst, id] of pairs) {
      if (inst && this.hitboxSets[id]) {
        updateHitboxPositions(this.hitboxSets[id], this._extractBoneWorldPositions(inst));
      }
    }
  }

  _weaponTypeToVisualName(weaponType) {
    switch (weaponType) {
      case WeaponType.AK47:    return 'rifle';
      case WeaponType.M4A1:    return 'bullpup'; // distinct rifle model from the AK
      case WeaponType.SMG:     return 'smg';
      case WeaponType.SHOTGUN: return 'shotgun';
      case WeaponType.SNIPER:  return 'sniper';
      case WeaponType.PISTOL:  return 'pistol';
      case WeaponType.REVOLVER:return 'revolver';
      case WeaponType.KNIFE:   return 'knife';
      default:                 return 'rifle';
    }
  }

  _startReload() {
    if (!this.weaponSystem) return;

    const success = this.weaponSystem.startReload();
    if (!success) return;

    this._updateAmmoHUD();

    // Start CS:S-style reload animation on FP weapon
    if (this.fpWeapon) {
      const config = this.weaponSystem.getWeaponConfig();
      const isEmpty = this.weaponSystem.getAmmo().magazine === 0;

      this.fpWeapon.startReload(
        isEmpty,
        () => {
          // Ammo refills mid-animation (handled by WeaponSystem)
          this._updateAmmoHUD();
        },
        () => {
          // Animation complete
          this._updateAmmoHUD();
        }
      );
    }
  }

  _updateAmmoHUD() {
    if (!this.ammoEl || !this.weaponSystem) return;

    const weaponType = this.weaponSystem.currentWeapon;
    const ammo = this.weaponSystem.getAmmo();
    const config = this.weaponSystem.getWeaponConfig();

    // Weapon name display
    const weaponName = weaponType.toString();

    if (!config.hasAmmo) {
      this.ammoEl.innerHTML = `<div class="weapon-name">${weaponName}</div>`;
      return;
    }

    const isReloading = this.weaponSystem.state === 'RELOADING';
    if (isReloading) {
      this.ammoEl.innerHTML = `<div class="weapon-name">${weaponName}</div><div class="reloading">RELOADING...</div><div class="reserve">/ ${ammo.reserve}</div>`;
      return;
    }

    this.ammoEl.innerHTML = `<div class="weapon-name">${weaponName}</div><span class="mag">${ammo.magazine}</span> <span class="reserve">/ ${ammo.reserve}</span>`;
  }

  _fireWeapon() {
    if (!this.fpWeapon || !this.weaponSystem) return;

    const currentTime = performance.now() / 1000;

    // Use WeaponSystem instead of manual ammo tracking
    const fireResult = this.weaponSystem.fire(currentTime);
    if (!fireResult) return;

    // Trigger FP weapon visual effect
    this.fpWeapon.fire();
    if (this.sfx) this.sfx.shoot(this.fpWeapon.currentWeaponName, 0.85);

    // Recoil PATTERN drives viewpunch only (it kicks the view, which recovers via
    // decay). The bullet itself goes where the crosshair points + inaccuracy
    // spread — NOT the pattern. Applying the pattern to the bullet too made even
    // the first shot fly ~0.6deg high, which clears a far-away head hitbox.
    const patternDelta = getRecoilAngle(fireResult.weaponType, fireResult.shotIndex);
    this.camera_pitch += patternDelta.y * (Math.PI / 180);
    this.camera_yaw += patternDelta.x * (Math.PI / 180);
    this.punchAngle.x += patternDelta.y * (Math.PI / 180);
    this.punchAngle.y += patternDelta.x * (Math.PI / 180);

    // Construct hitscan ray from camera
    const rayOrigin = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };

    const camDir = new this.THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    // Inaccuracy spread only (zero when standing still with a settled crosshair,
    // so a dead-on shot lands at any range). Scoped sniper is braced = pinpoint.
    const spread = (this.scoped || !this.accuracyModel)
      ? { x: 0, y: 0 }
      : this.accuracyModel.getSpreadAngle(fireResult.weaponType, this.input.crouch);
    const pitchAxis = new this.THREE.Vector3(1, 0, 0);
    pitchAxis.applyQuaternion(this.camera.quaternion);
    camDir.applyAxisAngle(pitchAxis, spread.y * Math.PI / 180);
    const yawAxis = new this.THREE.Vector3(0, 1, 0);
    camDir.applyAxisAngle(yawAxis, spread.x * Math.PI / 180);

    camDir.normalize();
    const rayDir = { x: camDir.x, y: camDir.y, z: camDir.z };

    // Sync hitboxes to the bots' current positions THIS instant (they move in the
    // render loop; the tick-based update can be a frame behind for a fast shot).
    this._refreshHitboxes();

    // Test hitscan against all targets
    const targets = [];
    if (this.hitboxSets) {
      for (const [id, hbs] of Object.entries(this.hitboxSets)) {
        targets.push({ id, hitboxes: hbs });
      }
    }

    const hit = testHitscan(rayOrigin, rayDir, targets, 'local');

    // Tracer (every 4th bullet)
    if (this.combatFeedback && fireResult.shotIndex % 4 === 0) {
      const endPos = hit
        ? hit.hitPosition
        : {
            x: rayOrigin.x + rayDir.x * 100,
            y: rayOrigin.y + rayDir.y * 100,
            z: rayOrigin.z + rayDir.z * 100
          };
      this.combatFeedback.spawnTracer(
        new this.THREE.Vector3(rayOrigin.x, rayOrigin.y, rayOrigin.z),
        new this.THREE.Vector3(endPos.x, endPos.y, endPos.z)
      );
    }

    if (hit) {
      // Apply damage
      const weaponConfig = this.weaponSystem.getWeaponConfig();
      const damageResult = this.damageSystem.applyDamage('local', hit, weaponConfig);

      if (damageResult) {
        // Visual feedback: blood spray
        const hitPos3 = new this.THREE.Vector3(hit.hitPosition.x, hit.hitPosition.y, hit.hitPosition.z);
        const hitDir3 = new this.THREE.Vector3(rayDir.x, rayDir.y, rayDir.z);
        this.combatFeedback.onPlayerHit(hitPos3, hitDir3, hit.isHeadshot);

        // Log damage for debug
        console.log(`HIT ${hit.targetId} [${hit.zone}] ${damageResult.damageDealt} dmg (${damageResult.remainingHp} HP left)`);

        // Track for debug HUD
        this.debugDamageLog.push({
          zone: hit.zone.toUpperCase(),
          damage: damageResult.damageDealt,
          remainingHp: damageResult.remainingHp,
          targetId: hit.targetId.replace('mannequin_', '').toUpperCase(),
          time: performance.now() / 1000,
        });
        if (this.debugDamageLog.length > 5) this.debugDamageLog.shift();

        // Hit zone indicator
        this.debugHitIndicator = {
          zone: damageResult.isHeadshot ? 'HEAD' : hit.zone.toUpperCase(),
          time: performance.now() / 1000,
          isHeadshot: damageResult.isHeadshot,
          killed: damageResult.killed,
        };

        // If killed, trigger ragdoll
        if (damageResult.killed) {
          console.log(`KILLED ${hit.targetId}!`);
          const instanceMap = {
            mannequin_red: 'testMannequinRed',
            mannequin_blue: 'testMannequinBlue',
            mannequin_green: 'testMannequinGreen',
          };
          const propName = instanceMap[hit.targetId];
          const instance = propName ? this[propName] : null;
          if (instance) {
            // Clean collapse: keep the soldier mesh, topple it to the ground in
            // its frozen pose (the Bot syncs to DEAD next frame and stops driving it).
            this._startDeathCollapse(instance);
            if (propName) this[propName] = null; // stop live targeting / hitbox updates
          }
        }
      }
    } else {
      // No player hit — test environment (wall/floor hit)
      const raycaster = new this.THREE.Raycaster(
        new this.THREE.Vector3(rayOrigin.x, rayOrigin.y, rayOrigin.z),
        new this.THREE.Vector3(rayDir.x, rayDir.y, rayDir.z),
        0.1,
        200
      );
      // Raycast ONLY the environment (the map), not the whole scene — the scene
      // contains combat-feedback Sprites which throw without raycaster.camera.
      raycaster.camera = this.camera; // safety for any sprite encountered
      const worldHits = raycaster.intersectObject(this.mapScene || this.scene, true);
      if (worldHits.length > 0 && this.combatFeedback) {
        const wh = worldHits[0];
        this.combatFeedback.onEnvironmentHit(wh.point, wh.face?.normal || new this.THREE.Vector3(0, 1, 0));
        if (wh.object?.isMesh) {
          this.combatFeedback.addBulletDecal(wh.point, wh.face?.normal || new this.THREE.Vector3(0, 1, 0), wh.object);
        }
      }
    }

    // Update ammo HUD
    this._updateAmmoHUD();
  }

  _updateDebugHUD(currentTime) {
    const lines = [];

    // Header
    lines.push('=== COMBAT DEBUG HUD ===');
    lines.push('');

    // Section 1: Damage Log (last 5 hits)
    lines.push('[DAMAGE LOG]');
    if (this.debugDamageLog.length === 0) {
      lines.push('  (no hits yet)');
    } else {
      for (const entry of this.debugDamageLog) {
        const age = (currentTime - entry.time).toFixed(1);
        if (entry.targetId === 'RESPAWN') {
          lines.push(`  -- MANNEQUINS RESPAWNED --`);
        } else {
          lines.push(`  ${entry.targetId} [${entry.zone}] ${entry.damage} dmg -> ${entry.remainingHp} HP  (${age}s ago)`);
        }
      }
    }
    lines.push('');

    // Section 2: Weapon State
    lines.push('[WEAPON STATE]');
    if (this.weaponSystem) {
      const wt = this.weaponSystem.currentWeapon;
      const ws = this.weaponSystem.state;
      const ammo = this.weaponSystem.getAmmo();
      const config = this.weaponSystem.getWeaponConfig();
      if (config.hasAmmo) {
        lines.push(`  Weapon: ${wt}  State: ${ws}`);
        lines.push(`  Ammo: ${ammo.magazine}/${config.magazine} | Reserve: ${ammo.reserve}`);
      } else {
        lines.push(`  Weapon: ${wt}  State: ${ws}`);
        lines.push(`  Ammo: N/A (melee)`);
      }
    } else {
      lines.push('  (no weapon system)');
    }
    lines.push('');

    // Section 3: Accuracy
    lines.push('[ACCURACY]');
    if (this.accuracyModel) {
      const acc = this.accuracyModel.accuracy.toFixed(3);
      const speed = Math.hypot(this.vel.x, this.vel.z);
      const speedMs = speed.toFixed(2);
      const ground = this.onGround ? 'YES' : 'NO';
      const crouch = this.input.crouch ? 'YES' : 'NO';
      lines.push(`  Accuracy: ${acc}  Speed: ${speedMs} m/s`);
      lines.push(`  On Ground: ${ground}  Crouching: ${crouch}`);
    } else {
      lines.push('  (no accuracy model)');
    }
    lines.push('');

    // Section 4: Recoil
    lines.push('[RECOIL]');
    if (this.weaponSystem) {
      const sprayIdx = this.weaponSystem.shotsFired;
      const px = (this.punchAngle.x * (180 / Math.PI)).toFixed(2);
      const py = (this.punchAngle.y * (180 / Math.PI)).toFixed(2);
      lines.push(`  Spray Index: ${sprayIdx}/30  Punch: (${px}, ${py}) deg`);
    } else {
      lines.push('  (no weapon system)');
    }
    lines.push('');

    // Section 5: Mannequin HP
    lines.push('[MANNEQUIN HP]');
    if (this.damageSystem) {
      const redH = this.damageSystem.getHealth('mannequin_red');
      const blueH = this.damageSystem.getHealth('mannequin_blue');
      if (redH) {
        const alive = redH.alive ? 'ALIVE' : 'DEAD';
        const helmet = redH.hasHelmet ? '+HELMET' : '';
        const tag = redH.tagTimeRemaining > 0 ? ` TAG:${redH.tagSpeedMultiplier.toFixed(2)}` : '';
        lines.push(`  RED:  ${redH.hp.toFixed(0)} HP | ${redH.armor.toFixed(0)} AP ${helmet} [${alive}]${tag}`);
      }
      if (blueH) {
        const alive = blueH.alive ? 'ALIVE' : 'DEAD';
        const helmet = blueH.hasHelmet ? '+HELMET' : '';
        const tag = blueH.tagTimeRemaining > 0 ? ` TAG:${blueH.tagSpeedMultiplier.toFixed(2)}` : '';
        lines.push(`  BLUE: ${blueH.hp.toFixed(0)} HP | ${blueH.armor.toFixed(0)} AP ${helmet} [${alive}]${tag}`);
      }
    } else {
      lines.push('  (no damage system)');
    }
    lines.push('');

    // Section 6: Hit Indicator
    lines.push('[HIT INDICATOR]');
    if (this.debugHitIndicator) {
      const age = currentTime - this.debugHitIndicator.time;
      if (age < this.debugHitIndicatorDuration) {
        const fade = 1.0 - (age / this.debugHitIndicatorDuration);
        const opacity = Math.round(fade * 100);
        let label = this.debugHitIndicator.zone;
        if (this.debugHitIndicator.isHeadshot) label = '*** HEADSHOT ***';
        if (this.debugHitIndicator.killed) label += ' -> KILL';
        lines.push(`  >> ${label} << (${opacity}%)`);
      } else {
        lines.push('  (none)');
        this.debugHitIndicator = null;
      }
    } else {
      lines.push('  (none)');
    }

    lines.push('');
    lines.push('[Y] Respawn  [1] Toggle AK/M4  [`] Close');

    this.debugHudEl.textContent = lines.join('\n');
  }

  start() {
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop() {
    if (!this.running) return;

    const now = performance.now();
    let delta = (now - this.last) / 1000;
    this.last = now;
    this.acc += delta;

    // Fixed timestep simulation
    while (this.acc >= this.dt) {
      this._simulateTick(this.dt);
      this.acc -= this.dt;
    }

    // Step ragdoll physics
    if (this.ragdollSystem) {
      this.ragdollSystem.step(this.dt);
    }

    // Update combat feedback (visual effects)
    if (this.combatFeedback) {
      this.combatFeedback.update(delta);
    }

    // Update camera (crouch-jump raises viewpoint when crouching in air)
    const eyeHeight = this.input.crouch ? this.eyeHeightCrouching : this.eyeHeightStanding;
    const cjOffset = this.crouchJumpOffset || 0;
    this.camera.position.set(this.pos.x, this.pos.y + eyeHeight + cjOffset, this.pos.z);

    // Apply camera rotation
    const THREE = this.THREE;
    const euler = new THREE.Euler(this.camera_pitch, this.camera_yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Update opponent bots (roam, perceive the player, and engage).
    if (this.bots && this.bots.length) {
      const time = now / 1000;
      const localHealth = this.damageSystem ? this.damageSystem.getHealth('local') : null;
      const botCtx = {
        playerPos: this.pos,
        playerAlive: localHealth ? localHealth.alive : true,
        canSee: (eye, target) => this._botCanSee(eye, target),
        fire: (bot, muzzle) => this._botFire(bot, muzzle),
      };
      let aliveCount = 0;
      for (const bot of this.bots) {
        // Player kills route through the damage system; sync the bot so a dead
        // soldier stops moving and firing (no more shots from mid-air).
        if (bot.alive && this.damageSystem) {
          const h = this.damageSystem.getHealth(bot.id);
          if (h && !h.alive) bot.markDead();
        }
        if (bot.alive) { bot.update(delta, time, botCtx); aliveCount++; }
      }
      this._updateRound(delta, aliveCount);
    }

    // Update ragdoll visuals
    if (this.ragdollSystem) {
      this.ragdollSystem.updateVisuals();
    }

    // Advance death collapses (toppling dead soldiers)
    this._updateDeathCollapses(delta);

    // Update status display
    if (this.statusEl) {
      const speed = Math.hypot(this.vel.x, this.vel.z);
      const px = this.pos.x.toFixed(2);
      const py = this.pos.y.toFixed(2);
      const pz = this.pos.z.toFixed(2);
      const vx = this.vel.x.toFixed(2);
      const vy = this.vel.y.toFixed(2);
      const vz = this.vel.z.toFixed(2);
      const sp = speed.toFixed(2);
      const ground = this.onGround ? 'Y' : 'N';

      let statusText = `pos: ${px}, ${py}, ${pz}\nvel: ${vx}, ${vy}, ${vz}\nspeed: ${sp} m/s | ground: ${ground}`;

      if (this.weaponSystem) {
        const weapon = this.weaponSystem.currentWeapon;
        const shotsFired = this.weaponSystem.shotsFired;
        const accuracy = this.accuracyModel ? (this.accuracyModel.accuracy * 100).toFixed(0) : '100';
        statusText += `\nweapon: ${weapon} | shots: ${shotsFired} | acc: ${accuracy}%`;
      }

      if (this.damageSystem) {
        const localHealth = this.damageSystem.getHealth('local');
        if (localHealth) {
          statusText += `\nYOU: ${localHealth.hp.toFixed(0)} HP | ${localHealth.armor.toFixed(0)} armor`;
        }
        const redHealth = this.damageSystem.getHealth('mannequin_red');
        const blueHealth = this.damageSystem.getHealth('mannequin_blue');
        if (redHealth) {
          statusText += `\nRed: ${redHealth.hp.toFixed(0)} HP | ${redHealth.armor.toFixed(0)} armor`;
        }
        if (blueHealth) {
          statusText += `\nBlue: ${blueHealth.hp.toFixed(0)} HP | ${blueHealth.armor.toFixed(0)} armor`;
        }
        const greenHealth = this.damageSystem.getHealth('mannequin_green');
        if (greenHealth) {
          statusText += `\nGreen: ${greenHealth.hp.toFixed(0)} HP | ${greenHealth.armor.toFixed(0)} armor`;
        }
      }

      this.statusEl.textContent = statusText;
    }

    // Update combat debug HUD
    if (this.debugHudEnabled && this.debugHudEl) {
      this._updateDebugHUD(now / 1000);
    }

    // Two-pass rendering: world scene + first-person weapon
    this.renderer.clear(); // Clear color + depth

    // Pass 1: World scene (map + mannequins)
    this.renderer.render(this.scene, this.camera);

    // Full-auto firing
    if (this.fireHeld && this.fpWeapon && this.weaponSystem) {
      this.fireTimer += delta;
      const config = this.weaponSystem.getWeaponConfig();
      const rate = config.fireRate;
      while (this.fireTimer >= rate && this.weaponSystem.canFire()) {
        try {
          this._fireWeapon();
        } catch (e) {
          console.error('_fireWeapon error:', e);
        }
        this.fireTimer -= rate;
      }
    }

    // CS:S-style viewpunch decay — exponential, always active
    // Decays gradually while firing (view drifts up), faster when not firing
    const decayRate = this.fireHeld ? this.punchDecay * 0.3 : this.punchDecay;
    const decayFactor = Math.exp(-decayRate * delta);
    const prevPunchX = this.punchAngle.x;
    const prevPunchY = this.punchAngle.y;
    this.punchAngle.x *= decayFactor;
    this.punchAngle.y *= decayFactor;

    // Apply the decay as camera recovery (move view back by amount decayed)
    this.camera_pitch -= (prevPunchX - this.punchAngle.x);
    this.camera_yaw -= (prevPunchY - this.punchAngle.y);

    // Zero out tiny values
    if (Math.abs(this.punchAngle.x) < 0.0001) this.punchAngle.x = 0;
    if (Math.abs(this.punchAngle.y) < 0.0001) this.punchAngle.y = 0;

    // ADS: smooth FOV transition (sniper scope zooms 4x via scopeFov)
    const targetFov = this.scoped ? this.scopeFov : (this.aiming ? this.adsFov : this.normalFov);
    this.currentFov += (targetFov - this.currentFov) * Math.min(1, delta * 12);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
    if (this.fpWeapon) {
      this.fpWeapon.weaponCamera.fov = this.currentFov;
      this.fpWeapon.weaponCamera.updateProjectionMatrix();
    }

    // Pass 2: First-person weapon (renders on top, no depth conflict with walls)
    if (this.fpWeapon) {
      const speed = Math.hypot(this.vel.x, this.vel.z);
      this.fpWeapon.update(delta, {
        speed: speed,
        onGround: this.onGround,
        crouching: this.input.crouch,
        aiming: this.aiming,
      });
      this.fpWeapon.render(this.camera.quaternion);
    }

    requestAnimationFrame(() => this._loop());
  }
}
