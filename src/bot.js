/**
 * Opponent bot: drives a PlayerModel instance around the arena on the navmesh and
 * (later) perceives + engages the player. This layer (#3b) implements roaming only:
 * the bot picks random walkable destinations, paths to them along the navmesh, and
 * feeds velocity + facing into the model so the mocap locomotion plays naturally.
 *
 * A lightweight state machine (PATROL for now; ATTACK/SEARCH added in #3c/#3d) keeps
 * the update loop ready to grow without restructuring.
 */
const BotState = { PATROL: 'PATROL', ATTACK: 'ATTACK', SEARCH: 'SEARCH', DEAD: 'DEAD' };

export class Bot {
  /**
   * @param {object} THREE
   * @param {PlayerModel} model - shared PlayerModel manager (setTransform/updateAnimation)
   * @param {object} instance - spawned model instance (armed)
   * @param {ArenaNavMesh} navMesh
   * @param {object} opts - { id, speed }
   */
  constructor(THREE, model, instance, navMesh, opts = {}) {
    this.THREE = THREE;
    this.model = model;
    this.instance = instance;
    this.nav = navMesh;
    this.id = opts.id || 'bot';

    this.position = instance.scene.position.clone();
    this.yaw = instance.scene.rotation.y || 0;
    this.walkSpeed = opts.speed || 2.0; // m/s — above WALK_TOP for a clean walk clip

    this.state = BotState.PATROL;
    this.path = [];
    this.pathIndex = 0;
    this.repathCooldown = 0; // debounce failed re-paths

    // --- perception ---
    this.eyeHeight = opts.eyeHeight || 1.55;
    this.viewRange = opts.viewRange || 38;          // metres
    this.fovCos = Math.cos((opts.fovDeg || 130) * 0.5 * Math.PI / 180); // half-FOV cosine
    this.lastKnownPlayerPos = null;
    this.searchTimer = 0;

    // --- combat ---
    this.reactionTime = opts.reactionTime || 0.45;  // acquisition delay before first shot
    this.fireInterval = opts.fireInterval || 0.16;  // seconds between shots within a burst
    // Per-bot marksmanship (close-range hit chance); varies so they feel human,
    // not like identical aimbots. Kept low so fights are survivable; distance
    // falloff applied by the shooter handler.
    this.aimSkill = opts.aimSkill != null ? opts.aimSkill : (0.10 + Math.random() * 0.12);
    this.aimTimer = 0;        // counts down the reaction delay on acquisition
    this.fireCooldown = 0;    // time until next shot allowed
    this.burstShotsLeft = 0;  // remaining rounds in current burst
    this.burstPause = 0;      // pause between bursts

    this._vel = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._eye = new THREE.Vector3();
    this._toPlayer = new THREE.Vector3();
  }

  get alive() { return this.state !== BotState.DEAD; }

  /** Mark this bot dead — it stops moving, perceiving, and firing immediately. */
  markDead() {
    this.state = BotState.DEAD;
    this._vel.set(0, 0, 0);
  }

  /** Eye position (for line-of-sight + muzzle origin). */
  eyePosition() {
    return this._eye.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
  }

  /** True if the player is within range + FOV and in line-of-sight. */
  _canSeePlayer(ctx) {
    if (!ctx.playerAlive || !ctx.playerPos) return false;
    this._toPlayer.set(
      ctx.playerPos.x - this.position.x, 0, ctx.playerPos.z - this.position.z
    );
    const dist = this._toPlayer.length();
    if (dist > this.viewRange || dist < 0.001) return false;
    this._toPlayer.divideScalar(dist);
    // FOV: bot faces (sin yaw, 0, cos yaw); compare against direction to player.
    const fwdX = Math.sin(this.yaw), fwdZ = Math.cos(this.yaw);
    if (fwdX * this._toPlayer.x + fwdZ * this._toPlayer.z < this.fovCos) return false;
    // Line of sight: nothing solid between the bot's eye and the player.
    return ctx.canSee(this.eyePosition(), ctx.playerPos);
  }

  _faceYawTo(targetX, targetZ, dt, rate = 10) {
    const dx = targetX - this.position.x, dz = targetZ - this.position.z;
    if (dx * dx + dz * dz < 1e-6) return;
    const targetYaw = Math.atan2(dx, dz);
    this.yaw = this._approachAngle(this.yaw, targetYaw, dt * rate);
  }

  /** Snap to a fresh random destination and compute a path to it. */
  _pickPatrolDestination() {
    const dest = this.nav.randomPoint(this.THREE);
    if (!dest) { this.path = []; this.pathIndex = 0; return; }
    const path = this.nav.computePath(this.position, dest, this.THREE);
    // computePath includes the start point as path[0]; begin walking toward path[1].
    this.path = path;
    this.pathIndex = path.length > 1 ? 1 : 0;
  }

