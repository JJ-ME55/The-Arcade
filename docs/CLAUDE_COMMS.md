# CLAUDE_COMMS — The Arcade repo

> Cross-session journal for any Claude working in this repo.
>
> **For arcade-only decisions and progress notes,** entries land here.
> **For cross-cutting decisions that span both repos** (Arcade + SolShot),
> the canonical comms file is `Docs/internal/CLAUDE_COMMS.md` in the
> SolShot repo (`JJ-ME55/SolShot`). Both Claudes read both files.

## Protocol

1. **Date-stamp every entry.** ISO date + UTC time.
2. **Sign every entry.** `[main-claude]`, `[fishyboy-claude]`, or `[other-claude]`.
3. **Categorise each entry.** STATUS / DECISION / HANDOFF / FYI / REPLY / QUESTION.
4. **Be honest about what got done.** Verify with `git log -1` before claiming a commit. Paste hashes.
5. **Don't restate the design doc.** Link to it. `THE_ARCADE_v1_DESIGN.md` is the source of truth for the proposal.
6. **Don't litigate decisions that have landed.** The decisions table at the bottom of `THE_ARCADE_v1_DESIGN.md` + the headline-decisions table in main-claude's 2026-05-19 reply on SolShot's `Docs/internal/CLAUDE_COMMS.md` are locked. Surface concerns; don't unilaterally reverse.

---

## 2026-05-19 · `[main-claude]` — KICKOFF

This repo is bootstrapped from a scaffold landed on SolShot worktree branch `claude/focused-elion-939d41`, commit `fdf6bab`.

The full reply to `@fishyboy-claude`'s `THE_ARCADE_v1_DESIGN.md` proposal lives in the SolShot repo at `Docs/internal/CLAUDE_COMMS.md` (2026-05-19 entry). That entry contains:

- 7 headline decisions locked
- 3 open architectural items deferred (Arcade Champion formula, $TOKENS/$SHOT, domain)
- File-by-file inventory of what landed on the SolShot side (server endpoints, client receiver hook, scaffold)

**Read order for `@fishyboy-claude` on first boot here:**

1. `docs/FISH_KICKOFF.md` (this repo) — soft-landing onboarding
2. `docs/THE_ARCADE_v1_DESIGN.md` (this repo) — design proposal
3. `docs/MIGRATION_PLAYBOOK.md` (this repo) — operational rollout
4. SolShot repo's `Docs/internal/CLAUDE_COMMS.md`, 2026-05-19 main-claude entry — cross-cutting decisions

### State as of kickoff

| Surface | State |
|---|---|
| SolShot server endpoints | ✅ `/api/arcade/session-handoff` + `/api/arcade/session-validate` shipped (commit `fdf6bab` on SolShot worktree) |
| SolShot client receiver | ✅ `useArcadeTokenReceiver` hook wired in App.js |
| SolShot CORS allowlist | ✅ `the-arcade.vercel.app` added (commit `9950e59` on SolShot worktree) |
| Render `ARCADE_SESSION_SECRET` | ✅ in `render.yaml`, `generateValue: true` |
| Vercel project (`the-arcade`) | ✅ created on `jj-me55s-projects` |
| GitHub repo | ✅ created (this repo); awaiting initial push |
| Privy origins (the-arcade.vercel.app) | ⏳ JJ to add in Privy dashboard |
| Vercel env vars (5 of them) | ⏳ JJ to set after first deploy succeeds |
| Brand mocks | ⏳ Fish to commit to `src/assets/brand/` |
| Game lift (KU + BB) | ⏳ awaits Fish's freeze + lift-moment coordination with JJ |

### Outstanding `@main-claude` work (in parallel to Fish's visual build)

1. New SolShot server endpoints: `GET /api/arcade/leaderboard/:game`, `POST /api/arcade/score`, `GET /api/arcade/profile/:callsign` — reads from existing `BasketballScore` + `KeepieUppiesScore` schemas, joins with `users` for callsign resolution. No schema migration in v1 — that's a deferred tidy-up PR.
2. `POST /api/wager-waitlist` endpoint + `WagerWaitlist` Mongo model.
3. Welcome banner component on SolShot client — reads `localStorage.solshot_arcade_referral`, dismissable.

JJ owns the green-light on order. Default is to start (1) once Fish has the freeze moment scheduled.

— main-claude

---

## 2026-05-20 · `[main-claude]` — STATUS · @fishyboy-claude · @johnk

End-of-day status. JJ and I cranked through the kickoff → cabinet live → games lifted → leaderboards unified in a single session. The cabinet is reachable, all four game tiles are wired up, bot users land in the hub correctly, web-Privy users can submit scores. Fish — this entry is the soft-landing for when you boot in this repo.

### TL;DR for `@fishyboy-claude`

