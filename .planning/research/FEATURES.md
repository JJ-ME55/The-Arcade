# Feature Landscape

**Domain:** Browser-based competitive FPS with Solana token staking
**Researched:** 2026-02-13
**Overall confidence:** MEDIUM — Based on training knowledge of browser FPS games (Krunker.io, Venge.io, ev.io, 1v1.LOL), competitive FPS titles (CS:S, CS:GO, CS2, Valorant), and crypto gaming/wagering platforms (Rollbit, Polymarket, Zed Run, ev.io NFTs). WebSearch and WebFetch were unavailable during research. Findings reflect knowledge through early 2025 training data and should be validated against current market state.

---

## Table Stakes — FPS Game

Features users expect from any browser-based competitive FPS. Missing any of these and players will leave within minutes.

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| F1 | **Responsive controls (< 50ms input-to-screen)** | Browser FPS players are hypersensitive to input lag. Krunker.io proved browser FPS can feel native. Any perceptible delay and competitive players will not return. | High | None (foundational) | This is THE make-or-break feature. Must include pointer lock, raw mouse input, high-priority requestAnimationFrame loop. Target 144+ FPS rendering. |
| F2 | **Accurate hit registration** | Nothing kills an FPS faster than "I hit him and it didn't register." Players will blame the game, not their aim. | High | F1 (controls), netcode | Hitscan with generous-but-fair hitboxes. Visual feedback (blood/sparks) must be instant even before network confirmation. |
| F3 | **Low-latency netcode** | In a staked match, players will rage-quit over network-caused deaths. P2P WebRTC is viable for 2-4 players but must handle NAT traversal reliably. | High | F1 | WebRTC data channels with STUN/TURN fallback. Input prediction + interpolation. 64-tick target. TURN relay needed for ~15-20% of connections that fail direct P2P. |
| F4 | **Crosshair and HUD** | Every FPS has this. Players need health, ammo, kill feed, round score at a glance. Without it the game feels like a tech demo. | Low | F1 | HTML/CSS overlay on canvas. Customizable crosshair (color, size, style) is expected in competitive FPS. |
| F5 | **Audio feedback (gunshots, footsteps, hit sounds)** | Audio is ~40% of competitive FPS gameplay. Players locate enemies by sound. The headshot "dink" is viscerally satisfying. | Medium | F1 | Web Audio API with spatial positioning. Footsteps, gunshots, and hit markers must be directional. Volume falloff with distance. |
| F6 | **Smooth movement model** | CS:S-inspired movement (counter-strafing, air strafing) is the stated core value. Even simpler browser FPS games like Krunker have slide mechanics and bunny hopping. | High | F1 | Source-engine physics constants (friction 4.0, acceleration 5.0, air acceleration 10.0). This defines the game's identity. |
| F7 | **Visual clarity / readable players** | Players must be instantly identifiable against the environment. Red vs Blue mannequins on neutral block textures. | Low | None | Bright even lighting, high contrast team colors, no visual clutter. Already addressed by the mannequin + block-map design. |
| F8 | **Practice / warmup mode** | Competitive FPS players always want to warm up before staking real money. Without this, the barrier to entry for the staked mode is too high. | Medium | F1, F6 | Solo free-roam + basic bots. No wallet required. Must feel identical to real match physics. |
| F9 | **Settings menu (sensitivity, keybinds, volume)** | Competitive players WILL leave if they cannot customize sensitivity and keybinds. This is non-negotiable. | Medium | F1 | Mouse sensitivity slider (DPI-independent), keybind remapping, volume sliders (master/effects/voice), crosshair customization. Persist to localStorage. |
| F10 | **Match flow (rounds, scoring, win condition)** | Players need clear structure: when does the round start, who won, what's the score. Best of 5 with freeze time is standard for tactical FPS. | Medium | F1, netcode | Freeze time, round transitions, match-end scoreboard. Announcer voice adds polish but text overlay is the minimum. |

## Table Stakes — Crypto / Staking

