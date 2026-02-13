# ROADMAP.md

## Overview

This roadmap delivers a browser-based competitive FPS with Solana token staking across 9 phases. Phases are ordered by dependency and risk: the custom FPS engine is the foundational make-or-break component, followed by the map and player models that give it a world, then weapons and combat that make it a game, then match flow and HUD that make it competitive, then audio that makes it immersive, then multiplayer that makes it real, then the web platform that makes it accessible, then staking that makes it high-stakes, and finally practice mode and polish that make it complete.

**Depth:** Comprehensive
**Total v1 Requirements:** 81
**Phases:** 9

---

## Phase 1: Movement Engine

**Goal:** Player can run, jump, crouch, and air-strafe in a 3D space with movement that feels authentically like Counter-Strike: Source.

**Dependencies:** None (foundation)

**Requirements:**
- ENGINE-01: CS:S authentic physics (ground friction 4.0, acceleration 5.0, air acceleration 10.0)
- ENGINE-02: Counter-strafe to instantly zero velocity
- ENGINE-03: Bunny hop with no stamina penalty, speed building through air strafing
- ENGINE-04: Air strafe by synchronizing strafe keys with mouse movement
- ENGINE-05: Crouch to reduce hitbox, crouch-jump to reach higher ledges
- ENGINE-06: Stable 60fps rendering in Chrome/Firefox/Edge with Three.js
- ENGINE-07: Game loop at 64 ticks per second for physics
- ENGINE-08: Pointer lock for FPS camera control with no perceptible input lag

**Success Criteria:**
1. Player can move through a test volume with WASD, jump with space, crouch with ctrl, and the camera responds to mouse with zero perceptible lag after pointer lock engages
2. Player can counter-strafe (tap opposite direction key) and come to an immediate stop -- velocity reaches zero within 1-2 ticks, visually instantaneous
3. Player can chain bunny hops across a flat surface and measurably gain speed with each jump when applying correct air-strafe technique (strafe key + mouse curve)
4. Game loop maintains 64 tick/s physics simulation and renders at 60fps or above with no dropped frames during movement in Chrome, Firefox, and Edge
5. An experienced CS:S player confirms movement "feels right" -- ground acceleration, air control, friction, and crouch behavior match CS:S expectations

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 01-01-PLAN.md -- Project bootstrap + engine core + renderer + test arena
- [ ] 01-02-PLAN.md -- Movement physics (Source SDK) + collision detection + crouch
- [ ] 01-03-PLAN.md -- Settings + debug overlay + crosshair + movement validation checkpoint

---

## Phase 2: Map & Environment

**Goal:** The aim_ag_texture2 map exists as a complete, navigable arena with correct geometry, symmetry, and lighting that players can move through.

**Dependencies:** Phase 1 (movement engine to test navigation)

**Requirements:**
- MAP-01: aim_ag_texture2 faithfully recreated with 4-floor vertical layout
- MAP-02: Block geometry with flat solid-color surfaces (dev texture aesthetic)
- MAP-03: Symmetrical with neither spawn side having advantage
- MAP-04: One fixed spawn point per team on opposite ends
- MAP-05: Mix of open platforms, tight corridors, ramps, and vertical angles
- MAP-06: Bright, even, static lighting with no dark corners

**Success Criteria:**
1. Player spawns into the map and can navigate all 4 floors via ramps and jumps, with collision preventing passage through walls and floors
2. Map is visually recognizable as aim_ag_texture2 -- the characteristic multi-level block layout with open platforms, corridors, and ramps is faithfully represented
3. Two spawn points exist on opposite ends, and walking the map from each spawn reveals mirror-symmetrical geometry with no positional advantage to either side
4. All surfaces use flat solid-color materials (dev texture look) with bright, uniform lighting that leaves no dark corners or hidden spots

---

## Phase 3: Player Models & First-Person View

**Goal:** Players see a mannequin character model in the world with procedural animations, and experience a polished first-person view with arms and weapon models.

**Dependencies:** Phase 1 (movement states drive animations), Phase 2 (map provides environment context)

