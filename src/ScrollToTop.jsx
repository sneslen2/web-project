import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Resets scroll position on navigation.
 *
 * React Router does not touch the scroll offset when the route changes, so
 * opening a story from halfway down the checklist would leave the reader
 * stranded in the middle of the detail page. This scrolls to the top whenever
 * the path changes.
 *
 * Two cases are deliberately excluded:
 *
 *   POP      -- back/forward. The reader is returning to a view they have
 *               already scrolled, so their position is restored instead
 *               (see useScrollRestoration below). This is what keeps the
 *               checklist where they left it.
 *   REPLACE  -- the checklist writes its filters to the URL with
 *               `replace: true`, so every keystroke in the search box is a
 *               REPLACE. Scrolling on those would fight the user as they type.
 *
 * HashRouter cannot rely on the browser's native scroll restoration (the path
 * lives in the fragment, which the browser treats as one document), so both
 * directions are handled here.
 */

/** Where each visited location was scrolled to, keyed by location. */
const positions = new Map()

function ScrollToTop() {
  const location = useLocation()
  const navigationType = useNavigationType()

  // Record the offset for the location being left, so a later POP back to it
  // can restore it. Runs on cleanup, when `location` is still the old one.
  useEffect(() => {
    const key = location.key
    return () => {
      positions.set(key, window.scrollY)
    }
  }, [location])

  useEffect(() => {
    if (navigationType === 'POP') {
      const saved = positions.get(location.key) ?? 0
      // 'instant' rather than the default smooth scroll: returning to a list
      // should feel like the page was never left, not like a re-animation.
      window.scrollTo({ top: saved, behavior: 'instant' })

      // The catalog pages render a loading state first, so on the rare POP that
      // lands before the fetch resolves the document is too short and the
      // scroll clamps near the top. Re-apply once the content grows tall
      // enough, then stop watching.
      if (saved > 0 && window.scrollY < saved) {
        const observer = new ResizeObserver(() => {
          if (document.documentElement.scrollHeight >= saved + window.innerHeight) {
            window.scrollTo({ top: saved, behavior: 'instant' })
            observer.disconnect()
          }
        })
        observer.observe(document.body)
        // Stop as soon as the reader takes over, so a late restore can't yank
        // the page out from under them.
        const stop = () => observer.disconnect()
        window.addEventListener('wheel', stop, { once: true, passive: true })
        window.addEventListener('touchstart', stop, { once: true, passive: true })
        window.addEventListener('keydown', stop, { once: true })
        // Give up rather than fight a page that never gets tall again.
        const timer = setTimeout(stop, 2000)
        return () => {
          observer.disconnect()
          clearTimeout(timer)
          window.removeEventListener('wheel', stop)
          window.removeEventListener('touchstart', stop)
          window.removeEventListener('keydown', stop)
        }
      }
      return
    }

    // Filter edits on the checklist are REPLACE navigations; leave them alone.
    if (navigationType === 'REPLACE') return

    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location, navigationType])

  return null
}

export default ScrollToTop
