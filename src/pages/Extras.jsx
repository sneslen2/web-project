import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup'
import StoryCard from '../components/StoryCard.jsx'
import { STANDALONE, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'
import { usePersistentState } from '../usePersistentState.js'
import { useSearchParamList, useSearchParamString } from '../useSearchParamState.js'
import Collapse from 'react-bootstrap/Collapse'

/**
 * Extras -- works tracked alongside the main catalog but not part of it.
 *
 * Three groups, all readable and trackable, none of them Christie writing a
 * Christie mystery on her own:
 *
 *   westmacott -- the six romances she published as Mary Westmacott.
 *   detection  -- three Detection Club novels she wrote one chapter of.
 *   inspired   -- novels and stories by other authors: the Osborne
 *                 novelisations, the Hannah and Foley continuations, and the
 *                 twelve-author Marple collection.
 *
 * Deliberately narrower than the checklist. There is no format filter (every
 * extra is a novel, or a short story inside the one Marple collection), and no
 * detective filter unless the data actually offers more than one value.
 */

const SORTS = {
  'year-asc': { label: 'Publication date (oldest first)', compare: (a, b) => (a.year ?? 0) - (b.year ?? 0) },
  'year-desc': { label: 'Publication date (newest first)', compare: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
  'title-asc': { label: 'Title (A–Z)', compare: (a, b) => a.title.localeCompare(b.title) },
  'title-desc': { label: 'Title (Z–A)', compare: (a, b) => b.title.localeCompare(a.title) },
}

/** Labels for the stored category values. */
const CATEGORY_LABELS = {
  westmacott: 'Mary Westmacott',
  detection: 'Detection Club',
  inspired: 'Inspired by',
}

/** Matches the checklist: how short stories inside a collection are presented. */
const SHORT_STORY_MODES = {
  flat: 'Individually',
  grouped: 'Grouped by collection',
}

const MODE_STORAGE_KEY = 'christie-tracker:extras-short-story-mode:v1'
const FILTERS_OPEN_STORAGE_KEY = 'christie-tracker:extras-filters-open:v1'

const COLLECTION = 'Collection'
const SHORT_STORY = 'Short Story'

/** Facet label with its count, so a value's yield is visible before clicking. */
function FacetLabel({ name, count }) {
  return (
    <span className="d-flex justify-content-between gap-2">
      <span>{name}</span>
      <span className="text-muted small">{count}</span>
    </span>
  )
}

function Extras() {
  const {
    extras,
    extrasDistinctWorkSlugs,
    extrasCategories,
    extrasCharacters,
    extrasAuthors,
    membersOfCollection,
    uncollectedStories,
  } = useStories()
  const { get, summarize, collectionStatus } = useProgress()

  // Filters live in the URL, so returning here restores the view. Namespaced
  // separately from the checklist's params -- the two pages share no state.
  const [, setSearchParams] = useSearchParams()
  const [search, setSearch] = useSearchParamString('q', '')
  const [categories, setCategories] = useSearchParamList(
    'category',
    (v) => v in CATEGORY_LABELS,
  )
  const [selectedCharacters, setSelectedCharacters] = useSearchParamList('detective')
  const [authors, setAuthors] = useSearchParamList('author')
  const [statuses, setStatuses] = useSearchParamList(
    'status',
    (v) => Object.values(STATUS).includes(v),
  )
  const [sort, setSort] = useSearchParamString('sort', 'year-asc', (v) => v in SORTS)
  const [shortStoryMode, setShortStoryMode] = usePersistentState(
    MODE_STORAGE_KEY,
    'grouped',
    (v) => v in SHORT_STORY_MODES,
  )
  // Remembered across visits, same as the short-story mode.
  const [filtersOpen, setFiltersOpen] = usePersistentState(FILTERS_OPEN_STORAGE_KEY, true)

  function toggleIn(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  // Only worth showing a control that can change the result. The detective
  // filter is meaningful only if the extras span more than one detective, and
  // the mode toggle only if a collection is actually present.
  const showCharacterFilter = extrasCharacters.length > 1
  const showAuthorFilter = extrasAuthors.length > 0
  const hasCollections = extras.some((s) => s.type === COLLECTION)

  const facets = useMemo(() => {
    const uncollectedSlugs = new Set(uncollectedStories().map((s) => s.slug))
    const needle = search.trim().toLowerCase()

    const characterOf = (story) => story.character ?? STANDALONE

    const statusOf = (story) => {
      const memberSlugs = membersOfCollection(story.slug).map((m) => m.slug)
      return memberSlugs.length ? collectionStatus(memberSlugs) : get(story.slug).status
    }

    // A collection stands in for its member stories in grouped mode, exactly as
    // on the checklist, so the same reading is never listed twice.
    const inMode = (story) => {
      if (!hasCollections) return true
      if (story.type === COLLECTION) return shortStoryMode === 'grouped'
      if (story.type !== SHORT_STORY) return true
      return shortStoryMode === 'flat' || uncollectedSlugs.has(story.slug)
    }

    return {
      characterOf,
      statusOf,
      inMode,
      matchesSearch: (story) => !needle || story.title.toLowerCase().includes(needle),
      matchesCategory: (story) => !categories.length || categories.includes(story.extrasCategory),
      matchesCharacter: (story) =>
        !selectedCharacters.length || selectedCharacters.includes(characterOf(story)),
      // A collection has no single author, so it matches whenever one of its
      // member stories does -- otherwise filtering by author in grouped mode
      // would hide the collection that contains that author's story.
      matchesAuthor: (story) => {
        if (!authors.length) return true
        if (story.otherAuthor && authors.includes(story.otherAuthor)) return true
        return membersOfCollection(story.slug).some(
          (m) => m.otherAuthor && authors.includes(m.otherAuthor),
        )
      },
      matchesStatus: (story) => !statuses.length || statuses.includes(statusOf(story)),
    }
  }, [
    search,
    categories,
    selectedCharacters,
    authors,
    statuses,
    shortStoryMode,
    hasCollections,
    get,
    membersOfCollection,
    collectionStatus,
    uncollectedStories,
  ])

  const visible = useMemo(() => {
    const filtered = extras.filter(
      (story) =>
        facets.matchesSearch(story) &&
        facets.matchesCategory(story) &&
        facets.matchesCharacter(story) &&
        facets.matchesAuthor(story) &&
        facets.matchesStatus(story),
    )
    return [...filtered].sort(SORTS[sort].compare)
  }, [extras, facets, sort])

  const modeFiltered = useMemo(() => visible.filter(facets.inMode), [visible, facets])

  /**
   * How many entries each facet value would yield. Each count applies every
   * other filter, so a number says what ticking that box actually shows.
   */
  const facetCounts = useMemo(() => {
    const tally = (matchesOwnFacet, keyOf) => {
      const counts = new Map()
      for (const story of extras) {
        if (!facets.inMode(story)) continue
        if (!facets.matchesSearch(story)) continue
        if (!matchesOwnFacet(story)) continue
        counts.set(keyOf(story), (counts.get(keyOf(story)) ?? 0) + 1)
      }
      return counts
    }

    return {
      categories: tally(
        (s) =>
          facets.matchesCharacter(s) && facets.matchesAuthor(s) && facets.matchesStatus(s),
        (s) => s.extrasCategory,
      ),
      characters: tally(
        (s) => facets.matchesCategory(s) && facets.matchesAuthor(s) && facets.matchesStatus(s),
        facets.characterOf,
      ),
      authors: tally(
        (s) =>
          facets.matchesCategory(s) && facets.matchesCharacter(s) && facets.matchesStatus(s),
        (s) => s.otherAuthor,
      ),
      statuses: tally(
        (s) => facets.matchesCategory(s) && facets.matchesCharacter(s) && facets.matchesAuthor(s),
        facets.statusOf,
      ),
    }
  }, [extras, facets])

  /**
   * Progress over the extras only. Counts distinct works, so a collection
   * contributes its member stories rather than itself and the total does not
   * lurch when the mode is toggled.
   */
  const progress = useMemo(() => {
    const overall = summarize(extrasDistinctWorkSlugs)

    const filteredSlugs = new Set()
    for (const story of modeFiltered) {
      if (story.type === COLLECTION) {
        for (const member of membersOfCollection(story.slug)) filteredSlugs.add(member.slug)
      } else {
        filteredSlugs.add(story.slug)
      }
    }
    const filtered = summarize([...filteredSlugs])

    return {
      overall,
      filtered,
      showFiltered: filtered.total > 0 && filtered.total !== overall.total,
    }
  }, [summarize, extrasDistinctWorkSlugs, modeFiltered, membersOfCollection])

  const activeFilters =
    categories.length +
    selectedCharacters.length +
    authors.length +
    statuses.length +
    (search ? 1 : 0)

  function clearFilters() {
    // One atomic setSearchParams() call, not five sequential ones -- see the
    // matching comment in Checklist.jsx's clearFilters for why calling each
    // field's own setter in sequence would silently leave four of the five
    // filters still applied.
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete('q')
        params.delete('category')
        params.delete('detective')
        params.delete('author')
        params.delete('status')
        return params
      },
      { replace: true },
    )
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="mb-0">Extras</h1>
        <Badge bg="secondary">{progress.overall.total} works</Badge>
      </div>

      <p className="text-muted">
        Works tracked alongside the main catalog but kept out of it: the romances Christie published
        as Mary Westmacott, the Detection Club novels she contributed a chapter to, and the
        novelisations and continuation novels written by other authors. None of these count toward
        the checklist or statistics.
      </p>

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-baseline small mb-1">
            <span>
              {progress.overall.read} of {progress.overall.total} read
            </span>
            <span className="text-muted">{progress.overall.percentRead}%</span>
          </div>
          <ProgressBar now={progress.overall.percentRead} variant="success" />
          {progress.showFiltered && (
            <>
              <div className="d-flex justify-content-between align-items-baseline small mb-1 mt-3">
                <span className="text-muted">
                  In this filter: {progress.filtered.read} of {progress.filtered.total}
                </span>
                <span className="text-muted">{progress.filtered.percentRead}%</span>
              </div>
              <ProgressBar now={progress.filtered.percentRead} variant="warning" />
            </>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Header
          as="button"
          type="button"
          className="ch-filter-toggle"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="extras-filters-body"
        >
          <span className="h6 mb-0">Filters</span>
          <span className={`ch-nav-caret${filtersOpen ? ' open' : ''}`} aria-hidden="true" />
        </Card.Header>
        <Collapse in={filtersOpen}>
          <div id="extras-filters-body">
        <Card.Body>
          <Row className="g-3">
            <Col md={6} lg={4}>
              <Form.Label htmlFor="extras-search">Search titles</Form.Label>
              <Form.Control
                id="extras-search"
                type="search"
                value={search}
                placeholder="Title contains…"
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col md={6} lg={4}>
              <Form.Label htmlFor="extras-sort">Sort by</Form.Label>
              <Form.Select
                id="extras-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {Object.entries(SORTS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            {/* Only shown when a collection is present; without one there is
                nothing to group. */}
            {hasCollections && (
              <Col md={6} lg={4}>
                <Form.Label>Short stories</Form.Label>
                <ToggleButtonGroup
                  type="radio"
                  name="extras-short-story-mode"
                  value={shortStoryMode}
                  onChange={setShortStoryMode}
                  className="d-flex"
                >
                  {Object.entries(SHORT_STORY_MODES).map(([key, label]) => (
                    <ToggleButton
                      key={key}
                      id={`extras-mode-${key}`}
                      value={key}
                      variant="outline-secondary"
                      size="sm"
                    >
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Col>
            )}
          </Row>

          <Row className="g-3 mt-1">
            <Col md={6} lg={3}>
              <fieldset>
                <legend className="form-label fs-6">Category</legend>
                {extrasCategories.map((category) => (
                  <Form.Check
                    key={category}
                    type="checkbox"
                    id={`extras-category-${category}`}
                    label={
                      <FacetLabel
                        name={CATEGORY_LABELS[category] ?? category}
                        count={facetCounts.categories.get(category) ?? 0}
                      />
                    }
                    checked={categories.includes(category)}
                    onChange={() => toggleIn(categories, setCategories, category)}
                  />
                ))}
              </fieldset>
            </Col>

            {showAuthorFilter && (
              <Col md={6} lg={3}>
                <fieldset>
                  <legend className="form-label fs-6">Author</legend>
                  {extrasAuthors.map((author) => (
                    <Form.Check
                      key={author}
                      type="checkbox"
                      id={`extras-author-${author.replace(/\W+/g, '-')}`}
                      label={
                        <FacetLabel
                          name={author}
                          count={facetCounts.authors.get(author) ?? 0}
                        />
                      }
                      checked={authors.includes(author)}
                      onChange={() => toggleIn(authors, setAuthors, author)}
                    />
                  ))}
                </fieldset>
              </Col>
            )}

            {showCharacterFilter && (
              <Col md={6} lg={3}>
                <fieldset>
                  <legend className="form-label fs-6">Detective</legend>
                  {extrasCharacters.map((character) => (
                    <Form.Check
                      key={character}
                      type="checkbox"
                      id={`extras-detective-${character.replace(/\W+/g, '-')}`}
                      label={
                        <FacetLabel
                          name={character}
                          count={facetCounts.characters.get(character) ?? 0}
                        />
                      }
                      checked={selectedCharacters.includes(character)}
                      onChange={() =>
                        toggleIn(selectedCharacters, setSelectedCharacters, character)
                      }
                    />
                  ))}
                  <Form.Check
                    type="checkbox"
                    id="extras-detective-standalone"
                    label={
                      <FacetLabel
                        name="Standalone"
                        count={facetCounts.characters.get(STANDALONE) ?? 0}
                      />
                    }
                    checked={selectedCharacters.includes(STANDALONE)}
                    onChange={() =>
                      toggleIn(selectedCharacters, setSelectedCharacters, STANDALONE)
                    }
                  />
                </fieldset>
              </Col>
            )}

            <Col md={6} lg={3}>
              <fieldset>
                <legend className="form-label fs-6">Status</legend>
                {Object.values(STATUS).map((status) => (
                  <Form.Check
                    key={status}
                    type="checkbox"
                    id={`extras-status-${status}`}
                    label={
                      <FacetLabel
                        name={status[0].toUpperCase() + status.slice(1)}
                        count={facetCounts.statuses.get(status) ?? 0}
                      />
                    }
                    checked={statuses.includes(status)}
                    onChange={() => toggleIn(statuses, setStatuses, status)}
                  />
                ))}
              </fieldset>
            </Col>
          </Row>

          {activeFilters > 0 && (
            <div className="mt-3">
              <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </Card.Body>
          </div>
        </Collapse>
      </Card>

      {modeFiltered.length === 0 ? (
        <p className="text-muted">No extras match these filters.</p>
      ) : (
        <Row xs={1} md={2} xl={3} className="g-3">
          {modeFiltered.map((story) => (
            <Col key={story.slug}>
              <StoryCard story={story} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}

export default Extras