Features crypto-native users expect from any wagering or staking platform. Missing these erodes trust immediately.

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| S1 | **Wallet connection (Phantom, Backpack, Solflare)** | Solana users expect wallet-adapter integration. Phantom alone covers ~70% of Solana users, but excluding Backpack or Solflare alienates significant segments. | Low | None | Use @solana/wallet-adapter-react. Well-documented, standardized. |
| S2 | **Transparent escrow (on-chain, verifiable)** | Crypto users are paranoid about custodial risk — rightfully so. The escrow must be on-chain, auditable, and non-custodial. If funds go to a server wallet, trust collapses. | High | Solana program | PDA-controlled vault. Open-source Anchor program. Users must be able to verify on Solscan that their tokens are in escrow, not a team wallet. |
| S3 | **Cancel / refund if no opponent** | Users will NOT stake tokens into a queue with no guaranteed refund. This is the single biggest trust concern. | Medium | S2 | `cancel_escrow` instruction callable by maker anytime before taker accepts. Must be atomic and immediate. |
| S4 | **Transaction confirmation feedback** | Crypto users are accustomed to seeing tx signatures, confirmations, and explorer links. "Your stake is submitted" with no proof feels like a scam. | Low | S1, S2 | Show tx signature, link to Solscan, confirmation count. Toast notifications for each transaction phase. |
| S5 | **Clear payout breakdown** | Before staking, users must see exactly what they win and what the platform takes. "Winner gets 95%, 5% treasury" must be displayed at stake time, not buried in docs. | Low | S2 | Pre-match: show potential payout amount. Post-match: show actual payout tx with breakdown. |
| S6 | **Token balance display** | Users need to see their balance before staking. Checking a separate wallet app is friction. | Low | S1 | Read SPL token balance from connected wallet. Real-time update after transactions. |
| S7 | **Secure match result validation** | With real money at stake, the match result cannot be solely determined by one client. A referee or consensus mechanism is essential. | High | S2, netcode | Cloudflare Worker referee validates both clients' reported results + checksums. Discrepancies trigger dispute flow rather than auto-payout. |
| S8 | **Disconnect / abandonment handling** | What happens when a player disconnects mid-match? This MUST be defined and communicated. Undefined disconnect behavior will cause support nightmares and trust erosion. | High | S7, netcode | Options: forfeit after 30s disconnect, pause for reconnect window, or round loss. Must be documented in rules and enforced by referee. |

## Table Stakes — Platform / Social

| # | Feature | Why Expected | Complexity | Dependencies | Notes |
|---|---------|--------------|------------|--------------|-------|
| P1 | **Matchmaking queue** | Players expect to click "Find Match" and get paired. Manual lobby browsing is acceptable as secondary but auto-match is required. | Medium | Supabase Realtime | Stake tolerance matching (20%). ELO-based pairing preferred but stake-based is the minimum. |
| P2 | **Leaderboard** | Competitive games need visible rankings. Players are motivated by climbing. Without it, wins feel meaningless. | Low | Database, ELO system | Separate 1v1 and 2v2 boards. Show top 100 + your own rank. Sortable by ELO, wins, earnings. |
| P3 | **Player profile with stats** | Players want to track their progress and show off their record. | Low | Database | Win/loss, K/D, HS%, total staked, total earned, match history. Link to profile by wallet address. |
| P4 | **Match history** | Both for personal review and trust verification. Players want to see past results and confirm payouts happened correctly. | Low | Database, S2 | Round-by-round breakdown, payout tx links, opponent info. |
| P5 | **Landing page / onboarding** | New users need to understand what the game is, how staking works, and how to start — in under 30 seconds. | Medium | None | Hero, gameplay preview, how-it-works flow, CTA. Must explain the crypto angle without assuming crypto knowledge. |

---

## Differentiators

Features that set this product apart. Not expected, but create competitive advantage and retention.

