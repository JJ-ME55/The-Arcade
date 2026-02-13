# Technology Stack

**Project:** FPS Staking Game (Browser-based competitive FPS with Solana token staking)
**Researched:** 2026-02-13
**Overall confidence:** HIGH — All versions verified against npm registry on research date. Rationale grounded in project constraints (zero server costs, zero external art, CS:S physics fidelity, 1v1/2v2 only).

---

## Decision Framework

Every technology choice in this stack was evaluated against three project-specific criteria:

1. **Does it support zero server costs?** — The project must run on WebRTC P2P + free tiers only.
2. **Does it give maximum control over game physics?** — CS:S movement fidelity is the #1 differentiator; abstractions that hide physics internals are disqualifying.
3. **Is it proven in production?** — For a staking game where real money is on the line, experimental libraries are unacceptable for core systems.

---

## Recommended Stack

### Game Engine & Rendering

| Technology | Version | Published | Purpose | Confidence |
|------------|---------|-----------|---------|------------|
| **three** | `0.182.0` | 2025-12-10 | 3D rendering engine | HIGH |
| **@types/three** | `0.182.0` | matched | TypeScript types for Three.js | HIGH |
| **three-mesh-bvh** | `0.9.8` | 2026-01-28 | BVH acceleration for raycasting (hitscan hit detection) | HIGH |

**Why Three.js (not Babylon.js, PlayCanvas, or R3F):**

- **Three.js raw** gives direct access to the render loop, camera, and scene graph. A custom FPS engine needs to own the game loop (`setInterval` at 64Hz for simulation, `requestAnimationFrame` for rendering). Babylon.js and PlayCanvas bundle their own game loops, input systems, and physics engines that would conflict with custom CS:S physics.
- **React Three Fiber (R3F) is explicitly NOT recommended** for this project. R3F wraps Three.js in React's reconciliation cycle, adding per-frame overhead from React's diffing algorithm. For a competitive FPS targeting 144+ FPS with 64-tick simulation, every millisecond matters. R3F's declarative model also fights against imperative game loop patterns (fixed-timestep update, input polling, state interpolation). R3F is excellent for 3D web experiences, product configurators, and data visualization — not for competitive FPS engines.
- **three-mesh-bvh** is essential for performant hitscan ray casting. Without BVH acceleration, `Raycaster.intersectObjects()` does brute-force triangle intersection testing, which is O(n) per triangle. With BVH, it is O(log n). For a multi-floor map with potentially hundreds of triangles, this is the difference between a 0.1ms and 5ms raycast.

**What NOT to use:**

| Library | Why Not |
|---------|---------|
| `@react-three/fiber` (R3F) ^9.5.0 | React reconciliation overhead in game loop; declarative model conflicts with imperative FPS engine; requires React 19 which adds complexity |
| `@react-three/drei` ^10.7.7 | Convenience wrappers built on R3F; unnecessary without R3F |
| `@react-three/rapier` ^2.2.0 | R3F bindings for Rapier; wrong abstraction layer |
| `@react-three/postprocessing` ^3.0.4 | R3F bindings for postprocessing; use `postprocessing` directly if needed |
| `babylon.js` | Opinionated engine with its own game loop, input system, and physics. Fighting against its abstractions to implement CS:S movement would be harder than building from scratch with Three.js |
| `playcanvas` | Same issues as Babylon; also has a mandatory editor-based workflow that conflicts with code-only map generation |

### Physics (Custom — No Library)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Custom implementation** | N/A | CS:S Source engine movement physics | HIGH |

**Why custom physics (not Rapier, Cannon, or Ammo.js):**

This is the most important architectural decision in the entire stack. The game's #1 differentiator is authentic CS:S movement physics. General-purpose physics engines (Rapier, Cannon, Ammo.js) implement realistic Newtonian physics — objects have mass, forces create acceleration, friction decelerates. Source engine movement is NOT Newtonian. It uses a unique acceleration model where:

