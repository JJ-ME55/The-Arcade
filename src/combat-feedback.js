/**
 * CombatFeedback - Visual combat effects system with object pooling
 *
 * Features:
 * - Blood particle spray on player hits
 * - Helmet spark flash on headshots
 * - Environment sparks on wall/floor hits
 * - Bullet decals projected onto geometry
 * - Bullet tracers (every Nth shot)
 * - Enemy muzzle flashes (third-person)
 *
 * All effects use pre-allocated pools for 60fps performance during firefights.
 */

export default class CombatFeedback {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;

    // Particle pools
    this.bloodPool = [];
    this.bloodActive = [];
    this.sparkPool = [];
    this.sparkActive = [];
    this.helmetSparkPool = [];
    this.helmetSparkActive = [];
    this.tracerPool = [];
    this.tracerActive = [];
    this.enemyFlashPool = [];
    this.enemyFlashActive = [];

    // Decal tracking
    this.decals = []; // { mesh, createdAt }
    this.maxDecals = 100;
    this.decalLifetime = 60; // seconds

    // Initialize all pools
    this._initBloodPool();
    this._initSparkPool();
    this._initHelmetSparkPool();
    this._initTracerPool();
    this._initEnemyFlashPool();
  }

  /**
   * Initialize blood particle pool (300 sprites)
   */
  _initBloodPool() {
    const THREE = this.THREE;

    // Create blood splatter texture
    const bloodTexture = this._createBloodTexture();

    for (let i = 0; i < 300; i++) {
      const material = new THREE.SpriteMaterial({
        map: bloodTexture,
        blending: THREE.NormalBlending,
        transparent: true,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.scene.add(sprite);
      this.bloodPool.push(sprite);
    }

    console.log('CombatFeedback: Blood pool initialized (300 sprites)');
  }

  /**
   * Create procedural blood splatter texture
   */
  _createBloodTexture() {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Dark red irregular splatter using overlapping circles
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 64, 64);

    const darkRed = '#8b0000';
    ctx.fillStyle = darkRed;

    // Random overlapping circles for irregular shape
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = Math.random() * 15 + 10;
      const x = 32 + Math.cos(angle) * dist;
      const y = 32 + Math.sin(angle) * dist;
      const radius = Math.random() * 8 + 6;

      ctx.globalAlpha = 0.7 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central splatter
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(32, 32, 16, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Initialize environment spark pool (200 sprites)
   */
  _initSparkPool() {
    const THREE = this.THREE;

    // Create spark texture (bright orange/yellow)
    const sparkTexture = this._createSparkTexture();

    for (let i = 0; i < 200; i++) {
      const material = new THREE.SpriteMaterial({
        map: sparkTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.scene.add(sprite);
      this.sparkPool.push(sprite);
    }

    console.log('CombatFeedback: Spark pool initialized (200 sprites)');
  }

  /**
   * Create procedural spark texture
   */
  _createSparkTexture() {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Orange/yellow radial gradient
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 100, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 150, 50, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Initialize helmet spark pool (5 sprites for headshot flash)
   */
  _initHelmetSparkPool() {
    const THREE = this.THREE;

    // Bright yellow-white flash texture
    const flashTexture = this._createHelmetFlashTexture();

    for (let i = 0; i < 5; i++) {
      const material = new THREE.SpriteMaterial({
        map: flashTexture,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.scene.add(sprite);
      this.helmetSparkPool.push(sprite);
    }

    console.log('CombatFeedback: Helmet spark pool initialized (5 sprites)');
  }

  /**
   * Create helmet flash texture (bright yellow-white)
   */
  _createHelmetFlashTexture() {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Bright radial gradient
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 150, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Initialize bullet tracer pool (20 lines)
   */
  _initTracerPool() {
    const THREE = this.THREE;

    for (let i = 0; i < 20; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points * 3 coords
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: 0xffdd44, // Yellow-orange
        transparent: true,
        linewidth: 1,
      });

      const line = new THREE.Line(geometry, material);
      line.visible = false;
      this.scene.add(line);
      this.tracerPool.push(line);
    }

    console.log('CombatFeedback: Tracer pool initialized (20 lines)');
  }

  /**
   * Initialize enemy muzzle flash pool (8 sprites)
   */
  _initEnemyFlashPool() {
    const THREE = this.THREE;

    // Same radial gradient as FP weapon muzzle flash
    const flashTexture = this._createMuzzleFlashTexture();

    for (let i = 0; i < 8; i++) {
      const material = new THREE.SpriteMaterial({
        map: flashTexture,
        blending: THREE.AdditiveBlending,
        color: 0xffaa44,
        transparent: true,
        depthTest: false,
      });

      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.scene.add(sprite);
      this.enemyFlashPool.push(sprite);
    }

    console.log('CombatFeedback: Enemy flash pool initialized (8 sprites)');
  }

  /**
   * Create muzzle flash texture (same as FirstPersonWeapon)
   */
  _createMuzzleFlashTexture() {
    const THREE = this.THREE;
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

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Create bullet hole texture
   */
  _createBulletHoleTexture() {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 32, 32);

    // Dark circle (bullet hole)
    ctx.fillStyle = 'rgba(20, 20, 20, 1)';
    ctx.beginPath();
    ctx.arc(16, 16, 6, 0, Math.PI * 2);
    ctx.fill();

    // Radial cracks pattern
    ctx.strokeStyle = 'rgba(40, 40, 40, 0.8)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const startDist = 6;
      const endDist = 10 + Math.random() * 4;

      const startX = 16 + Math.cos(angle) * startDist;
      const startY = 16 + Math.sin(angle) * startDist;
      const endX = 16 + Math.cos(angle) * endDist;
      const endY = 16 + Math.sin(angle) * endDist;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Spawn blood particles on player hit
   * @param {THREE.Vector3} position - Hit position
   * @param {THREE.Vector3} direction - Shot direction (normalized)
   * @param {boolean} isHeadshot - True for headshot (more particles + helmet spark)
   */
  onPlayerHit(position, direction, isHeadshot) {
    const THREE = this.THREE;

    // Spawn more particles for headshot
    const particleCount = isHeadshot ? (10 + Math.floor(Math.random() * 3)) : (5 + Math.floor(Math.random() * 4));
    const scaleRange = isHeadshot ? [0.15, 0.2] : [0.1, 0.15];

    for (let i = 0; i < particleCount; i++) {
      const sprite = this._acquireFromPool(this.bloodPool, this.bloodActive);
      if (!sprite) break; // Pool exhausted

      // Position at hit point
      sprite.position.copy(position);

      // Random scale
      const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
      sprite.scale.set(scale, scale, 1);

      // Velocity: opposite shot direction + random spread + upward bias
      const spreadAngle = 0.5; // 0.5 radian cone
      const randomDir = new THREE.Vector3(
        (Math.random() - 0.5) * spreadAngle,
        (Math.random() - 0.5) * spreadAngle + 0.2, // Upward bias
        (Math.random() - 0.5) * spreadAngle
      );

      const velocity = direction.clone().negate().add(randomDir).normalize();
      const speed = 2 + Math.random() * 2; // 2-4 m/s
      velocity.multiplyScalar(speed);

      // Particle state
      sprite.userData = {
        velocity: velocity,
        lifetime: 1.0 + Math.random() * 0.5, // 1.0-1.5s
        age: 0,
        gravity: -9.8,
      };

      sprite.visible = true;
      sprite.material.opacity = 1.0;
    }

    // Helmet spark on headshot
    if (isHeadshot) {
      const sprite = this._acquireFromPool(this.helmetSparkPool, this.helmetSparkActive);
      if (sprite) {
        sprite.position.copy(position);
        sprite.scale.set(0.1, 0.1, 1);
        sprite.userData = {
          lifetime: 0.08, // 80ms
          age: 0,
          pulsing: true,
        };
        sprite.visible = true;
        sprite.material.opacity = 1.0;
      }
    }
  }

  /**
   * Spawn environment sparks on wall/floor hit
   * @param {THREE.Vector3} position - Hit position
   * @param {THREE.Vector3} normal - Surface normal
   */
  onEnvironmentHit(position, normal) {
    const THREE = this.THREE;

    const sparkCount = 3 + Math.floor(Math.random() * 3); // 3-5 sparks

    for (let i = 0; i < sparkCount; i++) {
      const sprite = this._acquireFromPool(this.sparkPool, this.sparkActive);
      if (!sprite) break; // Pool exhausted

      sprite.position.copy(position);

      // Random scale
      const scale = 0.03 + Math.random() * 0.03; // 0.03-0.06
      sprite.scale.set(scale, scale, 1);

      // Velocity: reflect off surface normal + random spread
      const spreadAngle = 0.4;
      const randomDir = new THREE.Vector3(
        (Math.random() - 0.5) * spreadAngle,
        (Math.random() - 0.5) * spreadAngle,
        (Math.random() - 0.5) * spreadAngle
      );

      // Reflect: velocity bounces off normal
      // For simplicity, use normal + random spread for outward direction
      const velocity = normal.clone().add(randomDir).normalize();
      const speed = 3 + Math.random() * 3; // 3-6 m/s
      velocity.multiplyScalar(speed);

      sprite.userData = {
        velocity: velocity,
        lifetime: 0.3 + Math.random() * 0.2, // 0.3-0.5s
        age: 0,
        gravity: -15, // Sparks fall faster than blood
      };

      sprite.visible = true;
      sprite.material.opacity = 1.0;
    }
  }

  /**
   * Add bullet decal projected onto geometry
   * @param {THREE.Vector3} position - Decal position
   * @param {THREE.Vector3} normal - Surface normal
   * @param {THREE.Mesh} targetMesh - Mesh to project decal onto
   */
  addBulletDecal(position, normal, targetMesh) {
    const THREE = this.THREE;

    // Skip if no target mesh (can't project decal)
    if (!targetMesh) return;

    // Create bullet hole texture if not already cached
    if (!this._bulletHoleTexture) {
      this._bulletHoleTexture = this._createBulletHoleTexture();
    }

    // Create decal geometry projected onto target mesh
    const orientation = new THREE.Euler();
    orientation.setFromVector3(normal);

    const size = new THREE.Vector3(0.08, 0.08, 0.05);

    // Import DecalGeometry (Three.js addon)
    // Note: In a real app, this would be imported at the top
    // For now, we check if it's available via THREE.DecalGeometry
    if (!THREE.DecalGeometry) {
      console.warn('DecalGeometry not available - skipping bullet decal');
      return;
    }

    const decalGeometry = new THREE.DecalGeometry(
      targetMesh,
      position,
      orientation,
      size
    );

    const decalMaterial = new THREE.MeshBasicMaterial({
      map: this._bulletHoleTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      opacity: 0.8,
    });

    const decalMesh = new THREE.Mesh(decalGeometry, decalMaterial);
    this.scene.add(decalMesh);

    // Track decal with creation time
    const now = performance.now() / 1000;
    this.decals.push({ mesh: decalMesh, createdAt: now });

    // Remove oldest decal if limit exceeded
    if (this.decals.length > this.maxDecals) {
      const oldest = this.decals.shift();
      this.scene.remove(oldest.mesh);
      oldest.mesh.geometry.dispose();
      oldest.mesh.material.dispose();
    }
  }

  /**
   * Spawn bullet tracer line
   * @param {THREE.Vector3} startPosition - Muzzle position
   * @param {THREE.Vector3} endPosition - Impact position (or max range)
   */
  spawnTracer(startPosition, endPosition) {
    const line = this._acquireFromPool(this.tracerPool, this.tracerActive);
    if (!line) return; // Pool exhausted

    // Set line geometry positions
    const positions = line.geometry.attributes.position.array;
    positions[0] = startPosition.x;
    positions[1] = startPosition.y;
    positions[2] = startPosition.z;
    positions[3] = endPosition.x;
    positions[4] = endPosition.y;
    positions[5] = endPosition.z;
    line.geometry.attributes.position.needsUpdate = true;

    // Tracer state
    line.userData = {
      startPos: startPosition.clone(),
      endPos: endPosition.clone(),
      lifetime: 0.15, // 0.15s
      age: 0,
    };

    line.visible = true;
    line.material.opacity = 1.0;
  }

  /**
   * Show enemy muzzle flash at position
   * @param {THREE.Vector3} position - World position of enemy muzzle
   */
  showEnemyMuzzleFlash(position) {
    const sprite = this._acquireFromPool(this.enemyFlashPool, this.enemyFlashActive);
    if (!sprite) return; // Pool exhausted

    sprite.position.copy(position);

    // Random scale
    const scale = 0.2 + Math.random() * 0.1; // 0.2-0.3
    sprite.scale.set(scale, scale, 1);

    // Random rotation (same as FP muzzle flash)
    sprite.material.rotation = Math.random() * Math.PI * 2;

    sprite.userData = {
      lifetime: 0.05, // 50ms
      age: 0,
    };

    sprite.visible = true;
    sprite.material.opacity = 1.0;
  }

  /**
   * Update all active particles
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    const now = performance.now() / 1000;

    // Update blood particles
    for (let i = this.bloodActive.length - 1; i >= 0; i--) {
      const sprite = this.bloodActive[i];
      const data = sprite.userData;

      data.age += dt;

      // Apply velocity and gravity
      sprite.position.x += data.velocity.x * dt;
      sprite.position.y += data.velocity.y * dt;
      sprite.position.z += data.velocity.z * dt;
      data.velocity.y += data.gravity * dt;

      // Fade out starting at 50% lifetime
      const fadeStart = data.lifetime * 0.5;
      if (data.age > fadeStart) {
        const fadeProgress = (data.age - fadeStart) / (data.lifetime - fadeStart);
        sprite.material.opacity = 1.0 - fadeProgress;
      }

      // Expired?
      if (data.age >= data.lifetime) {
        this._releaseToPool(this.bloodPool, this.bloodActive, i);
      }
    }

    // Update helmet sparks (headshot flash)
    for (let i = this.helmetSparkActive.length - 1; i >= 0; i--) {
      const sprite = this.helmetSparkActive[i];
      const data = sprite.userData;

      data.age += dt;

      // Scale pulse: 0.1 -> 0.25 -> 0
      const progress = data.age / data.lifetime;
      let scale;
      if (progress < 0.5) {
        scale = 0.1 + (0.15 * (progress / 0.5)); // 0.1 -> 0.25
      } else {
        scale = 0.25 * (1 - (progress - 0.5) / 0.5); // 0.25 -> 0
      }
      sprite.scale.set(scale, scale, 1);

      // Fade
      sprite.material.opacity = 1.0 - progress;

      // Expired?
      if (data.age >= data.lifetime) {
        this._releaseToPool(this.helmetSparkPool, this.helmetSparkActive, i);
      }
    }

    // Update environment sparks
    for (let i = this.sparkActive.length - 1; i >= 0; i--) {
      const sprite = this.sparkActive[i];
      const data = sprite.userData;

      data.age += dt;

      // Apply velocity and gravity
      sprite.position.x += data.velocity.x * dt;
      sprite.position.y += data.velocity.y * dt;
      sprite.position.z += data.velocity.z * dt;
      data.velocity.y += data.gravity * dt;

      // Rapid fade
      const fadeProgress = data.age / data.lifetime;
      sprite.material.opacity = 1.0 - fadeProgress;

      // Expired?
      if (data.age >= data.lifetime) {
        this._releaseToPool(this.sparkPool, this.sparkActive, i);
      }
    }

    // Update tracers
    for (let i = this.tracerActive.length - 1; i >= 0; i--) {
      const line = this.tracerActive[i];
      const data = line.userData;

      data.age += dt;

      // Tracer "slides" - start position moves toward end position
      const slideProgress = data.age / data.lifetime;
      const currentStart = data.startPos.clone().lerp(data.endPos, slideProgress);

      const positions = line.geometry.attributes.position.array;
      positions[0] = currentStart.x;
      positions[1] = currentStart.y;
      positions[2] = currentStart.z;
      line.geometry.attributes.position.needsUpdate = true;

      // Fade
      line.material.opacity = 1.0 - slideProgress;

      // Expired?
      if (data.age >= data.lifetime) {
        this._releaseToPool(this.tracerPool, this.tracerActive, i);
      }
    }

    // Update enemy muzzle flashes
    for (let i = this.enemyFlashActive.length - 1; i >= 0; i--) {
      const sprite = this.enemyFlashActive[i];
      const data = sprite.userData;

      data.age += dt;

      // Fade
      const fadeProgress = data.age / data.lifetime;
      sprite.material.opacity = 1.0 - fadeProgress;

      // Expired?
      if (data.age >= data.lifetime) {
        this._releaseToPool(this.enemyFlashPool, this.enemyFlashActive, i);
      }
    }

    // Cleanup old decals (older than 60s)
    const cutoffTime = now - this.decalLifetime;
    while (this.decals.length > 0 && this.decals[0].createdAt < cutoffTime) {
      const old = this.decals.shift();
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }
  }

  /**
   * Acquire sprite from pool
   */
  _acquireFromPool(pool, active) {
    if (pool.length === 0) return null; // Pool exhausted
    const sprite = pool.pop();
    active.push(sprite);
    return sprite;
  }

  /**
   * Release sprite back to pool
   */
  _releaseToPool(pool, active, index) {
    const sprite = active[index];
    sprite.visible = false;
    sprite.userData = {};
    active.splice(index, 1);
    pool.push(sprite);
  }

  /**
   * Cleanup resources
   */
  dispose() {
    // Remove all sprites from scene
    [...this.bloodPool, ...this.bloodActive].forEach(s => this.scene.remove(s));
    [...this.sparkPool, ...this.sparkActive].forEach(s => this.scene.remove(s));
    [...this.helmetSparkPool, ...this.helmetSparkActive].forEach(s => this.scene.remove(s));
    [...this.tracerPool, ...this.tracerActive].forEach(s => this.scene.remove(s));
    [...this.enemyFlashPool, ...this.enemyFlashActive].forEach(s => this.scene.remove(s));

    // Remove decals
    this.decals.forEach(d => this.scene.remove(d.mesh));

    console.log('CombatFeedback: Disposed');
  }
}