| # | Feature | Value Proposition | Complexity | Dependencies | Notes |
|---|---------|-------------------|------------|--------------|-------|
| D1 | **Authentic CS:S movement physics** | No browser FPS has faithfully replicated Source engine movement. Krunker has slide mechanics; ev.io has basic movement. CS:S counter-strafing, bunny hopping, and air strafing in the browser is genuinely novel. Skilled players will evangelize this. | High | F1, F6 | This is the game's core identity and #1 differentiator. The skill ceiling created by authentic movement physics is what separates this from every other browser FPS. Getting this wrong kills the project. |
| D2 | **Skill-only wagering (no RNG, no pay-to-win)** | Most crypto games are glorified slot machines (loot boxes, gacha, random drops). A pure-skill wagering game where the better player wins is extremely rare in the crypto space. This appeals to both competitive gamers AND crypto degens who respect skill. | Medium | S2, F2, F6 | The fixed loadout (no economy, no weapon selection) reinforces this. Every advantage comes from mechanical skill, not wallet size or RNG. |
| D3 | **Zero-download browser experience with real stakes** | The combination of "no download + real money" is powerful. Most wagering games require apps. Most browser games have no real stakes. The intersection is nearly empty. | Low | F1, S1, S2 | The frictionless entry ("click link, connect wallet, play") is a massive distribution advantage for crypto communities sharing links on Twitter/Discord. |
| D4 | **Spectator mode for live staked matches** | Watching other people gamble is inherently compelling (poker streams, sports betting). Watching live FPS matches with real tokens on the line creates natural content and community engagement. | Medium | Netcode, S2 | Enables organic content creation. Streamers can spectate and commentate. Community forms around watching high-stakes matches. |
| D5 | **Deterministic simulation with cheat detection** | Both clients running identical simulations with state checksums is unusually robust for a browser game. Most browser FPS games have rampant cheating. Being able to say "provably fair" resonates with both gamers AND crypto users. | High | F1, netcode | State checksum comparison catches basic manipulation. Combined with referee validation, this is significantly more anti-cheat than typical browser FPS. |
| D6 | **ELO-separated matchmaking** | Most crypto wagering is flat (anyone vs anyone). ELO-based matching means new players face other new players, not sharks. This dramatically improves retention for non-hardcore players. | Medium | P1, database | Separate 1v1 and 2v2 ELO. Consider visible ranks (Bronze, Silver, Gold, Diamond) for psychological progression. |
| D7 | **Headshot-centric damage model (one-tap kills)** | The 4x headshot multiplier creating one-tap kills is viscerally satisfying and creates highlight-worthy moments. Combined with real stakes, a clutch headshot in a final round becomes a story players share. | Low | F2 | Amplifies the spectator experience (D4). Every round has potential for a "did you see that" moment. |
| D8 | **Direct challenge by wallet address** | Beyond matchmaking, letting players challenge specific opponents creates grudge matches, rivalry, and social stakes beyond tokens. Twitter beef can be settled in-game. | Low | P1, S1 | Low complexity, high social value. "1v1 me, 10K tokens" becomes a meme and organic marketing. |
| D9 | **Transparent on-chain earnings history** | All payouts are Solana transactions — publicly verifiable. A leaderboard showing "top earners this week" with verifiable on-chain proof is unique trust-building that traditional games cannot offer. | Low | S2, P2 | Links to Solscan for every payout. "Don't trust, verify" resonates deeply with crypto audience. |
| D10 | **aim_ag_texture2 nostalgia factor** | The specific map choice targets CS:S veterans (late 2000s-early 2010s players) who are now 25-35 years old — prime crypto demographic. Nostalgia is a powerful acquisition hook. | Low | Map geometry | Must be recognizable to CS:S players. The block aesthetic also serves minimalism (no art assets needed). |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in the browser FPS and crypto gaming spaces.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| A1 | **Weapon skins / cosmetic marketplace** | Adds massive complexity (asset pipeline, marketplace smart contracts, inventory system). Dilutes the "pure skill" identity. Creates perception of pay-to-win even if cosmetic-only. Most crypto game NFT marketplaces become ghost towns. | Keep mannequins and geometric weapons. If cosmetics are ever added (post-v1), make them earnable through play only, never purchasable. |
| A2 | **NFT integration for game items** | NFT fatigue is real (as of 2024-2025). Associating the game with NFTs triggers immediate skepticism from both gamers and much of the crypto community. It signals "cash grab" and attracts speculators instead of players. | Token staking is the only crypto integration. Keep it clean: stake tokens, win tokens. No NFTs, no collectibles, no trading cards. |
| A3 | **Token with complex tokenomics** | Emission schedules, staking rewards, governance, deflationary burns — these attract tokenomics speculators and DeFi farmers, not gamers. They also create regulatory risk and require ongoing economic management. | Simple utility token. Used for staking in matches. 5% treasury fee funds development. Tokenomics complexity can be added later if needed, but starting simple is safer. |
| A4 | **Mobile support** | Touch controls for competitive FPS are fundamentally inferior. Supporting mobile means either degrading the experience or splitting the playerbase by input method. Browser FPS games that added mobile (Krunker) saw it create more problems than it solved. | Desktop browser only. State this clearly. Pointer Lock API + keyboard + mouse is the only supported input. |
| A5 | **Multiple maps at launch** | Every additional map multiplies QA, balance testing, and development time. One map, perfected, is better than three maps with issues. aim_ag_texture2 is sufficient for the core game loop. | Ship with one map. Validate the game loop works. Add maps only after the core experience is proven and playerbase demands it. |
| A6 | **In-game voice chat** | WebRTC voice adds complexity, moderation burden, and legal concerns (recording, abuse). Browser voice quality is inconsistent. Players already use Discord for voice. | Link to Discord server. For 2v2 teammates, suggest Discord party. Voice chat is a future feature if ever. |
| A7 | **Dedicated game servers** | Violates the zero-server-cost constraint. For 2-4 player matches, P2P WebRTC is sufficient. Dedicated servers only become necessary at 5+ players or for anti-cheat that requires authoritative server. | WebRTC P2P with Cloudflare Workers referee for result validation. TURN relay servers for NAT traversal are the only server cost (and can use free-tier TURN services initially). |
| A8 | **Weapon unlocks / progression system** | Weapon variety creates balance nightmares and undermines "pure skill test" identity. Progression systems (unlock pistol at level 5, rifle at level 10) gate content behind grind, which conflicts with the instant-play browser ethos. | Fixed loadout forever: rifle + pistol + knife. Every player is equal from their first match. Progression is expressed through ELO rank, not unlocks. |
| A9 | **Play-to-earn / token emissions for playing** | Emitting tokens as rewards for playing creates unsustainable economics (Axie Infinity collapse). It attracts farmers and bots, not competitive players. The game becomes "work" instead of "competition." | The economic model is zero-sum wagering: players stake, winner takes pot minus fee. No tokens are created or emitted. The game is a platform for competition, not a token faucet. |
| A10 | **Replay system at launch** | Recording, storing, and playing back full match replays is surprisingly complex (state snapshots, timeline scrubbing, camera system). It is valuable but NOT required for the core experience. | Defer to post-launch. The deterministic simulation design makes replays feasible later since you only need to store input sequences. Design for it but do not build it in v1. |
| A11 | **Tournament / bracket system at launch** | Tournament infrastructure (brackets, scheduling, multi-match tracking, prize pools) is a significant feature set. The core 1v1/2v2 matchmaking must work perfectly first. | Support tournaments manually (Discord-organized, direct challenge for each match). Build tournament infrastructure only after the core experience has a proven playerbase. |
| A12 | **Anti-cheat kernel driver or browser extension** | Invasive anti-cheat (like Vanguard or EasyAntiCheat) is impossible in a browser context and would destroy the zero-friction entry. Even requiring a browser extension would cut the audience dramatically. | Rely on deterministic simulation checksums + referee validation + statistical anomaly detection. Accept that browser games will have some cheating; focus on making it detectable and punishable rather than preventable. |
| A13 | **Team sizes beyond 2v2** | Larger team sizes (5v5) require dedicated servers (P2P breaks down beyond 4 players), significantly more complex netcode, role-based gameplay, and economy systems. This is a different game entirely. | Cap at 2v2. The intimate match sizes (1v1, 2v2) are core to the identity: every player matters, every round is personal, stakes feel real. |

