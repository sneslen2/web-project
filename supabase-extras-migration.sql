-- =====================================================================
-- The Christie Project -- Extras migration
--
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: every statement is idempotent.
--
-- Splits the catalog into three groups:
--
--   1. Main works    -- Christie's own writing. The checklist and all totals.
--   2. Extras        -- not her solo writing, but still trackable on their own
--                       page: the Westmacott romances, the Detection Club
--                       collaborations, and novels by other authors.
--   3. Excluded      -- redundant 2017 radio-play republications. Hidden from
--                       the app entirely, but the rows (and any reading
--                       progress on them) are kept so this is reversible.
--
-- Two new columns rather than deletions, so nothing is destroyed and the
-- grouping can be revised without a re-scrape.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------

-- Which bucket a row belongs to. NULL means a main work, so existing rows
-- stay in the checklist by default and only the exceptions are marked.
--   'westmacott'  -- Mary Westmacott romances (her pen name)
--   'detection'   -- Detection Club collaborative novels
--   'inspired'    -- novels and stories written by other authors
alter table public.stories add column if not exists extras_category text;

alter table public.stories drop constraint if exists stories_extras_category_check;
alter table public.stories add constraint stories_extras_category_check
  check (extras_category is null
         or extras_category in ('westmacott', 'detection', 'inspired'));

-- Hidden from the app: republished radio plays that duplicate a work already
-- in the catalog. Not deleted, because reading_progress cascades on delete and
-- the call on what counts as redundant may change.
alter table public.stories add column if not exists excluded boolean not null default false;

-- The checklist and the extras page both filter on these.
create index if not exists stories_extras_category_idx
  on public.stories (extras_category);
create index if not exists stories_excluded_idx on public.stories (excluded);

-- Author credit for works Christie did not write. NULL for her own writing and
-- for the Detection Club titles, which have many contributors per book.
alter table public.stories add column if not exists other_author text;


-- ---------------------------------------------------------------------
-- 2. Extras -- Mary Westmacott (6 novels)
-- ---------------------------------------------------------------------
-- Already carry attribution = 'Mary Westmacott' from the scrape.
update public.stories
   set extras_category = 'westmacott'
 where attribution = 'Mary Westmacott';


-- ---------------------------------------------------------------------
-- 3. Extras -- Detection Club (3 collaborative novels)
-- ---------------------------------------------------------------------
-- Christie wrote a chapter of each alongside Sayers, Chesterton and others.
-- No other_author: the contributor list is per-chapter, not per-book.
update public.stories
   set extras_category = 'detection'
 where attribution = 'Detection Club';


-- ---------------------------------------------------------------------
-- 4. Extras -- written by other authors (20 rows)
-- ---------------------------------------------------------------------
-- The source site labels only two of these ("Inspired by"), so the rest are
-- listed explicitly by slug.

-- Charles Osborne: novelisations of three Christie plays.
update public.stories
   set extras_category = 'inspired', other_author = 'Charles Osborne'
 where slug in (
   'black-coffee',            -- 1998, novelisation of the 1930 play
   'the-unexpected-guest',    -- 1999
   'spiders-web'              -- 2000
 );

-- Sophie Hannah: the authorised Poirot continuation novels.
update public.stories
   set extras_category = 'inspired', other_author = 'Sophie Hannah'
 where slug in (
   'the-monogram-murders',            -- 2014
   'closed-casket',                   -- 2016
   'the-mystery-of-three-quarters',   -- 2018
   'the-killings-at-kingfisher-hill', -- 2020
   'hercule-poirots-silent-night',    -- 2023
   'the-last-death-of-the-year'       -- 2025
 );

-- Lucy Foley: Marple continuation novel.
update public.stories
   set extras_category = 'inspired', other_author = 'Lucy Foley'
 where slug = 'murder-at-the-grand-alpine-hotel';  -- 2026