- Ground movement applies `sv_accelerate` (5.0) against a wish-direction vector, clamped by `sv_maxspeed`
- Friction is applied as a separate step with `sv_friction` (4.0) decelerating proportionally to current speed
- **Air movement** uses `sv_airaccelerate` (10.0) with a critical subtlety: the speed cap only applies to the *component* of velocity in the wish direction, not total velocity. This is what enables air strafing — you can exceed max speed by curving your wish direction perpendicular to your current velocity.
- Bunny hopping exploits the 1-frame window between landing and friction application

No physics engine implements this. Attempting to "configure" Rapier or Cannon to produce CS:S movement would be fighting the engine at every step. The physics for this game is ~200-300 lines of vector math (dot products, projections, clamping). It does not need a 500KB WASM physics engine.

**What NOT to use for player movement:**

| Library | Version | Why Not |
|---------|---------|---------|
| `@dimforge/rapier3d-compat` | 0.19.3 | WASM-based rigid body physics. Designed for realistic physics simulation, not Source engine quake-derived movement. 500KB+ WASM bundle for functionality we don't need. |
| `cannon-es` | 0.20.0 | Last updated 2022-08-12. Unmaintained. Also implements Newtonian physics that would fight CS:S movement model. |
| `ammo.js` | — | Bullet physics port to WASM. Same Newtonian physics problem. Extremely heavy bundle (~1.5MB). |

**What you DO need for physics:**

- Custom `PlayerController` class implementing Source engine movement equations
- Three.js `Raycaster` (with three-mesh-bvh acceleration) for ground detection and hitscan
- Three.js `Box3` / manual AABB for collision detection against map geometry (block-style map makes this trivial — all surfaces are axis-aligned boxes)
- Custom gravity (apply `800 u/s^2` downward per tick, standard Source gravity)

### Multiplayer / Networking

| Technology | Version | Published | Purpose | Confidence |
|------------|---------|-----------|---------|------------|
| **Native WebRTC API** | Browser built-in | — | Peer-to-peer data channels for game state | HIGH |
| **@supabase/supabase-js** | `2.95.3` | 2026-02-06 | Signaling server (via Realtime channels), matchmaking, database | HIGH |

**Why native WebRTC (not PeerJS or simple-peer):**

- **PeerJS** (`1.5.5`, last published 2025-06-07) wraps WebRTC and provides a managed signaling server (PeerServer). For this project, Supabase Realtime already serves as the signaling channel, making PeerJS's main value proposition (managed signaling) redundant. PeerJS also abstracts away DataChannel configuration (ordered vs unordered, maxRetransmits), which a game engine needs direct control over.
- **simple-peer** (`9.11.1`, last published 2022-02-17) is unmaintained (4 years stale). It was excellent in its time but should not be introduced into a new project.
- **Native WebRTC** (`RTCPeerConnection`, `RTCDataChannel`) is well-supported in all modern browsers. The API surface needed for this project is small: create offer/answer, exchange ICE candidates (via Supabase Realtime), open an unordered/unreliable DataChannel for input packets. This is ~100 lines of code. A library adds dependency risk for minimal savings.

**Signaling flow:**

```
Player A queues  -->  Supabase Realtime channel
Player B queues  -->  Supabase matches by stake range
Supabase notifies both  -->  Exchange SDP offer/answer via Realtime
Exchange ICE candidates  -->  Via Realtime
WebRTC DataChannel opens  -->  Direct P2P, Supabase channel closed
Game ticks  -->  Input packets over DataChannel (unordered, unreliable)
```

**DataChannel configuration for game input:**

```typescript
const channel = peerConnection.createDataChannel('game', {
  ordered: false,        // Don't wait for out-of-order packets
  maxRetransmits: 0,     // Don't retransmit lost packets (stale data is useless)
});
```

This gives UDP-like semantics over WebRTC, which is what game netcode needs. PeerJS defaults to ordered/reliable channels (TCP-like), which causes head-of-line blocking — a disaster for real-time game input.

