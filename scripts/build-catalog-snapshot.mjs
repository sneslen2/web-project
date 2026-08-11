// Writes public/catalog.json -- the offline fallback the app uses when Supabase
// is unreachable (most often because a free-tier project has auto-paused).
//
//   node scripts/build-catalog-snapshot.mjs              # from Supabase (preferred)
//   node scripts/build-catalog-snapshot.mjs --from-file  # from scripts/full-stories.json
//
// Reads through the publishable key, exactly as the browser does, so the
// snapshot can only ever contain rows the app was already allowed to serve.
// No secret key is needed or accepted here.
//
// Re-run this after any import-stories.mjs run, then rebuild, so the cached
// copy doesn't drift from the database.
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/catalog.json')
const FALLBACK_SOURCE = resolve(HERE, 'full-stories.json')

// Same project + publishable key as src/supabaseClient.js.
const SUPABASE_URL = 'https://lskobysyxbngryxzkxez.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uHOWKmQ9xv8ToIM0aBpHyA_4_AnT_M9'

// Must stay in sync with the select in src/data/StoriesProvider.jsx, so the
// cached rows and the live rows have identical shape.
const COLUMNS =
  'slug, title, type, detective, year, story_count, attribution, url, cover, synopsis, more_about, trivia, quote, extract_pdf, related'

const fromFile = process.argv.includes('--from-file')

/** Map a scraped full-stories.json record to the DB column shape. */
function rowFromScrape(story) {
  const slug = (story.url || '').split('/').filter(Boolean).pop() || ''
  return {
    slug,
    title: story.title,
    type: story.type,
    detective: story.character ?? null,
    year: story.year ?? null,
    story_count: story.storyCount ?? null,
    attribution: story.attribution ?? null,
    url: story.url,
    cover: story.cover ?? null,
    synopsis: story.synopsis ?? null,
    more_about: story.moreAbout ?? null,
    trivia: story.trivia ?? [],
    quote: story.quote ?? null,
    extract_pdf: story.extractPdf ?? null,
    related: story.related ?? [],
  }
}

async function fromSupabase() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  })

  // Page through rather than relying on the default 1000-row cap holding
  // forever -- the catalog is ~300 rows today but this stays correct if it grows.
  const PAGE = 500
  const rows = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('stories')
      .select(COLUMNS)
      .order('year', { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) throw new Error(error.message)
    rows.push(...data)
    if (data.length < PAGE) break
  }

  return rows
}

let rows
let source

if (fromFile) {
  const raw = JSON.parse(await readFile(FALLBACK_SOURCE, 'utf8'))
  rows = raw.map(rowFromScrape)
  source = 'scripts/full-stories.json'
} else {
  try {
    rows = await fromSupabase()
    source = 'Supabase'
  } catch (err) {
    console.error(`Could not read from Supabase: ${err.message}`)
    console.error(
      'If the project is paused, resume it and retry, or pass --from-file to\n' +
        'build the snapshot from the scraped JSON instead.',
    )
    process.exit(1)
  }
}

if (rows.length === 0) {
  console.error(`No rows read from ${source} -- refusing to write an empty snapshot.`)
  console.error('An empty catalog.json would make the fallback look like a working, empty catalog.')
  process.exit(1)
}

// Written without indentation: this ships to the browser, and pretty-printing
// it costs ~200 KB for nobody's benefit.
await writeFile(OUT, JSON.stringify(rows), 'utf8')

const kb = Math.round(Buffer.byteLength(JSON.stringify(rows)) / 1024)
console.log(`Wrote ${rows.length} rows from ${source} to public/catalog.json (${kb} KB)`)
