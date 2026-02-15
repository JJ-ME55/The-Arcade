export default class MovementVisualizer {
  constructor(opts = {}) {
    this.THREE = opts.THREE;
    this.GLTFLoader = opts.GLTFLoader;
    this.Octree = opts.Octree;
    this.Capsule = opts.Capsule;
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

    // Config adjusted to meter scale (map is in Blender meters, not HU)
    this.cfg = {
      groundAccel: 5.0,
      groundFriction: 4.0,
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

  _loadMap() {
    const THREE = this.THREE;
    const GLTFLoader = this.GLTFLoader;
    const Octree = this.Octree;

    const loader = new GLTFLoader();
    const mapStartTime = performance.now();

    loader.load(
      'arena_map.glb',
      (gltf) => {
        const mapLoadTime = performance.now() - mapStartTime;
        console.log(`Map loaded in ${mapLoadTime.toFixed(1)}ms`);

        // Add map to scene
        this.scene.add(gltf.scene);

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

        // Extract spawn points
        this._extractSpawnPoints(gltf.scene);

        // Position player at spawn
        if (this.spawnRed) {
          this.pos.copy(this.spawnRed);
          this.pos.y += 1.0; // Raise player to standing position above spawn point
          console.log(`Player spawned at red spawn: (${this.pos.x.toFixed(2)}, ${this.pos.y.toFixed(2)}, ${this.pos.z.toFixed(2)})`);
        } else {
          console.warn('No spawn points found, using fallback position');
        }

        // Update status
        if (this.statusEl) {
          this.statusEl.textContent = 'Map loaded. Click to play.';
        }

        // Start game loop
        this.start();
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        if (this.statusEl) {
          this.statusEl.textContent = `Loading map... ${percent}%`;
        }
      },
      (error) => {
        console.error('Error loading map:', error);
        if (this.statusEl) {
          this.statusEl.textContent = 'Error loading map. Check console.';
        }
      }
    );
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

  _addGridLines(scene) {
    // Add world-space grid lines to all materials via onBeforeCompile
    // Recreates the dev-texture block pattern lost during flat-color GLB export
    const processed = new Set();
    scene.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mat = obj.material;
      if (processed.has(mat.uuid)) return;
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
    });
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

    // Request pointer lock
    document.addEventListener('click', () => {
      document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
      document.body.requestPointerLock();
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement || document.mozPointerLockElement) {
        this.camera_yaw -= e.movementX * this.mouse_sens;
        this.camera_pitch -= e.movementY * this.mouse_sens;
        // Clamp pitch to prevent flipping
        this.camera_pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera_pitch));
      }
    });
  }

  _initInput() {
    this.input = { forward: 0, right: 0, jumpPressed: false, jumpHeld: false, crouch: false };
    const keys = {};
    window.addEventListener('keydown', (e) => {
      const prev = !!keys[e.code];
      if (e.code === 'Space') this.input.jumpHeld = true;
      if (e.code === 'ShiftLeft') this.input.crouch = true;
      if (e.code === 'Space' && !prev) this.input.jumpPressed = true;
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
      wishspeed = cfg.maxSpeed;
    }

    // Crouch slows movement by 50%
    if (this.input.crouch) wishspeed *= 0.5;

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

      // Gravity
      vel.y += cfg.gravity * dt;
    }

    // Integrate velocity
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;
    pos.z += vel.z * dt;

    // Collision detection and resolution
    this._resolveCollision();
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

    // Multiple collision iterations to handle corners
    let onGround = false;
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
        }
      }
    }

    this.onGround = onGround;
    this.crouchJumpOffset = crouchJumpOffset;

    this.playerCollider.start.set(pos.x, pos.y + capsuleRadius + crouchJumpOffset, pos.z);
    this.playerCollider.end.set(pos.x, pos.y + crouchJumpOffset + playerHeight - capsuleRadius, pos.z);
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

    // Update camera (crouch-jump raises viewpoint when crouching in air)
    const eyeHeight = this.input.crouch ? this.eyeHeightCrouching : this.eyeHeightStanding;
    const cjOffset = this.crouchJumpOffset || 0;
    this.camera.position.set(this.pos.x, this.pos.y + eyeHeight + cjOffset, this.pos.z);

    // Apply camera rotation
    const THREE = this.THREE;
    const euler = new THREE.Euler(this.camera_pitch, this.camera_yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

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
      this.statusEl.textContent = `pos: ${px}, ${py}, ${pz}\nvel: ${vx}, ${vy}, ${vz}\nspeed: ${sp} m/s | ground: ${ground}`;
    }

    // Render
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this._loop());
  }
}