**TURN relay fallback:**

~15-20% of WebRTC connections fail direct P2P due to symmetric NAT. A TURN relay server is needed as fallback. Options:

| Service | Free Tier | Notes | Confidence |
|---------|-----------|-------|------------|
| Metered.ca | 500MB/month | Most generous free tier for TURN | MEDIUM |
| Xirsys | Limited free | Alternative TURN provider | MEDIUM |
| Self-hosted coturn | Free (but needs a server) | Violates zero-server-cost for day 1 | LOW |

**Recommendation:** Start with Metered.ca free tier for TURN. 500MB/month is sufficient for early user base (game input packets are tiny — ~50 bytes/tick * 64 ticks/sec * 2 players = ~6.4KB/sec per match). Budget for paid TURN only when matchmaking volume exceeds free tier.

> **LOW confidence note:** TURN provider free-tier limits and availability should be verified at implementation time. These were known as of early 2025 training data.

**What NOT to use:**

| Library | Why Not |
|---------|---------|
| `peerjs` ^1.5.5 | Redundant signaling (Supabase already handles it), hides DataChannel config, adds dependency |
| `simple-peer` ^9.11.1 | Unmaintained since 2022 |
| `socket.io` | WebSocket library, not WebRTC. Would route all traffic through a server, violating zero-server-cost constraint |
| `colyseus` | Game server framework — requires a dedicated server |
| `geckos.io` | WebRTC game library but designed for client-server, not pure P2P |

### Game Loop Architecture

| Pattern | Purpose | Confidence |
|---------|---------|------------|
| **Fixed-timestep simulation (64 Hz)** | Deterministic physics/game state updates | HIGH |
| **Variable-timestep rendering (requestAnimationFrame)** | Smooth visual output at monitor refresh rate | HIGH |
| **State interpolation** | Smooth rendering between simulation ticks | HIGH |

**Why this pattern:**

The game runs TWO loops:

1. **Simulation loop** at fixed 64 ticks/second (15.625ms per tick). Uses `setInterval` or accumulated-delta pattern. This is where movement physics, input processing, hit detection, and game state live. Fixed timestep ensures deterministic behavior — both clients produce identical results from identical inputs.

2. **Render loop** at variable rate via `requestAnimationFrame` (targeting 144+ FPS). Interpolates between the last two simulation states for smooth visuals. This decouples visual smoothness from simulation rate.

```typescript
// Core game loop pattern
const TICK_RATE = 64;
const TICK_MS = 1000 / TICK_RATE;
let accumulator = 0;
let previousState: GameState;
let currentState: GameState;

function gameLoop(timestamp: number) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  accumulator += delta;

  // Fixed-timestep simulation
  while (accumulator >= TICK_MS) {
    previousState = clone(currentState);
    currentState = simulate(currentState, getInputs());
    sendInputsToRemote();
    accumulator -= TICK_MS;
  }

  // Interpolated rendering
  const alpha = accumulator / TICK_MS;
  render(interpolate(previousState, currentState, alpha));
  requestAnimationFrame(gameLoop);
}
```

**Why not R3F's useFrame:**

R3F's `useFrame` hook runs once per render frame inside React's reconciliation cycle. It cannot guarantee fixed-timestep simulation, doesn't support accumulator patterns cleanly, and adds React overhead per frame. A custom game loop owns the timing entirely.

### Frontend / Website

| Technology | Version | Published | Purpose | Confidence |
|------------|---------|-----------|---------|------------|
| **next** | `16.1.6` | 2026-01-27 | Website framework (landing, lobby, profiles, leaderboard) | HIGH |
| **react** | `19.2.4` | current | UI library (Next.js peer dependency) | HIGH |
| **tailwindcss** | `4.1.18` | current | Utility CSS for website pages | HIGH |
| **framer-motion** | `12.34.0` | current | Page transitions, lobby animations | HIGH |
| **typescript** | `5.9.3` | current | Type safety throughout | HIGH |

