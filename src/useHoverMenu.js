import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Open/close state for a dropdown that responds to hover as well as click.
 *
 * Spread `hostProps` onto the element wrapping both the toggle and the menu,
 * and pass `show`/`setShow` to a react-bootstrap <Dropdown>. Clicking and
 * keyboard use keep working, because the component stays controlled and
 * onToggle still drives the same state.
 *
 * Two details that matter:
 *
 *   - Closing is delayed. The caret and the menu are separate boxes with a
 *     small gap between them, so a pointer travelling from one to the other
 *     briefly leaves both. Closing immediately on mouseleave would make the
 *     menu impossible to reach.
 *
 *   - Hover is ignored where the device has no hover. On a touchscreen the
 *     synthetic mouseenter that fires on tap would open the menu at the same
 *     moment the tap is handled, so pointer support is checked first.
 */
export function useHoverMenu({ closeDelay = 180 } = {}) {
  const [show, setShow] = useState(false)
  const timer = useRef(null)

  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // Cancel a pending close if the component unmounts mid-timeout.
  useEffect(() => clearTimer, [])

  // Read once and kept in sync, rather than re-queried on every render, so a
  // device that gains or loses a pointer is picked up without a reload.
  const [canHover, setCanHover] = useState(
    () => window.matchMedia?.('(hover: hover)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia?.('(hover: hover)')
    if (!query) return
    const sync = (event) => setCanHover(event.matches)
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const openNow = useCallback(() => {
    clearTimer()
    setShow(true)
  }, [])

  const closeSoon = useCallback(() => {
    clearTimer()
    timer.current = setTimeout(() => setShow(false), closeDelay)
  }, [closeDelay])

  // Hover is gated on the device supporting it; focus is not, so the menu still
  // opens for keyboard users on a touchscreen.
  const onMouseEnter = useCallback(() => {
    if (canHover) openNow()
  }, [canHover, openNow])

  const onMouseLeave = useCallback(() => {
    if (canHover) closeSoon()
  }, [canHover, closeSoon])

  // Any explicit toggle (click, Escape, outside click, selecting an item) wins
  // over a pending hover close, so the two input modes cannot disagree.
  const setShowFromToggle = useCallback((next) => {
    clearTimer()
    setShow(next)
  }, [])

  return {
    show,
    setShow: setShowFromToggle,
    hostProps: {
      onMouseEnter,
      onMouseLeave,
      // Keyboard focus reveals the menu too, and moving focus out of the group
      // dismisses it. React's onFocus/onBlur delegate focusin/focusout, so
      // these fire for descendants -- the caret and the menu items alike.
      onFocus: openNow,
      onBlur: closeSoon,
    },
  }
}
