import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { buildMembership } from './collectionMembership.js'

/**
 * Loads the Christie catalog from Supabase once, at app start, and shares it.
 *
 * The catalog is public reference data (see the select-only RLS policy on
 * `stories`), so this works signed out. It's fetched rather than bundled so the
 * database is the single source of truth and the ~640 KB stays out of the build.
 *
 * If that fetch fails, we fall back to public/catalog.json -- a snapshot built
 * by scripts/build-catalog-snapshot.mjs. The common cause is a free-tier
 * Supabase project auto-pausing after a week of inactivity, which would
 * otherwise leave every page showing an error for a catalog that has not
 * actually changed. The fallback is lazily fetched, so a healthy load never
 * pays for it.
 */

const StoriesContext = createContext(null)

/** Sentinel for "no recurring detective" in filter state -- null can't be a checkbox value. */
export const STANDALONE = '__standalone__'

/** Columns to read. Kept in sync with scripts/build-catalog-snapshot.mjs. */
const COLUMNS =
  'slug, title, type, detective, year, story_count, attribution, extras_category, excluded, other_author, url, cover, synopsis, more_about, trivia, quote, extract_pdf, related'

/**
 * Map a DB row to the shape the components use. `detective` is named that way
 * in Postgres because "character" is a built-in type name there.
 */
function toStory(row) {
  return {
    slug: row.slug,
    title: row.title,
    type: row.type,
    character: row.detective,
    year: row.year,
    storyCount: row.story_count,
    attribution: row.attribution,
    // Null for Christie's own writing; 'westmacott' | 'detection' | 'inspired'
    // for the works on the Extras page. `?? null` rather than a bare read so a
    // snapshot predating these columns behaves like a main work.
    extrasCategory: row.extras_category ?? null,
    excluded: row.excluded ?? false,
    otherAuthor: row.other_author ?? null,
    url: row.url,
    cover: row.cover,
    synopsis: row.synopsis,
    moreAbout: row.more_about,
    trivia: row.trivia ?? [],
    quote: row.quote,
    extractPdf: row.extract_pdf,
    related: row.related ?? [],
  }
}

/**
 * Turn a supabase-js error into something a reader can act on.
 *
 * A paused project and a dropped wifi connection both surface as the same
 * opaque "Failed to fetch" from the underlying fetch call, so we can't tell
 * them apart from the client -- but naming both candidates is far more useful
 * than showing the raw TypeError.
 */
function describeError(queryError) {
  const raw = queryError?.message ?? 'Unknown error'

  // supabase-js reports network-level failures with no HTTP status.
  const isNetworkFailure =
    queryError?.status === undefined || raw.toLowerCase().includes('failed to fetch')

  if (isNetworkFailure) {
    return {
      message: 'Could not reach the Supabase project.',
      // The overwhelmingly likely cause for this app, and the one with a fix
      // the reader can actually carry out.
      hint:
        'Free-tier Supabase projects pause automatically after about a week of ' +
        'inactivity. Check the Supabase dashboard and resume the project if it is ' +
        'paused. A lost network connection would look the same from here.',
      raw,
    }
  }

  return { message: raw, hint: null, raw }
}