**Why Next.js 16 (not 15, not Vite + React):**

- Next.js 16 is the current stable release (2026-01-27). It supports React 19 natively.
- The project needs SSR/SSG for the landing page (SEO), API routes for lightweight backend logic, and client-side rendering for the game canvas. Next.js handles all three.
- Prior art: the developer's previous gladiator-arena project uses this stack, reducing ramp-up time.
- Tailwind CSS 4.x is the current major version with improved performance and PostCSS integration.

**Why NOT Vite + React SPA:**

The landing page needs SEO (search engines must index it for organic acquisition). A pure SPA with client-side rendering has poor SEO without additional SSR setup. Next.js provides SSR/SSG out of the box.

### Three.js + Next.js Integration Pattern

The Three.js game canvas is a **client-only component** within the Next.js app. It does NOT use R3F.

```typescript
// app/match/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { GameEngine } from '@/engine/GameEngine';

export default function MatchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js renderer + custom game engine
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.start();

    return () => engine.dispose();
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0" />
      {/* HUD overlay as HTML/CSS, positioned over canvas */}
      <div className="fixed inset-0 pointer-events-none">
        <Crosshair />
        <HealthBar />
        <AmmoCounter />
        <KillFeed />
        <RoundScore />
      </div>
    </>
  );
}
```

**Key architectural point:** The game engine (`GameEngine` class) is a pure TypeScript module that takes a canvas element and manages its own Three.js renderer, scene, camera, and game loop. It has ZERO React dependency. React only provides the mounting point (canvas ref) and the HUD overlay (HTML/CSS elements positioned over the canvas).

This separation means:
- The game engine can be tested and developed independently of React/Next.js
- The HUD is regular HTML/CSS (easy to style, accessible, no canvas text rendering)
- React's reconciliation never touches game state
- The engine can be extracted to a standalone page if needed

### Blockchain / Staking

| Technology | Version | Published | Purpose | Confidence |
|------------|---------|-----------|---------|------------|
| **@solana/web3.js** | `1.98.4` | 2025-07-31 | Solana RPC client, transaction building | HIGH |
| **@coral-xyz/anchor** | `0.32.1` | 2025-10-10 | Anchor client for escrow smart contract interaction | HIGH |
| **@solana/spl-token** | `0.4.14` | current | SPL token operations (transfer, balance) | HIGH |
| **@solana/wallet-adapter-react** | `0.15.39` | current | React hooks for wallet connection | HIGH |
| **@solana/wallet-adapter-react-ui** | `0.9.39` | current | Pre-built wallet connection UI components | HIGH |
| **@solana/wallet-adapter-wallets** | `0.19.37` | 2025-06-10 | Wallet adapter implementations (Phantom, Backpack, Solflare) | HIGH |
| **@solana/wallet-adapter-base** | `0.9.27` | current | Base types and interfaces for wallet adapters | HIGH |
| **bs58** | `6.0.0` | current | Base58 encoding/decoding for Solana addresses | HIGH |

**On-chain program (separate Rust codebase):**

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Anchor framework** | `0.32.1` | Solana program framework (Rust) | HIGH |
| **Solana CLI** | latest stable | Program deployment, key management | HIGH |

**Why @solana/web3.js v1 (not v2):**

- `@solana/web3.js` v2.0.0 is published under the `next` npm tag, not `latest`. It is a complete rewrite with a different API surface (tree-shakeable, functional style vs class-based).
- **Critically, Anchor 0.32.1 depends on `@solana/web3.js ^1.69.0`**. Using web3.js v2 would require either a newer Anchor version that supports it (does not exist yet on `latest`) or maintaining two web3.js versions.
- The wallet-adapter ecosystem (`@solana/wallet-adapter-*`) is built around web3.js v1.
- **Recommendation:** Use web3.js v1.98.4. Migrate to v2 when Anchor and wallet-adapter officially support it. This is the pragmatic choice — the entire Solana developer ecosystem is still on v1 as of February 2026.

