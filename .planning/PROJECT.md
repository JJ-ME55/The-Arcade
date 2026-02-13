# PROJECT.md

## What This Is

A browser-based competitive first-person shooter inspired by Counter-Strike: Source gameplay on the iconic aim_ag_texture2 map. Players stake Solana tokens in 1v1 or 2v2 elimination matches. Winner takes 95% of the staked pot, 5% goes to the project treasury. The game prioritizes smooth, skill-based gameplay above all else.

## Core Value

**The ONE thing that must work:** The FPS gameplay must feel smooth, responsive, and skill-rewarding — authentic CS:S movement and gunplay in the browser. If the game doesn't feel good to play, nothing else matters.

## Vision

A minimalist competitive FPS where the only thing that matters is skill. No flashy graphics, no pay-to-win, no complexity — just clean block-style arenas, mannequin players, and pure aim duels with real tokens on the line. Players who practice get better. The skill ceiling is massive. One precise headshot wins the fight.

## Who It's For

- Competitive FPS players who enjoy aim maps and skill-based dueling
- Crypto/Solana community members looking for play-to-earn with actual skill involved
- CS:S nostalgic players who miss the aim_ag_texture2 era
- Anyone who wants fast-paced competitive matches with real stakes

## What It Does

### Game
- Browser-based FPS (Three.js) — no download required
- CS:S authentic movement: counter-strafing, bunny hopping, air strafing, crouch peeking
- Hitscan shooting with semi-random recoil (CS:S style, not CS:GO deterministic)
- One-tap headshots (4x multiplier, 100HP + full armor)
- Fixed loadout: rifle + pistol + knife (pure skill test, no economy)
- Faithful recreation of aim_ag_texture2 map (4-floor block arena)
- Best of 5 rounds, elimination style (1 spawn per team)
- Red vs Blue teams with mannequin player models
- "RED TEAM WINS" / "BLUE TEAM WINS" announcer between rounds

### Staking
- Solana token staking via on-chain escrow (adapted from PRIMUS/gladiator-arena)
- 1v1: winner takes 95%, 5% treasury
- 2v2: winning team splits 95% evenly (47.5% each), 5% treasury
- Matchmaking with 20% stake tolerance
- Cancel escrow if no opponent found (full refund)

### Platform
- Landing page, arena lobby, match screen, leaderboard, profiles
- Practice mode (free roam + bots, no wallet needed)
- Spectator mode (watch live matches)
- ELO ranking system (separate 1v1 and 2v2)
- Match history with round-by-round stats

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend/Website | Next.js + Tailwind CSS + Framer Motion | Proven stack from gladiator arena project |
| Game Engine | Three.js + custom FPS engine (TypeScript) | Maximum control over CS:S physics model |
| Multiplayer | WebRTC peer-to-peer | Zero server costs, viable for 2-4 players |
| Match Referee | Cloudflare Workers (free tier) | Validates outcomes before on-chain payout |
| Database/Realtime | Supabase (PostgreSQL + Realtime) | Reused from gladiator arena, handles matchmaking |
| Blockchain | Solana + Anchor framework | Escrow staking adapted from PRIMUS |
| Audio | Web Audio API | Spatial 3D audio for positional sounds |
| Wallets | Phantom, Backpack, Solflare | Standard Solana wallet-adapter |

## Constraints

- **Zero server costs** — WebRTC P2P for game traffic, Cloudflare Workers free tier for referee
- **Zero external art assets** — Map, player models, weapons, animations all built in code
- **Sound effects** need to be sourced from free libraries (Freesound.org, Mixkit)
- **Announcer voice** — TTS with deep voice processing or ~10 voice actor lines
- **Token name and tokenomics** — TBD (to be determined later)
- **Game name** — TBD

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three.js + custom engine over Babylon.js/PlayCanvas | Need direct control over friction, acceleration, air movement to match CS:S feel | Decided |
| WebRTC P2P over dedicated servers | Zero hosting costs; viable for 1v1/2v2 match sizes | Decided |
| Faithful aim_ag_texture2 recreation | Iconic map, proven for aim duels, block geometry is all code | Decided |
| Mannequin player models (geometric primitives) | No artist needed, fits minimalist aesthetic, team colors (red/blue) | Decided |
| CS:S damage model (one-tap headshots) | High skill ceiling, rewards precision, authentic CS:S feel | Decided |
| Fixed loadout (no weapon selection) | Pure skill test, no economy complexity | Decided |
| Best of 5 rounds with 1 spawn per team | Prevents spawn killing, adds tension per round | Decided |
| 95% winner / 5% treasury split | Simple, more to fund development | Decided |
| Deterministic simulation on both clients | Enables cheat detection via state checksums | Decided |
| Adapted PRIMUS escrow model | Proven staking flow, reduces development risk | Decided |

## Prior Art

- **Gladiator Arena (PRIMUS)** — Same developer's previous project. Staking flow, website layout, matchmaking system, and Supabase integration will be adapted from this project.
- **Counter-Strike: Source** — The gameplay reference. Movement physics (sv_friction 4, sv_accelerate 5, sv_airaccelerate 10), hitscan shooting, semi-random recoil, generous hitboxes.
- **aim_ag_texture2** — The map reference. 4-floor vertical block arena, flat dev textures, 48+ spawns (we use 1 per team for round-based).

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Browser-based FPS with CS:S authentic movement (counter-strafing, bhop, air strafe)
- [ ] Hitscan shooting with semi-random recoil and one-tap headshots
- [ ] Faithful aim_ag_texture2 map recreation (4-floor block arena)
- [ ] Mannequin player models with procedural animations
- [ ] First-person weapon view with geometric weapon models
- [ ] Fixed loadout: rifle + pistol + knife
- [ ] Best of 5 elimination rounds with freeze time and announcer
- [ ] WebRTC P2P multiplayer with deterministic simulation
- [ ] Solana token escrow staking (95% winner / 5% treasury)
- [ ] Matchmaking queue with stake tolerance (Supabase Realtime)
- [ ] 1v1 and 2v2 game modes
- [ ] Landing page, arena lobby, match screen
- [ ] Leaderboard with ELO rankings (separate 1v1/2v2)
- [ ] Player profiles with stats and match history
- [ ] Practice mode with bots (no wallet required)
- [ ] Spectator mode (watch live matches)
- [ ] HUD: crosshair, health, ammo, kill feed, round score
- [ ] Spatial audio (positional gunshots, footsteps, headshot dink)
- [ ] Cloudflare Workers match referee for payout validation
- [ ] Wallet connection (Phantom, Backpack, Solflare)

### Out of Scope

- Weapon skins / cosmetics — Not for v1, keep it pure
- Multiple maps — One map only (aim_ag_texture2)
- Team sizes beyond 2v2 — Keep it tight
- Dedicated game servers — Zero server cost constraint
- Mobile support — Desktop browser only
- Voice chat — Use Discord or external
- Replay system — Future feature
- Tournament mode — Future feature

---
*Last updated: 2026-02-13 after initialization*