**Requirements:**
- MODEL-01: Mannequin figures built from geometric primitives (spheres, cylinders, capsules)
- MODEL-02: Proper human proportions (~7.5 head-heights tall)
- MODEL-03: Red team solid matte red, blue team solid matte blue
- MODEL-04: Procedural run animation with arm swing and leg stride synced to movement speed
- MODEL-05: Procedural strafe, crouch, jump, shooting, reload, and knife swing animations
- MODEL-06: Death triggers ragdoll physics on all joints
- MODEL-07: First-person view shows mannequin arms in team color with geometric weapon models
- MODEL-08: First-person gun bob synced to footsteps, visual recoil kick, and muzzle flash

**Success Criteria:**
1. A mannequin figure made of geometric primitives (no external models) stands in the map with correct human proportions, clearly distinguishable as red team or blue team by solid matte color
2. The mannequin visibly animates when moving -- arms swing and legs stride during running, body shifts during strafing, compresses during crouching, and rises during jumping, all procedurally synced to actual movement speed
3. When a mannequin "dies," its body collapses with ragdoll physics -- joints go limp and the body tumbles naturally based on momentum
4. In first-person view, the player sees their own team-colored mannequin arms holding a geometric weapon model, with gun bob that sways in rhythm with footsteps, visual recoil kick when firing, and a muzzle flash effect

---

## Phase 4: Weapons & Combat

**Goal:** Players can shoot, switch weapons, and eliminate opponents with a damage model that rewards precise aim -- headshots kill in one rifle shot.

**Dependencies:** Phase 1 (movement affects accuracy), Phase 3 (hitboxes on models, first-person weapon view)

**Requirements:**
- COMBAT-01: Rifle hitscan with 4x headshot multiplier (one-tap kill ~104 damage)
- COMBAT-02: Semi-random recoil (upward climb + random lateral pull)
- COMBAT-03: Accuracy degrades while moving and sustained fire, recovers when stopped
- COMBAT-04: Pistol hitscan with faster rate, better running accuracy, ~2 headshots to kill
- COMBAT-05: Knife ~40 damage left click, instant kill right-click backstab, fastest movement speed
- COMBAT-06: Switch between rifle, pistol, knife with draw animations
- COMBAT-07: Players spawn with 100 HP + full armor + helmet
- COMBAT-08: Tagging on hit (slight movement speed reduction)
- COMBAT-09: Slightly generous hitboxes (CS:S style)
- COMBAT-10: Headshot dink sound on hit
- COMBAT-11: Client-side prediction with immediate visual feedback (blood, sparks)

**Success Criteria:**
1. Player can fire rifle at a stationary mannequin and a headshot deals ~104 damage (one-tap kill through helmet), while body shots deal ~26 damage -- the 4x headshot multiplier is clearly observable in damage numbers
2. Sustained rifle fire produces visible recoil that climbs upward with random lateral pull, and weapon accuracy degrades during movement or spray but recovers to baseline when the player stops and waits
3. Player can switch between rifle, pistol, and knife with visible draw animations, and each weapon behaves distinctly -- pistol fires faster with better moving accuracy, knife swings with left/right click dealing different damage, knife grants fastest movement speed
4. When a shot lands, the shooter sees immediate visual feedback (blood/sparks) and hears a distinct metallic dink on headshots, and the target experiences tagging (movement slows briefly)
5. Hitboxes feel fair -- shots that visually look like they should hit the mannequin register as hits, with slightly generous registration matching CS:S feel

---

## Phase 5: Match Flow & HUD

**Goal:** Two local test players can play a complete best-of-5 match with freeze time, round transitions, scoring, and a full competitive HUD -- the game has structure and stakes.

**Dependencies:** Phase 4 (combat required for elimination rounds), Phase 2 (spawn points for round starts)

**Requirements:**
- MATCH-01: Best of 5 rounds, first to 3 wins
- MATCH-02: 3-second freeze time at round start
- MATCH-03: Round ends when all players on one team eliminated
- MATCH-04: 5-second round transition with team win display and announcer voice
- MATCH-05: Match end scoreboard with kills, deaths, assists, HS%, damage, MVP
- MATCH-06: 1v1 and 2v2 mode support
- HUD-01: Crosshair centered on screen
- HUD-02: Health + armor display (bottom left)
- HUD-03: Ammo count display (bottom right)
- HUD-04: Kill feed (top right) with weapon icons
- HUD-05: Round score (top center) RED X : Y BLUE
- HUD-06: Teammate health bar in 2v2 mode