**What NOT to use:**

| Library | Why Not |
|---------|---------|
| `@solana/web3.js` ^2.0.0 (next tag) | Incompatible with Anchor 0.32.1 and wallet-adapter ecosystem. API rewrite with insufficient ecosystem adoption. |
| `@metaplex-foundation/*` | NFT tooling. This project explicitly avoids NFTs (anti-feature A2). |
| `@project-serum/anchor` | Deprecated package name. Use `@coral-xyz/anchor` instead. |

**Anchor program architecture:**

The escrow program is adapted from the PRIMUS/gladiator-arena pattern:

```
programs/
  escrow/
    src/
      lib.rs            # Program entry point
      instructions/
        initialize.rs   # Maker creates escrow + stakes tokens
        accept.rs       # Taker matches stake
        payout.rs       # Distribute winnings (called by referee)
        cancel.rs       # Maker cancels if no opponent
      state/
        escrow.rs       # EscrowAccount struct (maker, taker, amounts, status)
```

### Match Referee (Serverless)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Cloudflare Workers** | — | Validates match results before triggering on-chain payout | HIGH |
| **wrangler** | `4.65.0` | Cloudflare Workers CLI for development and deployment | HIGH |

**Why Cloudflare Workers (not AWS Lambda, Vercel Serverless):**

- **Free tier:** 100,000 requests/day, 10ms CPU time per invocation. A match referee request is a simple JSON comparison + one Solana RPC call. Well within limits.
- **Edge deployment:** Low latency globally. The referee should respond quickly after match end.
- **No cold start:** Workers use V8 isolates, not containers. Near-instant startup compared to Lambda's cold start (relevant for user experience — players want fast payouts).
- **Solana RPC from Workers:** Workers can make fetch requests to Solana RPC endpoints. The referee validates both clients' submitted results, checks state checksums, and if they agree, signs and submits the payout transaction.

**Referee flow:**

```
Both clients POST match results to Cloudflare Worker
  --> Worker compares results (winner, scores, checksums)
  --> If they agree: Worker calls Anchor `payout` instruction
  --> If they disagree: Flag for dispute resolution
```

**What NOT to use:**

| Service | Why Not |
|---------|---------|
| AWS Lambda | Cold starts add 200-500ms latency; free tier is 1M requests/month but has time-based billing complexity |
| Vercel Serverless Functions | Tied to Vercel deployment; less control over runtime; cold starts |
| Self-hosted server | Violates zero-server-cost constraint |

### State Management (Client-Side)

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **zustand** | `5.0.11` | UI state management (lobby, HUD, settings) | HIGH |

**Why Zustand (not Redux, Jotai, React Context):**

- Minimal boilerplate, tiny bundle (~1KB), works outside React components (important for the game engine to read/write UI state).
- The game engine is NOT managed by React. It needs a state store that can be accessed from both React components (HUD, lobby) and plain TypeScript classes (game engine). Zustand stores are plain JavaScript objects accessible from anywhere.
- Redux adds too much boilerplate for this project's UI state needs. React Context causes unnecessary re-renders.

**Important distinction:** Zustand manages **UI/app state** (lobby status, wallet connection, settings, HUD values). It does NOT manage **game state** (player positions, health, ammo, round status). Game state lives in the game engine's own data structures, updated at 64Hz. The game engine pushes relevant values to Zustand stores for HUD rendering.

```typescript
// Game engine updates Zustand store for HUD
import { useHudStore } from '@/stores/hudStore';

// Inside game engine (not React)
const hudStore = useHudStore.getState();
hudStore.setHealth(player.health);
hudStore.setAmmo(player.weapon.ammo);
```

### Audio

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Web Audio API** | Browser built-in | Spatial 3D audio for gunshots, footsteps, hit sounds | HIGH |

**Why Web Audio API (not Howler.js or Three.js AudioListener):**

