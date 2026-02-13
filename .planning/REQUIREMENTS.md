# REQUIREMENTS.md

## v1 Requirements

### FPS Engine (ENGINE)

- [ ] **ENGINE-01**: Player can move with CS:S authentic physics (ground friction 4.0, acceleration 5.0, air acceleration 10.0)
- [ ] **ENGINE-02**: Player can counter-strafe to instantly zero velocity for accurate shots
- [ ] **ENGINE-03**: Player can bunny hop by chaining jumps with no stamina penalty, building speed through air strafing
- [ ] **ENGINE-04**: Player can air strafe by synchronizing strafe keys with mouse movement to curve trajectory mid-air
- [ ] **ENGINE-05**: Player can crouch to reduce hitbox and improve accuracy, and crouch-jump to reach higher ledges
- [ ] **ENGINE-06**: Game renders at stable 60fps in Chrome/Firefox/Edge with Three.js
- [ ] **ENGINE-07**: Game loop runs at 64 ticks per second for physics and hit detection
- [ ] **ENGINE-08**: Pointer lock captures mouse for FPS camera control with no perceptible input lag

### Shooting & Combat (COMBAT)

- [ ] **COMBAT-01**: Rifle fires hitscan with 4x headshot multiplier (one-tap kill through helmet at ~104 damage)
- [ ] **COMBAT-02**: Rifle has semi-random recoil (upward climb with random lateral pull, CS:S style)
- [ ] **COMBAT-03**: Weapon accuracy degrades while moving and during sustained fire, recovers when stopped
- [ ] **COMBAT-04**: Pistol fires hitscan with faster rate, better running accuracy, ~2 headshots to kill through helmet
- [ ] **COMBAT-05**: Knife deals ~40 damage on left click, instant kill on right-click backstab, fastest movement speed
- [ ] **COMBAT-06**: Player can switch between rifle, pistol, and knife with draw animations
- [ ] **COMBAT-07**: Players spawn with 100 HP + full armor + helmet every round
- [ ] **COMBAT-08**: Getting hit applies tagging (slight movement speed reduction, CS:S level)
- [ ] **COMBAT-09**: Hitboxes are slightly generous (CS:S style) — shots that look like hits register as hits
- [ ] **COMBAT-10**: Headshot hits produce a distinct metallic "dink" sound
- [ ] **COMBAT-11**: Client-side prediction provides immediate visual feedback (blood, sparks) before server confirmation

### Map (MAP)

- [ ] **MAP-01**: aim_ag_texture2 map faithfully recreated with 4-floor vertical layout
- [ ] **MAP-02**: Map uses block geometry with flat solid-color surfaces (dev texture aesthetic)
- [ ] **MAP-03**: Map is symmetrical with neither spawn side having an advantage
- [ ] **MAP-04**: Map has one fixed spawn point per team on opposite ends
- [ ] **MAP-05**: Map has mix of open platforms, tight corridors, ramps, and vertical angles
- [ ] **MAP-06**: Map has bright, even, static lighting with no dark corners

### Player Models (MODEL)

- [ ] **MODEL-01**: Players are mannequin figures built from geometric primitives (spheres, cylinders, capsules)
- [ ] **MODEL-02**: Mannequins have proper human proportions (~7.5 head-heights tall)
- [ ] **MODEL-03**: Red team uses solid matte red material, blue team uses solid matte blue material
- [ ] **MODEL-04**: Procedural run animation with arm swing and leg stride synced to movement speed
- [ ] **MODEL-05**: Procedural strafe, crouch, jump, shooting, reload, and knife swing animations
- [ ] **MODEL-06**: Death triggers ragdoll physics on all joints
- [ ] **MODEL-07**: First-person view shows mannequin arms in team color with geometric weapon models
- [ ] **MODEL-08**: First-person has gun bob synced to footsteps, visual recoil kick, and muzzle flash

### Rounds & Match Flow (MATCH)

