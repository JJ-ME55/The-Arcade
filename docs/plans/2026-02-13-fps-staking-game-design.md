# FPS Staking Game — Design Document

**Date:** 2026-02-13
**Status:** Approved
**Token Name:** TBD
**Game Name:** TBD

---

## 1. Overview

A browser-based competitive first-person shooter inspired by Counter-Strike: Source gameplay on the aim_ag_texture2 map. Players stake Solana tokens in 1v1 or 2v2 matches. Winner takes 95% of the pot, 5% goes to the project treasury. The game prioritizes smooth, skill-based gameplay above all else.

### Core Pillars

1. **Gameplay first** — CS:S authentic movement, shooting, and feel
2. **Pure skill test** — minimalist block-style map, no visual clutter, no pay-to-win
3. **Real stakes** — token escrow staking makes every match meaningful
4. **Zero friction** — browser-based, no download required
5. **High skill ceiling** — bunny hopping, counter-strafing, one-tap headshots reward practice

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend/Website** | Next.js + Tailwind CSS + Framer Motion |
| **Game Engine** | Three.js + custom FPS engine (TypeScript) |
| **Multiplayer** | WebRTC peer-to-peer (direct connection) |
| **Match Referee** | Cloudflare Workers (free tier) |
| **Database/Realtime** | Supabase (PostgreSQL + Realtime channels) |
| **Blockchain** | Solana + Anchor framework |
| **Audio** | Web Audio API |
| **Wallets** | Phantom, Backpack, Solflare (wallet-adapter) |

### Architecture Rationale

- **Three.js + custom engine** chosen over Babylon.js/PlayCanvas for maximum control over CS:S physics (friction, acceleration, air movement). The block-style map eliminates the need for a complex editor.
- **WebRTC P2P** chosen over dedicated servers to avoid hosting costs. Viable because matches are 1v1/2v2 only (2-4 players). Both clients run deterministic simulation.
- **Cloudflare Workers referee** validates match outcomes before triggering on-chain payouts. Extremely lightweight — only processes match results, not game ticks. Free tier covers the load.
- **Supabase** reused from gladiator arena project for matchmaking queue, player data, and realtime coordination.

---

## 3. Gameplay Mechanics

### 3.1 Movement (CS:S Authentic)

Replicating Counter-Strike: Source's movement model, which is distinctly more fluid than CS:GO/CS2 due to lower friction values.

| Parameter | Value | Notes |
|-----------|-------|-------|
| Ground acceleration | 5.0 | `sv_accelerate` equivalent |
| Ground friction | 4.0 | CS:S value (CS:GO uses 4.8 — stickier) |
| Air acceleration | 10.0 | `sv_airaccelerate` equivalent |
| Max speed (knife) | ~250 u/s | Fastest movement |
| Max speed (rifle) | ~215 u/s | Standard combat speed |
| Max speed (pistol) | ~220 u/s | Slightly faster than rifle |

**Movement Techniques:**

- **Counter-strafing**: Tapping the opposite direction key instantly zeroes velocity, achieving maximum weapon accuracy within 1-2 frames. Essential for competitive play.
- **Bunny hopping**: No stamina penalty. Chaining jumps preserves and builds speed through air strafing. Scroll-wheel jump binding supported.
- **Air strafing**: Synchronizing strafe keys (A/D) with mouse movement while airborne curves trajectory and adds velocity. The projection-based speed cap only limits the component in the wish direction, allowing total velocity to exceed max speed.
- **Crouch peeking**: Crouching reduces hitbox size and improves accuracy. Used to peek corners with minimal exposure.
- **Crouch jumping**: Pressing crouch mid-jump reduces bounding box height, allowing access to higher ledges.

### 3.2 Weapons (Fixed Loadout)

Every player spawns with the same loadout every round. No weapon selection, no economy. Pure skill test.

**Rifle (Primary):**
- Hitscan (instant ray cast, no bullet travel)
- Headshot: 4x multiplier — one-tap kill through helmet (~104 damage)
- Body: ~26-30 damage per hit (3-4 shots to kill)
- Legs: ~19-22 damage per hit (~75% of body damage)
- Semi-random recoil: upward climb with random lateral pull (CS:S style, not CS:GO deterministic patterns)
- High first-shot accuracy when stationary
- Accuracy degrades significantly while moving
- Accuracy degrades with sustained fire, recovers when stopped
- ~215 u/s movement speed