---

## Feature Dependencies

```
FOUNDATION LAYER (must exist first):
  F1 (Responsive controls) ─── base for everything
    ├── F6 (Movement model) ─── defines the game feel
    ├── F2 (Hit registration) ─── defines combat
    │     └── F5 (Audio feedback) ─── enhances combat feel
    ├── F4 (HUD) ─── player information
    ├── F7 (Visual clarity) ─── readability
    └── F9 (Settings) ─── player customization

MULTIPLAYER LAYER (requires foundation):
  F3 (Netcode / WebRTC P2P)
    ├── F10 (Match flow / rounds)
    ├── D5 (Deterministic simulation)
    └── S7 (Match result validation)
          └── S8 (Disconnect handling)

STAKING LAYER (requires multiplayer):
  S1 (Wallet connection)
    ├── S6 (Balance display)
    └── S2 (On-chain escrow)
          ├── S3 (Cancel/refund)
          ├── S4 (Transaction feedback)
          └── S5 (Payout breakdown)

PLATFORM LAYER (requires staking):
  P1 (Matchmaking) ─── requires S2 + F3
    ├── D6 (ELO matchmaking) ─── enhanced matchmaking
    └── D8 (Direct challenge) ─── alternative to queue
  P2 (Leaderboard) ─── requires database
  P3 (Player profile) ─── requires database
  P4 (Match history) ─── requires P3 + S2
  P5 (Landing page) ─── independent, but informed by all features

ENHANCEMENT LAYER (requires platform):
  F8 (Practice mode) ─── can be built early (only needs foundation)
  D4 (Spectator mode) ─── requires F3 + match flow
  D9 (On-chain earnings) ─── requires S2 + P2
```

