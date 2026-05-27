type Vec3 = { x: number; y: number; z: number };

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vecScale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vecLength(a: Vec3): number {
  return Math.sqrt(vecDot(a, a));
}

function vecNormalize(a: Vec3): Vec3 {
  const l = vecLength(a) || 1;
  return vecScale(a, 1 / l);
}

export interface MovementConfig {
  groundAccel: number;
  groundFriction: number;
  airAccel: number;
  maxSpeedRifle: number;
  maxSpeedPistol: number;
  maxSpeedKnife: number;
  gravity: number;
}

export interface InputState {
  forward: number; // -1..1
  right: number; // -1..1
  jump: boolean;
  crouch: boolean;
}

export class MovementEngine {
  config: MovementConfig;
  position: Vec3;
  velocity: Vec3;
  onGround: boolean;

  constructor(config?: Partial<MovementConfig>) {
    this.config = {
      groundAccel: 5.0,
      groundFriction: 4.0,
      airAccel: 10.0,
      maxSpeedRifle: 215,
      maxSpeedPistol: 220,
      maxSpeedKnife: 250,
      gravity: -980,
      ...config,
    } as MovementConfig;

    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.onGround = true;
  }

  // Simplified wish direction based on input; camera yaw assumed 0 for demo
  private wishDir(input: InputState): Vec3 {
    const forward = { x: 0, y: 0, z: input.forward };
    const right = { x: input.right, y: 0, z: 0 };
    const r = vecAdd(forward, right);
    const l = vecLength(r);
    if (l === 0) return { x: 0, y: 0, z: 0 };
    return vecScale(r, 1 / l);
  }

  // Ground friction (Quake/CS style)
  private applyFriction(dt: number) {
    const cfg = this.config;
    const vel = { x: this.velocity.x, y: 0, z: this.velocity.z };
    const speed = vecLength(vel);
    if (speed <= 0) return;
    const drop = Math.max(speed, cfg.groundFriction) * cfg.groundFriction * dt;
    const newSpeed = Math.max(0, speed - drop);
    const scale = newSpeed / speed;
    this.velocity.x *= scale;
    this.velocity.z *= scale;
  }

  // Accelerate towards wish direction (CS/Quake formula)
  private accelMove(wishdir: Vec3, wishspeed: number, accel: number, dt: number) {
    const vel = { x: this.velocity.x, y: 0, z: this.velocity.z };
    const currentspeed = vecDot(vel, wishdir);
    let addspeed = wishspeed - currentspeed;
    if (addspeed <= 0) return;
    let accelSpeed = accel * wishspeed * dt;
    if (accelSpeed > addspeed) accelSpeed = addspeed;
    this.velocity.x += wishdir.x * accelSpeed;
    this.velocity.z += wishdir.z * accelSpeed;
  }

  update(dt: number, input: InputState, weapon: 'rifle' | 'pistol' | 'knife' = 'rifle') {
    const cfg = this.config;
    const maxSpeed = weapon === 'rifle' ? cfg.maxSpeedRifle : weapon === 'pistol' ? cfg.maxSpeedPistol : cfg.maxSpeedKnife;

    const wish = this.wishDir(input);
    // horizontal wish speed based on input magnitude
    const wishLen = vecLength(wish);
    const wishspeed = wishLen > 0 ? wishLen * maxSpeed : 0;

    if (this.onGround) {
      this.applyFriction(dt);
      // accelerate on ground
      this.accelMove(wish, wishspeed, cfg.groundAccel, dt);
      // small air jump handling
      if (input.jump) {
        this.velocity.y = 270; // jump impulse
        this.onGround = false;
      }
    } else {
      // air control: smaller accel but still effective for bhop
      // project wish to horizontal and apply air accel
      const airAccel = cfg.airAccel;
      // curr horizontal speed cap for air
      this.accelMove(wish, wishspeed, airAccel, dt);
      // gravity
      this.velocity.y += cfg.gravity * dt;
    }

    // clamp horizontal speed to a reasonable cap
    const horizSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    const hardCap = maxSpeed * 1.75;
    if (horizSpeed > hardCap) {
      const s = hardCap / horizSpeed;
      this.velocity.x *= s;
      this.velocity.z *= s;
    }

    // integrate
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // simple ground collision
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.onGround = true;
    }
  }
}

export default MovementEngine;