**Pistol (Secondary):**
- Hitscan
- Headshot: ~2 hits to kill through helmet
- Body: ~5-6 hits to kill
- Better running accuracy than rifle
- Faster fire rate
- ~220 u/s movement speed
- Viable for eco-style force plays and close-range fights

**Knife (Melee):**
- Left click: ~40 damage (2-3 hits to kill)
- Right click backstab: instant kill
- ~250 u/s movement speed (fastest)
- Used for movement speed advantage and humiliation kills

### 3.3 Damage Model

| Attribute | Value |
|-----------|-------|
| Health | 100 HP |
| Armor | Full armor + helmet (every spawn) |
| Headshot multiplier (rifle) | 4x (one-tap kill) |
| Body damage (rifle) | 26-30 per hit |
| Leg damage (rifle) | 75% of body |
| Tagging | Getting hit slightly reduces movement speed (CS:S level — less punishing than CS 1.6) |

### 3.4 Hit Registration

- **Hitscan**: Instant ray cast from camera in aim direction. No bullet travel, no projectile physics.
- **Hitboxes**: Slightly generous (CS:S style). Shots that look like hits should register.
- **Client-side prediction**: Immediate visual feedback (blood, sparks) before confirmation.
- **Deterministic simulation**: Both clients compute identical results from the same inputs.
- **Headshot feedback**: Distinct metallic "dink" sound on helmet headshots.

### 3.5 Round Structure

- **Format**: Best of 5 rounds. First to 3 round wins takes the match.
- **Freeze time**: 3 seconds at round start. Players can look around but cannot move or shoot.
- **Spawns**: One fixed spawn point per team on opposite ends of the map.
- **Round end**: Triggered when all players on one team are eliminated.
- **Round transition**: 5-second pause. Screen displays "RED TEAM WINS" or "BLUE TEAM WINS" with deep announcer voice.
- **Match end**: Full scoreboard overlay showing kills, deaths, assists, headshot %, damage dealt, MVP.

---

## 4. Map — aim_ag_texture2 Recreation

### 4.1 Design Philosophy

Faithful recreation of the iconic aim_ag_texture2 map from Counter-Strike: Source. The map is a 4-floor vertical arena built entirely from block geometry with flat, minimal textures. It strips away all visual noise to focus entirely on aim and positioning.

### 4.2 Layout

- **4 floors** connected by ramps and platforms
- **Symmetrical** — neither spawn side has an advantage
- **Mix of engagement types**:
  - Open platforms for medium-range rifle duels
  - Tight corridors for close-quarters combat
  - Vertical angles between floors for flick shots
  - Ramps for dynamic movement (bhop paths, aggressive pushes)
- **One spawn point per team** on opposite ends (ground level)

### 4.3 Visual Style

- Flat, solid-color surfaces (light grey/beige)
- Subtle grid lines on surfaces (dev texture aesthetic)
- Simple rectangular geometry — boxes, platforms, ramps, walls
- Bright, even, static lighting — no dark corners
- Plain gradient skybox
- Maximum FPS, maximum visibility, zero distractions

### 4.4 Scale

Based on CS:S proportions:
- Player height: 72 Hammer Units equivalent
- Corridors: ~2-3 player widths
- Platform spacing: rifle engagement distances (500-1500 HU equivalent)
- Vertical floor spacing: ~128-192 HU per floor including floor thickness

---

## 5. Player Models — Mannequins

### 5.1 Construction

Humanoid figures built from smooth geometric primitives. Think crash test dummies or store mannequins — recognizably human but with zero detail work.

| Body Part | Geometry | Notes |
|-----------|----------|-------|
| Head | Sphere | Proportional to body |
| Torso | Tapered capsule | Chest wider than waist |
| Upper arms | Cylinders | Sphere joints at shoulders |
| Forearms | Cylinders | Sphere joints at elbows |
| Hands | Small spheres | Gun attaches to right hand |
| Upper legs | Cylinders | Sphere joints at hips |
| Lower legs | Cylinders | Sphere joints at knees |
| Feet | Flattened rounded boxes | Grounded feel |

- Proper human proportions (~7.5 head-heights tall)
- Slight ambient occlusion at joints for depth
- **Red team**: solid matte red material
- **Blue team**: solid matte blue material

### 5.2 Animations (All Procedural)