- **Howler.js** (`2.2.4`) is an excellent audio library for web apps, but it abstracts away the spatial audio API. For a competitive FPS, we need direct control over `PannerNode` (HRTF panning for directional audio), `GainNode` (distance-based falloff), and `AudioContext` timing (synchronized with game ticks). Howler.js adds an abstraction layer that would need to be bypassed for spatial audio anyway.
- **Three.js `Audio` / `PositionalAudio`** wraps Web Audio API and ties audio sources to `Object3D` positions. This is actually a reasonable choice and could be used. The recommendation for raw Web Audio API is because the game engine already manages positions — duplicating position tracking in Three.js Audio objects adds unnecessary overhead.
- For a project with ~10-15 sound effects (gunshots, footsteps, dink, reload, etc.), raw Web Audio API is manageable and gives maximum control.

**Sound loading pattern:**

```typescript
// Pre-decode all audio buffers at load time
const audioContext = new AudioContext();
const buffers: Map<string, AudioBuffer> = new Map();

async function loadSound(name: string, url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  buffers.set(name, audioBuffer);
}

// Play positional sound
function playAt(name: string, position: Vector3, listenerPos: Vector3) {
  const source = audioContext.createBufferSource();
  source.buffer = buffers.get(name)!;
  const panner = audioContext.createPanner();
  panner.setPosition(position.x, position.y, position.z);
  source.connect(panner).connect(audioContext.destination);
  source.start();
}
```

### Database & Realtime

| Technology | Version | Published | Purpose | Confidence |
|------------|---------|-----------|---------|------------|
| **@supabase/supabase-js** | `2.95.3` | 2026-02-06 | Database (PostgreSQL), Realtime channels (matchmaking signaling, WebRTC signaling), authentication | HIGH |

**Why Supabase (not Firebase, PlanetScale, custom):**

- **Prior art:** The developer's gladiator-arena project uses Supabase. Schema patterns, Realtime channel usage, and authentication flows can be directly adapted.
- **Realtime channels** serve double duty: matchmaking queue coordination AND WebRTC signaling (SDP offer/answer exchange, ICE candidate exchange). No separate signaling server needed.
- **PostgreSQL** with Row Level Security handles player profiles, match history, ELO ratings, and leaderboards.
- **Free tier** is generous: 500MB database, 2GB bandwidth, 50K monthly active users, Realtime included.

**Supabase Realtime for signaling:**

```typescript
// WebRTC signaling over Supabase Realtime
const channel = supabase.channel(`match:${matchId}`);

channel.on('broadcast', { event: 'sdp-offer' }, ({ payload }) => {
  peerConnection.setRemoteDescription(payload.sdp);
});

channel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
  peerConnection.addIceCandidate(payload.candidate);
});
```

### Dev Tooling

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **typescript** | `5.9.3` | Type safety throughout entire codebase | HIGH |
| **vitest** | `4.0.18` | Unit and integration testing | HIGH |
| **eslint** | `10.0.0` | Code linting | HIGH |
| **lil-gui** | `0.21.0` | Development-only debug panel for tuning physics constants | MEDIUM |
| **stats.js** | `0.17.0` | FPS/MS/MB performance overlay during development | MEDIUM |

**Why Vitest (not Jest):**

- Native ESM support, faster execution, compatible with Vite and Next.js toolchains.
- Built-in TypeScript support without additional configuration.
- Same assertion API as Jest (familiar to most developers).

**Why lil-gui:**

The CS:S physics model has ~10 tunable constants (friction, acceleration, air acceleration, gravity, max speed per weapon, jump velocity, etc.). `lil-gui` provides a floating panel to adjust these in real-time during development without restarting. It is development-only and excluded from production builds.

---

## Supporting Libraries (Install If Needed)

These are NOT core dependencies. Install only when the specific feature is being built.

| Library | Version | When to Install | Purpose |
|---------|---------|-----------------|---------|
| **postprocessing** | `6.38.2` | Polish phase | Bloom for muzzle flash, vignette for damage feedback. Use sparingly — performance cost. |
| **three-stdlib** | `2.36.1` | If specific Three.js examples code is needed | Standalone builds of Three.js /examples/jsm modules |

