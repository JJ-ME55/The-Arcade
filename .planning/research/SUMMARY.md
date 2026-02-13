# Research Summary

**Project:** FPS Staking Game (Browser-based competitive FPS with Solana token staking)
**Synthesized:** 2026-02-13
**Overall confidence:** MEDIUM-HIGH

---

## Executive Summary

This project is a browser-based competitive FPS with authentic CS:S movement physics, where players stake Solana tokens on 1v1 and 2v2 matches. The architecture is fundamentally a **two-application system**: a standalone 64-tick Three.js game engine operating independently of a Next.js web shell, connected by a lightweight event bus. Multiplayer operates via WebRTC peer-to-peer data channels (zero server game traffic), with Supabase providing matchmaking, signaling relay, and player data, and a Cloudflare Worker acting as match referee to authorize on-chain payouts from an Anchor-based escrow program on Solana.

The recommended approach is to build the custom FPS engine first and in isolation -- this is both the highest-risk and highest-value component. CS:S movement physics cannot be replicated by any existing physics library (Rapier, Cannon, Ammo.js all implement Newtonian physics, which is incompatible with Source engine's Quake-derived acceleration model). The engine uses raw Three.js (not React Three Fiber, which adds reconciliation overhead incompatible with competitive frame rates), custom ray-primitive intersection for hitscan (not Three.js Raycaster, which is too slow for per-tick gameplay), and Web Audio API for spatial sound. All rendering and UI outside the game canvas is handled by Next.js 16 + React 19 + Tailwind CSS 4, with Zustand bridging engine state to HUD components.

The top risks are: (1) escrow stuck states causing permanent fund loss -- the Anchor program MUST include a timeout-refund escape hatch before accepting real funds; (2) P2P cheating with real money at stake -- layered anti-cheat (checksums + statistical analysis + referee replay + reputation gating) is mandatory, not optional; (3) floating-point non-determinism across browsers breaking the deterministic simulation model -- fixed-point arithmetic or early cross-browser validation is required in Phase 1, not Phase 2; (4) WebRTC connection failures for 10-30% of player pairs without TURN relay -- budget for TURN from day one despite the "zero server cost" goal; and (5) movement that doesn't feel authentically like CS:S -- the entire value proposition hinges on this, so it must be validated by an experienced CS:S player before any other feature work proceeds.

---

## Key Findings

### From STACK.md (Confidence: HIGH)

- **Three.js 0.182.0 (raw, not R3F)** -- R3F's React reconciliation adds per-frame overhead unacceptable for a 64-tick competitive FPS. The engine is a standalone TypeScript class with zero React dependency.
- **Custom physics (no library)** -- CS:S movement uses Quake-derived acceleration with projection-based speed capping that enables air strafing. No physics engine implements this. It is ~200-300 lines of vector math.
- **Native WebRTC (no PeerJS/simple-peer)** -- Supabase Realtime handles signaling, making PeerJS redundant. Direct DataChannel configuration control (unordered, unreliable) is essential for game input.
- **Solana: web3.js v1.98.4 + Anchor 0.32.1** -- Anchor depends on web3.js v1; the v2 rewrite is incompatible with the current ecosystem. Pin exact versions for a staking application.
- **Next.js 16 + React 19 + Tailwind 4** -- SSR for landing page SEO, client rendering for game canvas, prior art from developer's gladiator-arena project.
- **Cloudflare Workers for match referee** -- 100K requests/day free tier, no cold starts (V8 isolates), edge-deployed for low-latency payout authorization.
- **Zustand 5.0.11 for UI state** -- Accessible from both React components and plain TypeScript engine classes. Game state stays in engine; Zustand handles HUD/lobby/settings only.

### From FEATURES.md (Confidence: MEDIUM)

**Must-have (MVP):**
- Responsive controls (<50ms input-to-screen), accurate hit registration, low-latency netcode (64-tick WebRTC P2P)
- CS:S movement model (THE differentiator), HUD (crosshair/health/ammo), audio feedback, settings (sensitivity/keybinds)
- Match flow (best of 5 rounds), wallet connection, on-chain escrow with cancel/refund, payout breakdown
- Match result validation via referee, disconnect handling, matchmaking queue, landing page

**Should-have (MVP, high value/low cost):**
- Practice mode (lowers barrier to staked play), transaction feedback (tx signatures/explorer links), balance display, direct challenge by wallet address

**Defer to post-MVP:**
- Leaderboard, player profiles, match history UI (store data from day 1, surface later), spectator mode, ELO-based matchmaking (start with stake-range only), on-chain earnings display

**Anti-features (never build in v1):**
- Weapon skins/cosmetics, NFTs, complex tokenomics, mobile support, multiple maps, voice chat, dedicated servers, weapon unlocks/progression, play-to-earn emissions, replay system, tournament brackets, anti-cheat browser extension, team sizes beyond 2v2

### From ARCHITECTURE.md (Confidence: MEDIUM)

- **Detached engine with event bridge**: Game engine is a standalone TypeScript class owning a canvas. React mounts/unmounts it but never controls the render loop. Communication via typed event bus.
- **Fixed-timestep (64Hz) simulation + variable-rate rendering**: Accumulator pattern decouples deterministic physics from display refresh rate. State interpolation for smooth visuals.
- **Two WebRTC DataChannels**: Unreliable/unordered for game input (UDP-like, 11 bytes/packet, ~1.4 KB/s bidirectional); reliable/ordered for control messages (round transitions, chat).
- **Input redundancy over reliability**: Include last 3 ticks of input in every packet to recover from drops without retransmission delay.
- **Escrow state machine**: NoEscrow -> WaitingForOpponent -> Active -> MatchComplete -> Settled/Closed. Cancel path from WaitingForOpponent. Timeout-refund escape hatch from Active.
- **Referee as minimal validator**: Does NOT simulate gameplay. Receives results from both clients, validates agreement, cross-references Supabase, triggers on-chain payout. Holds authority keypair in Worker secrets.
- **Build order by dependency level**: Engine (Level 0) -> Netcode + App Shell (Level 1) -> Multiplayer + Matchmaking + Staking UI (Level 2) -> Full Match Flow + Referee + Audio (Level 3) -> Spectator + Practice + Polish (Level 4).

### From PITFALLS.md (Confidence: MEDIUM-HIGH)

**Critical (project killers):**
1. **Escrow stuck states** -- Timeout-refund escape hatch is non-negotiable. Idempotent payout. Monitoring dashboard.
2. **P2P cheating with money at stake** -- Layered defense: checksums, statistical analysis, referee replay, reputation gating. Wallhack mitigation by only sending visible enemy positions.
3. **Movement doesn't feel like CS:S** -- Build movement prototype FIRST, before guns, networking, or maps. Validate with an experienced CS:S player.
4. **Floating-point non-determinism** -- Use fixed-point arithmetic in simulation layer, or validate cross-browser determinism in Phase 1 with automated tick-comparison tests.
5. **WebRTC connection failures** -- Budget for TURN relay. Pre-flight connectivity check before locking escrow funds. Escrow state machine must handle connection failure.

**Moderate (delays/debt):**
- rAF not suitable for fixed-tick simulation (use accumulator pattern)
- Pointer Lock API edge cases (build state machine early)
- DataChannel misconfiguration (unreliable+unordered with redundancy)
- Supabase Realtime signaling race condition (store in DB, not just pub/sub)
- Synchronized PRNG for recoil (seeded, deterministic, part of simulation state)
- Gambling UX perception (frame as entry fee, lead with gameplay, require practice matches)
- Queue starvation at launch (direct challenge first, broader tolerance, show queue population)

**Minor:**
- Web Audio autoplay policy (init AudioContext on user gesture)
- Three.js memory leaks between matches (dispose or reuse scenes)
- Bunny hop tick-rate dependency (lock to 64 ticks exactly)
- Wallet adapter UX pain (desktop-only, wallet interaction only in lobby)

---

## Implications for Roadmap

### Suggested Phase Structure: 5 Phases

**Phase 1: Core FPS Engine (Standalone)**
- **Rationale:** This is the single highest-risk component and the foundation for everything else. If CS:S movement doesn't feel right in the browser, the project concept fails. Must be validated before ANY investment in multiplayer, blockchain, or website.
- **Delivers:** Playable single-player FPS prototype: movement, shooting, map, player models, HUD, settings.
- **Features:** F1 (controls), F6 (movement), F2 (hit registration), F4 (HUD), F7 (visual clarity), F9 (settings), D1 (authentic CS:S movement), D7 (headshot damage model).
- **Pitfalls to avoid:** Floating-point non-determinism (Pitfall 1 -- establish fixed-point or validate determinism NOW), GC-heavy Three.js patterns (Pitfall 6 -- object pooling from line 1), rAF-coupled simulation (Pitfall 8 -- accumulator pattern from day 1), wrong input processing order (Pitfall 11 -- reference Quake 3 source), Three.js Raycaster for hitscan (Pitfall 15 -- custom ray-primitive intersection), movement feel (Pitfall 5 -- build movement prototype FIRST, test with CS player), bunny hop tick dependency (Pitfall 18 -- lock to 64 ticks), synchronized PRNG for recoil (Pitfall 13).
- **Research flag:** NEEDS `/gsd:research-phase` -- CS:S movement algorithm specifics (PM_Accelerate, PM_AirAccelerate, friction application order), fixed-point arithmetic patterns in JavaScript, Three.js object pooling best practices.

**Phase 2: WebRTC Multiplayer (P2P Netcode)**
- **Rationale:** Second hardest technical challenge. Prove P2P works before building matchmaking or staking around it. Must validate WebRTC connectivity rates and deterministic sync.
- **Delivers:** Two players can connect P2P and play a match with synchronized game state, deterministic simulation, and checksum verification.
- **Features:** F3 (netcode), F10 (match flow/rounds), D5 (deterministic simulation), F5 (audio feedback -- directional, spatial).
- **Pitfalls to avoid:** WebRTC connection failures (Pitfall 2 -- implement TURN fallback), P2P cheat design (Pitfall 3 -- design layered anti-cheat architecture), DataChannel misconfiguration (Pitfall 10 -- unreliable+unordered with input redundancy), Supabase signaling race condition (Pitfall 12 -- store in DB not just Realtime), recoil synchronization (Pitfall 13).
- **Research flag:** NEEDS `/gsd:research-phase` -- WebRTC TURN provider options and pricing (2026), Supabase Realtime delivery guarantees, cross-browser determinism test results from Phase 1.

**Phase 3: Website + Matchmaking + Engine Integration**
- **Rationale:** Engine and multiplayer work standalone. Wrap them in the web app. Build the lobby, queue, landing page. This phase makes it feel like a product instead of a tech demo.
- **Delivers:** Complete web experience: landing page, lobby with matchmaking queue, game canvas integration, player profiles (data collection), practice mode.
- **Features:** P1 (matchmaking), P5 (landing page), F8 (practice mode), S1 (wallet connection -- UI only, no staking yet), D8 (direct challenge), P2 (leaderboard -- basic), P3 (player profile -- basic).
- **Pitfalls to avoid:** Gambling UX perception (Pitfall 14 -- frame as competition, lead with gameplay, require practice), queue starvation (Pitfall 20 -- direct challenge primary, broad tolerance, show queue size), Pointer Lock recovery (Pitfall 9 -- handle alt-tab and escape cleanly).
- **Research flag:** Standard patterns, likely does NOT need `/gsd:research-phase`. Next.js + Supabase integration is well-documented and developer has prior art.

**Phase 4: Solana Staking + Referee**
- **Rationale:** On-chain escrow and referee can be developed in parallel on devnet. Integrate with match flow once Phase 3 works. This phase introduces real money -- every edge case must be handled.
- **Delivers:** Complete staking flow: escrow creation, opponent matching with stakes, match play, referee validation, on-chain payout, cancel/refund.
- **Features:** S2 (on-chain escrow), S3 (cancel/refund), S4 (transaction feedback), S5 (payout breakdown), S6 (balance display), S7 (match result validation), S8 (disconnect handling), D2 (skill-only wagering), D3 (zero-download + real stakes).
- **Pitfalls to avoid:** Escrow stuck states (Pitfall 4 -- timeout-refund escape hatch MANDATORY, idempotent payout, monitoring), referee single point of failure (Pitfall 7 -- dual-signature architecture, open-source referee logic, key rotation), wallet adapter UX (Pitfall 19 -- desktop only, wallet interaction only in lobby).
- **Research flag:** NEEDS `/gsd:research-phase` -- Current Anchor 0.32.1 PDA patterns, Solana transaction size limits for 2v2 escrow design, Cloudflare Worker secrets management, current wallet-adapter behavior.

**Phase 5: Polish + Full Features + Launch**
- **Rationale:** Everything connects. Add features that make it a complete product. Implement deeper anti-cheat layers, spectator mode, ELO system.
- **Delivers:** Production-ready product with spectator mode, ELO ranking, comprehensive stats, audio polish, post-processing effects, and community features.
- **Features:** D4 (spectator mode), D6 (ELO matchmaking), D9 (on-chain earnings history), D10 (aim_ag_texture2 nostalgia), P4 (match history), plus anti-cheat Layers 2-4 (statistical analysis, replay validation, reputation gating).
- **Pitfalls to avoid:** Audio autoplay (Pitfall 16 -- AudioContext on user gesture), memory leaks between matches (Pitfall 17 -- dispose or reuse), GC accumulation (Pitfall 6 -- profile and optimize).
- **Research flag:** Standard patterns, likely does NOT need `/gsd:research-phase`. These are feature additions on a working foundation.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry on 2026-02-13. Version compatibility (Anchor <-> web3.js v1, R3F rejection rationale) confirmed via npm dependency inspection. |
| Features | MEDIUM | Based on training knowledge of browser FPS (Krunker, ev.io) and crypto gaming. No live market validation. Competitive landscape may have shifted since early 2025. Regulatory status of skill-based wagering unverified for 2026. |
| Architecture | MEDIUM | Core patterns (fixed timestep, P2P netcode, event bus) are HIGH confidence. Specific API surfaces (Supabase Realtime delivery guarantees, Anchor PDA patterns, Cloudflare Workers KV) may have evolved. |
| Pitfalls | MEDIUM-HIGH | Fundamental issues (floating-point determinism, P2P cheat weakness, escrow stuck states) are well-established and HIGH confidence. Specific mitigations (TURN provider pricing, browser Pointer Lock cooldowns) need live verification. |

### Gaps Requiring Attention

1. **TURN relay provider availability and pricing (2026)** -- LOW confidence. Free-tier options (Metered.ca 500MB/month) are from early 2025 training data. Must verify before Phase 2 implementation. Directly impacts "zero server cost" constraint.
2. **Regulatory status of skill-based token wagering** -- Not addressed in research. Varies by jurisdiction. Legal counsel recommended before launch. Geo-blocking may be required.
3. **Cross-browser floating-point determinism** -- Research identifies the risk but the actual extent of divergence between Chrome instances on identical hardware is unknown. Must be empirically validated in Phase 1 with automated tick-comparison tests.
4. **Supabase Realtime concurrent connection limits (free tier)** -- Each queued player and spectator consumes a connection. Limits may affect scalability earlier than expected.
5. **Three.js WebGPU renderer maturity** -- Could provide performance headroom but stability for production competitive FPS is unverified.
6. **2v2 escrow design** -- Single 4-player escrow vs two paired 1v1 escrows. Depends on current Anchor account size limits and transaction size constraints. Needs Phase 4 research.
7. **Cloudflare Workers CPU time limit** -- 10ms free tier. Match replay validation (anti-cheat Layer 3) may exceed this. Needs verification for paid tier limits.

---

## Cross-Research Patterns

Several themes emerged consistently across all four research files:

1. **Engine independence is paramount.** STACK, ARCHITECTURE, and PITFALLS all converge on the same conclusion: the game engine must be a standalone TypeScript module with zero React, zero physics library, and zero framework dependency. Every abstraction layer (R3F, Rapier, PeerJS) was rejected for adding overhead or hiding critical control surfaces.

2. **Determinism is the architectural linchpin.** The P2P model, anti-cheat system, referee validation, and dispute resolution ALL depend on both clients producing identical simulation results. If determinism fails, the entire architecture collapses. This single concern appears in STACK (custom physics rationale), ARCHITECTURE (checksum system), FEATURES (D5 differentiator), and PITFALLS (Pitfalls 1, 8, 11, 13, 18).

3. **The escrow must be self-healing.** ARCHITECTURE and PITFALLS independently arrive at the same conclusion: a timeout-refund escape hatch is non-negotiable. The referee is a single point of failure, Solana network congestion can stall payouts, and players will lose real money if escrows get stuck. The Anchor program design must account for every failure mode from day one.

4. **Movement feel is the single most important feature AND the single hardest technical challenge.** FEATURES identifies it as the #1 differentiator (D1). PITFALLS identifies it as a top-5 project killer (Pitfall 5). STACK structures the entire technology selection around it (custom physics, raw Three.js, no abstractions). ARCHITECTURE puts it at Level 0 of the dependency graph. Everything depends on getting this right first.

5. **Zero server cost is aspirational, not absolute.** STACK recommends Metered.ca TURN relay. PITFALLS warns that 10-30% of connections fail without TURN. ARCHITECTURE acknowledges the TURN trade-off. The "zero server cost" constraint should be reframed as "minimal server cost" with a small TURN budget ($0-5/month initially).

---

## Sources (Aggregated)

**HIGH confidence sources (well-established, unlikely to have changed):**
- npm registry (queried 2026-02-13) -- all package versions and publish dates
- Quake 3 Arena GPL source code (`bg_pmove.c`) -- movement physics reference
- W3C WebRTC specification -- DataChannel configuration, ICE framework
- IEEE 754 specification -- floating-point determinism limitations
- Gaffer On Games (gafferongames.com) -- fixed timestep, deterministic lockstep patterns
- Glenn Fiedler's networking articles -- P2P reliability, packet redundancy
- Three.js documentation -- object disposal, memory management, GC concerns
- MDN Web Docs -- Pointer Lock API, Web Audio API, WebRTC API

**MEDIUM confidence sources (based on training data, may have evolved):**
- Solana/Anchor documentation -- PDA patterns, escrow design, program upgrade authority
- Supabase Realtime documentation -- channel API, delivery guarantees
- Cloudflare Workers documentation -- KV, secrets API, CPU time limits
- Browser game development community -- GC pressure, Pointer Lock edge cases
- Crypto gaming post-mortems -- escrow failures, referee trust, gambling perception
- Competitive FPS landscape -- Krunker.io, ev.io, Venge.io feature sets

**LOW confidence (needs live verification):**
- TURN relay provider pricing and free-tier availability (2026)
- Regulatory status of skill-based token wagering by jurisdiction
- NAT traversal success rates by region/ISP
