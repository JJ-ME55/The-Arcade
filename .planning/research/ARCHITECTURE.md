# Architecture Patterns

**Domain:** Browser-based competitive FPS with Solana token staking
**Researched:** 2026-02-13
**Overall confidence:** MEDIUM (based on training knowledge; WebSearch/WebFetch unavailable for live verification)

---

## Recommended Architecture

### System Overview

The system is composed of six major subsystems that operate at different cadences and communicate through well-defined boundaries. The critical insight is that this is really **two applications sharing a viewport**: a 64-tick real-time game engine and a React/Next.js web application. Keeping these cleanly separated while allowing them to cooperate is the central architectural challenge.

```
+----------------------------------------------------------+
|                    BROWSER (Client)                       |
|                                                          |
|  +-------------------+     +---------------------------+ |
|  |   Next.js App     |     |   FPS Game Engine         | |
|  |   (React/Tailwind)|<--->|   (Three.js + TypeScript) | |
|  |                   |     |                           | |
|  |  - Landing page   |     |  - Game loop (64 tick)    | |
|  |  - Arena lobby    |     |  - Physics simulation     | |
|  |  - Leaderboard    |     |  - Renderer (Three.js)    | |
|  |  - Profile        |     |  - Input system           | |
|  |  - HUD overlay    |     |  - Audio (Web Audio API)  | |
|  |  - Wallet UI      |     |  - Netcode layer          | |
|  +--------+----------+     +----------+---+------------+ |
|           |                           |   |              |
+-----------+---------------------------+---+--------------+
            |                           |   |
            v                           |   v
    +-------+--------+                  |  +-------------+
    |    Supabase     |                  |  |   WebRTC    |
    |  (PostgreSQL +  |                  |  | Data Channel|
    |   Realtime)     |                  |  |   (P2P)     |
    |                 |                  |  +------+------+
    | - Matchmaking   |                  |         |
    | - Player stats  |                  |    Direct peer
    | - Match history |                  |    connection
    | - Signaling     |                  |         |
    +-------+---------+                  |  +------+------+
            |                            |  |  Opponent   |
            v                            |  |  Browser    |
    +-------+---------+                  |  +-------------+
    | Cloudflare      |<-----------------+
    | Workers         |
    | (Match Referee) |
    |                 |
    | - Result valid. |
    | - Payout trigger|
    +-------+---------+
            |
            v
    +-------+---------+
    |  Solana Chain    |
    |  (Anchor)       |
    |                 |
    | - Escrow PDA    |
    | - Vault PDA     |
    | - Payout ix     |
    | - Treasury      |
    +-----------------+
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Transport |
|-----------|---------------|-------------------|-----------|
| **Next.js App** | Website pages, routing, HUD overlay, wallet connection, lobby UI | Game Engine (event bus), Supabase (SDK), Solana (wallet-adapter) | In-process events, HTTPS, WSS |
| **FPS Game Engine** | Game loop, physics, rendering, input, audio, hit detection | Next.js App (event bus), WebRTC (data channel), Netcode layer | In-process events, WebRTC DataChannel |
| **Netcode Layer** | Input serialization, tick synchronization, state checksums, interpolation | Game Engine (direct calls), WebRTC DataChannel | Binary protocol over DataChannel |
| **WebRTC Data Channel** | Direct P2P game state transport | Netcode Layer, Supabase (signaling only) | UDP-like (SCTP/unreliable) |
| **Supabase** | Matchmaking queue, player data, match history, WebRTC signaling relay | Next.js App (SDK), Cloudflare Workers (API) | HTTPS, WSS (Realtime channels) |
| **Cloudflare Workers** | Match result validation, payout authorization | Supabase (verify match data), Solana (sign payout tx) | HTTPS |
| **Solana Program (Anchor)** | Token escrow, vault management, payout distribution, treasury | Wallet (client-side signing), Cloudflare Workers (payout authority) | RPC (JSON-RPC to Solana validators) |

---

## Data Flow

### Flow 1: Matchmaking and Connection Establishment

```
Player A (Browser)              Supabase                    Player B (Browser)
      |                            |                              |
      |-- insert_queue_entry ----->|                              |
      |                            |<---- insert_queue_entry -----|
      |                            |                              |
      |                  [Match engine pairs                      |
      |                   players by stake                        |
      |                   tolerance + mode]                       |
      |                            |                              |
      |<-- Realtime: matched ----->|<----- Realtime: matched ---->|
      |                            |                              |
      |-- SDP Offer (via Realtime)->                              |
      |                            |----> SDP Offer (relay) ----->|
      |                            |                              |
      |                            |<---- SDP Answer (relay) -----|
      |<-- SDP Answer (via RT) ----|                              |
      |                            |                              |
      |-- ICE candidates -------->|-----> ICE candidates -------->|
      |<-- ICE candidates ---------|<----- ICE candidates --------|
      |                            |                              |
      |<==========  WebRTC DataChannel established  =============>|
      |                            |                              |
      |  [Supabase signaling       |                              |
      |   no longer needed]        |                              |
