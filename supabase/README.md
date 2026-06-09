# DEEPER — Supabase backend (per-user save + leaderboard + Arcade login)

This wires DEEPER into The Arcade's account system so a player's progress follows them
across **web and mobile**, and so scores share one leaderboard.

## Architecture
- **Auth = Privy (third-party JWT).** The player logs in with the same Arcade Privy account.
  Privy issues a JWT; Supabase is configured to trust it. RLS keys off the JWT `sub` (the
  Privy user id), so each user can only read/write their own save.
- **Cloud save** (`saves` table): the existing local `MetaState` blob is synced up/down and
  merged, so the IndexedDB local save becomes a per-user cloud save (offline still works;
  it syncs on next login).
- **Leaderboard** (`scores` table): public read, authenticated insert-your-own. The client
  already reads through `src/net/leaderboard.ts`, so flipping `REMOTE_ENABLED` + adding the
  Supabase calls goes live with no UI changes.

## One-time setup
1. Create a Supabase project. Grab **Project URL** + **anon public key** (Settings → API).
2. **Auth → Third-Party Auth → add Privy**, using the Arcade **Privy App ID**.
3. Run `supabase/schema.sql` in the SQL editor (tables + RLS + `top_scores`).
4. Put the three keys in `.env` (local) and the Vercel project env (web/mobile):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PRIVY_APP_ID`.

## Then (client wiring — built once keys exist)
- `npm i @supabase/supabase-js @privy-io/react-auth` (or the JS SDK).
- `src/net/supabase.ts` — client created with the Privy access token as the Supabase auth.
- Sync hooks in `src/core/state.ts` (App.load/save) → pull cloud save on login, merge unlocks
  (union) + last-write-wins on counters, push on change.
- Leaderboard submit/fetch via Supabase in `src/net/leaderboard.ts`.

## Hardening (pre-launch)
Move score inserts behind a Supabase **Edge Function** that HMAC-verifies the payload and
sanity-checks score-vs-depth-vs-time, then revoke the client insert policy (Phase D5).