**Success Criteria:**
1. A match begins with a 3-second freeze time where players can look around but cannot move or shoot, then a GO signal releases control -- this repeats at the start of every round
2. When all players on one team are eliminated, the round ends and a 5-second transition screen displays "RED TEAM WINS" or "BLUE TEAM WINS" before the next round begins with fresh spawns and full HP/armor
3. The first team to win 3 rounds wins the match, and a post-match scoreboard displays each player's kills, deaths, assists, headshot percentage, total damage dealt, and MVP designation
4. During gameplay, the HUD displays a centered crosshair, health and armor (bottom left), ammo count (bottom right), a kill feed with weapon icons (top right), and the round score as RED X : Y BLUE (top center)
5. The game correctly handles both 1v1 (solo elimination) and 2v2 (team elimination with teammate health bars visible) modes

---

## Phase 6: Audio

**Goal:** The game world sounds alive and competitive -- players can locate enemies by sound, gunfire has impact, and round events have audio presence.

**Dependencies:** Phase 4 (weapon fire events), Phase 5 (round transition events), Phase 1 (footstep events)

**Requirements:**
- AUDIO-01: Spatial 3D audio with Web Audio API -- gunshots and footsteps are positional
- AUDIO-02: Distinct sounds for rifle fire, pistol fire, knife slash, reload, jump/land
- AUDIO-03: Headshot dink sound, body hit sound
- AUDIO-04: Footstep sounds audible to opponents with volume falloff by distance
- AUDIO-05: Round win announcer voice (deep, authoritative tone)
- AUDIO-06: Freeze time end "GO" signal sound

**Success Criteria:**
1. Standing in the map, the player can determine the direction and approximate distance of a gunshot or footstep sound -- audio is clearly spatialized with left/right/front/behind distinction and volume falloff
2. Each weapon has a distinct, recognizable sound -- rifle fire, pistol fire, knife slash, and reload are all immediately distinguishable, and jump/land events produce audible audio cues
3. Headshot hits produce the signature metallic "dink" sound that is distinct from body hit sounds -- a player who lands a headshot knows it from audio alone
4. A deep, authoritative announcer voice declares "RED TEAM WINS" or "BLUE TEAM WINS" between rounds, and the freeze time ending is marked by a clear "GO" signal sound

---

## Phase 7: Multiplayer

**Goal:** Two real players on different machines connect peer-to-peer and play a synchronized match where both see the same game state -- the single-player game becomes a real competitive experience.

**Dependencies:** Phase 5 (complete match flow to synchronize), Phase 1-4 (all gameplay systems)

**Requirements:**
- MULTI-01: WebRTC data channel establishes direct P2P connection
- MULTI-02: Supabase Realtime handles WebRTC signaling (SDP/ICE)
- MULTI-03: Deterministic simulation from exchanged input states
- MULTI-04: Periodic state checksums detect desync
- MULTI-05: Input prediction for immediate local response
- MULTI-06: Interpolation smooths remote player rendering

**Success Criteria:**
1. Two players on different machines can establish a WebRTC P2P connection through Supabase Realtime signaling and enter a shared match -- both see each other's mannequins in the same map
2. The local player experiences zero perceptible input delay -- movement and shooting respond immediately via client-side prediction, identical to the single-player experience
3. The remote player's mannequin moves smoothly without teleporting or stuttering, with interpolation visibly smoothing the rendering between tick updates
4. Both clients produce matching state checksums at regular intervals, and any desync is detected and reported rather than silently diverging
5. A complete best-of-5 match can be played over the network with correct round transitions, scoring, and elimination detection on both clients

---

## Phase 8: Website, Matchmaking & Staking

**Goal:** Players can visit the website, connect their wallet, find opponents through matchmaking, stake tokens on matches, play, and receive payouts -- the full product loop from landing page to earnings.

**Dependencies:** Phase 7 (multiplayer matches to stake on), all prior phases

