# Phase 1: Movement Engine - Research

**Researched:** 2026-02-13
**Domain:** Browser-based FPS movement physics and game engine architecture
**Confidence:** HIGH

## Summary

Phase 1 requires implementing authentic Counter-Strike: Source movement physics in a browser-based game using Three.js and TypeScript. The research reveals that CS:S movement is derived from the Quake engine's acceleration model, which has been publicly documented through leaked Source SDK code and community reverse-engineering efforts.

The standard approach involves:
1. **Custom physics implementation** (~200-300 lines) based on the official Source SDK GameMovement.cpp code
2. **Fixed-timestep accumulator pattern** at 64Hz for deterministic physics separate from render rate
3. **Raw Three.js with PointerLockControls** for performance-critical FPS rendering
4. **Event-driven input capture feeding polled state** read each physics tick
5. **AABB or capsule collision** against box geometry using Three.js Box3 API

The movement algorithm is well-understood and has exact formulas available from Valve's official Source SDK 2013 GitHub repository. The challenge is not discovering how it works, but correctly implementing the specific acceleration projection logic that enables bunny hopping and air strafing.

**Primary recommendation:** Implement custom physics based on Source SDK GameMovement.cpp (Friction, Accelerate, AirAccelerate functions), use fixed-timestep accumulator at 64Hz with interpolation, and handle collision with Three.js Box3 + capsule math for smooth sliding.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Three.js | r160+ | 3D rendering engine | Industry standard WebGL library, raw API for FPS performance, official PointerLockControls |
| TypeScript | 5.x | Type-safe game engine | Catches physics bugs at compile time, required by project architecture |
| stats.js | 0.17.0 | Performance monitoring | Official Three.js companion library, lightweight FPS/MS/MB overlay |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| stats-gl | Latest | Advanced GPU metrics | Optional upgrade for WebGPU profiling (Tip 100 from 2026 best practices) |
| lil-gui | Latest | Debug controls UI | Optional for runtime physics tuning during development |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom physics | cannon.js / ammo.js | Physics libraries add 100KB+ and don't implement CS:S movement model; custom is 200-300 lines and exact |
| Raw Three.js | React Three Fiber (R3F) | R3F adds React overhead inappropriate for 64Hz fixed-timestep simulation (per project decision) |
| PointerLockControls | Custom from scratch | Reinventing API integration when Three.js provides tested implementation |

**Installation:**
```bash
npm install three@latest
npm install --save-dev @types/three
npm install stats.js
```

## Architecture Patterns

### Recommended Project Structure

```
src/engine/
├── core/
│   ├── GameLoop.ts          # Fixed-timestep accumulator, 64Hz physics
│   ├── InputManager.ts      # Event capture → polled state map
│   └── EventBus.ts          # Decoupled communication
├── physics/
│   ├── Movement.ts          # Friction, Accelerate, AirAccelerate
│   ├── Collision.ts         # AABB/Capsule vs Box3 world geometry
│   └── Player.ts            # Velocity, position, state (ground/air)
├── renderer/
│   ├── Renderer.ts          # Three.js setup, setAnimationLoop
│   ├── Camera.ts            # PointerLockControls wrapper
│   └── Scene.ts             # Three.js scene graph
└── debug/
    ├── StatsOverlay.ts      # stats.js integration
    └── DebugHUD.ts          # Velocity/position overlay (F3 toggle)
```

### Pattern 1: Fixed-Timestep Accumulator (64Hz Physics)

**What:** Separate physics simulation (64Hz) from render rate (variable) using time accumulation.

**When to use:** Required for deterministic physics that doesn't depend on framerate.

**Example:**
```typescript
// Source: https://gafferongames.com/post/fix_your_timestep/
class GameLoop {
  private readonly dt = 1/64;  // 15.625ms fixed timestep
  private accumulator = 0;
  private currentTime = 0;

  private previousState: PhysicsState;
  private currentState: PhysicsState;

  start() {
    this.currentTime = performance.now() / 1000;
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number) {
    const newTime = timestamp / 1000;
    let frameTime = newTime - this.currentTime;

    // Cap frame time spikes (tab away, debugger pause)
    if (frameTime > 0.25) frameTime = 0.25;

    this.currentTime = newTime;
    this.accumulator += frameTime;

    // Consume accumulated time in fixed steps
    while (this.accumulator >= this.dt) {
      this.previousState = this.currentState.clone();
      this.integrate(this.currentState, this.dt);
      this.accumulator -= this.dt;
    }

    // Interpolate for smooth rendering
    const alpha = this.accumulator / this.dt;
    const renderState = this.interpolate(this.previousState, this.currentState, alpha);

    this.render(renderState);
    requestAnimationFrame(this.loop.bind(this));
  }
}
```