```

**Key point:** Supabase Realtime channels are used ONLY for WebRTC signaling (SDP exchange + ICE candidates). Once the DataChannel is open, all game traffic flows directly P2P. The signaling channel can be closed to save resources.

### Flow 2: Game Tick (Steady State)

```
Local Client                    WebRTC DataChannel              Remote Client
     |                                |                              |
     |  [Capture input this tick]     |                              |
     |  [keys, mouse delta, tick#]    |                              |
     |                                |                              |
     |-- Send input packet ---------> |                              |
     |                                |--------> Deliver input ----->|
     |                                |                              |
     |<--------- Receive input -------|<---- Send input packet ------|
     |                                |                              |
     |  [Apply both inputs to         |  [Apply both inputs to      |
     |   deterministic simulation]    |   deterministic simulation] |
     |                                |                              |
     |  [Render interpolated state]   |  [Render interpolated state]|
     |                                |                              |
     |-- Checksum (every N ticks) --> |                              |
     |                                |--------> Checksum ---------> |
     |<--------- Checksum -----------|<--------- Checksum ----------|
     |                                |                              |
     | [Compare: match = OK]          | [Compare: match = OK]       |
     | [Mismatch = flag for referee]  | [Mismatch = flag for ref]   |
```

**Data per tick (approximate, per player):**
- Input packet: ~20-40 bytes (tick number, key bitmask, mouse delta x/y, actions bitmask)
- At 64 ticks/sec, 2 players: ~2.5-5 KB/sec total bandwidth per player
- Checksums every 32-64 ticks: ~32 bytes (hash of world state positions + health)

### Flow 3: Match Result and Payout

```
Client A         Client B         Cloudflare Worker        Supabase         Solana
   |                |                    |                     |               |
   | [Match ends — both clients         |                     |               |
   |  compute final result locally]     |                     |               |
   |                |                    |                     |               |
   |-- POST match result (signed) ----->|                     |               |
   |                |-- POST result --->|                     |               |
   |                |                    |                     |               |
   |                |          [Validate:                      |               |
   |                |           - Both clients agree on winner |               |
   |                |           - Match ID exists in Supabase  |               |
   |                |           - Checksum history consistent  |               |
   |                |           - Round scores valid]          |               |
   |                |                    |                     |               |
   |                |                    |-- Verify match ---->|               |
   |                |                    |<--- Match data -----|               |
   |                |                    |                     |               |
   |                |                    |-- Sign + send payout tx --------->|
   |                |                    |                     |               |
   |                |                    |                [Execute:            |
   |                |                    |                 - 95% to winner    |
   |                |                    |                 - 5% to treasury   |
   |                |                    |                 - Close escrow]    |
   |                |                    |                     |               |
   |                |                    |<--- tx confirmed ---|               |
   |                |                    |                     |               |
   |                |                    |-- Update match ---->|               |
   |                |                    |   record (settled)  |               |
   |                |                    |                     |               |
   |<-- Result: tx hash, earnings ------|                     |               |
   |                |<--- Result --------|                     |               |
```

**Critical security point:** The Cloudflare Worker holds a payout authority keypair. This is the ONLY entity that can trigger the `payout` instruction on the Solana program. Neither client can unilaterally claim funds. Both clients must submit matching results, and the Worker cross-references with Supabase match records.

### Flow 4: Staking Lifecycle

```
State Machine:

  [No Escrow]
       |
       | Player A calls initialize_escrow (stakes tokens)
       v
  [WaitingForOpponent]
       |                    \
       | Player B calls      \ Player A calls cancel_escrow
       | accept_escrow        \ (full refund, escrow closed)
       | (stakes matching)     v
       v                   [Cancelled]
  [Active]
       |
       | Match plays out
       | (WebRTC game session)
       v
  [MatchComplete]
       |
       | Referee calls payout
       | (95% winner, 5% treasury)
       v
  [Settled]
       |
       | Escrow account closed
       | Rent reclaimed
       v
  [Closed]
```

**On-chain accounts:**
- `EscrowAccount` PDA: seeds = `['escrow', maker_pubkey]` -- stores maker, taker, stake amount, status, match ID, winner
- `Vault` PDA: seeds = `['vault', escrow_pubkey]` -- token account holding both players' stakes
- Payout authority: Cloudflare Worker's keypair (stored in Worker secrets, never exposed to clients)

---

## Subsystem 1: Three.js Game Engine + Next.js Integration

### The Core Challenge

The game engine runs a fixed 64-tick simulation loop that must never be blocked by React re-renders. Meanwhile, the Next.js app owns routing, UI overlays (HUD, lobby, scoreboard), and wallet interactions. These two systems must coexist without interfering with each other.

### Recommended Pattern: Detached Engine with Event Bridge

**Confidence: MEDIUM** (based on established React Three Fiber patterns and game engine architecture best practices from training data)

```typescript
// Architecture: The game engine is NOT a React component.
// It is a standalone TypeScript class that owns a <canvas> element.
// React mounts/unmounts it but does not control the render loop.

// === Engine Side ===
class FPSEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private accumulator: number = 0;
  private readonly TICK_RATE = 64;
  private readonly TICK_DURATION = 1000 / 64; // ~15.625ms

  private eventBus: EventEmitter; // Bridge to React

  constructor(canvas: HTMLCanvasElement, eventBus: EventEmitter) {
    this.canvas = canvas;
    this.eventBus = eventBus;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    // ... setup scene, camera, etc.
  }

  // Fixed timestep game loop
  update(deltaMs: number) {
    this.accumulator += deltaMs;
    while (this.accumulator >= this.TICK_DURATION) {
      this.tick(); // Physics, input, simulation at fixed rate
      this.accumulator -= this.TICK_DURATION;
    }
    const alpha = this.accumulator / this.TICK_DURATION;
    this.render(alpha); // Interpolated render at display refresh rate
  }

  private tick() {
    // Process input
    // Run physics
    // Check hits
    // Send network update
    // Emit state changes to React via eventBus
    this.eventBus.emit('health-changed', { health: this.localPlayer.health });
    this.eventBus.emit('ammo-changed', { ammo: this.localPlayer.ammo });
    this.eventBus.emit('kill-feed', { killer: '...', victim: '...' });
  }

  start() {
    const loop = (timestamp: number) => {
      const delta = this.clock.getDelta() * 1000;
      this.update(delta);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  destroy() {
    // Cleanup Three.js resources, cancel RAF, release pointer lock
  }
}
```

```typescript
// === React Side ===
// Next.js page component for /match

function MatchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FPSEngine | null>(null);
  const [health, setHealth] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [killFeed, setKillFeed] = useState<KillEvent[]>([]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const eventBus = new EventEmitter();
    const engine = new FPSEngine(canvasRef.current, eventBus);
    engineRef.current = engine;

    // Subscribe to engine events for HUD
    eventBus.on('health-changed', ({ health }) => setHealth(health));
    eventBus.on('ammo-changed', ({ ammo }) => setAmmo(ammo));
    eventBus.on('kill-feed', (event) => setKillFeed(prev => [...prev, event]));

    engine.start();

    return () => {
      engine.destroy();
      eventBus.removeAllListeners();
    };
  }, []);

  return (
    <div className="relative w-screen h-screen">
      {/* Three.js canvas — engine owns this entirely */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD overlay — React owns this, positioned on top */}
      <HUDOverlay health={health} ammo={ammo} killFeed={killFeed} />
    </div>
  );
}
```

### Why NOT React Three Fiber (R3F)?

R3F is excellent for 3D web applications (configurators, data visualization, simple games). It is **not** recommended here because:

1. **Performance overhead**: R3F's React reconciler adds overhead per frame. At 64 ticks/sec with physics, hit detection, and networking, every microsecond counts.
2. **Control inversion**: R3F wants React to own the render loop (`useFrame`). An FPS engine needs to own its own fixed-timestep loop with accumulator-based ticking, independent of React's scheduler.
3. **State management mismatch**: React state updates are batched and async. Game state must be immediate and synchronous within a tick. Mixing these causes subtle timing bugs.
4. **Pointer lock conflict**: FPS games need persistent pointer lock. R3F's event system and React's synthetic events can interfere.
5. **Memory and GC**: R3F creates many small objects per frame for the reconciler. In a performance-critical FPS, you want zero-allocation hot paths.

**Confidence: HIGH** (this is well-established game engine architecture wisdom; R3F's own documentation acknowledges it is not designed for high-tick-rate game engines)

### Integration Boundaries

| Concern | Owner | Why |
|---------|-------|-----|
| Canvas element | Game Engine (exclusively) | Engine needs direct GL context control, no React interference |
| Game loop timing | Game Engine (requestAnimationFrame) | Fixed timestep must not be interrupted by React renders |
| HUD rendering | React (HTML/CSS overlay) | HTML/CSS HUD is more flexible and accessible than WebGL text |
| Page routing | Next.js | Standard web navigation for lobby, profile, etc. |
| Pointer lock | Game Engine | Must capture/release on game start/pause, engine manages this |
| Keyboard input | Game Engine (raw addEventListener) | React synthetic events add latency; use raw DOM events |
| Mouse input | Game Engine (raw mousemove) | Direct access needed for FPS aim, not React events |
| Wallet connection | React (wallet-adapter) | Standard React hooks from @solana/wallet-adapter |
| State to HUD | Event bus (engine -> React) | One-way data flow, engine emits, React subscribes |
| Commands from UI | Event bus (React -> engine) | e.g., "pause", "change weapon", "start match" |

---

## Subsystem 2: WebRTC P2P Multiplayer

### Session Lifecycle

**Confidence: HIGH** (WebRTC connectivity model is well-documented W3C standard)

```
Phase 1: SIGNALING (via Supabase Realtime)
├── Player A creates offer (RTCPeerConnection.createOffer)
├── Player A sets local description
├── Player A sends SDP offer via Supabase Realtime channel
├── Player B receives offer, sets remote description
├── Player B creates answer (RTCPeerConnection.createAnswer)
├── Player B sets local description
├── Player B sends SDP answer via Supabase Realtime channel
├── Player A receives answer, sets remote description
├── Both exchange ICE candidates via Realtime channel
└── ICE negotiation completes → DTLS handshake → SCTP established