**Requirements:**
- WEB-01: Landing page with hero section, CTA, how-it-works, features overview
- WEB-02: Arena lobby with wallet connection, mode select, stake input, queue tabs
- WEB-03: Match screen with full-screen Three.js canvas and HUD overlay
- WEB-04: Leaderboard page with ELO rankings, 1v1 and 2v2 tabs
- WEB-05: Profile page with stats and match history
- QUEUE-01: Matchmaking queue with mode and stake amount selection
- QUEUE-02: Pairs players within 20% stake tolerance
- QUEUE-03: Queue screen with search animation, timer, cancel button
- QUEUE-04: Direct challenge by wallet address
- QUEUE-05: Browse and accept open challenges
- QUEUE-06: 2v2 party up with teammate before queuing
- STAKE-01: Connect Solana wallet (Phantom, Backpack, Solflare)
- STAKE-02: Create escrow with stake amount, tokens to PDA vault
- STAKE-03: Opponent accepts escrow with matching stake
- STAKE-04: Winner receives 95%, 5% to treasury
- STAKE-05: 2v2 winning team splits 95% evenly (47.5% each)
- STAKE-06: Maker can cancel escrow if no opponent (full refund)
- STAKE-07: Timeout refund if match doesn't complete
- STAKE-08: Cloudflare Worker referee validates result before payout
- STAKE-09: Token balance displayed in arena lobby

**Success Criteria:**
1. A new visitor can land on the website, understand the game through the hero section and how-it-works flow, connect their Solana wallet (Phantom, Backpack, or Solflare), and see their token balance in the arena lobby
2. A player can enter the matchmaking queue selecting 1v1 or 2v2 mode and a stake amount, see a searching animation with elapsed time and a cancel button, and get matched with an opponent within 20% stake tolerance -- or alternatively, directly challenge another player by wallet address or browse open challenges to accept
3. Once matched, both players' tokens are locked in an on-chain escrow PDA vault, the match launches in a full-screen Three.js canvas with HUD overlay, and the game plays through to completion with correct round flow
4. After the match, the Cloudflare Worker referee validates the result, the winner receives 95% of the total pot on-chain (or 47.5% each in 2v2), 5% goes to treasury, and a maker can cancel an unmatched escrow for full refund or a stuck match triggers timeout refund
5. Players can view the leaderboard with ELO rankings (separate 1v1 and 2v2 tabs) and their own profile page showing wins, losses, K/D ratio, headshot percentage, earnings, and match history

---

## Phase 9: Practice Mode & Launch Polish

**Goal:** Players can practice without staking, the game handles edge cases gracefully, and the product is ready for real users with real money.

**Dependencies:** Phase 8 (full product to polish), all prior phases

**Requirements:**
- WEB-06: Practice mode page with free roam and bot opponents
- PRACTICE-01: Solo map load for movement and aim practice
- PRACTICE-02: Bot opponents with basic AI (move, shoot, die)
- PRACTICE-03: No wallet connection or staking required

**Success Criteria:**
1. A player can access the practice mode page without connecting a wallet and load into the aim_ag_texture2 map solo for free-roam movement and aim practice
2. Bot opponents spawn in the map with basic AI -- they move around, shoot at the player, and die when killed -- providing meaningful target practice
3. All game systems (movement, shooting, recoil, weapon switching, HUD, audio, ragdolls) work correctly in practice mode identically to how they work in multiplayer matches
4. The practice-to-competitive pipeline works: a new player can practice, then seamlessly transition to the arena lobby to queue for a staked match

---

## Progress

| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Movement Engine | Not Started | ENGINE-01 through ENGINE-08 (8) |
| 2 | Map & Environment | Not Started | MAP-01 through MAP-06 (6) |
| 3 | Player Models & First-Person View | Not Started | MODEL-01 through MODEL-08 (8) |
| 4 | Weapons & Combat | Not Started | COMBAT-01 through COMBAT-11 (11) |
| 5 | Match Flow & HUD | Not Started | MATCH-01 through MATCH-06, HUD-01 through HUD-06 (12) |
| 6 | Audio | Not Started | AUDIO-01 through AUDIO-06 (6) |
| 7 | Multiplayer | Not Started | MULTI-01 through MULTI-06 (6) |
| 8 | Website, Matchmaking & Staking | Not Started | WEB-01 through WEB-05, QUEUE-01 through QUEUE-06, STAKE-01 through STAKE-09 (20) |
| 9 | Practice Mode & Launch Polish | Not Started | WEB-06, PRACTICE-01 through PRACTICE-03 (4) |

**Total: 81/81 requirements mapped**

---
*Created: 2026-02-13*