| Animation | Description |
|-----------|-------------|
| Idle | Subtle breathing — chest rise/fall |
| Run | Arm swing + leg stride, synced to speed |
| Strafe | Lean into direction, cross-step legs |
| Crouch | Knees bend, center of mass drops |
| Jump | Legs tuck on ascent, extend on landing |
| Shoot | Upper body recoil kick, arm absorbs |
| Reload | Arm pulls down and back up |
| Knife swing | Arm slash motion |
| Death | Ragdoll physics on all joints |

### 5.3 First-Person View

- Blocky mannequin arms in team color
- Simple geometric weapon models (rectangular rifle, angular pistol, flat blade knife)
- Gun bob synced to movement/footsteps
- Visual recoil kick on firing
- Muzzle flash (point light + sprite)

---

## 6. Token & Staking

### 6.1 Token

- **Name**: TBD
- **Network**: Solana (SPL Token)
- **Supply/Tokenomics**: TBD

### 6.2 Staking Flow (Adapted from PRIMUS)

Uses a three-phase on-chain escrow model:

**Phase 1 — Initialize Escrow (Maker stakes):**
1. Player connects wallet
2. Selects game mode (1v1 or 2v2) and stake amount
3. Calls `initialize_escrow` instruction
4. Tokens transferred from wallet to escrow vault (PDA-controlled)
5. Escrow status: `WaitingForOpponent`

**Phase 2 — Accept Escrow (Taker stakes):**
1. Opponent matched via queue or direct challenge
2. Calls `accept_escrow` with matching stake
3. Tokens transferred to same vault
4. Escrow status: `Active`
5. WebRTC connection established, match begins

**Phase 3 — Payout:**
1. Match completes, referee validates result
2. `payout` instruction triggered
3. **Winner receives 95%** of total pot
4. **5% to treasury**
5. Escrow closed, vault emptied

**For 2v2:**
- Both teammates stake individually
- Winning team's 95% is split evenly (47.5% each)

### 6.3 Smart Contract Architecture

| Account | Purpose | PDA Seeds |
|---------|---------|-----------|
| EscrowAccount | Tracks stakes, participants, match state | `['escrow', maker_pubkey]` |
| Vault | Holds both players' staked tokens | `['vault', escrow_pubkey]` |

**Instructions:**
- `initialize_escrow` — maker creates escrow with stake
- `accept_escrow` — taker matches stake
- `payout` — distributes winnings after match
- `cancel_escrow` — maker can cancel if no opponent yet (full refund)

### 6.4 Staking Parameters

- **Minimum stake**: TBD (e.g. 500 tokens)
- **Maximum stake**: No limit
- **Matchmaking tolerance**: 20% stake range (matches players with similar stakes)

---

## 7. Website & Pages

### 7.1 Site Structure

```
/                    → Landing page
/arena               → Game lobby (mode select, stake, queue)
/match               → The FPS game (Three.js canvas)
/leaderboard         → Rankings
/profile             → Player stats, match history
/practice            → Practice mode (no stakes)
/spectate            → Watch live matches
/roadmap             → Development roadmap
```

### 7.2 Landing Page (`/`)

- Hero section with game branding and CTA ("ENTER THE ARENA")
- Gameplay preview (animated loop or screenshot)
- How it works: Connect Wallet → Stake → Fight → Win
- Features overview
- Token information (placeholder until named)
- Dark, clean aesthetic

### 7.3 Arena Lobby (`/arena`)

- Wallet connection (Phantom, Backpack, Solflare)
- Token balance display
- Mode selection: 1v1 / 2v2
- Stake input with presets (500, 1000, 5000, custom)
- Tabs:
  - **Find Match** — auto-matchmaking by stake tolerance
  - **Challenge Player** — direct PvP by wallet address
  - **Browse Matches** — open challenges to accept
- Queue screen: searching animation, time elapsed, player count, cancel button
- 2v2 party system: invite teammate by wallet address before queuing

### 7.4 Match Screen (`/match`)

- Full-screen Three.js canvas
- HUD overlay (HTML/CSS):
  - Crosshair (center)
  - Health + armor (bottom left)
  - Ammo (bottom right)
  - Kill feed (top right)
  - Round score (top center): RED 2 : 1 BLUE
  - Teammate health bar (2v2 only)
- Round transition: "RED TEAM WINS" / "BLUE TEAM WINS" with announcer
- Match end: scoreboard with K/D/A, HS%, damage, MVP
- Return to lobby button

### 7.5 Leaderboard (`/leaderboard`)

