import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Per-story reading progress: status, rating, date finished, notes.
 *
 * THIS IS THE SUPABASE SEAM. Everything is currently kept in localStorage so
 * the app is fully usable before the database is wired up. To move it to
 * Supabase, replace the load/persist internals below with queries against a
 * `reading_progress` table (user_id, story_slug, status, rating, finished_on,
 * notes) -- the hook's public shape stays identical, so no page needs editing.
 */

const STORAGE_KEY = 'christie-tracker:progress:v1'

export const STATUS = {
  UNREAD: 'unread',
  READING: 'reading',
  READ: 'read',
}

export const STATUS_LABELS = {
  [STATUS.UNREAD]: 'Unread',
  [STATUS.READING]: 'Reading',
  [STATUS.READ]: 'Read',
}

/** The shape of a progress record. Absent from the map == untouched == unread. */
const emptyRecord = {
  status: STATUS.UNREAD,
  rating: null, // 1-5, or null for unrated
  finishedOn: null, // ISO date string (YYYY-MM-DD)
  notes: '',
}

const ProgressContext = createContext(null)

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch (err) {
    // Corrupt JSON or a browser blocking storage -- start clean rather than
    // crashing the whole app on mount.
    console.error('Could not read saved progress:', err)
    return {}
  }
}

export function ProgressProvider({ children }) {
  // Keyed by story slug.
  const [records, setRecords] = useState(loadInitial)

  // Persist on every change. Cheap at this size (302 stories max).
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (err) {
      console.error('Could not save progress:', err)
    }
  }, [records])

  const update = useCallback((slug, changes) => {
    setRecords((current) => ({
      ...current,
      [slug]: { ...emptyRecord, ...current[slug], ...changes },
    }))
  }, [])

  const value = useMemo(() => {
    const get = (slug) => records[slug] ?? emptyRecord

    return {
      records,
      get,
      update,

      /** Cycle unread -> read -> unread, stamping the finish date. */
      toggleRead(slug) {
        const current = get(slug)
        const nowRead = current.status !== STATUS.READ
        update(slug, {
          status: nowRead ? STATUS.READ : STATUS.UNREAD,
          // Record when it was finished; clear it if un-marking.
          finishedOn: nowRead ? new Date().toISOString().slice(0, 10) : null,
        })
      },

      setStatus: (slug, status) => update(slug, { status }),
      setRating: (slug, rating) => update(slug, { rating }),
      setNotes: (slug, notes) => update(slug, { notes }),

      /** Wipe everything. Used by the statistics page. */
      reset: () => setRecords({}),
    }
  }, [records, update])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === null) {
    throw new Error('useProgress must be used inside a <ProgressProvider>')
  }
  return context
}
