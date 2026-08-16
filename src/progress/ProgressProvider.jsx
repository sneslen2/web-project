import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { todayLocal } from '../today.js'

/**
 * Per-story reading progress: status, rating, date finished, notes.
 *
 * Two backing stores, chosen by sign-in state:
 *
 *   - Signed out: localStorage only ("guest mode"). Works exactly as before
 *     this file was wired to Supabase.
 *   - Signed in: the `reading_progress` table is the source of truth. Local
 *     state is kept as a fast, offline-tolerant mirror -- reads and renders
 *     never wait on the network, writes go out in the background.
 *
 * The first time a given browser signs in, any guest-mode progress already
 * sitting in localStorage is uploaded for slugs that don't already have a
 * server row (see the migration block in the sign-in effect below). A
 * per-user localStorage flag makes this a one-time merge per browser, so a
 * stale guest copy from months ago can't clobber newer progress made on
 * another device on a later login.
 *
 * The hook's public shape is unchanged from the localStorage-only version, so
 * no page needed editing to pick this up.
 */

const STORAGE_KEY = 'christie-tracker:progress:v1'
const MIGRATED_KEY_PREFIX = 'christie-tracker:progress:migrated:'

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

/** DB row -> app record. */
function fromDbRow(row) {
  return {
    status: row.status,
    rating: row.rating,
    finishedOn: row.finished_on,
    notes: row.notes,
  }
}

/** App record -> DB row. Always a full row: upsert replaces the whole record. */
function toDbRow(slug, record, userId) {
  return {
    user_id: userId,
    story_slug: slug,
    status: record.status,
    rating: record.rating,
    finished_on: record.finishedOn,
    notes: record.notes,
  }
}

export function ProgressProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  // Keyed by story slug.
  const [records, setRecords] = useState(loadInitial)
  // Surfaced for any future UI that wants to show a "couldn't sync" notice.
  // Nothing currently reads this -- writes are optimistic and logged to the
  // console on failure so a flaky connection can't block reading tracking.
  const [syncError, setSyncError] = useState(null)

  // Lets the sign-in effect read "whatever is in state right now" without
  // depending on `records` (which would re-run the effect on every write).
  const recordsRef = useRef(records)
  useEffect(() => {
    recordsRef.current = records
  }, [records])

  // Persist locally on every change, signed in or not. For guests this *is*
  // the store; for signed-in users it's an offline-tolerant mirror of
  // whatever was last confirmed with the server.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (err) {
      console.error('Could not save progress:', err)
    }
  }, [records])

  // On sign-in, pull this user's progress down from Supabase and (once, per
  // browser, per account) upload any guest-mode progress that isn't already
  // represented on the server.
  useEffect(() => {
    // Auth hasn't resolved yet -- don't act on a session we don't know for
    // sure is absent.
    if (authLoading) return
    // Signed out: nothing to sync. Whatever loadInitial() found stays as-is.
    if (!userId) return

    let active = true

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('reading_progress')
          .select('story_slug, status, rating, finished_on, notes')
          .eq('user_id', userId)
        if (error) throw error
        if (!active) return

        const remote = {}
        for (const row of data) remote[row.story_slug] = fromDbRow(row)

        const migratedKey = MIGRATED_KEY_PREFIX + userId
        const alreadyMigrated = localStorage.getItem(migratedKey) === '1'

        if (!alreadyMigrated) {
          // Merge, don't overwrite: only upload guest slugs with no server
          // row yet. A guest copy that predates progress made on another
          // device must never clobber it.
          const guestOnly = Object.entries(recordsRef.current).filter(([slug]) => !(slug in remote))

          if (guestOnly.length > 0) {
            const rows = guestOnly.map(([slug, record]) => toDbRow(slug, record, userId))
            const { error: uploadError } = await supabase.from('reading_progress').upsert(rows)
            if (uploadError) throw uploadError
            for (const [slug, record] of guestOnly) remote[slug] = record
          }

          localStorage.setItem(migratedKey, '1')
        }

        if (active) {
          setRecords(remote)
          setSyncError(null)
        }
      } catch (err) {
        console.error('Could not sync progress with the server:', err)
        // Leave whatever's already in state (guest-loaded or last-known-good)
        // rather than blanking the page over a network hiccup.
        if (active) setSyncError(err.message ?? String(err))
      }
    })()

    return () => {
      active = false
    }
  }, [userId, authLoading])

  const update = useCallback(
    (slug, changes) => {
      setRecords((current) => {
        const merged = { ...emptyRecord, ...current[slug], ...changes }

        if (userId) {
          supabase
            .from('reading_progress')
            .upsert(toDbRow(slug, merged, userId))
            .then(({ error }) => {
              if (error) {
                console.error('Could not save progress to the server:', error.message)
                setSyncError(error.message)
              }
            })
        }

        return { ...current, [slug]: merged }
      })
    },
    [userId],
  )

  /**
   * Apply the same change to many stories in one state update.
   *
   * Used when a collection's status is set: the collection has no stored status
   * of its own, so the write goes to its members. Doing it as a single update
   * avoids the render-per-story a loop of update() calls would cause -- and,
   * signed in, sends one bulk upsert instead of one request per story.
   */
  const updateMany = useCallback(
    (slugs, changes) => {
      if (slugs.length === 0) return

      setRecords((current) => {
        const next = { ...current }
        const merged = []

        for (const slug of slugs) {
          const record = { ...emptyRecord, ...current[slug], ...changes }
          next[slug] = record
          merged.push([slug, record])
        }

        if (userId) {
          supabase
            .from('reading_progress')
            .upsert(merged.map(([slug, record]) => toDbRow(slug, record, userId)))
            .then(({ error }) => {
              if (error) {
                console.error('Could not save progress to the server:', error.message)
                setSyncError(error.message)
              }
            })
        }

        return next
      })
    },
    [userId],
  )

  const value = useMemo(() => {
    const get = (slug) => records[slug] ?? emptyRecord

    return {
      records,
      get,
      update,
      syncError,

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

      /**
       * Clear local state and storage only. Used on sign-out: does NOT touch
       * the server, since the whole point is that the account's progress is
       * still saved there for next time -- only this browser's in-memory/
       * localStorage copy needs to stop showing it (so the next person to use
       * this browser, or this account signed into a different one, doesn't
       * inherit it).
       */
      clearLocal: () => setRecords({}),

      /**
       * Wipe everything, including the server. Used by the statistics page's
       * "Reset all progress" -- signed in, this also deletes every row this
       * user owns, since otherwise the next sign-in would just pull the
       * "reset" progress back down from Supabase, undoing it. Do not call
       * this on sign-out; see clearLocal.
       */
      reset: () => {
        setRecords({})
        if (userId) {
          supabase
            .from('reading_progress')
            .delete()
            .eq('user_id', userId)
            .then(({ error }) => {
              if (error) {
                console.error('Could not clear progress on the server:', error.message)
                setSyncError(error.message)
              }
            })
        }
      },
    }
  }, [records, update, updateMany, userId, syncError])

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (context === null) {
    throw new Error('useProgress must be used inside a <ProgressProvider>')
  }
  return context
}