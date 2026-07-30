-- =====================================================================
-- The Christie Project -- Supabase schema
--
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. It is safe to re-run (drops each policy before recreating it).
--
-- Two tables with deliberately different access models:
--
--   stories           -- the Christie catalog. PUBLIC, read-only to clients.
--   reading_progress  -- per-user status/rating/notes. PRIVATE to each user.
--
-- After running this, load the catalog rows with:
--   cd scripts && node import-stories.mjs
-- =====================================================================


-- =====================================================================
-- 1. stories -- the catalog
-- =====================================================================
create table if not exists public.stories (
  -- Slug from the tail of the agathachristie.com URL. Natural primary key: it's
  -- stable, unique across all 302 records, and it's what the app's routes use
  -- (/#/story/the-mysterious-affair-at-styles), so no extra lookup is needed.
  slug        text primary key,

  title       text not null,
  -- Novel | Collection | Play | Short Story. Left as free text rather than an
  -- enum so a re-scrape that introduces a new format doesn't fail the import.
  type        text not null,
  -- NULL means a standalone story with no recurring detective. This is
  -- meaningful data, not missing data -- 80 of 302 rows are legitimately NULL.
  --
  -- Named `detective`, not `character`: "character" is a built-in type name in
  -- Postgres (character varying), so a column with that name has to be quoted
  -- in many contexts and reads ambiguously. The JSON field stays `character`;
  -- the import script and the client map between the two.
  detective   text,
  year        integer check (year between 1900 and 2100),

  -- Number of stories in a collection. NULL for every other format -- the site
  -- only publishes it for collections, where it appears inside the type label
  -- ("Collection (7 stories)").
  story_count smallint check (story_count > 0),

  -- Credit that occupies the detective slot on the source site but isn't a
  -- recurring detective: "Mary Westmacott" (her romance pen name), "Detection
  -- Club" (collaborative novels), "Inspired by" (novels other authors adapted
  -- from Christie plays). Kept separate so the detective filter stays clean.
  attribution text,

  url         text not null,
  -- imgix base URL with the query string stripped, so the client can request
  -- any width on demand (?w=200).
  cover       text,

  synopsis    text,
  -- Longer prose: writing history, adaptations. Paragraphs separated by "\n\n".
  more_about  text,
  -- "Did you know?" bullets. Present on only ~5% of stories; empty array
  -- otherwise, never NULL, so the client never has to null-check before mapping.
  trivia      text[] not null default '{}',
  -- {"text": "...", "author": "Hercule Poirot"} or NULL. Two rows have a quote
  -- with no author, so the author is not guaranteed inside the object.
  quote       jsonb,
  extract_pdf text,
  -- [{"title": "...", "url": "..."}]. Deliberately NOT a foreign key: 12 of the
  -- linked titles (graphic novels, quote compilations, non-fiction) are outside
  -- the four scraped formats, so an FK would silently drop 15 real links.
  related     jsonb not null default '[]',

  imported_at timestamptz not null default now()
);

-- Migration for a table created before story_count/attribution existed.
-- `create table if not exists` above is a no-op on an existing table, so new
-- columns have to be added explicitly. Both are no-ops if already present.
alter table public.stories add column if not exists story_count smallint;
alter table public.stories add column if not exists attribution text;

-- The checklist sorts by publication date and filters by format/detective.
create index if not exists stories_year_idx on public.stories (year);
create index if not exists stories_type_idx on public.stories (type);
create index if not exists stories_detective_idx on public.stories (detective);

-- ---------------------------------------------------------------------
-- stories RLS: readable by everyone, writable by no client.
--
-- The catalog is public reference data, so anonymous visitors can read it
-- without signing in. Note there are NO insert/update/delete policies: with
-- RLS enabled, no policy means no access, so the publishable key cannot alter
-- the catalog. The import script must therefore use the SECRET key (see
-- scripts/import-stories.mjs), which bypasses RLS.
-- ---------------------------------------------------------------------
alter table public.stories enable row level security;

drop policy if exists "Catalog is publicly readable" on public.stories;
create policy "Catalog is publicly readable"
  on public.stories
  for select
  to anon, authenticated
  using (true);


-- =====================================================================
-- 2. reading_progress -- one row per user per story
-- =====================================================================
create table if not exists public.reading_progress (
  -- Owner. References Supabase's built-in auth.users, so deleting an account
  -- takes its progress with it. NOT NULL matters: a nullable owner combined
  -- with the policies below would create rows nobody can see or delete.
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,

  -- Cascade so a re-import that drops a story doesn't leave orphaned progress.
  story_slug  text not null
                references public.stories (slug) on delete cascade,

  status      text not null default 'unread'
                check (status in ('unread', 'reading', 'read')),
  rating      smallint check (rating between 1 and 5),
  finished_on date,
  notes       text not null default '',

  updated_at  timestamptz not null default now(),

  -- One progress row per user per story. This composite key is also what makes
  -- upsert work: the client can .upsert() without first checking existence.
  primary key (user_id, story_slug)
);

-- The statistics page reads all of one user's progress at once.
create index if not exists reading_progress_user_idx
  on public.reading_progress (user_id);

-- Keep updated_at honest rather than trusting the client to send it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reading_progress_touch on public.reading_progress;
create trigger reading_progress_touch
  before update on public.reading_progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- reading_progress RLS -- THIS IS THE IMPORTANT PART.
--
-- The publishable key ships in the JavaScript bundle, so anyone can read it
-- and issue queries against this project. These policies are what make that
-- harmless: each user reaches only their own rows. Never disable RLS here.
--
-- Target role is `authenticated`, not `public`, so a signed-out visitor
-- matches no policy and sees nothing.
-- ---------------------------------------------------------------------
alter table public.reading_progress enable row level security;

drop policy if exists "Users read their own progress" on public.reading_progress;
create policy "Users read their own progress"
  on public.reading_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

-- `with check` validates the NEW row, so a client cannot insert progress owned
-- by somebody else even though it supplies user_id itself.
drop policy if exists "Users insert their own progress" on public.reading_progress;
create policy "Users insert their own progress"
  on public.reading_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- `using` picks which rows may be updated; `with check` stops an update from
-- reassigning the row to another user. Both are needed.
drop policy if exists "Users update their own progress" on public.reading_progress;
create policy "Users update their own progress"
  on public.reading_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their own progress" on public.reading_progress;
create policy "Users delete their own progress"
  on public.reading_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);


-- =====================================================================
-- 3. Verify (optional)
-- =====================================================================
-- select relname, relrowsecurity as rls_enabled
--   from pg_class
--   where oid in ('public.stories'::regclass, 'public.reading_progress'::regclass);
--
-- select tablename, policyname, cmd, roles
--   from pg_policies where schemaname = 'public'
--   order by tablename, cmd;
--
-- select count(*) as story_count from public.stories;               -- expect 302
-- select type, count(*) from public.stories group by type order by type;