Phase 2: DATA CHANNEL SETUP
├── Player A creates DataChannel("game", { ordered: false, maxRetransmits: 0 })
│   ├── ordered: false — UDP-like, no head-of-line blocking
│   └── maxRetransmits: 0 — drop stale packets, always use latest
├── Player B receives DataChannel via ondatachannel event
├── Both verify channel is open
└── Signaling channel can now be closed

Phase 3: GAME SESSION
├── Exchange clock sync packets (determine latency, agree on tick 0)
├── Begin deterministic simulation
├── Each tick: serialize input → send via DataChannel
├── Receive remote input → apply to simulation
├── Periodic checksum exchange (every 32-64 ticks)
└── On desync: log, flag, continue (referee arbitrates)

Phase 4: TEARDOWN
├── Match ends → both clients compute result
├── Both POST result to Cloudflare Worker (with match ID + signatures)
├── Close DataChannel
├── Close RTCPeerConnection
└── Return to lobby (Next.js navigation)
```

### DataChannel Configuration

```typescript
// Critical: Use UNRELIABLE mode for game inputs
const channel = peerConnection.createDataChannel("game", {
  ordered: false,        // No ordering guarantee — we use tick numbers
  maxRetransmits: 0,     // No retransmission — stale inputs are useless
});

// Secondary channel for reliable messages (round transitions, chat)
const reliableChannel = peerConnection.createDataChannel("control", {
  ordered: true,         // Ordered delivery
  // Default: reliable   // TCP-like semantics
});
```

**Why two channels:**
- Game input packets (64/sec) must be unreliable. A retransmitted 200ms-old input is worse than a dropped one.
- Control messages (round start, round end, pause, chat) must be reliable and ordered. These happen rarely but must arrive.

### Input Packet Format

```
Bit-packed binary for minimum overhead:

