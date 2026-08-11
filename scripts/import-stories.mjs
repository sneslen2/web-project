// Loads the scraped catalog into the Supabase `stories` table.
//
// Run supabase-schema.sql FIRST, then:
//
//   # PowerShell
//   $env:SUPABASE_SECRET_KEY = "sb_secret_..."
//   node import-stories.mjs
//
//   # bash
//   SUPABASE_SECRET_KEY="sb_secret_..." node import-stories.mjs
//
//   --file=<path>   source JSON (default: full-stories.json)
//   --dry-run       validate and report, write nothing
//
// WHY A SECRET KEY: the `stories` table has a select-only RLS policy and no
// insert policy, so the publishable key used by the app cannot write to it --
// which is the point. The secret key bypasses RLS and is needed for this
// one-off load.
//
// The secret key is read from the environment and MUST NOT be committed or
// pasted into any file under src/. It bypasses all access control; anyone
// holding it has full read/write access to the database. Rotate it in the
// Supabase dashboard if it ever leaks.
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lskobysyxbngryxzkxez.supabase.co'
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY

const args = process.argv.slice(2)
const fileArg = args.find((a) => a.startsWith('--file='))
const SOURCE = fileArg ? fileArg.split('=')[1] : 'full-stories.json'
const DRY_RUN = args.includes('--dry-run')

if (!SECRET_KEY && !DRY_RUN) {
  console.error(
    'SUPABASE_SECRET_KEY is not set.\n' +
      'Find it in the Supabase dashboard under Project Settings -> API keys\n' +
      '(the secret / service_role key, NOT the publishable one), then:\n\n' +
      '  PowerShell:  $env:SUPABASE_SECRET_KEY = "sb_secret_..."\n' +
      '  bash:        export SUPABASE_SECRET_KEY="sb_secret_..."\n\n' +
      'Or run with --dry-run to validate the data without writing.',
  )
  process.exit(1)
}

/** Slug from the tail of the story's agathachristie.com URL. */
const slugFor = (story) => (story.url || '').split('/').filter(Boolean).pop() || ''

/** Map a scraped record to a `stories` row. JSON `character` -> column `detective`. */
function toRow(story) {
  return {
    slug: slugFor(story),
    title: story.title,
    type: story.type,
    detective: story.character ?? null,
    year: story.year ?? null,
    // Collections only; null for other formats.
    story_count: story.storyCount ?? null,
    // Pen name / collaboration / adaptation credit -- deliberately not a detective.
    attribution: story.attribution ?? null,
    url: story.url,
    cover: story.cover ?? null,
    synopsis: story.synopsis ?? null,
    more_about: story.moreAbout ?? null,
    // Non-null defaults in the schema, so normalize here rather than sending null.
    trivia: story.trivia ?? [],
    quote: story.quote ?? null,
    extract_pdf: story.extractPdf ?? null,
    related: story.related ?? [],
  }
}

const raw = JSON.parse(await readFile(SOURCE, 'utf8'))
console.log(`Read ${raw.length} records from ${SOURCE}`)

const rows = raw.map(toRow)

// ---------------------------------------------------------------------------
// Validate before writing. A bad slug or missing title would either fail the
// insert or, worse, silently create an unreachable story page.
// ---------------------------------------------------------------------------
const problems = []
const seen = new Map()

rows.forEach((row, i) => {
  if (!row.slug) problems.push(`[${i}] "${row.title}" has no slug (url: ${row.url})`)
  if (!row.title) problems.push(`[${i}] slug "${row.slug}" has no title`)
  if (!row.type) problems.push(`[${i}] slug "${row.slug}" has no type`)

  if (seen.has(row.slug)) {
    problems.push(`[${i}] duplicate slug "${row.slug}" (also at [${seen.get(row.slug)}])`)
  }
  seen.set(row.slug, i)
})

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found -- nothing written:`)
  problems.slice(0, 20).forEach((p) => console.error('  ' + p))
  process.exit(1)
}

console.log('Validation passed:')
console.log(`  ${rows.length} rows, ${seen.size} unique slugs`)
console.log(`  detective set on ${rows.filter((r) => r.detective).length}`)
console.log(`  synopsis  set on ${rows.filter((r) => r.synopsis).length}`)
console.log(`  trivia    on ${rows.filter((r) => r.trivia.length).length}`)
console.log(`  quote     on ${rows.filter((r) => r.quote).length}`)
console.log(`  related   on ${rows.filter((r) => r.related.length).length}`)

if (DRY_RUN) {
  console.log('\n--dry-run: nothing written.')
  console.log('Sample row:', JSON.stringify(rows[0], null, 2).slice(0, 700))
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Write. Upsert on the slug primary key so re-running updates in place instead
// of failing on conflicts -- this script is safe to run repeatedly.
// ---------------------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false },
})

const BATCH = 100 // keep request bodies well under any payload limit
let written = 0

for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const { error } = await supabase.from('stories').upsert(batch, { onConflict: 'slug' })

  if (error) {
    console.error(`\nBatch at row ${i} failed: ${error.message}`)
    if (error.details) console.error('Details:', error.details)
    console.error(`\n${written} rows were written before this failure.`)
    process.exit(1)
  }

  written += batch.length
  console.log(`  upserted ${written}/${rows.length}`)
}

// Read back rather than trusting the write.
const { count, error: countError } = await supabase
  .from('stories')
  .select('*', { count: 'exact', head: true })

if (countError) {
  console.error(`\nWrote ${written} rows, but the verification count failed: ${countError.message}`)
  process.exit(1)
}

console.log(`\nDone. ${written} rows upserted; table now holds ${count}.`)
if (count !== rows.length) {
  console.warn(
    `Note: table count (${count}) differs from source (${rows.length}) -- ` +
      'there may be rows from an earlier import with slugs no longer in the source.',
  )
}
