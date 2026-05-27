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

    this._vel = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  get alive() { return this.state !== BotState.DEAD; }

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
   */
  update(dt, time) {
    if (!this.nav || !this.nav.ready || this.state === BotState.DEAD) return;

    if (this.repathCooldown > 0) this.repathCooldown -= dt;

    let moving = false;

    // PATROL: walk the current path; pick a new destination when finished.
    if (this.pathIndex >= this.path.length) {
      if (this.repathCooldown <= 0) {
        this._pickPatrolDestination();
        if (this.path.length === 0) this.repathCooldown = 0.5; // nav miss — retry soon
      }
    }

    if (this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      this._dir.set(target.x - this.position.x, 0, target.z - this.position.z);
      const dist = this._dir.length();

      if (dist < 0.35) {
        // Reached this waypoint; advance.
        this.pathIndex++;
      } else {
        this._dir.divideScalar(dist); // normalize (dist != 0 here)
        const step = Math.min(this.walkSpeed * dt, dist);
        this.position.x += this._dir.x * step;
        this.position.z += this._dir.z * step;
        // Ride the actual navmesh surface under our feet so ramps/slopes are
        // followed smoothly (snapping to target.y made the bot float up ramps).
        const groundY = this.nav.sampleHeight(this.position);
        this.position.y = (groundY != null) ? groundY : target.y;

        // Face the direction of travel (smoothed so turns aren't instant).
        const targetYaw = Math.atan2(this._dir.x, this._dir.z);
        this.yaw = this._approachAngle(this.yaw, targetYaw, dt * 8);

        this._vel.set(this._dir.x * this.walkSpeed, 0, this._dir.z * this.walkSpeed);
        moving = true;
      }
    }

    if (!moving) this._vel.set(0, 0, 0);

    // Drive the model: position/facing + mocap locomotion blend.
    this.model.setTransform(this.instance, this.position, this.yaw);
    this.model.updateAnimation(this.instance, dt, {
      velocity: this._vel,
      onGround: true,
      crouching: false,
      time,
      shooting: false,
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