Offset  Size    Field
0       4 bytes tick_number (uint32)
4       2 bytes key_bitmask (uint16)
                  bit 0: W (forward)
                  bit 1: A (strafe left)
                  bit 2: S (backward)
                  bit 3: D (strafe right)
                  bit 4: Space (jump)
                  bit 5: Ctrl (crouch)
                  bit 6: Mouse1 (primary fire)
                  bit 7: Mouse2 (secondary fire / knife alt)
                  bit 8: R (reload)
                  bit 9: 1 (rifle)
                  bit 10: 2 (pistol)
                  bit 11: 3 (knife)
6       2 bytes mouse_delta_x (int16, scaled)
8       2 bytes mouse_delta_y (int16, scaled)
10      1 byte  sequence_number (uint8, wraps)

Total: 11 bytes per packet
At 64 ticks/sec: 704 bytes/sec per direction → ~1.4 KB/sec bidirectional
```

### NAT Traversal and TURN Fallback

**Confidence: MEDIUM** (standard WebRTC pattern, but success rates vary by ISP/region)

WebRTC's ICE framework handles NAT traversal automatically:
1. **Host candidates** (local IP) — works on same LAN
2. **Server-reflexive candidates** (via STUN) — works for most symmetric NATs
3. **Relay candidates** (via TURN) — guaranteed fallback, but adds latency and cost

**Recommendation for this project:**
- Use free public STUN servers (Google's `stun:stun.l.google.com:19302` or similar)
- For TURN: either accept that ~10-15% of connections may fail if both players have strict symmetric NAT, or budget for a small TURN server (Cloudflare or Twilio TURN services). This is a key trade-off against the "zero server cost" constraint.
- Most player pairs (estimated 80-90%) will connect via STUN alone
- Display clear error messaging when P2P connection fails, with suggestions (try different network, use VPN, etc.)

---

## Subsystem 3: Deterministic Simulation and Anti-Cheat

### Deterministic Simulation Architecture

**Confidence: MEDIUM** (deterministic lockstep is a well-known pattern for P2P games, but browser JavaScript introduces unique challenges)

```
The deterministic simulation model:

Tick N:
  1. Gather local input for tick N
  2. Send local input to peer
  3. Wait for peer's input for tick N (with timeout)
  4. Apply BOTH inputs to physics simulation
  5. Advance world state by one tick (1/64th second)
  6. Both clients now have identical world state

Requirements for determinism:
  - Same input → same output, guaranteed
  - No floating-point divergence
  - No random() calls (use seeded PRNG with shared seed)
  - Sorted entity processing (same order on both clients)
  - Fixed-point or careful IEEE 754 handling
```

### The Floating-Point Problem

**Confidence: HIGH** (this is a well-documented issue in deterministic simulation)

JavaScript uses IEEE 754 double-precision floats. In theory, the same operations in the same order on the same inputs produce the same results. In practice:

- **Same browser engine, same platform**: Generally deterministic. V8 on Chrome will produce identical results on two Windows machines.
- **Different browser engines**: May differ due to different JIT compilation, different math library implementations.
- **Different platforms**: x86 vs ARM may produce different results for transcendental functions (sin, cos, atan2).

**Mitigation strategy for this project:**
1. **Require same browser engine** (Chrome/Chromium recommended) -- simplifies determinism guarantees.
2. **Avoid transcendental functions in simulation** where possible. Use lookup tables for sin/cos if needed in physics.
3. **Use integer/fixed-point for critical state** (player positions, health). Store as integers with implicit decimal (e.g., position * 1000 as int).
4. **Checksum verification** catches divergence even if it occurs. Don't rely solely on determinism; verify it.
5. **Tolerance-based checksums** -- allow small epsilon differences in positions, flag only significant divergence.

### Anti-Cheat Layers

```
Layer 1: Deterministic Verification (P2P)
├── Both clients compute identical simulation
├── Periodic checksum comparison (every 32-64 ticks)
├── Detects: speed hacks, teleporting, health manipulation
└── Limitation: A hacked client can send correct checksums while rendering differently

Layer 2: Input Validation (P2P)
├── Validate that received inputs are physically possible
│   ├── Mouse delta within human-possible range
│   ├── Key combinations are valid
│   └── Fire rate matches weapon constraints
├── Detects: aimbot (superhuman mouse movement), rapid fire
└── Limitation: Sophisticated aimbots can mimic human patterns

Layer 3: Referee Validation (Cloudflare Worker)
├── Both clients independently submit match results
├── Results must agree (winner, round scores, final kill)
├── Cross-reference with Supabase match record
├── Detects: result fabrication, score manipulation
└── Limitation: Cannot detect in-match cheating, only outcome disagreement