### Pattern 2: Event-Driven Input with Polled State

**What:** Capture keyboard/mouse events immediately, store in state map, poll during physics tick.

**When to use:** Eliminates missed inputs between physics ticks while allowing deterministic polling.

**Example:**
```typescript
// Source: https://stephendoddtech.com/blog/game-design/keyboard-event-game-input-map
class InputManager {
  private keyState = new Map<string, boolean>();
  private mouseState = { dx: 0, dy: 0 };

  constructor() {
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onKeyDown(event: KeyboardEvent) {
    event.preventDefault();  // Block browser defaults (F-keys, Ctrl, etc)
    this.keyState.set(event.code, true);
  }

  private onKeyUp(event: KeyboardEvent) {
    event.preventDefault();
    this.keyState.set(event.code, false);
  }

  private onMouseMove(event: MouseEvent) {
    // Only update if pointer locked
    if (document.pointerLockElement) {
      this.mouseState.dx += event.movementX;
      this.mouseState.dy += event.movementY;
    }
  }

  // Called each physics tick (64Hz)
  pollInput(): InputSnapshot {
    const snapshot = {
      forward: this.keyState.get('KeyW') || false,
      back: this.keyState.get('KeyS') || false,
      left: this.keyState.get('KeyA') || false,
      right: this.keyState.get('KeyD') || false,
      jump: this.keyState.get('Space') || false,
      crouch: this.keyState.get('ControlLeft') || false,
      mouseDelta: { ...this.mouseState }
    };

    // Clear mouse delta after polling (consume once per tick)
    this.mouseState.dx = 0;
    this.mouseState.dy = 0;

    return snapshot;
  }
}
```

### Pattern 3: Source Engine Movement Physics

**What:** The exact acceleration algorithm from Valve's Source SDK enabling CS:S movement feel.

**When to use:** Required for authentic bunny hop, air strafe, counter-strafe mechanics.

**Example:**
```typescript
// Source: https://github.com/ValveSoftware/source-sdk-2013/blob/master/sp/src/game/shared/gamemovement.cpp
class Movement {
  // CS:S constants
  private readonly SV_FRICTION = 4.0;
  private readonly SV_ACCELERATE = 5.0;        // Ground acceleration
  private readonly SV_AIRACCELERATE = 10.0;    // Air acceleration
  private readonly SV_STOPSPEED = 100.0;

  // Apply friction when grounded (called before acceleration)
  friction(velocity: Vector3, dt: number, isGrounded: boolean): void {
    if (!isGrounded) return;

    const speed = velocity.length();
    if (speed < 0.1) return;

    const control = Math.max(speed, this.SV_STOPSPEED);
    const drop = control * this.SV_FRICTION * dt;

    const newSpeed = Math.max(speed - drop, 0);
    velocity.multiplyScalar(newSpeed / speed);
  }

  // Ground acceleration (standard movement)
  accelerate(velocity: Vector3, wishDir: Vector3, wishSpeed: number, accel: number, dt: number): void {
    // Project current velocity onto desired direction
    const currentSpeed = velocity.dot(wishDir);
    const addSpeed = wishSpeed - currentSpeed;

    if (addSpeed <= 0) return;

    // Calculate acceleration for this frame
    let accelSpeed = accel * dt * wishSpeed;

    // Cap acceleration to not overshoot
    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }

    // Apply acceleration in desired direction
    velocity.addScaledVector(wishDir, accelSpeed);
  }

  // Air acceleration (enables bunny hop speed gain)
  airAccelerate(velocity: Vector3, wishDir: Vector3, wishSpeed: number, accel: number, dt: number): void {
    // Air speed cap (prevents infinite acceleration)
    const airSpeedCap = 30.0;
    let cappedWishSpeed = Math.min(wishSpeed, airSpeedCap);

    const currentSpeed = velocity.dot(wishDir);
    const addSpeed = cappedWishSpeed - currentSpeed;

    if (addSpeed <= 0) return;

    // Note: different formula than ground (no wishSpeed multiplier before dt)
    let accelSpeed = accel * wishSpeed * dt;

    if (accelSpeed > addSpeed) {
      accelSpeed = addSpeed;
    }

    velocity.addScaledVector(wishDir, accelSpeed);
  }

  // The key to bunny hopping: projection-based speed cap allows perpendicular velocity stacking
  update(input: InputSnapshot, dt: number): void {
    const wishDir = this.getWishDirection(input);
    const wishSpeed = this.getMaxSpeed(input);  // 250 knife, 215 rifle

    if (this.isGrounded) {
      this.friction(this.velocity, dt, true);
      this.accelerate(this.velocity, wishDir, wishSpeed, this.SV_ACCELERATE, dt);
    } else {
      // No friction in air (preserves momentum)
      this.airAccelerate(this.velocity, wishDir, wishSpeed, this.SV_AIRACCELERATE, dt);
    }

    // Apply gravity
    this.velocity.y -= 800.0 * dt;  // sv_gravity default

    // Integrate position
    this.position.addScaledVector(this.velocity, dt);
  }
}
```