- Ranked by ELO/skill rating
- Tabs: 1v1 rankings, 2v2 rankings, all-time
- Columns: rank, player, wins, losses, win rate, HS%, total earnings
- Own rank highlighted

### 7.6 Profile (`/profile`)

- Stats: wins, losses, win rate, K/D, HS%, total staked, total earned
- Match history with opponent, result, stake, earnings per match
- ELO graph over time
- Clickable matches for round-by-round detail

### 7.7 Practice Mode (`/practice`)

- Free roam on the map (solo, no opponent)
- Bot opponents (simple AI — moves, shoots, dies)
- No wallet connection required
- No stakes
- Learn mechanics before playing for real

### 7.8 Spectate (`/spectate`)

- Browse live matches
- Click to watch in real-time
- Free camera or follow a player's POV
- HUD shows both players' health and round score

---

## 8. Multiplayer & Netcode

### 8.1 Architecture

- **WebRTC data channels** for game state (peer-to-peer, no relay server)
- **Supabase Realtime** for matchmaking signaling and pre-match coordination
- **Cloudflare Workers** for match result validation (referee)
- **Deterministic simulation** on both clients

### 8.2 Connection Flow

1. Matchmaking pairs players via Supabase
2. Supabase Realtime exchanges WebRTC signaling data (SDP offers/answers, ICE candidates)
3. WebRTC data channel established (direct P2P connection)
4. Both clients synchronize game start
5. Each tick: clients exchange input states (keys pressed, mouse position)
6. Both clients simulate deterministically from inputs
7. Periodic state checksums to detect desync

### 8.3 Tick Rate

- Target: 64 ticks per second (matching CS:S's 66 tick default)
- Client sends input packet every tick via WebRTC data channel
- Interpolation smooths rendering between ticks
- Input prediction for local player (immediate response feel)

### 8.4 Anti-Cheat Considerations

- Deterministic simulation means both clients should produce identical results
- State checksum comparison catches basic manipulation
- Match referee validates results before payout
- Player report system
- Match history analysis for statistical anomalies
- Future: server-side replay validation

---

## 9. Audio

### 9.1 Sound Effects (Sourced from free libraries)

| Sound | Description |
|-------|-------------|
| Rifle fire | Sharp, punchy gunshot |
| Pistol fire | Lighter, distinct from rifle |
| Headshot dink | Metallic helmet hit (iconic CS sound) |
| Body hit | Flesh impact |
| Footsteps | Distinct per surface, audible to opponents |
| Jump/land | Landing thud |
| Knife slash | Whoosh + impact |
| Reload | Magazine click + chamber |
| Round win announcer | Deep voice: "Red team wins" / "Blue team wins" |
| Match start | "Prepare for battle" or similar |
| Freeze time end | GO signal |

### 9.2 Implementation

- Web Audio API for spatial/3D audio
- Footsteps and gunshots are positional (hear direction/distance)
- Volume falloff with distance
- Different footstep sounds based on movement speed

---

## 10. External Asset Requirements

**Everything built in code:** Map, player models, weapons, animations, UI, website, smart contracts, netcode

**Needs sourcing:**
- Sound effects — from free libraries (Freesound.org, Mixkit, etc.) or placeholder until custom audio
- Announcer voice lines — text-to-speech with deep voice processing, or a voice actor for ~10 short lines

---

## 11. Development Phases (Suggested)

### Phase 1: Core FPS Engine
- Three.js renderer setup
- Player controller (movement, jumping, crouching)
- CS:S physics model (friction, acceleration, air strafing, bunny hopping)
- Hitscan shooting with recoil
- Map geometry (aim_ag_texture2 recreation)
- Mannequin player models + procedural animations
- First-person weapons + HUD

### Phase 2: Multiplayer
- WebRTC P2P connection
- Input synchronization
- Deterministic simulation
- Interpolation and prediction
- Round system (best of 5)
- Match flow (freeze time, round transitions, announcer)

### Phase 3: Website & Matchmaking
- Next.js site (landing, arena lobby, leaderboard, profile)
- Supabase integration (queue, player data, match history)
- Matchmaking system with stake tolerance
- Queue UI and match flow

### Phase 4: Staking & Blockchain
- Solana escrow program (Anchor)
- Wallet connection
- Stake → escrow → payout flow
- Cloudflare Workers match referee
- Treasury collection

### Phase 5: Full Features
- Practice mode with bots
- Spectator system
- ELO ranking system
- Detailed stats and match history
- Audio integration
- Polish and optimization