Layer 4: Statistical Analysis (Post-match, Supabase)
├── Track per-player stats over time
├── Flag statistical anomalies (99% headshot rate, inhuman reaction times)
├── Community reporting system
├── Manual review for flagged accounts
└── Limitation: Requires enough data, won't catch first-time cheaters
```

**Honest assessment:** P2P anti-cheat is inherently weaker than server-authoritative anti-cheat. For a staking game, this is a real risk. The mitigation is layered defense: make cheating detectable through checksums and statistics, make the stakes small enough that sophisticated cheat development isn't worth the ROI, and maintain a reputation system that makes cheating costly (ELO loss, account flags, community reports).

---

## Subsystem 4: Solana Escrow and Payout

### On-Chain Architecture

**Confidence: MEDIUM** (based on Anchor escrow patterns from training data; Anchor framework specifics may have evolved)

```
Solana Program (Anchor)
│
├── Instructions:
│   ├── initialize_escrow
│   │   ├── Signer: maker (player A's wallet)
│   │   ├── Creates: EscrowAccount PDA
│   │   ├── Creates: Vault token account PDA
│   │   ├── Transfers: stake_amount from maker → vault
│   │   └── Sets status: WaitingForOpponent
│   │
│   ├── accept_escrow
│   │   ├── Signer: taker (player B's wallet)
│   │   ├── Validates: taker_stake matches maker_stake (within tolerance)
│   │   ├── Transfers: stake_amount from taker → vault
│   │   └── Sets status: Active
│   │
│   ├── payout
│   │   ├── Signer: referee_authority (Cloudflare Worker keypair)
│   │   ├── Validates: status == Active, winner is maker or taker
│   │   ├── Transfers: 95% of vault → winner
│   │   ├── Transfers: 5% of vault → treasury
│   │   ├── Closes vault account (rent reclaim)
│   │   └── Sets status: Settled
│   │
│   └── cancel_escrow
│       ├── Signer: maker (only maker can cancel)
│       ├── Validates: status == WaitingForOpponent
│       ├── Transfers: full amount from vault → maker
│       ├── Closes vault account (rent reclaim)
│       └── Sets status: Cancelled
│
├── Accounts:
│   ├── EscrowAccount (PDA: ['escrow', maker_pubkey])
│   │   ├── maker: Pubkey
│   │   ├── taker: Pubkey (set on accept)
│   │   ├── stake_amount: u64
│   │   ├── status: enum { WaitingForOpponent, Active, Settled, Cancelled }
│   │   ├── match_id: [u8; 32] (links to Supabase match record)
│   │   ├── winner: Option<Pubkey>
│   │   ├── created_at: i64
│   │   └── bump: u8
│   │
│   └── Vault (PDA: ['vault', escrow_pubkey])
│       └── SPL Token Account holding staked tokens
│
└── Authority:
    └── referee_authority: Pubkey (Cloudflare Worker's keypair)
        Only this keypair can call the payout instruction.
        Stored as encrypted secret in Cloudflare Worker environment.
```

### Atomicity Concern: Match Result to Payout

The system must handle the case where a match completes but the payout transaction fails. The escrow sits in `Active` state with funds locked.

**Resolution protocol:**
1. Cloudflare Worker attempts payout transaction
2. On failure: retry with exponential backoff (3 attempts)
3. On persistent failure: mark match as `PendingPayout` in Supabase
4. Background job (scheduled Cloudflare Worker cron) retries pending payouts
5. Manual intervention: admin can trigger payout for stuck escrows
6. Timeout mechanism: if escrow is `Active` for >24 hours with no payout, allow dispute resolution

**For 2v2 matches:**
- Both teammates stake into the same escrow (or separate escrows linked by match_id)
- Recommendation: use a single escrow per match, with 4 stake deposits (maker_1, maker_2, taker_1, taker_2)
- Payout splits 95% evenly between the two winners (47.5% each)
- This requires the escrow account to track 4 participants, not 2
- Alternative: two separate 1v1-style escrows per 2v2 match, simpler but more transactions

---

## Subsystem 5: Supabase as Backbone

### Role Definition

Supabase serves four distinct roles. It is important to understand which role requires which Supabase feature:

| Role | Supabase Feature | Data |
|------|-----------------|------|
| **Matchmaking Queue** | PostgreSQL + Realtime | Queue entries (player, mode, stake amount, timestamp) |
| **WebRTC Signaling** | Realtime Channels | SDP offers/answers, ICE candidates (ephemeral) |
| **Player Data** | PostgreSQL | Profiles, ELO ratings, stats, match history |
| **Match Records** | PostgreSQL | Match ID, players, result, escrow address, timestamps |

### Matchmaking Flow (Database Detail)

```sql
-- Queue table
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id),
  wallet_address TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('1v1', '2v2')),
  stake_amount BIGINT NOT NULL,
  escrow_address TEXT, -- on-chain escrow PDA
  status TEXT DEFAULT 'searching',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matching logic (simplified):
-- Find opponent where:
--   same game_mode
--   stake_amount within 20% tolerance
--   status = 'searching'
--   oldest entry first (FIFO fairness)
```

### Realtime Channel Strategy

```
Channel: matchmaking:{player_id}
  Purpose: Notify player when matched
  Events: 'matched' (contains opponent info, match_id)

Channel: signaling:{match_id}
  Purpose: WebRTC SDP/ICE exchange between matched players
  Events: 'sdp-offer', 'sdp-answer', 'ice-candidate'
  Lifecycle: Created on match, destroyed after WebRTC connection established

Channel: match:{match_id}
  Purpose: Match state updates visible to spectators
  Events: 'round-start', 'round-end', 'match-end', 'player-killed'
  Lifecycle: Created on match start, destroyed on match end
```

---

## Subsystem 6: Cloudflare Worker as Match Referee

### Design

**Confidence: MEDIUM** (Cloudflare Workers architecture is well-understood, but the specific referee pattern is custom)

The referee is deliberately minimal. It does NOT process game ticks or simulate gameplay. It only:
1. Receives match results from both clients
2. Validates they agree
3. Cross-references with Supabase
4. Triggers the on-chain payout

```
Cloudflare Worker: /api/match-result
│
├── Input (from each client):
│   ├── match_id: string
│   ├── player_wallet: string
│   ├── winner_wallet: string
│   ├── round_scores: [number, number]
│   ├── final_checksum: string
│   ├── signature: string (wallet signature over payload)
│   └── timestamp: number
│
├── Validation:
│   ├── Verify wallet signature (proves the submitter is who they claim)
│   ├── Wait for both players' submissions (KV store for first submission)
│   ├── Compare: do both agree on winner?
│   │   ├── YES → proceed to payout
│   │   └── NO → dispute (mark for review, do not pay out)
│   ├── Fetch match record from Supabase (verify match_id exists, players match)
│   └── Verify escrow is in Active state on-chain
│
├── Payout:
│   ├── Construct payout transaction
│   ├── Sign with referee authority keypair (from Worker secrets)
│   ├── Submit to Solana RPC
│   ├── Wait for confirmation
│   └── Update Supabase match record (settled, tx_hash)
│
└── Storage:
    └── Cloudflare KV: temporary storage for first player's submission
        while waiting for second player (TTL: 5 minutes)
```

### Security Considerations

- The referee authority keypair is the highest-value secret in the system. If compromised, an attacker can drain all active escrows.
- Store in Cloudflare Worker secrets (encrypted at rest, not in code).
- Consider a multi-sig or time-locked approach for the authority if stakes grow large.
- Rate-limit the endpoint to prevent abuse.
- The Worker should validate on-chain state directly (not trust client claims about escrow balances).

---

## Patterns to Follow

### Pattern 1: Event Bus for Engine-React Communication

**What:** A lightweight publish-subscribe event emitter that bridges the game engine and React components. Engine emits state changes; React subscribes and updates UI.

**When:** Any time game state needs to be reflected in the HUD or React UI.

**Why:** Decouples the 64-tick engine from React's async rendering cycle. The engine never waits for React. React never blocks the engine. Events are fire-and-forget from the engine's perspective.

```typescript
// Minimal typed event bus
type GameEvents = {
  'health-changed': { health: number; armor: number };
  'ammo-changed': { magazine: number; reserve: number };
  'kill-feed': { killer: string; victim: string; weapon: string; headshot: boolean };
  'round-end': { winner: 'red' | 'blue'; score: [number, number] };
  'match-end': { winner: 'red' | 'blue'; stats: MatchStats };
  'connection-status': { state: 'connecting' | 'connected' | 'disconnected' };
};

class GameEventBus {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof GameEvents>(event: K, callback: (data: GameEvents[K]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback); // unsubscribe
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}
```

### Pattern 2: Fixed Timestep with Interpolated Rendering

**What:** The physics/game simulation runs at a fixed 64 Hz. The renderer runs at the display's refresh rate (typically 60Hz, 144Hz, etc.) and interpolates between the last two simulation states for smooth visuals.

**When:** Always. This is the standard for any real-time game with a network component.

**Why:** Fixed timestep ensures deterministic simulation (both clients step at exactly 1/64th second). Variable rendering ensures smooth visuals regardless of display refresh rate.

```typescript
// Core loop structure
private accumulator = 0;
private previousState: WorldState;
private currentState: WorldState;

gameLoop(timestamp: number) {
  const deltaMs = timestamp - this.lastTimestamp;
  this.lastTimestamp = timestamp;
  this.accumulator += deltaMs;

  // Fixed simulation steps
  while (this.accumulator >= TICK_DURATION) {
    this.previousState = this.currentState.clone();
    this.simulateTick(); // Advance physics, process inputs
    this.accumulator -= TICK_DURATION;
  }

  // Interpolated render
  const alpha = this.accumulator / TICK_DURATION;
  this.render(this.previousState, this.currentState, alpha);

  requestAnimationFrame(this.gameLoop.bind(this));
}
```

### Pattern 3: Input Buffer for Network Jitter Tolerance

**What:** Instead of requiring remote input to arrive exactly on the tick it is needed, buffer 2-3 ticks of inputs to absorb network jitter.

**When:** Every networked game with P2P architecture.

**Why:** Network latency is variable. A 2-tick buffer (31ms at 64Hz) absorbs most jitter without noticeably increasing input delay.

```typescript
class InputBuffer {
  private buffer = new Map<number, InputPacket>(); // tick -> input
  private bufferSize = 2; // ticks of latency tolerance

  addRemoteInput(packet: InputPacket) {
    this.buffer.set(packet.tickNumber, packet);
  }

  getInputForTick(tick: number): InputPacket | null {
    return this.buffer.get(tick) ?? null;
  }

  // When simulating tick N, we process remote input from tick N-bufferSize
  // This means local player sees remote player 2 ticks behind,
  // but the simulation is smooth and never stalls waiting for input
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using React State for Game State

**What:** Storing player positions, velocities, health, or any per-tick data in React `useState` or a React state manager (Redux, Zustand, etc.).

**Why bad:** React state updates are batched and asynchronous. At 64 ticks/sec, the overhead of React reconciliation on game state is enormous and introduces frame-time spikes. React will re-render components unnecessarily, causing GC pressure and frame drops.

**Instead:** Keep all game state in plain TypeScript objects inside the engine. Only emit derivative, low-frequency updates to React (health changed, ammo changed, kill events). HUD components subscribe to these events and update via `useState` at natural UI rates (a few times per second at most).

### Anti-Pattern 2: Relying on WebRTC Reliability for Game Data

**What:** Using ordered, reliable DataChannel configuration for game input packets.

**Why bad:** Reliable delivery means TCP-like retransmission. A single dropped packet stalls all subsequent packets (head-of-line blocking). In an FPS, a 100ms stall is unacceptable. A 200ms-old retransmitted input is useless because newer inputs have already arrived.

**Instead:** Use `{ ordered: false, maxRetransmits: 0 }` for game input. Accept that packets will occasionally drop. Use tick numbers to detect gaps and extrapolate from last known input.

### Anti-Pattern 3: Client-Side Payout Authority

**What:** Allowing either game client to directly call the `payout` instruction on the Solana program.

**Why bad:** A malicious client could claim victory and drain the escrow. Even if both clients must agree, a compromised client can collude with a fake opponent (sock-puppet attack on their own escrow).

**Instead:** Only the Cloudflare Worker's keypair has payout authority. The Worker independently verifies both clients' submissions match, cross-references Supabase match records, and checks on-chain escrow state before signing.

### Anti-Pattern 4: Putting Game Tick Data Through Supabase

**What:** Routing per-tick game state (player positions, inputs) through Supabase Realtime instead of WebRTC DataChannel.

**Why bad:** Supabase Realtime uses WebSocket with server relay. Every message goes client -> Supabase server -> client. This adds 20-100ms+ latency compared to direct P2P. At 64 ticks/sec, this makes the game unplayable. It also generates massive Supabase costs from message volume.

**Instead:** Supabase Realtime is ONLY for signaling (SDP/ICE exchange) and low-frequency events (matchmaking, spectator updates). All game traffic goes direct P2P over WebRTC DataChannel.

### Anti-Pattern 5: Initializing Three.js Scene Inside React Render Cycle

**What:** Creating `THREE.WebGLRenderer`, `THREE.Scene`, or loading assets inside a React component's render function or a `useMemo` that depends on frequently-changing state.

**Why bad:** Three.js objects are heavyweight and should be created once. React's reconciler may call render functions multiple times. GPU context creation is expensive and can cause visible flicker.

**Instead:** Initialize all Three.js objects in a `useEffect` (mount only) or, better yet, in the engine constructor called once from `useEffect`. The engine manages its own lifecycle entirely. React only creates/destroys the engine on mount/unmount.

---

## Build Order (Dependency Analysis)

The components have clear dependency chains. Build order must respect these.

```
DEPENDENCY GRAPH:

Level 0 (No dependencies — can build first):
├── Three.js FPS Engine (standalone, no network, no React)
│   ├── Renderer + scene + camera
│   ├── Player controller (movement, physics)
│   ├── Weapon system (hitscan, recoil)
│   ├── Map geometry
│   └── Player models + animations
│
├── Solana Anchor Program (standalone, testable on localnet)
│   ├── EscrowAccount + Vault PDAs
│   ├── initialize_escrow, accept_escrow, cancel_escrow
│   └── payout instruction
│
└── Supabase Schema (standalone, database design)
    ├── Tables: profiles, matches, matchmaking_queue
    └── RLS policies

Level 1 (Depends on Level 0):
├── Next.js App Shell (depends on: nothing, but will integrate engine later)
│   ├── Pages: landing, lobby, leaderboard, profile
│   ├── Tailwind styling
│   └── Wallet connection (wallet-adapter)
│
├── WebRTC Netcode Layer (depends on: engine input/output format)
│   ├── Input serialization/deserialization
│   ├── Signaling client (Supabase Realtime)
│   ├── DataChannel management
│   └── Input buffer + tick sync
│
└── Engine-React Integration (depends on: engine + Next.js shell)
    ├── Event bus
    ├── Canvas mounting in /match page
    └── HUD overlay components

Level 2 (Depends on Level 1):
├── Multiplayer Game Loop (depends on: engine + netcode layer)
│   ├── Deterministic simulation mode
│   ├── Remote player rendering
│   ├── Checksum generation + comparison
│   └── Round system (freeze time, transitions)
│
├── Matchmaking System (depends on: Supabase schema + Next.js app)
│   ├── Queue insertion + matching logic
│   ├── Realtime notifications
│   └── Lobby UI integration
│
└── Wallet + Staking UI (depends on: Next.js + Anchor program)
    ├── Connect wallet
    ├── Create/accept escrow
    └── Display balances + stake amounts

Level 3 (Depends on Level 2):
├── Full Match Flow (depends on: multiplayer + matchmaking + staking)
│   ├── Queue → match → escrow → play → result
│   └── End-to-end integration
│
├── Cloudflare Worker Referee (depends on: Anchor program + Supabase)
│   ├── Result submission endpoint
│   ├── Validation logic
│   └── Payout transaction signing
│
└── Audio System (depends on: engine being functional)
    ├── Web Audio API spatial setup
    ├── Sound asset loading
    └── Integration with engine events (shots, hits, footsteps)

Level 4 (Depends on Level 3):
├── Spectator Mode (depends on: match flow working)
├── Practice Mode + Bots (depends on: engine + basic AI)
├── ELO Rating System (depends on: match results flowing to Supabase)
├── Stats + Match History (depends on: match records in Supabase)
└── Polish (depends on: everything working end-to-end)
```

### Suggested Build Order (Sequential Phases)

| Phase | What to Build | Rationale |
|-------|--------------|-----------|
| **Phase 1** | Standalone FPS engine (movement, shooting, map, models) | This is the core value. If this doesn't feel right, nothing else matters. Build and iterate in isolation. |
| **Phase 2** | WebRTC multiplayer (netcode, deterministic sim, P2P connection) | Second hardest technical challenge. Needs the engine from Phase 1. Prove P2P works before building around it. |
| **Phase 3** | Next.js website + engine integration + Supabase matchmaking | Now the engine and multiplayer work standalone. Wrap them in the web app. Build the lobby and queue. |
| **Phase 4** | Solana escrow + Cloudflare Worker referee + staking flow | On-chain work can be developed in parallel on devnet. Integrate with match flow once Phase 3 works. |
| **Phase 5** | Full integration + ancillary features (spectate, practice, stats, audio, polish) | Everything connects. Add the features that make it a complete product. |

### Key Build Order Insight

**The FPS engine is the single biggest risk and the foundational dependency.** If CS:S-style movement doesn't feel right in the browser, or if Three.js performance at 64 ticks is insufficient, the entire project concept fails. Build this first, test it extensively (even just WASD + mouse look + shooting at static targets), and validate the core feel before investing in multiplayer, blockchain, or website infrastructure.

---

## Scalability Considerations

| Concern | At 10 concurrent matches | At 100 concurrent matches | At 1000 concurrent matches |
|---------|------------------------|--------------------------|---------------------------|
| **Game traffic** | All P2P — zero server load | All P2P — zero server load | All P2P — zero server load |
| **Supabase** | Well within free tier | May approach free tier limits on Realtime connections | Need Supabase Pro plan; consider connection pooling |
| **Cloudflare Worker** | Well within free tier (10 result validations/min) | Free tier adequate (100 requests/min) | May approach free tier limits (100K requests/day); Worker paid plan |
| **Solana RPC** | Free public RPC adequate | May need dedicated RPC (Helius, Quicknode) | Dedicated RPC required; transaction fees become significant |
| **Matchmaking latency** | Instant for 1v1 (if 20 players online) | Fast queue times | May need regional sharding or ELO-based queue tiers |

**P2P advantage:** Game traffic scales at zero marginal cost. Each match is self-contained between two browsers. The server-side components (Supabase, Worker, Solana) only handle low-frequency events (matchmaking, signaling, payouts), not game ticks.

---

## Sources and Confidence Assessment

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Three.js renderer + custom game loop pattern | MEDIUM | Training data on Three.js game development; could not verify current Three.js API against live docs |
| React Three Fiber is suboptimal for high-tick-rate FPS | MEDIUM | Based on R3F architecture understanding from training data; R3F reconciler overhead is well-documented in community |
| WebRTC DataChannel unreliable mode for game input | HIGH | W3C WebRTC specification is stable; this is standard practice in browser-based multiplayer games |
| WebRTC signaling via Supabase Realtime | MEDIUM | Supabase Realtime supports broadcast channels suitable for signaling; specific API may have evolved |
| Fixed timestep + interpolated rendering pattern | HIGH | Standard game engine pattern documented in Gaffer on Games and widely used |
| Deterministic simulation floating-point concerns | HIGH | IEEE 754 cross-platform issues are well-documented in game networking literature |
| Anchor escrow PDA pattern | MEDIUM | Based on Anchor training data; Anchor framework may have new patterns or version changes |
| Cloudflare Workers for referee/validation | MEDIUM | Workers architecture is well-suited for this; specific KV and secrets API may have updated |
| Input packet binary format | HIGH | Standard binary protocol design; byte sizes and layouts are fundamental |
| NAT traversal success rates (80-90% via STUN) | LOW | Commonly cited figure but varies significantly by region and ISP; no live data to verify |

**Note on research limitations:** WebSearch and WebFetch tools were unavailable during this research session. All findings are based on training knowledge (cutoff: May 2025). For the actual implementation, verify specific API surfaces against current documentation for: Three.js (current version), Supabase Realtime (channel API), Anchor (latest IDL format), and Cloudflare Workers (KV and secrets API). Flag these for phase-specific research during roadmap execution.

---

## Open Questions for Phase-Specific Research

1. **TURN fallback cost**: What is the cheapest TURN relay option if P2P connection fails? Does Cloudflare offer free TURN? This directly impacts the "zero server cost" constraint.

2. **Anchor 2v2 escrow design**: Should 2v2 use a single 4-player escrow or two paired 1v1 escrows? Need to check current Anchor account size limits and transaction size constraints.

3. **Three.js WebGPU renderer**: Three.js has been developing a WebGPU renderer. Is it stable enough for production? Could provide performance headroom for the 64-tick loop.

4. **Supabase Realtime connection limits**: What are the concurrent Realtime connection limits on the free tier? Each player in queue + each spectator consumes a connection.

5. **Cloudflare Worker cold start latency**: When a match ends, the payout Worker may cold-start. Is this latency acceptable (player waiting for payout confirmation)?

6. **Browser pointer lock reliability**: Different browsers handle pointer lock differently (especially on focus loss, alt-tab). Need to test and handle edge cases for FPS mouse capture.