### Pattern 4: PointerLockControls Integration

**What:** Three.js official controls for first-person camera with raw mouse input.

**When to use:** Required for FPS camera control with pointer lock API.

**Example:**
```typescript
// Source: https://sbcode.net/threejs/pointerlock-controls/
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

class Camera {
  private controls: PointerLockControls;
  private camera: THREE.PerspectiveCamera;

  constructor(domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.controls = new PointerLockControls(this.camera, domElement);

    // Request pointer lock on click
    domElement.addEventListener('click', () => {
      this.controls.lock();
    });

    // Handle lock state changes
    this.controls.addEventListener('lock', () => {
      console.log('Pointer locked');
    });

    this.controls.addEventListener('unlock', () => {
      console.log('Pointer unlocked');
    });
  }

  // PointerLockControls handles camera rotation automatically via mousemove
  // No manual camera.rotation updates needed

  getObject(): THREE.Camera {
    return this.controls.getObject();
  }

  isLocked(): boolean {
    return this.controls.isLocked;
  }
}
```

### Pattern 5: Capsule Collision with Sliding Response

**What:** Player represented as capsule (cylinder + hemisphere caps) for smooth collision.

**When to use:** Required for sliding along walls and climbing stairs without snagging.

**Example:**
```typescript
// Sources:
// - https://wickedengine.net/2020/04/capsule-collision-detection/
// - https://medium.com/@pablobandinopla/collision-detection-in-threejs-made-easy-using-bvh-1ce6012199e8
class Collision {
  private readonly capsuleRadius = 0.5;   // Player width
  private readonly capsuleHeight = 1.8;    // Player height (standing)

  // Resolve collision by projecting out of geometry
  resolveCollision(position: Vector3, velocity: Vector3, worldGeometry: THREE.Box3[]): void {
    // Create AABB for capsule (fast broadphase check)
    const aabb = new THREE.Box3(
      new THREE.Vector3(
        position.x - this.capsuleRadius,
        position.y,
        position.z - this.capsuleRadius
      ),
      new THREE.Vector3(
        position.x + this.capsuleRadius,
        position.y + this.capsuleHeight,
        position.z + this.capsuleRadius
      )
    );

    // Check each box in world
    for (const box of worldGeometry) {
      if (!aabb.intersectsBox(box)) continue;  // Fast reject

      // Detailed capsule-box test (simplified here)
      const penetration = this.capsuleBoxPenetration(position, box);

      if (penetration) {
        // Slide along surface (project velocity onto plane perpendicular to normal)
        position.add(penetration.normal.multiplyScalar(penetration.depth));

        // Remove velocity component in direction of collision
        const velocityIntoSurface = velocity.dot(penetration.normal);
        if (velocityIntoSurface < 0) {
          velocity.addScaledVector(penetration.normal, -velocityIntoSurface);
        }
      }
    }
  }

  private capsuleBoxPenetration(capsulePos: Vector3, box: THREE.Box3): { normal: Vector3, depth: number } | null {
    // Full capsule-box collision math omitted for brevity
    // Key: test capsule line segment + radius against box faces
    // Returns normal and penetration depth for sliding response
    return null;  // Placeholder
  }
}
```

### Anti-Patterns to Avoid

- **Framerate-dependent physics**: Never multiply velocity by `1.0` per frame. Always use `dt` from fixed timestep.
- **Direct velocity capping**: Don't clamp velocity length directly. Use projection-based acceleration limiting (the Source engine way) or bunny hopping breaks.
- **Smoothing mouse input**: Never apply acceleration curves or smoothing to `movementX/Y`. Competitive FPS requires raw input.
- **React in game loop**: Don't trigger React state updates from physics tick. Use event bus to communicate to UI layer.
- **Polling input every frame**: Don't read `KeyboardEvent` state in render loop. Use event-driven capture, poll at physics rate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pointer lock API integration | Custom mouse capture with hidden cursor | Three.js PointerLockControls | Handles browser quirks, promise/callback API differences, ESC key unlock |
| FPS/MS monitoring | Custom performance counter UI | stats.js | 600 bytes, battle-tested with Three.js, shows FPS/MS/MB |
| Three.js scene graph | Custom WebGL renderer | Three.js Scene/Renderer | 500KB but required by project; handles matrix math, culling, materials |
| localStorage serialization | Custom save/load with string parsing | JSON.stringify/parse | Handles nested objects, arrays, nulls correctly |
| requestAnimationFrame timing | setInterval for game loop | requestAnimationFrame | Syncs with vsync, pauses when tab hidden, better perf |