**Critical path:** F1 --> F6 + F2 --> F3 (netcode) --> F10 (rounds) --> S2 (escrow) --> P1 (matchmaking)

Everything else hangs off this spine. Notably:
- Practice mode (F8) can be built as soon as the foundation layer is done (no multiplayer needed)
- Landing page (P5) is independent and can be built in parallel
- Spectator mode (D4) requires the full multiplayer stack
- All staking features (S1-S8) require wallet-adapter but are otherwise independent of specific game features

---

## MVP Recommendation

### Must ship in MVP (without these, the product is not viable):

1. **F1 - Responsive controls** — The foundation. Uncompromisable.
2. **F6 - CS:S movement model** — The core differentiator. This IS the game.
3. **F2 - Hit registration** — Combat must feel right.
4. **F5 - Audio feedback** — Even basic audio (gunshots, hit markers, footsteps) is table stakes.
5. **F4 - HUD** — Crosshair, health, ammo, round score.
6. **F9 - Settings** — Sensitivity and keybinds at minimum.
7. **F3 - Low-latency netcode** — P2P WebRTC with input sync.
8. **F10 - Match flow** — Best of 5 rounds with clear win/loss.
9. **S1 - Wallet connection** — Phantom at minimum, wallet-adapter for others.
10. **S2 - On-chain escrow** — The staking mechanism.
11. **S3 - Cancel/refund** — Trust requirement.
12. **S5 - Payout breakdown** — Transparency requirement.
13. **S7 - Match result validation** — Referee for payout integrity.
14. **S8 - Disconnect handling** — Defined rules for disconnects.
15. **P1 - Matchmaking** — Find opponent by stake range.
16. **P5 - Landing page** — Explain the game, drive sign-ups.

### Should ship in MVP (high value, manageable complexity):

17. **F8 - Practice mode** — Dramatically lowers barrier to entry for staked play.
18. **S4 - Transaction feedback** — Tx signatures and explorer links build trust.
19. **S6 - Balance display** — Basic wallet info.
20. **D8 - Direct challenge** — Low complexity, high social value.
21. **F7 - Visual clarity** — Already addressed by the design (mannequins + blocks).

### Defer to post-MVP:

- **P2 (Leaderboard)** — Valuable but not blocking. Can launch without it and add within weeks.
- **P3 (Player profile)** — Same as leaderboard. Track data from day 1, surface it later.
- **P4 (Match history)** — Store match data from launch but the UI can come later.
- **D4 (Spectator mode)** — Important for community growth but not for initial launch.
- **D6 (ELO matchmaking)** — Start with stake-range matching only. Add ELO after enough matches generate data.
- **D9 (On-chain earnings)** — Nice-to-have transparency feature. Payouts are already on-chain and verifiable manually.
- **D10 (aim_ag_texture2 nostalgia)** — The map IS the nostalgia. No extra work needed; just ensure fidelity to the original.

