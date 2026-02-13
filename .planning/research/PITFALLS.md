# Domain Pitfalls

**Domain:** Browser-based competitive FPS with Solana token staking
**Researched:** 2026-02-13
**Overall confidence:** MEDIUM (all findings from training data, no live source verification)

> **Source disclosure:** WebSearch and WebFetch were unavailable during research. All findings derive from training knowledge (cutoff: May 2025). Confidence levels reflect this limitation. Critical claims should be validated against current documentation before implementation.

---

## Critical Pitfalls

Mistakes that cause rewrites, security breaches, or fundamental failure of the product.

---

### Pitfall 1: Floating-Point Non-Determinism Across Browsers and Hardware

**What goes wrong:** The design calls for deterministic simulation on both clients, with periodic state checksums to detect desync. In practice, JavaScript floating-point arithmetic produces different results across browsers, OS platforms, and even CPU architectures. V8 (Chrome), SpiderMonkey (Firefox), and JavaScriptCore (Safari) make different optimization choices (e.g., fused multiply-add, 80-bit intermediate precision on x87 vs 64-bit on SSE2). Two clients running identical code with identical inputs produce different positions, velocities, and hit detection results within seconds of gameplay.

**Why it happens:** IEEE 754 guarantees the *format* of doubles but not the *behavior* of transcendental functions (Math.sin, Math.cos, Math.atan2) or intermediate precision of chained arithmetic. JavaScript engines are free to reorder, fuse, or optimize floating-point operations. Even the same engine on different hardware may produce different results due to JIT optimization levels.

**Consequences:**
- State checksums diverge almost immediately (within 10-100 ticks)
- Hit registration becomes inconsistent: Player A sees a headshot, Player B's simulation says it missed
- With real money staked, desync disputes become match-breaking
- Ragequit/disconnect-on-losing exploits when "desync detected" becomes a mechanism

**Warning signs:**
- Checksum mismatches in cross-browser testing (Chrome vs Firefox vs Edge)
- Position drift that grows over time even with identical input sequences
- Hit registration disagreements in playtest logs
- Desync rates that vary by hardware (AMD vs Intel, integrated vs discrete GPU)

**Prevention:**
1. **Use fixed-point arithmetic for all physics:** Replace all floating-point math in the simulation with integer-scaled fixed-point (e.g., positions in 1/1000ths of a unit as integers). This is the standard approach for deterministic lockstep in RTS games (Age of Empires, StarCraft).
2. **Avoid Math.sin/cos/atan2 in simulation code:** Use lookup tables or polynomial approximations with integer arithmetic.
3. **Separate render state from simulation state:** The Three.js renderer can use floats freely; only the authoritative game simulation must be deterministic.
4. **Test cross-browser determinism from day one:** Run the simulation headless with recorded inputs on Chrome, Firefox, and Edge. Compare checksums per-tick. This must happen in Phase 1, not Phase 2.
5. **Fallback: authoritative client model.** If true determinism proves impractical, designate one client as authoritative for disputed events (hit registration). The referee validates plausibility rather than exact state match.

**Detection:** Automated cross-browser tick-comparison tests. Record input for 1000 ticks, replay on each browser, diff state. If ANY tick diverges, determinism is broken.

**Phase:** Must be addressed in **Phase 1** (Core FPS Engine). If the physics simulation is built on floats from the start, retrofitting fixed-point is a near-complete rewrite of the physics system.

**Confidence:** HIGH -- floating-point non-determinism across JS engines is extremely well-documented and universally experienced by developers attempting deterministic lockstep in browsers.

---

### Pitfall 2: WebRTC P2P Connection Failure Rates in Real-World Networks

**What goes wrong:** WebRTC direct P2P connections fail to establish for a significant percentage of real-world network configurations. Symmetric NAT (common on mobile carriers and corporate networks), double-NAT (ISP-level CGNAT), and strict firewall rules prevent STUN-negotiated connections. Without a TURN relay fallback, 10-30% of player pairs simply cannot connect.

**Why it happens:** STUN only works when at least one peer has a port-predictable NAT (cone NAT). When both peers are behind symmetric NAT, STUN hole-punching fails. The "zero hosting cost" constraint means no TURN server, but TURN is the fallback that makes WebRTC work universally.

**Consequences:**
- Player stakes tokens, enters queue, gets matched, but WebRTC connection fails
- Escrow is in `Active` state but no game can be played
- Players blame the platform ("I lost my money and couldn't even play")
- Geographic/ISP bias: players on certain networks can never play
- Connection success rate drops significantly on mobile networks (if ever expanded)

**Warning signs:**
- ICE candidate gathering takes >10 seconds
- Connection succeeds on local network but fails when testers are on different ISPs
- Specific ISPs or regions have near-100% failure rates
- Players report "stuck on connecting" after matchmaking

**Prevention:**
1. **Budget for a TURN relay.** Free TURN servers exist (metered.ca free tier: 500MB/month, Cloudflare plans to offer TURN). A data channel for 2-4 players at 64 ticks uses minimal bandwidth (~10-50 KB/s per peer). Even a cheap TURN relay on a $5/month VPS handles this.
2. **Implement ICE candidate gathering timeout with graceful fallback.** If direct connection fails in 5 seconds, try TURN. If TURN fails, cancel the escrow and return stakes.
3. **Pre-flight connectivity check:** Before accepting the escrow, have both players exchange a STUN check to verify they can connect. Only lock tokens after connection is confirmed.
4. **Escrow state machine must handle connection failure:** Add a `ConnectionFailed` transition from `Active` back to refund. The smart contract needs a timeout or referee-triggered cancellation.

**Detection:** Track ICE connection success/failure rates per ISP/region in Supabase. Alert when failure rate exceeds 5%.

