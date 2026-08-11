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

/**
 * Today as YYYY-MM-DD in the reader's own timezone.
 *
 * Not toISOString().slice(0, 10) -- that converts to UTC first, so a reader in
 * UTC+9 finishing a book on the morning of the 11th would have it stamped the
 * 10th. 'en-CA' is the locale whose short date format is already ISO-shaped.
 */
export const todayLocal = () => new Date().toLocaleDateString('en-CA')

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

  /**
   * Apply the same change to many stories in one state update.
   *
   * Used when a collection's status is set: the collection has no stored status
   * of its own, so the write goes to its members. Doing it as a single update
   * avoids the render-per-story a loop of update() calls would cause.
   */
  const updateMany = useCallback((slugs, changes) => {
    if (slugs.length === 0) return

    setRecords((current) => {
      const next = { ...current }
      for (const slug of slugs) {
        next[slug] = { ...emptyRecord, ...current[slug], ...changes }
      }
      return next
    })
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
          finishedOn: nowRead ? todayLocal() : null,
        })
      },

      setStatus: (slug, status) => update(slug, { status }),
      setRating: (slug, rating) => update(slug, { rating }),
      setNotes: (slug, notes) => update(slug, { notes }),

      /**
       * Set or clear the finish date. Pass '' or null to clear.
       *
       * Recording a finish date implies the story is read, so this promotes an
       * unread story rather than leaving the contradictory pair "Unread, but
       * finished on the 3rd". Clearing the date leaves the status alone --
       * "read, but I don't recall when" is a perfectly ordinary state.
       */
      setFinishedOn(slug, finishedOn) {
        const value = finishedOn || null
        const shouldPromote = value !== null && get(slug).status !== STATUS.READ

        update(slug, shouldPromote ? { finishedOn: value, status: STATUS.READ } : { finishedOn: value })
      },

      /**
       * A collection's status, derived from its members.
       *
       * Collections store no status of their own -- it is always computed, so
       * the collection and its contents can never disagree. Unticking one
       * member drops the collection out of Read immediately.
       *
       * An empty collection reports Unread: there is nothing to have read.
       */
      collectionStatus(memberSlugs) {
        if (memberSlugs.length === 0) return STATUS.UNREAD

        const statuses = memberSlugs.map((slug) => get(slug).status)
        if (statuses.every((s) => s === STATUS.READ)) return STATUS.READ
        if (statuses.some((s) => s !== STATUS.UNREAD)) return STATUS.READING
        return STATUS.UNREAD
      },

      /**
       * What marking a collection unread would destroy.
       *
       * Clearing a collection is the one lossy direction: finish dates cannot
       * be recovered, and a shared story may have been finished via a different
       * collection entirely. Callers use this to confirm before writing.
       */
      previewCollectionClear(memberSlugs) {
        const affected = memberSlugs.filter((slug) => get(slug).status !== STATUS.UNREAD)
        return {
          affected: affected.length,
          datedCount: affected.filter((slug) => get(slug).finishedOn).length,
          ratedCount: affected.filter((slug) => get(slug).rating != null).length,
        }
      },

      /**
       * Set a collection's status by writing through to every member.
       *
       * Read stamps today's finish date on members that were not already read,
       * preserving the original date on ones that were. Unread clears status
       * and finish date -- call previewCollectionClear first and confirm, since
       * that direction discards data. Ratings and notes are never touched by
       * either direction; they are judgments about the story, not progress.
       *
       * Reading is deliberately not written through -- "part-way through a
       * collection" is what the members already express, and forcing them all
       * to Reading would destroy per-story progress.
       *
       * A story in several collections is one record, so this correctly credits
       * it everywhere it appears.
       */
      setCollectionStatus(memberSlugs, status) {
        if (status === STATUS.READ) {
          const today = todayLocal()
          // Only stamp stories that were not already read, so an existing
          // finish date survives.
          const unfinished = memberSlugs.filter((slug) => get(slug).status !== STATUS.READ)
          updateMany(unfinished, { status: STATUS.READ, finishedOn: today })
          return
        }

        if (status === STATUS.UNREAD) {
          updateMany(memberSlugs, { status: STATUS.UNREAD, finishedOn: null })
        }
      },

      /**
       * Reading progress across a set of stories, for collection roll-ups.
       *
       * Purely derived -- it never writes. Because records are keyed by slug, a
       * story in several collections contributes the same progress to each.
       */
      summarize(slugs) {
        const total = slugs.length
        const read = slugs.filter((s) => get(s).status === STATUS.READ).length
        const reading = slugs.filter((s) => get(s).status === STATUS.READING).length
        const rated = slugs.map((s) => get(s).rating).filter((r) => r != null)

        return {
          total,
          read,
          reading,
          unread: total - read - reading,
          percentRead: total ? Math.round((read / total) * 100) : 0,
          // Only over the stories actually rated; null when none are.
          averageRating: rated.length
            ? Math.round((rated.reduce((sum, r) => sum + r, 0) / rated.length) * 10) / 10
            : null,
        }
      },

      /** Wipe everything. Used by the statistics page. */
      reset: () => setRecords({}),
    }
  }, [records, update, updateMany])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === null) {
    throw new Error('useProgress must be used inside a <ProgressProvider>')
  }
  return context
}