- [ ] **MATCH-01**: Matches are best of 5 rounds, first to 3 round wins takes the match
- [ ] **MATCH-02**: Round starts with 3-second freeze time (look around, can't move or shoot)
- [ ] **MATCH-03**: Round ends when all players on one team are eliminated
- [ ] **MATCH-04**: 5-second round transition displays "RED TEAM WINS" or "BLUE TEAM WINS" with announcer voice
- [ ] **MATCH-05**: Match end shows scoreboard with kills, deaths, assists, headshot %, damage dealt, MVP
- [ ] **MATCH-06**: Game supports 1v1 mode (solo elimination) and 2v2 mode (team elimination)

### Audio (AUDIO)

- [ ] **AUDIO-01**: Spatial/3D audio using Web Audio API — gunshots and footsteps are positional (direction + distance)
- [ ] **AUDIO-02**: Distinct sounds for rifle fire, pistol fire, knife slash, reload, jump/land
- [ ] **AUDIO-03**: Headshot dink sound, body hit sound
- [ ] **AUDIO-04**: Footstep sounds audible to opponents with volume falloff by distance
- [ ] **AUDIO-05**: Round win announcer voice (deep, authoritative tone)
- [ ] **AUDIO-06**: Freeze time end "GO" signal sound

### HUD (HUD)

- [ ] **HUD-01**: Crosshair centered on screen
- [ ] **HUD-02**: Health + armor display (bottom left)
- [ ] **HUD-03**: Ammo count display (bottom right)
- [ ] **HUD-04**: Kill feed (top right) showing recent kills with weapon icon
- [ ] **HUD-05**: Round score (top center) showing RED X : Y BLUE
- [ ] **HUD-06**: Teammate health bar visible in 2v2 mode

### Multiplayer (MULTI)

- [ ] **MULTI-01**: WebRTC data channel establishes direct P2P connection between players
- [ ] **MULTI-02**: Supabase Realtime handles WebRTC signaling (SDP offers/answers, ICE candidates)
- [ ] **MULTI-03**: Both clients run deterministic simulation from exchanged input states
- [ ] **MULTI-04**: Periodic state checksums detect desync between clients
- [ ] **MULTI-05**: Input prediction for local player provides immediate response feel
- [ ] **MULTI-06**: Interpolation smooths rendering of remote player between tick updates

### Staking & Blockchain (STAKE)

- [ ] **STAKE-01**: Player can connect Solana wallet (Phantom, Backpack, Solflare)
- [ ] **STAKE-02**: Player can create escrow with stake amount, tokens transferred to PDA vault
- [ ] **STAKE-03**: Opponent can accept escrow with matching stake, tokens locked in vault
- [ ] **STAKE-04**: Winner receives 95% of total pot, 5% goes to treasury
- [ ] **STAKE-05**: In 2v2, winning team splits 95% evenly (47.5% each)
- [ ] **STAKE-06**: Maker can cancel escrow if no opponent found (full refund)
- [ ] **STAKE-07**: Timeout refund auto-triggers if match doesn't complete within time limit
- [ ] **STAKE-08**: Cloudflare Worker referee validates match result before authorizing payout
- [ ] **STAKE-09**: Token balance displayed in arena lobby

### Matchmaking (QUEUE)

- [ ] **QUEUE-01**: Player can enter matchmaking queue with selected mode (1v1/2v2) and stake amount
- [ ] **QUEUE-02**: Matchmaking pairs players within 20% stake tolerance
- [ ] **QUEUE-03**: Queue screen shows searching animation, time elapsed, and cancel button
- [ ] **QUEUE-04**: Player can challenge another player directly by wallet address
- [ ] **QUEUE-05**: Player can browse and accept open challenges
- [ ] **QUEUE-06**: In 2v2, players can party up with a teammate before queuing

### Website (WEB)

- [ ] **WEB-01**: Landing page with hero section, CTA, how-it-works, and features overview
- [ ] **WEB-02**: Arena lobby page with wallet connection, mode select, stake input, and queue tabs
- [ ] **WEB-03**: Match screen with full-screen Three.js canvas and HUD overlay
- [ ] **WEB-04**: Leaderboard page with ELO rankings, separate 1v1 and 2v2 tabs
- [ ] **WEB-05**: Profile page with stats (wins, losses, K/D, HS%, earnings) and match history
- [ ] **WEB-06**: Practice mode page — free roam + bot opponents, no wallet required

### Practice Mode (PRACTICE)

- [ ] **PRACTICE-01**: Player can load into the map solo for movement and aim practice
- [ ] **PRACTICE-02**: Bot opponents with basic AI (move, shoot, die) for target practice
- [ ] **PRACTICE-03**: No wallet connection or staking required for practice mode

---

## v2 Requirements (Deferred)

- Spectator mode (watch live matches, free camera or follow POV)
- Replay system (review past matches)
- Tournament mode (brackets, prize pools)
- Multiple maps
- Cosmetic skins / player customization
- Voice chat integration
- Mobile browser support
- Advanced anti-cheat (server-side replay validation)
- Match highlight clips

## Out of Scope

- Weapon skins / cosmetics — Not for v1, keep it pure
- Multiple maps — One map only (aim_ag_texture2)
- Team sizes beyond 2v2 — Keep matches tight
- Dedicated game servers — Zero server cost constraint
- Mobile support — Desktop browser only for v1
- Voice chat — Use Discord externally
- Pay-to-win mechanics — Never, skill only

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ENGINE-01 | Phase 1: Movement Engine | Pending |
| ENGINE-02 | Phase 1: Movement Engine | Pending |
| ENGINE-03 | Phase 1: Movement Engine | Pending |
| ENGINE-04 | Phase 1: Movement Engine | Pending |
| ENGINE-05 | Phase 1: Movement Engine | Pending |
| ENGINE-06 | Phase 1: Movement Engine | Pending |
| ENGINE-07 | Phase 1: Movement Engine | Pending |
| ENGINE-08 | Phase 1: Movement Engine | Pending |
| MAP-01 | Phase 2: Map & Environment | Pending |
| MAP-02 | Phase 2: Map & Environment | Pending |
| MAP-03 | Phase 2: Map & Environment | Pending |
| MAP-04 | Phase 2: Map & Environment | Pending |
| MAP-05 | Phase 2: Map & Environment | Pending |
| MAP-06 | Phase 2: Map & Environment | Pending |
| MODEL-01 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-02 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-03 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-04 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-05 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-06 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-07 | Phase 3: Player Models & First-Person View | Pending |
| MODEL-08 | Phase 3: Player Models & First-Person View | Pending |
| COMBAT-01 | Phase 4: Weapons & Combat | Pending |
| COMBAT-02 | Phase 4: Weapons & Combat | Pending |
| COMBAT-03 | Phase 4: Weapons & Combat | Pending |
| COMBAT-04 | Phase 4: Weapons & Combat | Pending |
| COMBAT-05 | Phase 4: Weapons & Combat | Pending |
| COMBAT-06 | Phase 4: Weapons & Combat | Pending |
| COMBAT-07 | Phase 4: Weapons & Combat | Pending |
| COMBAT-08 | Phase 4: Weapons & Combat | Pending |
| COMBAT-09 | Phase 4: Weapons & Combat | Pending |
| COMBAT-10 | Phase 4: Weapons & Combat | Pending |
| COMBAT-11 | Phase 4: Weapons & Combat | Pending |
| MATCH-01 | Phase 5: Match Flow & HUD | Pending |
| MATCH-02 | Phase 5: Match Flow & HUD | Pending |
| MATCH-03 | Phase 5: Match Flow & HUD | Pending |
| MATCH-04 | Phase 5: Match Flow & HUD | Pending |
| MATCH-05 | Phase 5: Match Flow & HUD | Pending |
| MATCH-06 | Phase 5: Match Flow & HUD | Pending |
| HUD-01 | Phase 5: Match Flow & HUD | Pending |
| HUD-02 | Phase 5: Match Flow & HUD | Pending |
| HUD-03 | Phase 5: Match Flow & HUD | Pending |
| HUD-04 | Phase 5: Match Flow & HUD | Pending |
| HUD-05 | Phase 5: Match Flow & HUD | Pending |
| HUD-06 | Phase 5: Match Flow & HUD | Pending |
| AUDIO-01 | Phase 6: Audio | Pending |
| AUDIO-02 | Phase 6: Audio | Pending |
| AUDIO-03 | Phase 6: Audio | Pending |
| AUDIO-04 | Phase 6: Audio | Pending |
| AUDIO-05 | Phase 6: Audio | Pending |
| AUDIO-06 | Phase 6: Audio | Pending |
| MULTI-01 | Phase 7: Multiplayer | Pending |
| MULTI-02 | Phase 7: Multiplayer | Pending |
| MULTI-03 | Phase 7: Multiplayer | Pending |
| MULTI-04 | Phase 7: Multiplayer | Pending |
| MULTI-05 | Phase 7: Multiplayer | Pending |
| MULTI-06 | Phase 7: Multiplayer | Pending |
| WEB-01 | Phase 8: Website, Matchmaking & Staking | Pending |
| WEB-02 | Phase 8: Website, Matchmaking & Staking | Pending |
| WEB-03 | Phase 8: Website, Matchmaking & Staking | Pending |
| WEB-04 | Phase 8: Website, Matchmaking & Staking | Pending |
| WEB-05 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-01 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-02 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-03 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-04 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-05 | Phase 8: Website, Matchmaking & Staking | Pending |
| QUEUE-06 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-01 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-02 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-03 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-04 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-05 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-06 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-07 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-08 | Phase 8: Website, Matchmaking & Staking | Pending |
| STAKE-09 | Phase 8: Website, Matchmaking & Staking | Pending |
| WEB-06 | Phase 9: Practice Mode & Launch Polish | Pending |
| PRACTICE-01 | Phase 9: Practice Mode & Launch Polish | Pending |
| PRACTICE-02 | Phase 9: Practice Mode & Launch Polish | Pending |
| PRACTICE-03 | Phase 9: Practice Mode & Launch Polish | Pending |

---
*Last updated: 2026-02-13*