---

## Complete Installation

### Phase 1: Core Engine + Website

```bash
# Core rendering
npm install three@0.182.0
npm install -D @types/three@0.182.0

# Raycasting acceleration
npm install three-mesh-bvh@0.9.8

# Website framework
npm install next@16.1.6 react@19.2.4 react-dom@19.2.4
npm install tailwindcss@4.1.18
npm install framer-motion@12.34.0

# State management
npm install zustand@5.0.11

# Language
npm install -D typescript@5.9.3

# Testing
npm install -D vitest@4.0.18

# Linting
npm install -D eslint@10.0.0

# Dev tools (game tuning)
npm install -D lil-gui@0.21.0 stats.js@0.17.0
```

### Phase 2: Multiplayer + Database

```bash
# Database, realtime, auth
npm install @supabase/supabase-js@2.95.3

# No WebRTC library needed — use native browser API
```

### Phase 3: Blockchain / Staking

```bash
# Solana core
npm install @solana/web3.js@1.98.4
npm install @solana/spl-token@0.4.14
npm install @coral-xyz/anchor@0.32.1
npm install bs58@6.0.0

# Wallet connection
npm install @solana/wallet-adapter-react@0.15.39
npm install @solana/wallet-adapter-react-ui@0.9.39
npm install @solana/wallet-adapter-wallets@0.19.37
npm install @solana/wallet-adapter-base@0.9.27
```

### Phase 4: Match Referee

```bash
# Cloudflare Workers development
npm install -D wrangler@4.65.0
```

### Anchor Program (Separate Rust Environment)

```bash
# Install Anchor CLI (Rust toolchain required)
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli

# Or via AVM (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm
avm install 0.32.1
avm use 0.32.1
```

---

## Project Structure

```
fps-staking-game/
  src/
    app/                        # Next.js App Router pages
      page.tsx                  # Landing page
      arena/page.tsx            # Lobby (matchmaking, staking)
      match/page.tsx            # Game canvas mount point
      leaderboard/page.tsx      # Rankings
      profile/page.tsx          # Player stats
      practice/page.tsx         # Practice mode
      spectate/page.tsx         # Watch live matches
    engine/                     # Custom FPS engine (zero React dependency)
      GameEngine.ts             # Main engine class (init, start, dispose)
      loop/
        GameLoop.ts             # Fixed-timestep simulation + render loop
      physics/
        PlayerController.ts     # CS:S movement model implementation
        Collision.ts            # AABB collision vs map geometry
      combat/
        Hitscan.ts              # Raycasting with BVH
        DamageModel.ts          # HP, armor, multipliers
        Weapons.ts              # Rifle, pistol, knife stats + behavior
        Recoil.ts               # Semi-random recoil pattern
      world/
        Map.ts                  # aim_ag_texture2 geometry generation
        Skybox.ts               # Gradient skybox
      player/
        Mannequin.ts            # Geometric player model
        Animations.ts           # Procedural animation system
        FirstPerson.ts          # First-person arms + weapon view
      input/
        InputManager.ts         # Keyboard + mouse polling (Pointer Lock)
        KeyBindings.ts          # Configurable key bindings
      audio/
        AudioManager.ts         # Web Audio API spatial audio
        SoundLibrary.ts         # Pre-loaded audio buffers
      net/
        WebRTCManager.ts        # Peer connection + data channel management
        InputPacket.ts          # Serialization for network input
        StateChecksum.ts        # Deterministic state hashing
        Interpolation.ts        # State interpolation for remote players
      render/
        Renderer.ts             # Three.js WebGLRenderer wrapper
        Camera.ts               # FPS camera (Pointer Lock)
        HUD.ts                  # Bridge to Zustand HUD store
    stores/                     # Zustand stores
      hudStore.ts               # Health, ammo, kill feed, round score
      lobbyStore.ts             # Queue status, matched opponent
      settingsStore.ts          # Sensitivity, keybinds, volume
      walletStore.ts            # Connection state, balance
    components/                 # React components
      hud/                      # HUD overlay components
      lobby/                    # Arena lobby UI
      wallet/                   # Wallet connection UI
      shared/                   # Reusable UI components
    lib/
      supabase.ts               # Supabase client initialization
      solana.ts                 # Solana connection + program helpers
      constants.ts              # Game constants (physics, damage, tick rate)
  programs/                     # Anchor programs (Rust)
    escrow/
      src/
        lib.rs
        instructions/
        state/
  workers/                      # Cloudflare Workers
    referee/
      src/
        index.ts                # Match result validation + payout trigger
  public/
    sounds/                     # Audio files (.ogg / .mp3)
  tests/
    engine/                     # Game engine unit tests
    programs/                   # Anchor program tests
```

