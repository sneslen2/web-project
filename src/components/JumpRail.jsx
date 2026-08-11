import { useEffect, useState } from 'react'

/**
 * Sticky quick-jump rail for the checklist.
 *
 * `sections` is [{ id, label, count }] in the order they appear on the page.
 * Each id must match the DOM id of that section's heading.
 *
 * Highlights whichever section is currently in view. Uses scroll position
 * rather than IntersectionObserver: sections here are tall and often several
 * are on screen at once, and "the last heading you scrolled past" is the answer
 * a reader expects, which observers make surprisingly awkward to express.
 */
function JumpRail({ sections }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? null)

  useEffect(() => {
    if (sections.length === 0) return

    function syncActive() {
      // Matches the sticky navbar allowance in .ch-section-heading.
      const threshold = 90
      let current = sections[0].id

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (!element) continue
        if (element.getBoundingClientRect().top <= threshold) current = section.id
      }

      setActiveId(current)
    }

    syncActive()
    window.addEventListener('scroll', syncActive, { passive: true })
    window.addEventListener('resize', syncActive)
    return () => {
      window.removeEventListener('scroll', syncActive)
      window.removeEventListener('resize', syncActive)
    }
  }, [sections])

  // One section is the whole list; a rail to it would do nothing.
  if (sections.length < 2) return null

  return (
    <nav className="ch-rail" aria-label="Jump to section">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          className={`ch-rail-tick ${section.id === activeId ? 'on' : ''}`}
          aria-current={section.id === activeId ? 'true' : undefined}
          onClick={() => {
            // scroll-margin-top on the heading handles the navbar offset, so a
            // plain scrollIntoView lands in the right place.
            document
              .getElementById(section.id)
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {section.label}
          <small>{section.count}</small>
        </button>
      ))}
    </nav>
  )
}

export default JumpRail
