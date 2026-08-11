import { useEffect, useState } from 'react'

/**
 * useState that survives a reload.
 *
 * Used for view preferences (the checklist's short-story mode), not for user
 * data -- reading progress has its own provider. Falls back to the initial
 * value whenever storage is unreadable, so a browser blocking localStorage
 * degrades to a normal useState rather than crashing the page.
 */
export function usePersistentState(key, initialValue, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initialValue

      const parsed = JSON.parse(raw)
      // A stored value from an older build may no longer be a valid option.
      return isValid(parsed) ? parsed : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Full or disabled storage -- the preference just won't persist.
    }
  }, [key, value])

  return [value, setValue]
}