-- Marple: Twelve New Mysteries (2022) -- the collection plus all twelve member
-- stories. Each story has a different author, so the collection itself carries
-- no single other_author. The member stories keep their own rows so the extras
-- page can nest them under the collection, the same way the main checklist
-- handles short stories.
update public.stories
   set extras_category = 'inspired'
 where slug in (
   'marple-collection',
   'evil-in-small-places',
   'the-second-murder-at-the-vicarage',
   'miss-marple-takes-manhattan',
   'the-unravelling',
   'miss-marples-christmas',
   'the-open-mind',
   'the-jade-empress',
   'a-deadly-wedding-day',
   'murder-at-the-villa-rosa',
   'the-murdering-sort',
   'the-mystery-of-the-acid-soil',
   'the-disappearance'
 );

-- Per-story authors for the Marple collection. Each of the twelve was written
-- by a different contemporary crime writer.
update public.stories set other_author = 'Naomi Alderman'    where slug = 'the-open-mind';
update public.stories set other_author = 'Leigh Bardugo'     where slug = 'the-disappearance';
update public.stories set other_author = 'Alyssa Cole'       where slug = 'miss-marple-takes-manhattan';
update public.stories set other_author = 'Lucy Foley'        where slug = 'evil-in-small-places';
update public.stories set other_author = 'Elly Griffiths'    where slug = 'the-unravelling';
update public.stories set other_author = 'Natalie Haynes'    where slug = 'the-mystery-of-the-acid-soil';
update public.stories set other_author = 'Jean Kwok'         where slug = 'the-jade-empress';
update public.stories set other_author = 'Val McDermid'      where slug = 'the-second-murder-at-the-vicarage';
update public.stories set other_author = 'Karen M. McManus'  where slug = 'a-deadly-wedding-day';
update public.stories set other_author = 'Dreda Say Mitchell' where slug = 'the-murdering-sort';
update public.stories set other_author = 'Kate Mosse'        where slug = 'murder-at-the-villa-rosa';
update public.stories set other_author = 'Ruth Ware'         where slug = 'miss-marples-christmas';


-- ---------------------------------------------------------------------
-- 5. Excluded -- redundant 2017 radio-play republications (7 rows)
-- ---------------------------------------------------------------------
-- Christie's own writing, but each either duplicates a work already in the
-- catalog by title, or is a bundle of plays that are themselves listed
-- separately. The five distinct 2017 one-act plays (Fiddlers Three, The Wasp's
-- Nest, The Stranger, Personal Call, Butter in a Lordly Dish) are NOT excluded
-- -- they appear nowhere else in the catalog.
update public.stories
   set excluded = true
 where slug in (
   -- Duplicate an existing title.
   'yellow-iris-play',            -- cf. Yellow Iris (1937, short story)
   'towards-zero-outdoor-play',   -- cf. Towards Zero (1944, novel)
   'the-secret-of-chimneys-play', -- cf. The Secret of Chimneys (1925, novel)
   'a-daughters-a-daughter-play', -- cf. A Daughter's A Daughter (1952, novel)
   -- Bundles of plays listed individually elsewhere.
   'murder-in-the-studio-play',   -- Personal Call + Yellow Iris + Wasp's Nest
   'a-poirot-double-bill',        -- The Wasp's Nest + Yellow Iris
   'rule-of-thumb'                -- two Rule of Three plays + The Wasp's Nest
 );


-- ---------------------------------------------------------------------
-- 6. Verify
-- ---------------------------------------------------------------------
-- Expected: 263 main, 32 extras, 7 excluded, 302 total.
--
-- select
--   count(*) filter (where not excluded and extras_category is null) as main,
--   count(*) filter (where not excluded and extras_category is not null) as extras,
--   count(*) filter (where excluded) as excluded,
--   count(*) as total
-- from public.stories;
--
-- select extras_category, count(*)
--   from public.stories where not excluded and extras_category is not null
--   group by extras_category order by extras_category;
--   -- expect: detection 3, inspired 19, westmacott 6
--
-- select other_author, count(*) from public.stories
--   where other_author is not null group by other_author order by count(*) desc;