**Key insight:** Physics engines like cannon.js/ammo.js seem appealing but don't implement CS:S movement model. The Source SDK code is only ~200 lines for the core algorithm (Friction, Accelerate, AirAccelerate). Custom physics is actually simpler and more accurate than integrating a generic physics library.

## Common Pitfalls

### Pitfall 1: Incorrect Fixed-Timestep Implementation

**What goes wrong:** Physics simulation tied to render framerate causes speed variation across devices.

**Why it happens:** Using `requestAnimationFrame` delta directly for physics instead of fixed timestep accumulator.

**How to avoid:**
- Always accumulate frame time and consume in fixed `dt` chunks
- Store previous and current physics state for interpolation
- Cap maximum frame time to 250ms (prevents spiral of death when tab unfocused)

**Warning signs:**
- Player moves faster on 144Hz monitors than 60Hz
- Physics breaks when framerate drops below 60fps
- Movement feels different in Chrome vs Firefox

### Pitfall 2: Counter-Strafing Doesn't Zero Velocity

**What goes wrong:** Pressing opposite direction key reduces speed but doesn't reach zero fast enough.

**Why it happens:** Friction applied after acceleration, or friction constant wrong (CS:S uses 4.0, not 4.8).

**How to avoid:**
- Apply friction BEFORE acceleration each physics tick (order matters!)
- Use exact CS:S constants: `sv_friction = 4.0`, `sv_accelerate = 5.0`
- Verify with debug overlay that velocity reaches 0 within 1-2 ticks

**Warning signs:**
- Counter-strafe takes 5-10 ticks instead of 1-2
- Player slides after releasing keys (friction too low)
- Player stops abruptly when key held (friction too high)

### Pitfall 3: Bunny Hop Doesn't Gain Speed

**What goes wrong:** Chaining jumps doesn't increase velocity beyond base run speed.

**Why it happens:** Air acceleration using ground acceleration formula, or speed being clamped directly instead of projection-based.

