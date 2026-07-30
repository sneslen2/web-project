-- =====================================================================
-- CS571 web project -- Supabase schema
--
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. It is safe to re-run (drops each policy before recreating it).
--
-- `items` is PLACEHOLDER scaffolding. When the real domain is known, rename
-- the table and columns; keep the ownership column, the RLS enable, and the
-- four policies exactly as they are -- that combination is what stops one
-- user reading another's rows.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The table
-- ---------------------------------------------------------------------
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),

  -- Owner of the row. References Supabase's built-in auth.users table, so a
  -- deleted account takes its rows with it.
  --
  -- The default means an insert that omits user_id still gets the caller's id
  -- rather than NULL; the client sets it explicitly too. NOT NULL matters --
  -- a nullable owner column plus the policies below would let a NULL-owner row
  -- become invisible to everyone and deletable by no one.
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,

  title       text not null check (char_length(trim(title)) between 1 and 500),
  created_at  timestamptz not null default now()
);

-- Every query in the app filters by user_id (via RLS) and sorts by created_at.
-- Without this index that's a full scan of all users' rows on every page load.
create index if not exists items_user_id_created_at_idx
  on public.items (user_id, created_at desc);


-- ---------------------------------------------------------------------
-- 2. Row Level Security
--
-- THIS IS THE IMPORTANT PART. The publishable key is in the shipped
-- JavaScript bundle, so anyone can read it and issue arbitrary queries
-- against this project. RLS is what makes that harmless: without the
-- policies below, `enable row level security` denies everything, and with
-- them each user reaches only their own rows.
--
-- Never disable RLS on a table holding real user data.
-- ---------------------------------------------------------------------
alter table public.items enable row level security;

-- `authenticated` (not `public`) as the target role means a signed-out visitor
-- with the publishable key matches no policy at all and sees nothing.

drop policy if exists "Users can read their own items" on public.items;
create policy "Users can read their own items"
  on public.items
  for select
  to authenticated
  using (auth.uid() = user_id);

-- `with check` validates the NEW row: a client cannot insert a row owned by
-- somebody else even though it supplies user_id itself.
drop policy if exists "Users can insert their own items" on public.items;
create policy "Users can insert their own items"
  on public.items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- `using` picks which rows may be updated; `with check` stops the update from
-- reassigning the row to another user. Both are needed.
drop policy if exists "Users can update their own items" on public.items;
create policy "Users can update their own items"
  on public.items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own items" on public.items;
create policy "Users can delete their own items"
  on public.items
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- 3. Verify (optional)
--
-- Confirms RLS is on and lists the policies. Expect rls_enabled = true and
-- four rows.
-- ---------------------------------------------------------------------
-- select relname, relrowsecurity as rls_enabled
--   from pg_class where oid = 'public.items'::regclass;
--
-- select policyname, cmd, roles
--   from pg_policies where schemaname = 'public' and tablename = 'items'
--   order by cmd;
