# FPS Staking Game

> Browser-based competitive FPS inspired by Counter-Strike: Source | Solana token staking | 1v1 & 2v2

## What Is This?

A browser-based first-person shooter built on the gameplay of CS:S aim maps. Players stake Solana tokens in 1v1 or 2v2 elimination matches on a faithful recreation of the iconic **aim_ag_texture2** map. Winner takes 95% of the pot. No downloads, no pay-to-win — just pure aim and movement skill.

## Game Features

- **CS:S Authentic Movement** — Counter-strafing, bunny hopping, air strafing, crouch peeking. The full movement suite with authentic physics values (friction 4.0, acceleration 5.0, air accel 10.0).
- **One-Tap Headshots** — Hitscan shooting with 4x headshot multiplier. Semi-random recoil (CS:S style). High skill ceiling.
- **aim_ag_texture2 Map** — Faithful 4-floor block arena. Flat textures, bright lighting, zero visual clutter. Pure aim test.
- **Mannequin Players** — Geometric humanoid models in red vs blue. Procedural animations. No art assets needed.
- **Best of 5 Rounds** — Elimination style. Freeze time. "RED TEAM WINS" / "BLUE TEAM WINS" announcer.
- **Fixed Loadout** — Rifle + Pistol + Knife. Everyone gets the same weapons. Skill decides the winner.

## Staking

- Connect your Solana wallet (Phantom, Backpack, Solflare)
- Choose 1v1 or 2v2 and set your stake amount
- Tokens locked in on-chain escrow (non-custodial)
- **Winner: 95%** of total pot | **Treasury: 5%**
- 2v2: Winning team splits 95% evenly (47.5% each)
- Cancel anytime before opponent matches | Timeout refund if match doesn't complete

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game Engine | Three.js + custom FPS engine (TypeScript) |
| Frontend | Next.js + Tailwind CSS + Framer Motion |
| Multiplayer | WebRTC peer-to-peer |
| Database | Supabase (PostgreSQL + Realtime) |
| Blockchain | Solana + Anchor |
| Match Referee | Cloudflare Workers |
| Audio | Web Audio API |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/arena` | Game lobby — mode select, stake, matchmaking queue |
| `/match` | The FPS game (Three.js canvas + HUD) |
| `/leaderboard` | ELO rankings (1v1 and 2v2) |
| `/profile` | Player stats, match history |
| `/practice` | Free roam + bots, no wallet needed |

## Development Roadmap

| Phase | What It Builds |
|-------|---------------|
| 1 | Movement Engine (CS:S physics) |
| 2 | Map & Environment (aim_ag_texture2) |
| 3 | Player Models & First-Person View |
| 4 | Weapons & Combat |
| 5 | Match Flow & HUD |
| 6 | Audio |
| 7 | Multiplayer (WebRTC P2P) |
| 8 | Website, Matchmaking & Staking |
| 9 | Practice Mode & Launch Polish |

## Token

- **Name:** TBD
- **Network:** Solana (SPL Token)
- **Tokenomics:** TBD

## License

TBD