---

## Version Pinning Strategy

**Pin exact versions** for all dependencies. This project involves real money (staked tokens). A surprise breaking change from a loose version range could cause match failures or payout bugs.

```json
// package.json — use exact versions, NOT ranges
{
  "dependencies": {
    "three": "0.182.0",          // NOT "^0.182.0"
    "@solana/web3.js": "1.98.4", // NOT "^1.98.4"
    "next": "16.1.6"             // NOT "^16.1.6"
  }
}
```

Use `npm ci` (not `npm install`) in CI/CD to enforce lockfile-exact installs.

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Three.js version + raw engine approach | HIGH | Version verified on npm (0.182.0, published 2025-12-10). Custom engine approach is well-established for game development. |
| No physics library | HIGH | CS:S movement model is well-documented and fundamentally incompatible with Newtonian physics engines. |
| Native WebRTC over PeerJS | HIGH | Supabase handles signaling; DataChannel configuration control is essential for game input. |
| Solana/Anchor versions | HIGH | All versions verified on npm. Anchor 0.32.1 dependency on web3.js v1 confirmed via npm dependency inspection. |
| Next.js 16 + React 19 | HIGH | Versions verified, peer dependencies confirmed compatible. |
| Supabase for signaling + DB | HIGH | Version verified (2.95.3, published 2026-02-06). Pattern proven in developer's prior project. |
| TURN relay providers | LOW | Free-tier availability from training data (early 2025). Must verify current offerings at implementation time. |
| Game loop pattern | HIGH | Fixed-timestep + interpolation is the established standard for deterministic multiplayer games. |
| Zustand for UI state | HIGH | Version verified (5.0.11). External-access pattern well-documented. |
| Cloudflare Workers referee | MEDIUM | Free tier limits from training data. Core pattern is sound; specific limits should be verified. |

---

## Sources

- **npm registry** (queried 2026-02-13): All package versions and publish dates verified directly via `npm view [package] version` and `npm view [package] time`.
- **npm dependency inspection**: Anchor's `@solana/web3.js ^1.69.0` dependency and R3F's `react >=19 <19.3` peer dependency confirmed via `npm view [package] dependencies/peerDependencies`.
- **Source engine movement model**: Based on well-documented Quake/Source engine movement code. The acceleration/friction/air-strafe mechanics are derived from `sv_accelerate`, `sv_friction`, `sv_airaccelerate` cvars and their implementation in publicly available Source SDK code.
- **WebRTC DataChannel configuration**: Based on W3C WebRTC specification for `RTCDataChannelInit` (ordered, maxRetransmits parameters).
- **Game loop architecture**: Fixed-timestep pattern from Glenn Fiedler's "Fix Your Timestep" (gaffer.on.games), the standard reference for deterministic game loops.
- **Cloudflare Workers free tier**: Based on training data (early 2025). The 100K requests/day free tier has been stable for years but should be re-verified.
- **TURN relay providers**: Based on training data (early 2025). LOW confidence — verify current free-tier availability before committing.
