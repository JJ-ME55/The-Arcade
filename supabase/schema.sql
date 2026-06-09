-- ============================================================================
-- DEEPER (The Arcade) — Supabase schema
-- Auth model: Privy as a third-party JWT provider (so the SAME Arcade login works
-- on web + mobile and links into the platform). user_id = the Privy user id, which
-- arrives as the JWT 'sub' claim. RLS is enforced with auth.jwt()->>'sub'.
--
-- Setup once in the Supabase dashboard:
--   Auth → Sign In / Providers → Third-Party Auth → add Privy (your Arcade Privy App ID).
-- Then run this file in the SQL editor.
-- ============================================================================

-- ---- Cloud save: one row per user, holding the MetaState blob ----------------
create table if not exists public.saves (
  user_id    text        primary key,
  data       jsonb       not null,
  version    integer     not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

create policy "saves: read own"   on public.saves
  for select using (auth.jwt() ->> 'sub' = user_id);
create policy "saves: insert own" on public.saves
  for insert with check (auth.jwt() ->> 'sub' = user_id);
create policy "saves: update own" on public.saves
  for update using (auth.jwt() ->> 'sub' = user_id)
              with check (auth.jwt() ->> 'sub' = user_id);

-- ---- Leaderboard scores ------------------------------------------------------
create table if not exists public.scores (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  name       text        not null,
  score      bigint      not null check (score >= 0),
  depth      integer     not null default 0,
  cash       bigint      not null default 0,
  mode       text        not null default 'free',   -- 'free' | 'daily' | 'challenge'
  seed       text        not null default '',
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;

-- the board is public to read…
create policy "scores: public read" on public.scores
  for select using (true);
-- …but you can only submit a score under your own user id.
create policy "scores: insert own" on public.scores
  for insert with check (auth.jwt() ->> 'sub' = user_id);

create index if not exists scores_mode_score_idx on public.scores (mode, score desc);
create index if not exists scores_user_idx        on public.scores (user_id);

-- ---- Top-N helper (fast leaderboard reads) -----------------------------------
create or replace function public.top_scores(p_mode text, p_limit int default 50)
returns setof public.scores
language sql stable as $$
  select * from public.scores
  where mode = p_mode
  order by score desc
  limit greatest(1, least(p_limit, 200));
$$;

-- ============================================================================
-- HARDENING (recommended before a public launch): move score INSERTs behind a
-- Supabase Edge Function that verifies an HMAC of the payload + sanity-checks
-- score vs depth vs time-played, then revoke the "insert own" policy so the
-- client can't write arbitrary scores. (Build plan Phase D5 / replay validation.)
-- ============================================================================