**Phase:** Must be designed into **Phase 2** (Multiplayer) with smart contract implications for **Phase 4** (Staking). The escrow state machine in the Anchor program must account for connection failures from the start.

**Confidence:** HIGH -- WebRTC connection failure rates behind symmetric NAT are extensively documented. The 10-30% failure range without TURN is a well-established figure from WebRTC deployment experience.

---

### Pitfall 3: P2P Cheat Prevention is Fundamentally Weak When Money is Staked

**What goes wrong:** In a P2P architecture with no authoritative server, the client IS the server. A cheater can modify their local simulation to: give themselves wallhacks (trivial: the other player's position data is received every tick), aimbots (input is local), speed hacks (send manipulated inputs), or simply refuse to report a loss. The "deterministic simulation with checksums" approach catches naive state manipulation but not sophisticated cheats.

**Why it happens:** The fundamental security model of P2P gaming trusts both clients. State checksums verify that both clients ran the same simulation from the same inputs, but a cheater can: (a) use perfect information from received data (wallhack -- undetectable since it's a rendering overlay), (b) compute optimal aim and inject it as "real" mouse input (aimbot -- indistinguishable from skilled play in input logs), (c) selectively desync and claim the other player desynced.

**Consequences:**
- Players lose real money to cheaters
- Trust in the platform collapses rapidly (crypto gaming communities are especially paranoid about fairness)
- Reputation damage is permanent in crypto communities (one viral "I got cheated" post kills adoption)
- Honest players leave, only cheaters remain (death spiral)

**Warning signs:**
- Players with statistically impossible headshot rates (>80% over many matches)
- Sudden spike in "desync" reports from one player's matches
- Community reports of wallhacking (player always pre-aims corners)
- New accounts consistently winning against established players

**Prevention:**
1. **Accept that P2P cannot prevent all cheats.** Design the anti-cheat as layers, not a single mechanism:
   - **Layer 1 (Checksums):** Catches naive memory editors. Minimum viable.
   - **Layer 2 (Statistical analysis):** Server-side analysis of match data for impossible patterns (reaction time < human minimum, headshot rate anomalies, pre-aiming through walls).
   - **Layer 3 (Match replay validation):** Store input logs, replay on Cloudflare Worker to verify outcome. This is the strongest layer -- if the referee replays the match deterministically and gets a different result, flag the match.
   - **Layer 4 (Reputation/ELO gating):** New accounts play low-stakes matches. High-stakes require match history. Flagged accounts restricted.
2. **Wallhack mitigation:** Only send enemy position data when they would be visible (frustum + occlusion culling on the sending side). This is hard to implement perfectly but reduces the information available to wallhacks.
3. **Input rate limiting:** Reject input packets with inhuman characteristics (>1000 DPI equivalent mouse movement between ticks, perfect frame-by-frame tracking).
4. **Do not advertise P2P architecture publicly.** If the community knows there's no server, they know the attack surface.

**Detection:** Automated statistical analysis running on match results in Supabase. Flag accounts exceeding statistical thresholds.

**Phase:** Design the layered approach in **Phase 2** (Multiplayer). Implement Layer 1 (checksums) in Phase 2, Layers 2-4 in **Phase 5** (Full Features). The Cloudflare Workers referee in Phase 4 should be designed to support replay validation even if not initially implemented.

**Confidence:** HIGH -- the fundamental weakness of P2P anti-cheat is well-understood in game development. Every competitive P2P game with stakes faces this problem.

---

### Pitfall 4: Solana Escrow Stuck States and Fund Loss

**What goes wrong:** The escrow smart contract enters a state where staked tokens cannot be recovered. Common scenarios: (a) match completes but referee fails to trigger payout (Worker outage, network error), (b) one player disconnects mid-match and neither the winner nor the contract can resolve, (c) both players desync and both claim victory, (d) the referee is compromised or has a bug, (e) Solana network congestion causes the payout transaction to fail repeatedly.

**Why it happens:** On-chain state machines are permanent. A missing state transition means funds are locked forever. The referee (Cloudflare Worker) is an off-chain component that the smart contract trusts implicitly. If the referee goes down, cannot reach consensus, or is exploited, the escrow has no self-resolution mechanism.

**Consequences:**
- Players lose staked tokens permanently (catastrophic for trust)
- Legal liability for holding/losing user funds
- One incident goes viral and kills the project

**Warning signs:**
- Escrows stuck in `Active` state for >30 minutes (no match should last that long)
- Payout transactions failing on-chain
- Referee Worker returning errors or timing out
- Players reporting "match over but no payout"

**Prevention:**
1. **Implement a timeout-based escape hatch in the smart contract.** If no payout occurs within X minutes (e.g., 30 minutes) of escrow activation, either player can trigger a `timeout_refund` instruction that returns stakes to both players. This is the single most important safety mechanism.
2. **Make the payout instruction callable by multiple parties.** Not just the referee -- allow the winner to submit proof (signed match result from both clients) directly on-chain as a fallback.
3. **Idempotent payout.** The `payout` instruction must be safe to call multiple times. If a transaction fails due to network congestion, retrying must not double-pay.
4. **Test every edge case with Anchor's local validator:** Both players disconnect. Referee crashes. Network congestion. Malicious referee. Double-payout attempt. Timeout edge cases.
5. **Escrow monitoring dashboard:** Query all escrows, alert on any stuck in `Active` > 10 minutes.
6. **Upgradeable program (with timelock):** Use a multisig-gated upgrade authority so critical bugs can be patched, but with a timelock to prevent rug pulls.

**Detection:** Cron job (Cloudflare Worker scheduled trigger or Supabase Edge Function) that queries all active escrows and alerts on any exceeding the timeout threshold.

**Phase:** Must be designed into the Anchor program from **Phase 4** (Staking) day one. The timeout-refund mechanism is not a "nice to have" -- it is a hard requirement before accepting any real funds.

**Confidence:** HIGH -- stuck escrow states are the #1 cause of fund loss in Solana gaming DApps. Every escrow-based protocol has encountered this.

---

### Pitfall 5: Building the FPS Engine Before Proving the Game Loop Feels Good

**What goes wrong:** Teams spend months building a technically correct FPS engine (movement physics, hitscan, networking) only to discover the game doesn't *feel* right. The CS:S movement feel is extremely specific -- it's not just the parameter values (friction 4.0, acceleration 5.0), it's frame timing, interpolation, input processing order, and dozens of subtle interactions that make it feel "right." A technically correct implementation that doesn't feel like CS:S will fail to attract competitive players.

**Why it happens:** CS:S movement feel is an emergent property of many interacting systems, not just physics constants. The Source engine processes input, physics, and collisions in a specific order within a tick. It uses a specific clipping algorithm (Quake-derived). The "feel" of bunny hopping comes from the interaction between air acceleration, the speed-capping algorithm (only caps the component in the wish direction), and the jump timing window. Getting any one of these wrong makes the whole system feel "off."

**Consequences:**
- Months of engineering investment with a game that competitive players dismiss as "not CS-like"
- Movement is the first thing players evaluate -- bad movement = immediate abandonment
- Retrofitting "feel" into a finished engine often requires rewriting the input pipeline and physics loop
- Bunny hopping that feels floaty, counter-strafing that feels sluggish, or air strafing that feels unresponsive are all deal-breakers

**Warning signs:**
- Experienced CS players try it and say "something feels off" but can't articulate what
- Bunny hopping doesn't build speed reliably
- Counter-strafing has a perceptible delay before accuracy kicks in
- Air strafing curves are too tight or too wide compared to CS:S

**Prevention:**
1. **Build a movement prototype FIRST, before anything else.** A flat plane with a player controller. No guns, no networking, no map. Just WASD + mouse + jump. Get this feeling right before writing another line of code.
2. **Study the Quake/Source movement algorithm in detail.** The key references are:
   - The Quake 3 `PM_Accelerate` function (which Source is derived from)
   - The "wish direction" speed cap: `if (currentSpeed < wishSpeed) accelerate, else don't` -- but only comparing the *projection* of velocity onto wish direction
   - The frame-dependent nature of bunny hopping (acceleration per tick, not per second, which means higher tickrates change the feel)
3. **Record CS:S reference footage** for direct side-by-side comparison. Record bunny hop sequences, counter-strafe timings, air strafe arcs in CS:S with `cl_showpos 1` and compare numerical output to your implementation.
4. **Recruit a CS:S player for early playtesting.** Their muscle memory is the most sensitive test instrument you have. If they can bhop and counter-strafe naturally, you've succeeded.
5. **Implement the movement loop in the correct order:** Process input -> Apply friction (ground only) -> Calculate wish direction -> Accelerate -> Move -> Collide -> Resolve. Getting this order wrong changes the feel.

**Detection:** Side-by-side video comparison with CS:S. If an experienced player can tell the difference within 10 seconds of movement, it's not right yet.

**Phase:** This must be the very FIRST thing built in **Phase 1**. The entire project depends on this feeling right. Block all other Phase 1 work until movement feels correct.

**Confidence:** HIGH -- the difficulty of replicating Source engine movement feel is extensively documented in the Quake/Source modding community.

---

### Pitfall 6: Three.js Garbage Collection Stalls in a 64-Tick Game Loop

**What goes wrong:** Three.js was designed for 3D visualization and creative coding, not 60+ FPS competitive gaming. Its API encourages patterns that generate garbage every frame: creating new Vector3/Quaternion/Matrix4 objects, string-based uniform lookups, event listener patterns. At 64 ticks + 60+ FPS rendering, these allocations accumulate and trigger garbage collection pauses of 5-50ms, causing visible frame hitches and input lag spikes.

**Why it happens:** JavaScript's garbage collector runs non-deterministically. In a visualization context, occasional 10ms pauses are invisible. In a competitive FPS, a 10ms hitch during a gunfight is the difference between hitting and missing a headshot. Three.js internally allocates objects in many code paths (raycasting, matrix computation, rendering), and user code naturally follows the same pattern.

**Consequences:**
- Periodic frame time spikes (micro-stutters) even on powerful hardware
- Input latency spikes that feel like "lag" but aren't network-related
- Players blame "netcode" for what is actually GC pauses
- Performance degrades over time as heap grows (memory leaks from undisposed Three.js objects compound this)

**Warning signs:**
- Chrome DevTools Performance tab shows sawtooth memory pattern with periodic GC events
- Frame time occasionally spikes to 20-50ms despite average being 5ms
- Performance degrades after 5-10 minutes of play
- `performance.measureUserAgentSpecificMemory()` shows growing heap

**Prevention:**
1. **Object pooling for ALL per-frame allocations.** Pre-allocate Vector3, Quaternion, Matrix4, Raycaster, and reuse them. Never use `new Vector3()` inside a game loop or tick handler.
2. **Pre-allocate all Three.js objects at load time.** Player meshes, weapon meshes, particle effects -- create everything during loading, show/hide as needed, never create/destroy during gameplay.
3. **Separate simulation from rendering.** The 64-tick simulation should use plain typed arrays (Float64Array or Int32Array for fixed-point), never Three.js objects. Only copy final positions to Three.js objects at render time.
4. **Disable Three.js features you don't need:** No shadows (flat lit), no post-processing (simple aesthetic), no dynamic lights beyond muzzle flash. Each feature adds allocation overhead.
5. **Profile early, profile often.** Use Chrome DevTools Memory timeline from the first prototype. Target zero allocations per frame in the hot path.
6. **Dispose properly.** When a match ends, dispose all geometries, materials, textures, and render targets. Three.js does NOT garbage collect these automatically -- they leak GPU memory.

**Detection:** Chrome DevTools Memory tab. Record a 60-second gameplay session. If the sawtooth GC pattern appears, you have allocation pressure. Target: flat memory graph during gameplay.

**Phase:** Must be established as a coding discipline in **Phase 1** from the very first line of Three.js code. Retrofitting object pooling into an existing codebase is extremely tedious.

**Confidence:** HIGH -- Three.js GC pressure in game loops is a well-known issue documented extensively in Three.js discourse forums and the Three.js manual itself.

---

### Pitfall 7: The Cloudflare Workers Referee is a Single Point of Trust (and Failure)

**What goes wrong:** The match referee running on Cloudflare Workers is the sole authority that triggers payouts. If the referee has a bug, is compromised, or produces wrong results, there is no recourse. Additionally, the referee holds (or has access to) the authority to call the `payout` instruction, meaning it is effectively the custodian of all staked funds.

**Why it happens:** In a P2P architecture, you need a trusted third party to validate match outcomes. The Cloudflare Worker fills this role, but it's a centralized off-chain component with the keys to the on-chain treasury. This creates a trust bottleneck and a rug-pull vector.

**Consequences:**
- Bug in referee logic pays the wrong player (direct fund loss)
- Referee key compromise allows draining all active escrows
- Cloudflare outage means no payouts (stuck escrows)
- Community perceives centralized referee as a rug-pull risk ("the dev controls who wins")

**Warning signs:**
- Referee making payout calls that don't match expected match outcomes
- Community questioning why a centralized server decides who gets paid
- Cloudflare Workers hitting CPU time limits on complex match validation
- Inability to prove to players that the referee is honest

**Prevention:**
1. **Minimize referee authority.** The referee should only be able to trigger payout for the correct winner, not arbitrarily. Have both clients sign the match result, and the referee verifies both signatures agree before triggering payout. If signatures disagree, the referee replays from input logs.
2. **Dual-signature architecture.** Require BOTH the referee signature AND the winning player's signature to call `payout`. This way, the referee alone cannot drain funds.
3. **Publish referee logic as open source.** Let the community audit the validation code. This is cheap trust-building.
4. **Referee key rotation and multisig.** Don't use a single keypair. Use a multisig or rotate the referee authority key regularly. Store the key in Cloudflare Workers secrets (not in code).
5. **Implement the timeout-refund escape hatch** (from Pitfall 4). This limits the damage window of a referee failure.
6. **Log all referee decisions** to an append-only store (Supabase table with RLS preventing deletes). Players can audit every match result.

**Detection:** Automated reconciliation: compare referee payout decisions against match results stored in Supabase. Any mismatch is an immediate critical alert.

**Phase:** Architectural design in **Phase 2** (the dual-signature scheme affects the protocol design). Implementation in **Phase 4** (Staking). Referee audit logging in **Phase 5**.

**Confidence:** MEDIUM -- the specific architectural risk of a Cloudflare Workers referee in Solana gaming is a novel design pattern. The general principle of centralized referee risk in crypto gaming is well-established.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded user experience.

---

### Pitfall 8: requestAnimationFrame Timing is Not Suitable for a Fixed-Tick Simulation

**What goes wrong:** Developers use `requestAnimationFrame` (rAF) to drive both rendering and game simulation. rAF fires at display refresh rate (typically 60Hz, sometimes 144Hz, sometimes 30Hz on battery-saving mode). The design calls for 64 ticks per second. If the simulation is coupled to rAF, tick rate varies by monitor refresh rate, producing different gameplay speeds on different hardware.

**Why it happens:** rAF is the standard browser animation API and feels like the obvious choice. But it's a *rendering* timer, not a *simulation* timer. Its interval is not guaranteed (tabs in background throttle to 1Hz, battery saving reduces to 30Hz, monitors vary from 30-360Hz).

**Prevention:**
1. **Decouple simulation from rendering.** Use a fixed-timestep accumulator pattern:
   ```
   while (accumulatedTime >= TICK_INTERVAL) {
     simulateTick();
     accumulatedTime -= TICK_INTERVAL;
   }
   renderWithInterpolation(accumulatedTime / TICK_INTERVAL);
   ```
2. **Use `performance.now()` for time source**, not rAF's timestamp parameter (which can be rounded/clamped for Spectre mitigations in some browsers).
3. **Cap the number of simulation ticks per frame** to prevent spiral-of-death when a tab is foregrounded after being throttled (e.g., max 4 ticks per frame, drop the rest).
4. **Test on 30Hz, 60Hz, 144Hz, and 360Hz displays.** The game must feel identical on all of them.

**Detection:** Log actual tick rate during gameplay. If it deviates from 64 by more than +/- 2, the timing system is wrong.

**Phase:** **Phase 1** (Core FPS Engine). This is foundational to the game loop.

**Confidence:** HIGH -- the fixed-timestep pattern is standard game development knowledge, and the rAF coupling mistake is common in browser game tutorials.

---

### Pitfall 9: Pointer Lock API Edge Cases and Browser Inconsistencies

**What goes wrong:** The Pointer Lock API (`document.pointerLockElement`, `requestPointerLock()`) has numerous edge cases: (a) browsers require a user gesture (click) before granting pointer lock, (b) Chrome rate-limits pointer lock requests after the user presses Escape (a "cooldown" period, roughly 1-2 seconds), (c) Firefox and Chrome report `movementX`/`movementY` differently when pointer lock is first acquired (first event may have a large delta), (d) some browsers fire an `pointerlockerror` event silently, (e) Alt+Tab or OS-level interrupts break pointer lock without a clean event.

**Why it happens:** Pointer Lock was designed for casual games and demos, not competitive FPS. Browser vendors have added restrictions over time to prevent malicious sites from trapping the cursor. These restrictions conflict with FPS gameplay needs.

**Prevention:**
1. **Handle pointer lock loss gracefully.** Pause the game when pointer lock is lost. Show a clear "Click to resume" overlay. Never leave the player in a state where they can't control their character.
2. **Discard the first `mousemove` event** after pointer lock acquisition. The initial delta is often a large jump to the center of the screen.
3. **Implement pointer lock request retry with backoff.** If `requestPointerLock()` fails, wait 500ms and try again on the next click. Show user-friendly messaging ("Click the game to continue").
4. **Test the Escape key flow specifically.** Player presses Escape (opens menu / leaves lock), then clicks back. This is the most common edge case.
5. **Use `pointerlockerror` and `pointerlockchange` events** to track state machine transitions, not just `document.pointerLockElement` polling.

**Detection:** QA checklist: Alt+Tab during gameplay, Escape key, browser devtools opening, OS notification popup, multi-monitor mouse escape, and fullscreen toggle. Each must recover cleanly.

**Phase:** **Phase 1** (Core FPS Engine). Build the pointer lock state machine early.

**Confidence:** HIGH -- Pointer Lock API issues are well-documented on MDN and in browser bug trackers.

---

### Pitfall 10: WebRTC Data Channel Ordering and Reliability Misconfiguration

**What goes wrong:** WebRTC data channels can be configured as ordered/unordered and reliable/unreliable. Developers either: (a) use the default (ordered + reliable, which is TCP-like) causing head-of-line blocking and latency spikes when packets are lost, or (b) use unordered + unreliable (UDP-like) but don't implement sequence numbering, causing input packets to be processed out of order and breaking the deterministic simulation.

**Why it happens:** The correct configuration for a 64-tick game is nuanced. You want low latency (unreliable, no retransmit) but you need every input to arrive eventually (for deterministic replay). These requirements conflict.

**Prevention:**
1. **Use unordered, unreliable data channels for tick input** to minimize latency. Each input packet includes a tick sequence number. The receiving client processes them in order by sequence number, not arrival order.
2. **Implement redundancy, not reliability.** Include the last N inputs (e.g., last 3 ticks) in every packet. If packet for tick 100 is lost, it arrives in the packet for tick 101, 102, or 103. This provides reliability without retransmission delay.
3. **Use a separate ordered, reliable channel for control messages** (match start, round end, concede, disconnect).
4. **Monitor round-trip time and packet loss** on the data channel. Display connection quality to players. Allow players to see their ping.

**Detection:** Log packet loss rate and out-of-order arrival rate during playtesting. If >2% packet loss on a stable connection, check configuration.

**Phase:** **Phase 2** (Multiplayer). Get this right from the first networking prototype.

**Confidence:** HIGH -- WebRTC data channel configuration pitfalls are standard knowledge in real-time multiplayer networking.

---

### Pitfall 11: Input Processing Order Breaks Movement Physics Feel

**What goes wrong:** The order in which the game loop processes inputs, physics, and collisions changes the emergent feel of movement. CS:S processes in a specific order inherited from Quake: (1) read input, (2) categorize (on ground vs airborne), (3) apply friction if grounded, (4) calculate wish velocity from input, (5) accelerate, (6) move, (7) collide and clip velocity, (8) check ground contact. Changing this order -- for example, checking ground contact before friction, or colliding before accelerating -- produces subtly different behavior that experienced players detect instantly.

**Why it happens:** There's no "physics engine" for Source-style movement. You have to implement the exact algorithm. Most tutorials and game physics resources describe a different order (often: integrate forces, detect collisions, resolve). The Source/Quake approach is idiosyncratic.

**Prevention:**
1. **Start from the Quake 3 Arena GPL source code** (`bg_pmove.c`) as the reference implementation. The Source engine's movement is a direct descendant with minor parameter changes.
2. **Implement the exact `PM_Accelerate` algorithm:** `addSpeed = wishSpeed - DotProduct(velocity, wishDirection); if (addSpeed <= 0) return; accelSpeed = accel * wishSpeed * frameTime; if (accelSpeed > addSpeed) accelSpeed = addSpeed; velocity += wishDirection * accelSpeed;`
3. **Implement `PM_AirAccelerate` as a separate function** with its own speed cap behavior (capped at 30 units/s in Quake 3, 10 in CS:S -- but the projection-based cap is what enables air strafing).
4. **Write unit tests comparing your output to recorded Source engine values.** Capture position+velocity per tick from CS:S with `cl_showpos 1` for known input sequences, then verify your engine matches.

**Detection:** Side-by-side comparison of velocity graphs for identical input sequences between CS:S and your engine.

**Phase:** **Phase 1** (Core FPS Engine). This is the movement implementation itself.

**Confidence:** HIGH -- the Quake/Source movement algorithm is well-documented in the Quake source code and community analysis.

---

### Pitfall 12: WebRTC Signaling Bootstrapping Through Supabase Creates a Race Condition

**What goes wrong:** Using Supabase Realtime channels for WebRTC signaling (SDP offer/answer exchange, ICE candidate trickling) introduces race conditions. If Player B subscribes to the signaling channel after Player A has already sent the SDP offer, Player B never receives the offer. Supabase Realtime does not replay missed messages. Additionally, Realtime channel subscriptions are asynchronous -- there's a window between "join channel" and "subscribed" where messages are lost.

**Why it happens:** Supabase Realtime is a pub/sub system designed for live updates, not a reliable message queue. It does not guarantee delivery of messages sent before subscription. WebRTC signaling requires exactly-once, ordered delivery of SDP and ICE candidates.

**Prevention:**
1. **Store signaling data in the Supabase database (not just Realtime).** Write the SDP offer to a row. Player B reads the row on join AND subscribes for updates. This ensures the offer is available regardless of subscription timing.
2. **Implement a signaling state machine:** `offer_created` -> `answer_created` -> `ice_complete` -> `connected`. Both players poll the database row state on channel subscription to catch up on missed events.
3. **Retry ICE candidates.** If the initial ICE candidate exchange seems incomplete, re-send all gathered candidates after a short delay.
4. **Connection establishment timeout.** If WebRTC is not connected within 15 seconds of signaling start, retry the entire signaling flow from scratch.

**Detection:** Intermittent "connection failed" reports that succeed on retry. Signaling data present in database but peer never received it.

**Phase:** **Phase 2** (Multiplayer). This is the WebRTC connection establishment flow.

**Confidence:** MEDIUM -- this is an inference from Supabase Realtime's pub/sub semantics and WebRTC signaling requirements. Specific race condition timing depends on Supabase Realtime's implementation details.

---

### Pitfall 13: CS:S Semi-Random Recoil is Harder to Replicate Than Deterministic Patterns

**What goes wrong:** The design calls for CS:S-style "semi-random" recoil rather than CS:GO-style deterministic spray patterns. Teams assume "random recoil" is simpler than deterministic patterns. In practice, CS:S recoil uses a *seeded* pseudo-random number generator that both the client and server agree on, producing recoil that feels random but is reproducible. In a deterministic P2P simulation, both clients must produce identical "random" recoil sequences, which requires synchronized RNG state.

**Why it happens:** "Semi-random" sounds simpler than "deterministic pattern," but determinism in P2P means ALL randomness must be seeded and synchronized. If you use `Math.random()`, each client gets different recoil, and hit detection diverges.

**Prevention:**
1. **Use a seeded PRNG (e.g., mulberry32, xorshift128) instead of Math.random().** Seed it with the round number + tick number, or a shared seed exchanged at match start.
2. **The PRNG must be part of the deterministic simulation state.** Both clients must call it the same number of times in the same order per tick.
3. **Test by recording recoil spray results** on both clients for 100 consecutive shots. They must be bit-identical.
4. **Alternative: Use deterministic recoil patterns anyway.** CS:GO proved that deterministic patterns are viable and arguably more competitive (reward spray control practice). This eliminates the RNG synchronization problem entirely.

**Detection:** Recoil comparison tests between two clients for the same firing sequence. Any divergence means RNG is not synchronized.

**Phase:** **Phase 1** (Core FPS Engine, weapon implementation).

**Confidence:** HIGH -- synchronized PRNG for deterministic multiplayer is a well-established requirement.

---

### Pitfall 14: Staking UX That Feels Like a Casino Instead of a Competition

**What goes wrong:** The staking flow is designed like a crypto DeFi product (connect wallet, approve transaction, stake tokens) instead of a competitive game entry. Players feel like they're gambling, not competing. Regulatory exposure increases. The crypto-skeptic FPS audience is alienated. The game attracts degenerate gamblers instead of competitive players, creating a toxic community.

**Why it happens:** Developers with crypto experience default to DeFi UX patterns. Prominent token amounts, transaction confirmations, and wallet popups put the financial aspect front and center, overshadowing the gameplay.

**Consequences:**
- Regulatory scrutiny (gambling classification in many jurisdictions)
- Wrong audience (gamblers, not gamers)
- Competitor perception: "it's just another crypto casino game"
- High-skill players leave because low-skill players aren't fun to play against (they're just gambling)

**Warning signs:**
- Community discussions focus on staking returns rather than gameplay
- Player retention is low (gamblers have no loyalty)
- Comparisons to crypto casinos in media coverage
- Regulatory inquiries

**Prevention:**
1. **Frame staking as an entry fee, not a bet.** Language matters. "Entry fee: 500 tokens" not "Stake: 500 tokens." "Prize pool" not "pot." "Winner's purse" not "payout."
2. **Make practice mode prominent.** Players should play dozens of free matches before ever staking. The path should be: play free -> get good -> compete for stakes.
3. **Prominent skill display:** Show ELO, match history, win rate prominently. De-emphasize token amounts.
4. **Require minimum match history** before high-stakes matches (e.g., 10 free matches before staking, 50 matches before staking >1000 tokens).
5. **The landing page should show GAMEPLAY, not tokenomics.** Lead with the FPS, not the crypto.

**Detection:** Monitor what new users do first: if >50% go straight to staking without playing practice mode, the UX is pushing gambling over gaming.

**Phase:** **Phase 3** (Website & Matchmaking) for UX design. **Phase 5** for practice mode flow.

**Confidence:** MEDIUM -- this is derived from patterns observed in crypto gaming projects that launched and struggled with audience fit. Specific regulatory outcomes vary by jurisdiction.

---

### Pitfall 15: Three.js Raycasting Performance for Hitscan Hit Detection

**What goes wrong:** Using Three.js's built-in `Raycaster` for hitscan hit detection against mannequin player models is too slow for a 64-tick simulation. Three.js raycasting tests against every triangle in the scene by default, and mannequin models made of multiple geometric primitives (head sphere, torso capsule, limb cylinders) each add raycasting overhead. At 64 ticks with potentially 4 players shooting, that's hundreds of raycasts per second.

**Why it happens:** Three.js `Raycaster` is a general-purpose tool designed for mouse picking in 3D scenes. It traverses the entire scene graph and tests against mesh bounding boxes, then individual triangles. This is overkill for FPS hitscan where you only need to test against a few hitbox shapes.

**Prevention:**
1. **Don't use Three.js Raycaster for gameplay hit detection.** Implement your own ray-vs-primitive tests in the simulation layer:
   - Ray vs sphere (head hitbox) -- trivial math
   - Ray vs capsule (torso, limbs) -- slightly more complex but still fast
   - Ray vs AABB (simplified hitboxes) -- fastest option
2. **Keep hitbox representations separate from Three.js scene graph.** Hitboxes are plain math objects (center, radius, height) updated from simulation state, not Three.js meshes.
3. **Use Three.js Raycaster only for non-gameplay purposes** (mouse picking in menus, debug visualization).
4. **For 2v2, you're testing against at most 3 enemy hitboxes per shot.** Custom ray-primitive intersection is effectively free at this scale.

**Detection:** Profile the simulation tick. If hitscan takes >0.5ms per shot, the detection method is too heavy.

**Phase:** **Phase 1** (Core FPS Engine, weapon implementation).

**Confidence:** HIGH -- Three.js Raycaster performance for per-tick gameplay use is a documented concern in the Three.js community.

---

## Minor Pitfalls

Mistakes that cause annoyance, minor delays, or cosmetic issues.

---

### Pitfall 16: Web Audio API Autoplay Policy Blocks Game Sounds

**What goes wrong:** Browsers block `AudioContext` creation or playback until after a user gesture (click, keypress). If the game creates an AudioContext on page load or match start without a prior gesture, all sound is silently blocked. Players hear nothing -- no gunshots, no footsteps, no headshot dink.

**Prevention:** Create and resume the AudioContext on the first user click (e.g., the "Click to play" overlay that also requests pointer lock). Store the context globally and reuse it. Never create AudioContext in response to a non-gesture event (WebSocket message, timer, etc.).

**Phase:** **Phase 5** (Audio integration). But design for it from Phase 1 by having a central AudioContext that's initialized on user gesture.

**Confidence:** HIGH -- autoplay policy is a well-documented browser restriction.

---

### Pitfall 17: Memory Leaks from Undisposed Three.js Resources Between Matches

**What goes wrong:** When a match ends and a new one begins, developers create new Three.js scenes, geometries, materials, and textures without properly disposing the old ones. Three.js does not garbage-collect GPU resources (WebGL buffers, textures). After several matches, GPU memory fills up, causing performance degradation, texture corruption, or browser tab crashes.

**Prevention:**
1. **Implement a `disposeMatch()` function** that traverses the scene and calls `.dispose()` on every geometry, material, and texture.
2. **Better: Reuse the scene between matches.** Reset positions and state rather than destroying and recreating. This is faster and avoids disposal bugs.
3. **Use `renderer.info` to monitor GPU resource counts.** After disposal, `renderer.info.memory.geometries` and `renderer.info.memory.textures` should return to baseline.

**Phase:** **Phase 2** (when matches start repeating). Monitor from Phase 1.

**Confidence:** HIGH -- Three.js resource disposal is covered explicitly in the Three.js documentation.

---

### Pitfall 18: Bunny Hop Tick-Rate Dependency

**What goes wrong:** Bunny hopping effectiveness depends on the number of acceleration frames applied while airborne. At higher tick rates, more acceleration frames are applied per second, but each frame applies less acceleration (scaled by frameTime). However, the speed cap check (`if currentSpeed < wishSpeed`) happens per-frame, and the interaction between per-frame speed cap and per-frame acceleration is not purely linear. This means bunny hopping feels different at 64 tick vs 128 tick vs variable tick rates, even with identical physics constants.

**Prevention:**
1. **Lock the simulation to exactly 64 ticks.** Never let the tick rate vary.
2. **Test bunny hop speed accumulation** against CS:S at 66 tick (the closest standard tick rate). Tune air acceleration to compensate for the 64 vs 66 tick difference if needed.
3. **The fixed-timestep accumulator (Pitfall 8) ensures consistent tick rate** regardless of frame rate. This is critical.

**Phase:** **Phase 1** (Core FPS Engine, movement physics).

**Confidence:** HIGH -- tick-rate dependency of Quake-derived movement is well-documented.

---

### Pitfall 19: Wallet Adapter Connection UX Pain on Solana

**What goes wrong:** Solana wallet-adapter works differently across wallets (Phantom, Backpack, Solflare). Common issues: (a) mobile browser wallet detection fails (Phantom in-app browser vs standalone Chrome), (b) transaction signing popups interrupt gameplay flow, (c) wallet disconnects silently during a match, (d) users on mobile get redirected to app stores instead of connecting.

**Prevention:**
1. **Wallet connection happens ONLY in the lobby, never during gameplay.** Pre-sign any necessary transactions before the match starts.
2. **The escrow flow should require exactly 2 wallet interactions:** (a) `initialize_escrow` or `accept_escrow` before the match, (b) nothing during the match, (c) payout is triggered by the referee, not the player. No wallet popups during gameplay.
3. **Test with Phantom, Backpack, and Solflare on both desktop and mobile browsers.** Each has quirks.
4. **Scope to desktop-only initially** (as stated in project constraints). Mobile wallet connection is a minefield that can be addressed later.

**Phase:** **Phase 4** (Staking & Blockchain).

**Confidence:** MEDIUM -- wallet adapter issues are commonly reported in Solana developer communities, but specific behavior changes with wallet updates.

---

### Pitfall 20: Matchmaking Queue Starvation in Low-Population Periods

**What goes wrong:** The matchmaking system with 20% stake tolerance works when there's a healthy player population. With a small initial player base, players queue for minutes with no match, get frustrated, and leave. The game dies from a cold-start problem: not enough players -> long queues -> players leave -> even fewer players.

**Prevention:**
1. **Launch with direct challenge (invite link) as the primary mode.** Don't depend on random matchmaking initially. Players invite friends directly.
2. **Broader stake tolerance for low population.** Start with 50% tolerance and tighten as population grows.
3. **Show queue population to players.** "3 players searching in your stake range" is better than an infinite spinner.
4. **Cross-mode queuing for practice.** While waiting for a staked match, offer a free practice match against another queued player. This keeps players engaged.
5. **Bot matches as fallback** (no staking, for practice) when no human opponent is available.

**Phase:** **Phase 3** (Matchmaking design) and **Phase 5** (practice mode / bots as fallback).

**Confidence:** MEDIUM -- cold-start problem is universal for multiplayer games, but specific thresholds depend on the audience size.

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Severity | Mitigation |
|-------|---------------|----------|------------|
| **Phase 1: Core FPS Engine** | Movement doesn't feel like CS:S (Pitfall 5) | Critical | Build movement prototype first, test with CS player |
| **Phase 1: Core FPS Engine** | Floating-point non-determinism built in from start (Pitfall 1) | Critical | Use fixed-point or validate cross-browser determinism immediately |
| **Phase 1: Core FPS Engine** | GC-heavy Three.js patterns established early (Pitfall 6) | Moderate | Enforce object pooling discipline from line 1 |
| **Phase 1: Core FPS Engine** | rAF-coupled simulation loop (Pitfall 8) | Moderate | Fixed timestep accumulator from day one |
| **Phase 1: Core FPS Engine** | Wrong input processing order (Pitfall 11) | Moderate | Reference Quake 3 PM_Accelerate source |
| **Phase 1: Core FPS Engine** | Three.js Raycaster for hitscan (Pitfall 15) | Moderate | Custom ray-primitive intersection from start |
| **Phase 2: Multiplayer** | WebRTC connection failures without TURN (Pitfall 2) | Critical | Budget for TURN relay, pre-flight connectivity check |
| **Phase 2: Multiplayer** | P2P cheat vulnerability (Pitfall 3) | Critical | Design layered anti-cheat, don't rely on checksums alone |
| **Phase 2: Multiplayer** | Data channel misconfiguration (Pitfall 10) | Moderate | Unreliable + unordered with redundancy for game data |
| **Phase 2: Multiplayer** | Signaling race condition (Pitfall 12) | Moderate | Store signaling data in DB, not just Realtime |
| **Phase 2: Multiplayer** | Synchronized PRNG for recoil (Pitfall 13) | Moderate | Seeded PRNG as part of simulation state |
| **Phase 3: Website** | Gambling UX instead of competition UX (Pitfall 14) | Moderate | Frame as entry fee, lead with gameplay |
| **Phase 3: Website** | Queue starvation (Pitfall 20) | Moderate | Direct challenge first, broader tolerance |
| **Phase 4: Staking** | Stuck escrow / fund loss (Pitfall 4) | Critical | Timeout-refund escape hatch mandatory |
| **Phase 4: Staking** | Referee single point of failure (Pitfall 7) | Critical | Dual-signature, timeout fallback, open-source referee |
| **Phase 4: Staking** | Wallet connection UX issues (Pitfall 19) | Minor | Desktop-only, wallet interaction only in lobby |
| **Phase 5: Full Features** | Audio autoplay blocked (Pitfall 16) | Minor | AudioContext on user gesture |
| **Phase 5: Full Features** | GPU memory leaks between matches (Pitfall 17) | Minor | Proper disposal or scene reuse |

---

## Top 5 "Project Killer" Risks (Ranked)

1. **Escrow stuck states (Pitfall 4)** -- Players lose real money. Instant project death. Non-negotiable: implement timeout-refund before accepting any real funds.

2. **P2P cheating with real money on the line (Pitfall 3)** -- One viral cheating incident kills trust permanently. Layered anti-cheat is mandatory, and the community must perceive the system as fair.

3. **Movement doesn't feel like CS:S (Pitfall 5)** -- The entire value proposition is "CS:S in the browser." If movement feels wrong, competitive players won't come and won't stay.

4. **Floating-point non-determinism (Pitfall 1)** -- If the deterministic simulation isn't actually deterministic, the entire P2P + checksums + referee architecture falls apart. This must be validated in Phase 1, not discovered in Phase 2.

5. **WebRTC connection failures (Pitfall 2)** -- If 20% of matched players can't connect, the staking flow breaks (money locked, no game played). A TURN fallback or pre-flight check is essential.

---

## Sources

All findings in this document are derived from training knowledge (cutoff: May 2025). Key knowledge sources include:

- **Quake 3 Arena GPL source code** (`bg_pmove.c`) -- movement physics algorithm reference [HIGH confidence]
- **Three.js documentation** -- object disposal, memory management patterns [HIGH confidence]
- **MDN Web Docs** -- Pointer Lock API, Web Audio API autoplay policy, WebRTC API [HIGH confidence]
- **Gaffer On Games** (gafferongames.com) -- deterministic lockstep, fixed timestep patterns [HIGH confidence]
- **Glenn Fiedler's networking articles** -- P2P reliability, packet redundancy patterns [HIGH confidence]
- **IEEE 754 specification** -- floating-point determinism limitations [HIGH confidence]
- **Solana/Anchor documentation** -- PDA, escrow patterns, program upgrade authority [MEDIUM confidence -- may have changed since training]
- **WebRTC community experience** -- NAT traversal success rates, TURN necessity [HIGH confidence]
- **Browser game development community** -- GC pressure, rAF timing, Pointer Lock edge cases [MEDIUM confidence]
- **Crypto gaming post-mortems** -- escrow stuck states, referee trust, gambling perception [MEDIUM confidence]

**Items needing live verification before relying on them:**
- Cloudflare Workers CPU time limits for match replay validation
- Current Supabase Realtime message delivery guarantees
- Current Solana wallet-adapter behavior across wallets
- Cloudflare TURN relay availability and pricing
- Current browser-specific Pointer Lock API restrictions and cooldown timings
