import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * useState backed by a URL search param.
 *
 * Filter state lives in the URL so that leaving the checklist and coming back
 * -- via the browser Back button or the story page's back control -- restores
 * the view the user had set up, and so a filtered view can be linked or
 * bookmarked. Defaults are omitted from the querystring, which keeps the
 * unfiltered URL clean as `/checklist`.
 *
 * History is replaced rather than pushed: adjusting a filter is refining one
 * view, not navigating, so Back should leave the checklist entirely instead of
 * stepping back through every keystroke and checkbox.
 */

/** Joins list values for memo keying. Not a space: the facet values contain
 *  spaces themselves ("Miss Marple", "Short Story"), so a space would make
 *  ["Miss", "Marple"] and ["Miss Marple"] collide. */
const SEP = ''

/** A single string value, e.g. ?sort=title-asc */
export function useSearchParamString(key, defaultValue, isValid = () => true) {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(key)
  const value = raw !== null && isValid(raw) ? raw : defaultValue

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          const resolved = typeof next === 'function' ? next(params.get(key) ?? defaultValue) : next
          // Defaults and empties are omitted rather than written, so a cleared
          // view reads as `/checklist` instead of `/checklist?q=&sort=year-asc`.
          if (resolved === defaultValue || resolved === '' || resolved == null) {
            params.delete(key)
          } else {
            params.set(key, resolved)
          }
          return params
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}

/**
 * A repeated value, e.g. ?type=Novel&type=Play, exposed as an array.
 *
 * An empty array means "all" throughout the checklist, and is represented by
 * the param being absent.
 */
export function useSearchParamList(key, isValid = () => true) {
  const [searchParams, setSearchParams] = useSearchParams()

  // getAll returns a fresh array every render, so memoize on the contents to
  // keep the reference stable -- callers pass this straight into useMemo
  // dependency arrays, and an unstable reference would recompute the whole
  // filter pipeline on every render.
  const joined = searchParams.getAll(key).join(SEP)
  const value = useMemo(
    () => joined.split(SEP).filter((v) => v !== '' && isValid(v)),
    // isValid is a literal at every call site; depending on its identity would
    // defeat the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [joined],
  )

  const setValue = useCallback(
    (next) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          const resolved = typeof next === 'function' ? next(params.getAll(key)) : next
          params.delete(key)
          for (const item of resolved) params.append(key, item)
          return params
        },
        { replace: true },
      )
    },
    [key, setSearchParams],
  )

  return [value, setValue]
}