**Live URL:** [`https://the-arcade-eta.vercel.app`](https://the-arcade-eta.vercel.app) (Vercel auto-suffixed `-eta` because the bare `the-arcade.vercel.app` name was taken by another account).

**Stack:**
- Vite + React 18 + TypeScript (strict)
- React Router v6
- `@privy-io/react-auth` 3.23.1 (shared app with SolShot)
- Phaser 3.55 (basketball, keepie-uppies)
- Three.js 0.184 (free-kicks) — first non-Phaser game in the hub
- `@solana-program/memo|system|token` + `@solana/kit` pinned to Kit ^5 family (Privy optional peer deps; misalignment broke 4 builds before we landed the right combo)

**Routes wired:**
- `/` — cabinet landing, fire-gradient title + "Insert Coin" Privy login
- `/dashboard` — post-auth game grid (4 tiles: Keepie Uppies, Basketball, Free Kicks, SolShot)
- `/play/basketball`, `/play/keepie-uppies`, `/play/free-kicks` — actual playable games (lifted from SolShot per-game branches + JJ-ME55/solshot-free-kicks)
- `/play/solshot` — interstitial → redirect to solshot.gg
- `/leaderboards`, `/wager`, `/profile/:callsign`, `/me`, `/about` — placeholders, awaiting UI

### Commit timeline (this session, on `main` of JJ-ME55/The-Arcade)

| Commit | What |
|---|---|
| `688da95` | Initial scaffold + onboarding docs |
| `72acb9a` | fix(privy): nest createOnLogin under embeddedWallets.solana |
| `944f5f9` | fix(privy): use defaultSolanaRpcsPlugin instead of solanaClusters |
| `dbf5dd3` | fix(deps): add @solana-program/memo + spl-token peer deps |
| `0761f21` | fix(deps): add all Privy Solana optional peer deps |
| `4d7f179` | fix(deps): bump @solana/kit to ^6.0.0 (wrong — see next) |
| `ada85a0` | **fix(deps): align all @solana-program/* on Kit ^5** — first green build |
| `669f339` | fix(games): rename JSX-bearing .js files to .jsx |
| `4ebeebf` | fix(vercel): SPA rewrite for client-side routing |
| `0c79ce9` | feat(games): lift Basketball + Keepie Uppies from SolShot per-game branches |
| `bba34db` | feat(games): forfeit + mute chrome, drop Safari escape link |
| `d7736db` | feat(games): lift Free Kicks (Three.js) from JJ-ME55/solshot-free-kicks |
| `8637d0e` | feat(games): mint per-game session JWT for Privy-authed web users |

### How the score-submission flow works now

**Bot path** (unchanged from standalone era — re-pointed to arcade hub):
1. TG user taps `/basketball` in `@TheArcadeGG_Bot`
2. Bot mints a session JWT bound to their `telegramUserId`
3. Bot opens `https://the-arcade-eta.vercel.app/play/basketball?session=<jwt>`
4. `BasketballScreen.jsx` captures `?session=` into `sessionStorage`
5. Game plays
6. On game-over, game POSTs to `/api/games/basketball/score` with the JWT
7. Score lands in `BasketballScore` Mongo collection (same as standalone era)

**Web path** (new, this session):
1. Direct visitor signs in via Privy on the cabinet landing
2. Navigates to `/play/basketball`
3. `useArcadeSessionMint('basketball')` hook fires — calls `POST /api/arcade/mint-session?game=basketball` with their Privy access token
4. Server resolves Privy DID → `User` doc → their linked `telegramUserId`
5. Server mints the same-shape JWT the bot would have minted, returns it
6. Client stashes in `sessionStorage` (both keys: `arcade_session` and `arcadeSession` — basketball/KU use the former, free-kicks the latter)
7. Game's existing submit-on-game-over reads sessionStorage, POSTs to the same `/api/games/basketball/score` endpoint
8. Score lands in same Mongo collection — **same leaderboard as bot users**

**Limitation deliberately baked in:** web users need a linked Telegram. If they signed in via email or Google on Privy and never linked TG, server returns `412 tg_not_linked` and the game plays in free-mode (no score submission). Linking still happens via SolShot's `/link` command in `@SolShotGG_bot`. A "Link Telegram to track scores" banner on the game routes is a clean follow-up.

### What's working ✓

- Cabinet landing renders, "Insert Coin" opens Privy modal
- Email login works (verified by JJ)
- Game tiles route to playable Phaser/Three.js scenes
- Forfeit button (← Arcade) overlay top-left, navigates back to /dashboard
- Mute toggle (🔊/🔇) top-right, works on Phaser games; no-op on free-kicks (no audio sources)
- SolShot tile redirects out to solshot.gg
- Score submission via bot JWT path (unchanged from standalone era)
- Score submission via Privy session-mint path (new, this session)

### What's not yet working

- **TG OAuth on Privy** — BotFather's `setdomain` is `solshot.gg`. Logging in to Privy via Telegram on the arcade hub returns `Bot domain invalid`. Deferred until the real domain (`arcade.xyz` or whatever) is locked — no point burning BotFather changes on a throwaway preview URL.
- **First-time arcade users without prior SolShot session** — won't have a `User` doc yet, so mint-session returns 412. Workaround: an `/api/arcade/register` endpoint that the hub calls on first Privy sign-in to create the doc. Small follow-up, not yet built.
- **Arcade Champion cross-game leaderboard** — deferred per JJ. Per-game boards work; cross-game requires formula decision first.
- **`$TOKENS` / `$SHOT` economy** — deferred per JJ. Direction-of-travel: $SHOT becomes purely in-game, $TOKENS becomes the sole tradeable token. Not v1 work.
- **Real cabinet artwork** — placeholders only. Fish to drop mocks at `src/assets/brand/` from `C:\Users\jacob\The Arcade\Website images and branding\`.
- **Dashboard tile artwork** — placeholder cards (CSS box + game name). Cabinet-card design per `THE_ARCADE_v1_DESIGN.md` §Visual Identity pending.
- **`/leaderboards`, `/wager`, `/profile`, `/me`** — placeholder text pages. UI build pending.

### Server-side companion (in JJ-ME55/SolShot)

Lives on PR branch `claude/focused-elion-939d41` (PR open at https://github.com/JJ-ME55/SolShot/pull/new/claude/focused-elion-939d41).

| Commit | What |
|---|---|
| `fdf6bab` | feat(arcade): bootstrap — session-handoff + scaffold + playbook + comms |
| `9950e59` | fix(cors): allow the-arcade.vercel.app origin (superseded by 476af9b) |
| `d4ac184` | docs(arcade-scaffold): Fish onboarding docs |
| `d74f341` / `7c54d4d` / `4e17c9e` / `6daed19` | scaffold mirror fixes (Privy SDK shape, peer deps, Kit ^5) |
| `476af9b` | fix(cors): correct The Arcade URL (-eta suffix) |
| `6a0cfab` | feat(arcade-bot): re-point GAMES to arcade hub URLs |
| `3bac7c4` | feat(arcade): mint-session endpoint for web users |

Once JJ merges + Render redeploys (~2 min auto-deploy):
- Bot URLs in `@TheArcadeGG_Bot.GAMES` point at `the-arcade-eta.vercel.app/play/<slug>` (was: standalone Vercels)
- `/api/arcade/mint-session?game=<slug>` endpoint goes live
- CORS allowlist accepts the arcade aliases

### What `@fishyboy-claude` should do first

1. **Drop the cabinet mocks** at `src/assets/brand/`. Single PR, easy to review. Then the cabinet landing can swap the placeholder fire-gradient title for the real artwork. See `src/assets/brand/README.md` for layout + palette tokens.
2. **Style the dashboard tiles** per `THE_ARCADE_v1_DESIGN.md` §Visual Identity — cabinet cards with pixel borders, marquee strip, game art in the "screen area." Current implementation is `src/routes/Dashboard.tsx`, plain CSS box per tile.
3. **Sourcing decision on the pixel display font** (Press Start 2P / VT323 / custom). Currently `var(--font-display)` falls through to monospace. Once you pick, swap the `tokens.css` variable.
4. **Leaderboard UI** (`/leaderboards` route) — ticket-stub rows, time-window toggle. Server endpoints don't exist yet for the *arcade* leaderboards (per-game endpoints exist at `/api/games/<slug>/leaderboard` and can be called directly for v1). Cross-game "Arcade Champion" still deferred pending JJ's formula call.
5. **Wager waitlist page** (`/wager`) — hero + 3-step explainer + email form. Server `POST /api/wager-waitlist` endpoint needs to be built; flag in this comms file when you want it.

### Open items needing JJ's decision (don't act alone)

These are unchanged from kickoff:
- **Arcade Champion cross-game leaderboard formula** (reverses the 2026-05-15 deferral if accepted)
- **$TOKENS vs $SHOT economy split** (JJ flagged a direction shift: $SHOT in-game only, $TOKENS sole tradeable)
- **Real domain** — `arcade.xyz` vs `thearcade.gg` vs alternatives, WHOIS pending. Affects TG OAuth and the eventual setdomain switch.

### Notes for your own session hygiene

The build-debug loop this session was 12 deploys (8 fails → 4 greens), driven via the Vercel API directly from main-claude's session (JJ generated a token, pasted in chat, now revoked). If you hit a red build:
- Check Vercel dashboard (`https://vercel.com/jj-me55s-projects/the-arcade`, project ID `prj_76wB1x1zw3y9Lyor6svIXu0u5DVz`)
- Paste the actual error line in this comms file or back to JJ
- Don't trust the Rollup PURE-comment warnings — they're noise; the real error is buried below them

— main-claude (Opus 4.7 / 1M context)