**How to avoid:**
- Use separate `airAccelerate()` function with different formula (no `wishSpeed` multiplier before `dt`)
- Never clamp total velocity length - only limit acceleration in current direction
- Set `sv_airaccelerate = 10.0` (higher than ground's 5.0)

**Warning signs:**
- Velocity never exceeds 250-300 units/s even with perfect bhop
- Air strafing doesn't create curved trajectory
- Speed stays constant regardless of jump timing

### Pitfall 4: Input Lag with Pointer Lock

**What goes wrong:** Camera rotation feels sluggish or delayed after locking pointer.

**Why it happens:**
- Not using `unadjustedMovement: true` option (OS mouse acceleration applies)
- Applying camera rotation in render loop instead of immediately on event
- Smoothing or easing mouse input

**How to avoid:**
```typescript
await canvas.requestPointerLock({ unadjustedMovement: true });
```
- Let PointerLockControls handle camera rotation (it's immediate)
- Never buffer or smooth `movementX/Y` values

**Warning signs:**
- Mouse feels different in-game vs desktop
- Small mouse movements don't register
- Rotation continues briefly after stopping mouse

### Pitfall 5: Browser Default Keys Not Blocked

**What goes wrong:** Pressing F11, Ctrl+W, or other browser shortcuts during gameplay triggers browser actions.

**Why it happens:** Not calling `event.preventDefault()` on keydown events.

**How to avoid:**
```typescript
document.addEventListener('keydown', (e) => {
  // Block all game keys from browser defaults
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ControlLeft', 'F3', 'F11'].includes(e.code)) {
    e.preventDefault();
  }
  this.keyState.set(e.code, true);
});
```

**Warning signs:**
- F11 fullscreens browser when trying to toggle debug overlay
- Ctrl+W closes tab when walking forward with crouch
- Space scrolls page when jumping

### Pitfall 6: Memory Leaks from Undisposed Three.js Resources

**What goes wrong:** Memory usage climbs over time, eventually causing stuttering or crashes.

**Why it happens:** Three.js geometries, materials, and textures are not garbage collected automatically.

**How to avoid:**
```typescript
// Always dispose when removing objects
geometry.dispose();
material.dispose();
texture.dispose();
renderer.dispose();
```

**Warning signs:**
- Memory usage (stats.js MB panel) increases over time
- Game runs smooth initially but degrades after 10+ minutes
- Browser DevTools shows increasing WebGL resource count

## Code Examples

### Complete Fixed-Timestep Game Loop with Interpolation

```typescript
// Source: https://gafferongames.com/post/fix_your_timestep/
class GameLoop {
  private readonly FIXED_DT = 1/64;  // 15.625ms (64 ticks per second)
  private readonly MAX_FRAME_TIME = 0.25;  // Cap spikes

  private currentTime = 0;
  private accumulator = 0;

  private prevState: PhysicsState;
  private currState: PhysicsState;

  constructor(
    private physics: PhysicsEngine,
    private renderer: Renderer
  ) {
    this.currentTime = performance.now() / 1000;
    this.prevState = this.physics.getState();
    this.currState = this.prevState.clone();
  }

  start(): void {
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(timestamp: number): void {
    const newTime = timestamp / 1000;
    let frameTime = newTime - this.currentTime;

    // Prevent spiral of death (tab away, debugger, etc)
    if (frameTime > this.MAX_FRAME_TIME) {
      frameTime = this.MAX_FRAME_TIME;
    }

    this.currentTime = newTime;
    this.accumulator += frameTime;

    // Process physics in fixed timesteps
    while (this.accumulator >= this.FIXED_DT) {
      this.prevState = this.currState.clone();
      this.physics.step(this.currState, this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    // Linear interpolation for smooth rendering
    const alpha = this.accumulator / this.FIXED_DT;
    const renderState = this.interpolate(this.prevState, this.currState, alpha);

    this.renderer.render(renderState);
    requestAnimationFrame(this.loop.bind(this));
  }

  private interpolate(prev: PhysicsState, curr: PhysicsState, alpha: number): PhysicsState {
    return {
      position: prev.position.clone().lerp(curr.position, alpha),
      velocity: prev.velocity.clone().lerp(curr.velocity, alpha),
      rotation: prev.rotation.clone().slerp(curr.rotation, alpha)
    };
  }
}
```

### Pointer Lock with unadjustedMovement (Raw Input)

```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
class PointerLockManager {
  private locked = false;

  constructor(private element: HTMLElement) {
    document.addEventListener('pointerlockchange', this.onLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.onLockError.bind(this));

    // Request lock on click
    element.addEventListener('click', () => this.requestLock());
  }

  private async requestLock(): Promise<void> {
    try {
      // Request raw input (disable OS mouse acceleration)
      const promise = this.element.requestPointerLock({
        unadjustedMovement: true
      });

      if (!promise) {
        console.warn('unadjustedMovement not supported, falling back');
        return;
      }

      await promise;
      console.log('Pointer locked with raw input');
    } catch (error) {
      if (error.name === 'NotSupportedError') {
        // Fallback to standard pointer lock
        this.element.requestPointerLock();
      } else {
        throw error;
      }
    }
  }

  private onLockChange(): void {
    this.locked = document.pointerLockElement === this.element;
    console.log('Pointer lock:', this.locked ? 'LOCKED' : 'UNLOCKED');
  }

  private onLockError(): void {
    console.error('Pointer lock failed');
  }

  isLocked(): boolean {
    return this.locked;
  }

  unlock(): void {
    document.exitPointerLock();
  }
}
```

### Key Binding System with localStorage Persistence

```typescript
// Sources:
// - https://www.meticulous.ai/blog/localstorage-complete-guide
// - https://stephendoddtech.com/blog/game-design/keyboard-event-game-input-map
type Action = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'crouch' | 'reload';

interface KeyBindings {
  [action: string]: string;  // Action -> KeyCode
}

class KeyBindingManager {
  private static readonly STORAGE_KEY = 'fps-game-keybindings';

  private static readonly DEFAULT_BINDINGS: KeyBindings = {
    forward: 'KeyW',
    back: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    crouch: 'ControlLeft',
    reload: 'KeyR',
    weapon1: 'Digit1',
    weapon2: 'Digit2',
    weapon3: 'Digit3',
    shoot: 'Mouse0',
    aim: 'Mouse2'
  };

  private bindings: KeyBindings;
  private reverseMap: Map<string, Action>;  // KeyCode -> Action

  constructor() {
    this.bindings = this.load();
    this.reverseMap = this.buildReverseMap();
  }

  private load(): KeyBindings {
    try {
      const stored = localStorage.getItem(KeyBindingManager.STORAGE_KEY);
      if (stored) {
        return { ...KeyBindingManager.DEFAULT_BINDINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load key bindings:', error);
    }
    return { ...KeyBindingManager.DEFAULT_BINDINGS };
  }

  save(): void {
    try {
      localStorage.setItem(
        KeyBindingManager.STORAGE_KEY,
        JSON.stringify(this.bindings)
      );
    } catch (error) {
      console.error('Failed to save key bindings:', error);
    }
  }

  rebind(action: Action, newKey: string): boolean {
    // Check if key already bound to different action
    const existingAction = this.reverseMap.get(newKey);
    if (existingAction && existingAction !== action) {
      return false;  // Conflict
    }

    // Remove old binding from reverse map
    const oldKey = this.bindings[action];
    this.reverseMap.delete(oldKey);

    // Set new binding
    this.bindings[action] = newKey;
    this.reverseMap.set(newKey, action);

    this.save();
    return true;
  }

  getAction(keyCode: string): Action | undefined {
    return this.reverseMap.get(keyCode);
  }

  getBinding(action: Action): string {
    return this.bindings[action];
  }

  reset(): void {
    this.bindings = { ...KeyBindingManager.DEFAULT_BINDINGS };
    this.reverseMap = this.buildReverseMap();
    this.save();
  }

  private buildReverseMap(): Map<string, Action> {
    const map = new Map<string, Action>();
    for (const [action, key] of Object.entries(this.bindings)) {
      map.set(key, action as Action);
    }
    return map;
  }
}
```

### Debug Overlay with stats.js and Custom HUD

```typescript
// Sources:
// - https://github.com/mrdoob/stats.js
// - https://github.com/veliovgroup/fps-meter
import Stats from 'stats.js';

class DebugOverlay {
  private stats: Stats;
  private customHUD: HTMLDivElement;
  private visible = false;

  constructor() {
    // stats.js setup
    this.stats = new Stats();
    this.stats.showPanel(0);  // 0: FPS, 1: MS, 2: MB
    this.stats.dom.style.cssText = 'position:absolute;top:0;left:0;z-index:10000';
    document.body.appendChild(this.stats.dom);

    // Custom HUD for velocity/position
    this.customHUD = document.createElement('div');
    this.customHUD.style.cssText = `
      position: absolute;
      top: 60px;
      left: 0;
      padding: 10px;
      background: rgba(0,0,0,0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.5;
      z-index: 10000;
    `;
    document.body.appendChild(this.customHUD);

    // Toggle with F3
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        this.toggle();
      }
    });

    this.hide();
  }

  begin(): void {
    this.stats.begin();
  }

  end(): void {
    this.stats.end();
  }

  update(data: {
    velocity: THREE.Vector3,
    position: THREE.Vector3,
    grounded: boolean,
    tickRate: number
  }): void {
    if (!this.visible) return;

    const speed = data.velocity.length();

    this.customHUD.innerHTML = `
      <div>Velocity: ${speed.toFixed(2)} u/s</div>
      <div>  X: ${data.velocity.x.toFixed(2)}</div>
      <div>  Y: ${data.velocity.y.toFixed(2)}</div>
      <div>  Z: ${data.velocity.z.toFixed(2)}</div>
      <div>Position: (${data.position.x.toFixed(2)}, ${data.position.y.toFixed(2)}, ${data.position.z.toFixed(2)})</div>
      <div>State: ${data.grounded ? 'GROUND' : 'AIR'}</div>
      <div>Tick Rate: ${data.tickRate.toFixed(1)} Hz</div>
    `;
  }

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  private show(): void {
    this.stats.dom.style.display = 'block';
    this.customHUD.style.display = 'block';
  }

  private hide(): void {
    this.stats.dom.style.display = 'none';
    this.customHUD.style.display = 'none';
  }
}
```

### Crosshair Implementation (CSS + HTML)

```typescript
// Sources: Community patterns from crosshair overlay tools
interface CrosshairSettings {
  size: number;       // Length of crosshair lines
  thickness: number;  // Line thickness in pixels
  gap: number;        // Gap from center
  color: string;      // CSS color
}

class Crosshair {
  private static readonly STORAGE_KEY = 'fps-game-crosshair';

  private static readonly DEFAULT_SETTINGS: CrosshairSettings = {
    size: 10,
    thickness: 2,
    gap: 4,
    color: '#00ff00'
  };

  private container: HTMLDivElement;
  private settings: CrosshairSettings;

  constructor() {
    this.settings = this.load();
    this.container = this.createDOM();
    this.apply();
  }

  private createDOM(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 1000;
    `;

    // Horizontal line
    const hLine = document.createElement('div');
    hLine.className = 'crosshair-h';
    container.appendChild(hLine);

    // Vertical line
    const vLine = document.createElement('div');
    vLine.className = 'crosshair-v';
    container.appendChild(vLine);

    document.body.appendChild(container);
    return container;
  }

  private apply(): void {
    const { size, thickness, gap, color } = this.settings;

    const hLine = this.container.querySelector('.crosshair-h') as HTMLElement;
    const vLine = this.container.querySelector('.crosshair-v') as HTMLElement;

    // Horizontal line (left + right)
    hLine.style.cssText = `
      position: absolute;
      width: ${size * 2 + gap * 2}px;
      height: ${thickness}px;
      background: linear-gradient(to right,
        ${color} 0%, ${color} calc(50% - ${gap}px),
        transparent calc(50% - ${gap}px), transparent calc(50% + ${gap}px),
        ${color} calc(50% + ${gap}px), ${color} 100%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;

    // Vertical line (top + bottom)
    vLine.style.cssText = `
      position: absolute;
      width: ${thickness}px;
      height: ${size * 2 + gap * 2}px;
      background: linear-gradient(to bottom,
        ${color} 0%, ${color} calc(50% - ${gap}px),
        transparent calc(50% - ${gap}px), transparent calc(50% + ${gap}px),
        ${color} calc(50% + ${gap}px), ${color} 100%);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    `;
  }

  update(settings: Partial<CrosshairSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.apply();
    this.save();
  }

  private load(): CrosshairSettings {
    try {
      const stored = localStorage.getItem(Crosshair.STORAGE_KEY);
      if (stored) {
        return { ...Crosshair.DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load crosshair settings:', error);
    }
    return { ...Crosshair.DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      localStorage.setItem(Crosshair.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save crosshair settings:', error);
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval game loop | requestAnimationFrame | ~2010 | Vsync, tab pause, better perf |
| Callback-based pointerlock | Promise-based with unadjustedMovement | 2020+ | Raw input, easier async handling |
| Manual FPS counter | stats.js / stats-gl | Always standard | Lightweight, proven, WebGPU support |
| Physics libraries for movement | Custom CS:S implementation | N/A | No library implements Quake movement correctly |
| WebGL renderer from scratch | Three.js | Always standard | Matrix math, culling, materials handled |
| Polling keyboard every frame | Event-driven capture + polling | ~2015 | No missed inputs, deterministic |

**Deprecated/outdated:**
- **PointerLockControls constructor without domElement**: Old API took just camera; new API requires `(camera, domElement)` - affects all post-r125 Three.js versions
- **Callback-only requestPointerLock**: Modern browsers return Promise; handle both for compatibility
- **Class 1 vs Class 3 pointer lock**: Class 1 (immediate lock) deprecated; always use Class 3 (user gesture required)

## Open Questions

### 1. Capsule-Box Collision Math Complexity

**What we know:**
- Capsule is ideal for player (smooth sliding, no corner snagging)
- Three.js provides Box3 API for AABB tests
- Collision response requires penetration normal and depth

**What's unclear:**
- Full capsule-box collision algorithm not found in search results
- Wicked Engine article mentions approach but doesn't provide complete code
- Unclear if Three.js has built-in capsule primitive or if custom math needed

**Recommendation:**
- Start with AABB collision (simplest, Three.js Box3 has `.intersectsBox()`)
- Upgrade to capsule if AABB corner-snagging becomes noticeable
- Reference Three.js examples (FPS octree demo likely has solution)
- Fallback: Use swept AABB (box that moves smoothly) instead of full capsule

### 2. Octree for Level Geometry Optimization

**What we know:**
- Octrees reduce collision checks from O(n) to O(log n)
- Three.js has example octree implementations
- Only needed for complex geometry (100+ boxes)

**What's unclear:**
- Whether Phase 1 test arena (simple box geometry) needs optimization
- Performance threshold where octree becomes necessary
- Integration complexity with existing collision system

**Recommendation:**
- Phase 1: Skip octree, test arena is simple geometry (~10-20 boxes)
- Phase 2: Evaluate if aim_ag_texture2 map needs octree (depends on polygon count)
- Measure first: if collision checks don't show in profiler, don't optimize

### 3. Exact CS:S Default Values for sv_friction

**What we know:**
- Valve Developer Wiki lists sv_friction default as 4.0
- Some sources mention 4.8 for other Source games
- Source SDK code uses `sv_friction.GetFloat()` (server configurable)

**What's unclear:**
- Whether CS:S specifically uses 4.0 or 4.8
- If surf servers use different values (10+ for surf maps)

**Recommendation:**
- Start with 4.0 (documented Source SDK default)
- Implement as configurable constant for iteration
- Let project owner (CS:S player) feel-test and adjust
- Debug overlay shows velocity decay rate for validation

### 4. Browser Compatibility for unadjustedMovement

**What we know:**
- `requestPointerLock({ unadjustedMovement: true })` disables OS mouse acceleration
- Modern API returns Promise, old API uses callbacks
- Some browsers don't support unadjustedMovement

**What's unclear:**
- Exact browser versions supporting unadjustedMovement
- Whether fallback without raw input is acceptable
- Performance impact of polyfilling

**Recommendation:**
- Request with `unadjustedMovement: true`, catch NotSupportedError, fallback to standard
- Document requirement: "Best experience requires Chrome 88+ / Firefox 87+ for raw mouse input"
- Test on target browsers (Chrome, Firefox, Edge) during Phase 1

## Sources

### Primary (HIGH confidence)

**Movement Algorithm:**
- [Bunnyhopping from the Programmer's Perspective](https://adrianb.io/2015/02/14/bunnyhop.html) - Complete pseudocode and math
- [Valve Source SDK 2013 GameMovement.cpp](https://github.com/ValveSoftware/source-sdk-2013/blob/56accfdb9c4abd32ae1dc26b2e4cc87898cf4dc1/sp/src/game/shared/gamemovement.cpp) - Official implementation
- [SourceRuns Wiki: Bunnyhopping](https://wiki.sourceruns.org/Bunnyhopping) - Community documentation

**Game Loop:**
- [Fix Your Timestep - Gaffer On Games](https://gafferongames.com/post/fix_your_timestep/) - Canonical reference
- [André Leite: Fixed Timestep Game Loop](https://andreleite.com/posts/2025/game-loop/fixed-timestep-game-loop/) - Modern JS implementation

**Pointer Lock:**
- [MDN: Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) - Official spec

**Three.js:**
- [Three.js PointerLockControls Tutorial](https://sbcode.net/threejs/pointerlock-controls/) - Integration examples
- [100 Three.js Tips That Actually Improve Performance (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) - Current best practices

**stats.js:**
- [GitHub: mrdoob/stats.js](https://github.com/mrdoob/stats.js) - Official repository

### Secondary (MEDIUM confidence)

**Input Handling:**
- [Create a Keyboard Input Mapping (Stephen Dodd Tech)](https://stephendoddtech.com/blog/game-design/keyboard-event-game-input-map) - TypeScript pattern
- [Handling User Input (Gablaxian)](https://gablaxian.com/articles/creating-a-game-with-javascript/handling-user-input/) - Event vs polling

**Collision Detection:**
- [3D Collision Detection - MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection) - AABB and sphere methods
- [Capsule Collision Detection - Wicked Engine](https://wickedengine.net/2020/04/capsule-collision-detection/) - Capsule-box theory
- [Collision Detection in Three.js made easy using BVH (Medium)](https://medium.com/@pablobandinopla/collision-detection-in-threejs-made-easy-using-bvh-1ce6012199e8) - BVH optimization

**Performance:**
- [Building Efficient Three.js Scenes (Codrops)](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/) - 2026 optimization guide

**localStorage:**
- [JavaScript LocalStorage Complete Guide (Meticulous)](https://www.meticulous.ai/blog/localstorage-complete-guide) - Best practices

### Tertiary (LOW confidence)

**CS:S Physics Values:**
- Various Steam Community guides and forum posts discussing sv_friction, sv_accelerate, sv_airaccelerate values
- Marked as LOW confidence due to inconsistencies across sources (4.0 vs 4.8 for friction)
- Recommendation: Validate with project owner's CS:S experience

**Octree Implementations:**
- [GitHub: collinhover/threeoctree](https://github.com/collinhover/threeoctree) - Community library, uncertain maintenance status
- Not critical for Phase 1, defer investigation to Phase 2

## Metadata

**Confidence breakdown:**
- **Standard stack: HIGH** - Three.js and stats.js are industry standard, Source SDK code is official
- **Architecture: HIGH** - Fixed timestep pattern is well-documented, PointerLockControls is Three.js official
- **Pitfalls: MEDIUM** - Based on community reports and Three.js GitHub issues; specific project validation needed

**Research date:** 2026-02-13
**Valid until:** 2026-03-13 (30 days - stable domain, Three.js releases quarterly)

**Notes:**
- Phase 1 has no external dependencies on other phases (foundation phase)
- Movement algorithm is well-understood; implementation is the challenge, not discovery
- Counter-strafing and bunny hopping will require iteration and feel-testing
- Debug overlay is critical for validating physics constants match CS:S