  /**
   * @param {number} dt - seconds
   * @param {number} time - global time (seconds) for animation phase
   * @param {object} ctx - { playerPos, playerAlive, canSee(eye,target), fire(bot,muzzle) }
   */
  update(dt, time, ctx) {
    if (!this.nav || !this.nav.ready || this.state === BotState.DEAD) return;
    if (this.repathCooldown > 0) this.repathCooldown -= dt;

    const canSee = ctx ? this._canSeePlayer(ctx) : false;
    let moving = false;
    let shooting = false;

    // --- state transitions ---
    if (canSee) {
      this.lastKnownPlayerPos = { x: ctx.playerPos.x, y: ctx.playerPos.y, z: ctx.playerPos.z };
      if (this.state !== BotState.ATTACK) {
        this.state = BotState.ATTACK;
        this.aimTimer = this.reactionTime; // acquisition delay before first shot
        this.burstShotsLeft = 2 + Math.floor(Math.random() * 3);
        this.burstPause = 0;
        this.path = []; this.pathIndex = 0;
      }
    } else if (this.state === BotState.ATTACK) {
      // Lost sight: go investigate the last known position.
      this.state = BotState.SEARCH;
      this.searchTimer = 4.0;
      this.path = []; this.pathIndex = 0;
      if (this.lastKnownPlayerPos) {
        const path = this.nav.computePath(this.position, this.lastKnownPlayerPos, this.THREE);
        this.path = path;
        this.pathIndex = path.length > 1 ? 1 : 0;
      }
    }

    // --- behaviour per state ---
    if (this.state === BotState.ATTACK) {
      moving = false; // stand and engage (no cover tactics in this pass)
      this._vel.set(0, 0, 0);
      // Face the player.
      this._faceYawTo(ctx.playerPos.x, ctx.playerPos.z, dt, 12);
      // Fire control: reaction delay, then bursts at fireInterval.
      if (this.aimTimer > 0) {
        this.aimTimer -= dt;
      } else if (this.burstPause > 0) {
        this.burstPause -= dt;
      } else {
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
          shooting = true;
          this.fireCooldown = this.fireInterval;
          if (ctx.fire) ctx.fire(this, this.eyePosition());
          if (--this.burstShotsLeft <= 0) {
            this.burstShotsLeft = 2 + Math.floor(Math.random() * 3);
            this.burstPause = 0.9 + Math.random() * 1.1; // recover/retarget between bursts
          }
        }
      }
    } else {
      // PATROL / SEARCH: follow the current path. SEARCH walks to last-known pos
      // and reverts to PATROL on a timeout; PATROL re-rolls a destination at the end.
      if (this.state === BotState.SEARCH) {
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) this.state = BotState.PATROL;
      }

      if (this.pathIndex >= this.path.length) {
        if (this.state === BotState.SEARCH) {
          this.state = BotState.PATROL; // reached last-known pos, resume patrol
        }
        if (this.repathCooldown <= 0) {
          this._pickPatrolDestination();
          if (this.path.length === 0) this.repathCooldown = 0.5;
        }
      }

      if (this.pathIndex < this.path.length) {
        const target = this.path[this.pathIndex];
        this._dir.set(target.x - this.position.x, 0, target.z - this.position.z);
        const dist = this._dir.length();
        if (dist < 0.35) {
          this.pathIndex++;
        } else {
          this._dir.divideScalar(dist);
          const step = Math.min(this.walkSpeed * dt, dist);
          this.position.x += this._dir.x * step;
          this.position.z += this._dir.z * step;
          const groundY = this.nav.sampleHeight(this.position);
          this.position.y = (groundY != null) ? groundY : target.y;
          this.yaw = this._approachAngle(this.yaw, Math.atan2(this._dir.x, this._dir.z), dt * 8);
          this._vel.set(this._dir.x * this.walkSpeed, 0, this._dir.z * this.walkSpeed);
          moving = true;
        }
      }
      if (!moving) this._vel.set(0, 0, 0);
    }

    // Drive the model: position/facing + mocap locomotion blend (+ shoot overlay).
    this.model.setTransform(this.instance, this.position, this.yaw);
    this.model.updateAnimation(this.instance, dt, {
      velocity: this._vel,
      onGround: true,
      crouching: false,
      time,
      shooting,
      reloading: false,
      knifing: false,
    });
  }

  /** Move angle `a` toward `b` by at most `maxStep` radians (shortest way around). */
  _approachAngle(a, b, maxStep) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const clamped = Math.max(-1, Math.min(1, maxStep)) * d;
    return a + clamped;
  }
}

export { BotState };