---

## Competitive Landscape Context

### Browser FPS games this competes with on gameplay:

| Game | Key Features | What They Lack |
|------|-------------|----------------|
| **Krunker.io** | Slide mechanics, classes, custom maps, skins marketplace, ranked mode | No real-money staking, different movement model than CS:S, heavy on cosmetics |
| **Venge.io** | Team deathmatch, abilities, multiple maps | Casual-oriented, no competitive stakes, no Source-engine movement |
| **ev.io** | Solana NFT integration, multiple modes, ranked | NFT-focused (declining appeal), generic movement, no skill-only wagering |
| **1v1.LOL** | Build + shoot, 1v1 focused, browser-based | Fortnite-style building, not FPS purist, no staking |
| **Shell Shockers** | Egg-themed FPS, browser-based, popular | Very casual, not competitive, no staking |

### Crypto wagering games this competes with on staking:

| Game/Platform | Key Features | What They Lack |
|---------------|-------------|----------------|
| **Rollbit** | Crypto casino, slots, sports betting | No skill-based games, pure gambling |
| **Polymarket** | Prediction markets, real stakes | Not a game, prediction only |
| **Zed Run** | Horse racing NFTs, wagering | RNG-heavy, NFT-dependent |
| **ev.io** | Browser FPS + Solana NFTs | NFT-focused, not pure wagering |
| **PRIMUS/Gladiator Arena** | Solana staking, PvP | Prior art (same developer), different game genre |

### The gap this project fills:

**No existing product combines authentic competitive FPS mechanics with pure-skill token wagering in the browser.** ev.io is the closest but it went the NFT route (declining market) rather than direct skill-based wagering. The "CS:S movement in browser + Solana stakes" combination is genuinely unoccupied territory.

---

## Risk Notes

| Risk | Severity | Mitigation |
|------|----------|------------|
| CS:S movement is extremely hard to replicate correctly | HIGH | Budget significant time for tuning. Get competitive CS players to test early and often. This is the one feature that cannot be "good enough" — it must feel right. |
| WebRTC P2P NAT traversal failures | MEDIUM | TURN relay fallback is essential. Budget for a TURN server or use free-tier services (Metered.ca, Xirsys free tier). Test across various network configurations. |
| Cheating in browser environment | MEDIUM | Deterministic checksums catch basic manipulation. Referee validation prevents payout fraud. Statistical analysis catches long-term patterns. Accept some cheating will exist; focus on detection over prevention. |
| Regulatory risk of token wagering | HIGH | This is a skill-based competition, not gambling (no house edge on outcomes, no RNG). However, regulatory classification varies by jurisdiction. Consult legal counsel. Geo-block restricted jurisdictions. Terms of service must be clear. |
| Low initial liquidity / empty queues | HIGH | Direct challenge (D8) works with zero queue population. Practice mode (F8) retains players during low-activity periods. Consider seeding early matches with team/friends. |
| Token price volatility affecting stake value | MEDIUM | Display USD-equivalent values alongside token amounts. Consider stablecoin (USDC) staking as alternative. Minimum stake prevents dust-amount griefing. |

---

## Sources

- **Confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training knowledge (cutoff: early 2025) of the browser FPS and crypto gaming ecosystems. Key claims that should be validated with current sources:
  - ev.io's current status and feature set (it may have evolved or shut down)
  - Krunker.io's current competitive features
  - Current Solana wallet-adapter ecosystem and supported wallets
  - Regulatory landscape for skill-based crypto wagering in 2026
  - WebRTC TURN relay free-tier availability

- **HIGH confidence (well-established patterns):** Core FPS table stakes (F1-F10), wallet connection patterns (S1), escrow design (S2), general anti-features (A1-A13)
- **MEDIUM confidence (based on training knowledge, likely still accurate):** Competitive landscape, differentiator analysis, dependency mapping
- **LOW confidence (may have changed since training):** Specific competitor feature sets, TURN relay pricing, regulatory status