export function StoriesProvider({ children }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // True when the rows on screen came from the snapshot rather than the DB.
  const [stale, setStale] = useState(false)

  useEffect(() => {
    let active = true

    /**
     * Read the snapshot shipped alongside the app. Relative to import.meta.env
     * .BASE_URL so it resolves under the GitHub Pages repo subpath.
     */
    async function loadSnapshot() {
      const response = await fetch(`${import.meta.env.BASE_URL}catalog.json`)
      if (!response.ok) {
        throw new Error(`snapshot request returned ${response.status}`)
      }
      const rows = await response.json()
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('snapshot was empty')
      }
      return rows
    }

    async function load() {
      // Default order is publication date -- the catalog's most natural sort and
      // what the checklist opens with.
      const { data, error: queryError } = await supabase
        .from('stories')
        .select(COLUMNS)
        .order('year', { ascending: true })

      if (!active) return

      if (!queryError) {
        setStories(data.map(toStory))
        setLoading(false)
        return
      }

      // Live read failed. Serve the snapshot if we can -- a slightly stale
      // catalog beats an error page for data that changes approximately never.
      const described = describeError(queryError)

      try {
        const rows = await loadSnapshot()
        if (!active) return

        setStories(rows.map(toStory))
        setStale(true)
        setLoading(false)
        console.warn(
          `Supabase read failed (${described.raw}); serving the cached catalog from catalog.json.`,
        )
      } catch (snapshotError) {
        if (!active) return

        // Both sources are gone; now an error is the honest answer.
        console.error('Cached catalog also unavailable:', snapshotError)
        setError(described)
        setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => {
    // Lookups span every row, including extras: a story page has to resolve any
    // slug, and collection membership has to nest the Marple stories under
    // their collection the same way it does Christie's own.
    const bySlug = new Map(stories.map((s) => [s.slug, s]))

    // Derived from `related` on Collection rows -- see collectionMembership.js
    // for why that field means membership there and recommendations elsewhere.
    const { membersOf, collectionsOf, uncollected } = buildMembership(stories)

    const lookup = (slug) => bySlug.get(slug) ?? null
    const resolve = (slugs) => (slugs ?? []).map(lookup).filter(Boolean)

    // The catalog splits three ways. `excluded` rows (redundant 2017 radio-play
    // republications) are dropped outright; `extrasCategory` rows are trackable
    // but live on their own page; everything else is the main body of work that
    // the checklist, Statistics and About all count.
    const visible = stories.filter((s) => !s.excluded)
    const mainWorks = visible.filter((s) => !s.extrasCategory)
    const extras = visible.filter((s) => s.extrasCategory)

    return {
      // `stories` is the main body of work, so every existing consumer counts
      // and filters Christie's own writing without opting in.
      stories: mainWorks,
      extras,
      loading,
      error,
      stale,

      /** Member stories of a collection, in published order. */
      membersOfCollection: (slug) => resolve(membersOf.get(slug)),

      /**
       * Collections containing a story. 64 shorts are in more than one, which
       * is why this returns an array rather than a single parent.
       */
      collectionsContaining: (slug) => resolve(collectionsOf.get(slug)),

      /** Short stories belonging to no collection. */
      uncollectedStories: () => resolve(uncollected),

      /**
       * The catalog counted as distinct works: novels, plays and short stories,
       * with collections left out.
       *
       * A collection is a container, not a separate work -- counting both it
       * and its contents would tally the same reading twice. Reading all 19
       * collections covers 148 of the 263 main rows, so a naive total reports
       * 7% complete for what is more than half the catalog.
       *
       * Extras and excluded rows are already gone by this point, so this is
       * Christie's own body of work.
       */
      distinctWorks: mainWorks.filter((s) => s.type !== 'Collection'),

      /** Just the collections, for reporting on them separately. */
      collections: mainWorks.filter((s) => s.type === 'Collection'),

      /**
       * Slugs of every distinct work, for progress summaries.
       *
       * Pass to summarize() to get catalog-wide progress. Home and Statistics
       * both do exactly that, so the headline numbers cannot drift apart.
       */
      distinctWorkSlugs: mainWorks.filter((s) => s.type !== 'Collection').map((s) => s.slug),

      getStory(slug) {
        // One slug contains a non-ASCII character, so route params arrive
        // percent-encoded and must be decoded before lookup.
        let decoded = slug
        try {
          decoded = decodeURIComponent(slug)
        } catch {
          // Malformed encoding -- fall through and let the lookup miss.
        }
        return bySlug.get(decoded) ?? null
      },

      // Facets derived from the data, so a re-import that adds a new detective
      // or format shows up in the filters with no code change.
      // Formats a work can be filtered or counted by. Collection is excluded:
      // it is a container rather than a format. In the checklist's flat mode
      // collections are not shown at all, and in grouped mode they stand in for
      // the short stories inside them, so filtering to Short Story already
      // reaches them.
      types: [
        ...new Set(mainWorks.map((s) => s.type).filter(Boolean)),
      ]
        .filter((type) => type !== 'Collection')
        .sort(),
      characters: [...new Set(mainWorks.map((s) => s.character).filter(Boolean))].sort(),
      yearRange: mainWorks.reduce(
        (range, s) =>
          s.year ? { min: Math.min(range.min, s.year), max: Math.max(range.max, s.year) } : range,
        { min: Infinity, max: -Infinity },
      ),

      // Extras facets, kept separate so the two pages never offer each other's
      // filter values. Derived the same way, so a re-import that adds an extra
      // shows up with no code change.
      extrasDistinctWorkSlugs: extras
        .filter((s) => s.type !== 'Collection')
        .map((s) => s.slug),
      extrasCategories: [...new Set(extras.map((s) => s.extrasCategory).filter(Boolean))].sort(),
      extrasCharacters: [...new Set(extras.map((s) => s.character).filter(Boolean))].sort(),
      // Only authors credited on more than one work: a filter with one entry
      // per value filters nothing useful. The twelve Marple contributors each
      // wrote a single story, so they are deliberately absent.
      extrasAuthors: (() => {
        const counts = new Map()
        for (const story of extras) {
          if (!story.otherAuthor) continue
          counts.set(story.otherAuthor, (counts.get(story.otherAuthor) ?? 0) + 1)
        }
        return [...counts.entries()]
          .filter(([, count]) => count > 1)
          .map(([author]) => author)
          .sort()
      })(),
    }
  }, [stories, loading, error, stale])

  return <StoriesContext.Provider value={value}>{children}</StoriesContext.Provider>
}

export function useStories() {
  const context = useContext(StoriesContext)
  if (context === null) {
    throw new Error('useStories must be used inside a <StoriesProvider>')
  }
  return context
}

/** Percent-encode a slug for use in a route. */
export const encodeSlug = (slug) => encodeURIComponent(slug)

/**
 * Cover image at a given width. The stored URL is an imgix base with its query
 * stripped, so any width can be requested on demand.
 */
export function coverAt(story, width) {
  if (!story.cover) return null
  return `${story.cover}?auto=compress,format&fit=clip&q=70&w=${width}`
}
