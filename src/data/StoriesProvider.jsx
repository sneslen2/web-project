import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'

/**
 * Loads the Christie catalog from Supabase once, at app start, and shares it.
 *
 * The catalog is public reference data (see the select-only RLS policy on
 * `stories`), so this works signed out. It's fetched rather than bundled so the
 * database is the single source of truth and the ~640 KB stays out of the build.
 */

const StoriesContext = createContext(null)

/** Sentinel for "no recurring detective" in filter state -- null can't be a checkbox value. */
export const STANDALONE = '__standalone__'

export function StoriesProvider({ children }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      // Default order is publication date -- the catalog's most natural sort and
      // what the checklist opens with.
      const { data, error: queryError } = await supabase
        .from('stories')
        .select(
          'slug, title, type, detective, year, url, cover, synopsis, more_about, trivia, quote, extract_pdf, related',
        )
        .order('year', { ascending: true })

      if (!active) return

      if (queryError) {
        setError(queryError.message)
        setLoading(false)
        return
      }

      // Map DB columns to the shape the components use. `detective` is named
      // that way in Postgres because "character" is a built-in type name there.
      setStories(
        data.map((row) => ({
          slug: row.slug,
          title: row.title,
          type: row.type,
          character: row.detective,
          year: row.year,
          url: row.url,
          cover: row.cover,
          synopsis: row.synopsis,
          moreAbout: row.more_about,
          trivia: row.trivia ?? [],
          quote: row.quote,
          extractPdf: row.extract_pdf,
          related: row.related ?? [],
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => {
    const bySlug = new Map(stories.map((s) => [s.slug, s]))

    return {
      stories,
      loading,
      error,

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
      types: [...new Set(stories.map((s) => s.type).filter(Boolean))].sort(),
      characters: [...new Set(stories.map((s) => s.character).filter(Boolean))].sort(),
      yearRange: stories.reduce(
        (range, s) =>
          s.year ? { min: Math.min(range.min, s.year), max: Math.max(range.max, s.year) } : range,
        { min: Infinity, max: -Infinity },
      ),
    }
  }, [stories, loading, error])

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
