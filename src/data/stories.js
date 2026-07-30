import rawStories from './story-cards.json'

/**
 * The Christie catalog.
 *
 * Currently the listing-level scrape (title/type/character/year/url/cover).
 * The detail scrape adds synopsis, moreAbout, trivia, quote, extractPdf, and
 * related -- when that lands, replace story-cards.json and everything here
 * keeps working, since nothing below assumes the richer fields exist.
 */

/** URL identifier for a story, taken from the tail of its agathachristie.com URL. */
export function slugFor(story) {
  return (story.url || '').split('/').filter(Boolean).pop() || ''
}

// One slug -- "the-last-séance-collection" -- contains a non-ASCII character.
// It's legal in a URL but must be percent-encoded in hrefs and decoded on read,
// or the route silently fails to match.
export const encodeSlug = (slug) => encodeURIComponent(slug)
export const decodeSlug = (slug) => {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug // malformed percent-encoding; fall through to a not-found state
  }
}

export const stories = rawStories.map((story) => ({
  ...story,
  slug: slugFor(story),
}))

const bySlug = new Map(stories.map((s) => [s.slug, s]))

export const getStory = (slug) => bySlug.get(decodeSlug(slug)) ?? null

// ---------------------------------------------------------------------------
// Facets, derived from the data rather than hardcoded, so a re-scrape that adds
// a new character or format doesn't silently drop it from the filter controls.
// ---------------------------------------------------------------------------

/** Publication order, the catalog's most natural sort. */
export const TYPES = [...new Set(stories.map((s) => s.type).filter(Boolean))].sort()

/** Recurring detectives. `null` in the data means a standalone story. */
export const CHARACTERS = [...new Set(stories.map((s) => s.character).filter(Boolean))].sort()

export const YEAR_RANGE = stories.reduce(
  (range, s) => (s.year ? { min: Math.min(range.min, s.year), max: Math.max(range.max, s.year) } : range),
  { min: Infinity, max: -Infinity },
)

/** Sentinel for "no recurring character" in filter state. */
export const STANDALONE = '__standalone__'

/**
 * Cover image at a given width. The stored URL is an imgix base with its query
 * stripped, so any width can be requested on demand.
 */
export function coverAt(story, width) {
  if (!story.cover) return null
  return `${story.cover}?auto=compress,format&fit=clip&q=70&w=${width}`
}
