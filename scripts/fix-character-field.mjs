// One-off repair for the `character` field in full-stories.json.
//
//   node fix-character-field.mjs --dry-run   # report only
//   node fix-character-field.mjs             # rewrite the file in place
//
// Three problems, all from the detail pass writing non-detective values into
// `character` (the scraper is now fixed; this repairs the already-scraped data
// so a full 6-minute re-scrape isn't needed):
//
//  1. Collection pages label the type "Collection (7 stories)". That failed the
//     exact-match type check and fell through to the character slot. The type
//     field was already correct from the listing pass, so the fix is to null the
//     character and keep the count as `storyCount`.
//
//  2. "Detection Club", "Mary Westmacott", and "Inspired by" are legitimate
//     attributions but not recurring detectives, so they don't belong in a
//     detective filter. Moved to `attribution`.
//
//     ("Inspired by" is the site's own complete label -- it marks novels adapted
//     from Christie plays by other authors. Terse, but real information, so it's
//     preserved rather than discarded.)
import { readFile, writeFile } from 'node:fs/promises'

const DRY_RUN = process.argv.includes('--dry-run')
const FILE = 'full-stories.json'

const COUNT_RE = /^(.*?)\s*\((\d+)\s+stor(?:y|ies)\)$/i
// Values that are real metadata but not recurring detectives.
const ATTRIBUTIONS = new Set(['Detection Club', 'Mary Westmacott', 'Inspired by'])

const stories = JSON.parse(await readFile(FILE, 'utf8'))
const changes = []

for (const story of stories) {
  const original = story.character

  // Normalise every record so the field set is uniform, not just repaired rows.
  if (story.storyCount === undefined) story.storyCount = null
  if (story.attribution === undefined) story.attribution = null

  if (!original) continue

  const countMatch = original.match(COUNT_RE)

  if (countMatch) {
    const embeddedType = countMatch[1].trim()
    // Sanity check: only proceed if the embedded type agrees with the type
    // field. If they disagree, something else is wrong -- report, don't guess.
    if (embeddedType !== story.type) {
      changes.push({
        title: story.title,
        action: 'SKIPPED (type mismatch)',
        detail: `character says "${embeddedType}", type says "${story.type}"`,
      })
      continue
    }
    story.storyCount = Number(countMatch[2])
    story.character = null
    changes.push({
      title: story.title,
      action: 'count moved',
      detail: `"${original}" -> character: null, storyCount: ${story.storyCount}`,
    })
  } else if (ATTRIBUTIONS.has(original)) {
    story.attribution = original
    story.character = null
    changes.push({
      title: story.title,
      action: 'reclassified',
      detail: `"${original}" -> attribution`,
    })
  }
}

console.log(`${changes.length} record(s) affected:\n`)
for (const c of changes) {
  console.log(`  ${c.action.padEnd(24)} ${c.title}`)
  console.log(`  ${' '.repeat(24)} ${c.detail}`)
}

// Report the resulting detective list so the fix is visibly verified.
const remaining = {}
for (const s of stories) {
  const key = s.character ?? '(null / standalone)'
  remaining[key] = (remaining[key] || 0) + 1
}
console.log('\nResulting `character` values:')
for (const [key, count] of Object.entries(remaining).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${key}`)
}

if (DRY_RUN) {
  console.log('\n--dry-run: file not modified.')
} else {
  await writeFile(FILE, JSON.stringify(stories, null, 2))
  console.log(`\nWrote ${FILE} (${stories.length} records).`)
}
