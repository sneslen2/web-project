import { useMemo } from 'react'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup'
import JumpRail from '../components/JumpRail.jsx'
import StoryCard from '../components/StoryCard.jsx'
import { STANDALONE, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'
import { usePersistentState } from '../usePersistentState.js'
import { useSearchParamList, useSearchParamString } from '../useSearchParamState.js'

/**
 * Title with any leading article removed, for sorting and for the A-Z rail.
 *
 * "The Big Four" files under B, as it would on a shelf. Sorting and sectioning
 * must use the same key or the letter headings come out scrambled.
 */
export const sortableTitle = (story) => story.title.replace(/^(The|A|An)\s+/i, '').trim()

const SORTS = {
  'year-asc': { label: 'Publication date (oldest first)', compare: (a, b) => (a.year ?? 0) - (b.year ?? 0) },
  'year-desc': { label: 'Publication date (newest first)', compare: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
  'title-asc': {
    label: 'Title (A–Z)',
    compare: (a, b) => sortableTitle(a).localeCompare(sortableTitle(b)),
  },
  'title-desc': {
    label: 'Title (Z–A)',
    compare: (a, b) => sortableTitle(b).localeCompare(sortableTitle(a)),
  },
}

const GROUP_BY = {
  none: 'No grouping',
  type: 'Format',
  character: 'Detective',
  decade: 'Decade',
}

/**
 * How short stories are presented.
 *
 *   flat     -- every short story is its own entry, as before.
 *   grouped  -- short stories are nested under the collections that include
 *               them. Novels and plays are unaffected either way.
 */
const SHORT_STORY_MODES = {
  flat: 'Individually',
  grouped: 'Grouped by collection',
}

const MODE_STORAGE_KEY = 'christie-tracker:short-story-mode:v1'

const SHORT_STORY = 'Short Story'
const COLLECTION = 'Collection'

/** A labeled completion bar with its count and percentage. */
function ProgressRow({ label, read, total, percent, variant, className = '' }) {
  return (
    <div className={className}>
      <div className="d-flex justify-content-between align-items-baseline small mb-1">
        <span className="fw-semibold">{label}</span>
        <span className="text-muted">
          {read} of {total} read ({percent}%)
        </span>
      </div>
      <ProgressBar
        now={percent}
        variant={variant}
        style={{ height: '0.75rem' }}
        // The count beside the label already says this in text.
        aria-hidden="true"
      />
    </div>
  )
}

/**
 * A filter checkbox label with its match count.
 *
 * A zero count is dimmed rather than hidden: knowing a combination yields
 * nothing is useful, and removing the option would make the list jump around
 * as filters change.
 */
function FacetLabel({ name, count }) {
  return (
    <>
      {name}{' '}
      <span className={count === 0 ? 'text-muted opacity-50' : 'text-muted'}>({count})</span>
    </>
  )
}

function Checklist() {
  const { get, collectionStatus, summarize } = useProgress()
  const {
    stories,
    types,
    characters,
    distinctWorkSlugs,
    membersOfCollection,
    uncollectedStories,
  } = useStories()

  // Filters live in the URL, so navigating away and coming back -- with the
  // browser Back button or the story page's back control -- restores the view
  // the user had set up, and a filtered view can be linked or bookmarked.
  const [search, setSearch] = useSearchParamString('q', '')
  // Selected filter values. Named distinctly from the `types`/`characters`
  // facet lists above, which are the full sets available.
  const [selectedTypes, setSelectedTypes] = useSearchParamList('type') // empty == all
  const [selectedCharacters, setSelectedCharacters] = useSearchParamList('detective') // empty == all
  const [statuses, setStatuses] = useSearchParamList(
    'status',
    (v) => Object.values(STATUS).includes(v),
  ) // empty == all
  const [sort, setSort] = useSearchParamString('sort', 'year-asc', (v) => v in SORTS)
  const [groupBy, setGroupBy] = useSearchParamString('group', 'none', (v) => v in GROUP_BY)
  // Remembered across visits -- this is a way of reading the catalog, not a
  // transient filter, so re-picking it every time would be tedious.
  const [shortStoryMode, setShortStoryMode] = usePersistentState(
    MODE_STORAGE_KEY,
    'flat',
    (v) => v in SHORT_STORY_MODES,
  )

  function toggleIn(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  /**
   * The facet value each story counts as, and the per-facet predicates.
   *
   * Defined once and shared by the visible list and the facet counts, so a
   * count can never describe something different from what ticking the box
   * actually does.
   */
  const facets = useMemo(() => {
    const uncollectedSlugs = new Set(uncollectedStories().map((s) => s.slug))
    const needle = search.trim().toLowerCase()

    // Collection is not offered as a format. A collection holds short stories
    // and stands in for them in grouped mode, so it counts as Short Story --
    // otherwise picking Short Story there would empty the list.
    const typeOf = (story) => (story.type === COLLECTION ? SHORT_STORY : story.type)

    // STANDALONE is a sentinel: the data uses null for "no detective".
    const characterOf = (story) => story.character ?? STANDALONE

    // A collection stores no status of its own -- it is derived from its
    // members, so reading the stored value would never match one.
    const statusOf = (story) => {
      const memberSlugs = membersOfCollection(story.slug).map((m) => m.slug)
      return memberSlugs.length ? collectionStatus(memberSlugs) : get(story.slug).status
    }

    /** Which entries this mode represents a short story with. See modeFiltered. */
    const inMode = (story) => {
      if (story.type === COLLECTION) return shortStoryMode === 'grouped'
      if (story.type !== SHORT_STORY) return true
      return shortStoryMode === 'flat' || uncollectedSlugs.has(story.slug)
    }

    return {
      typeOf,
      characterOf,
      statusOf,
      inMode,
      matchesSearch: (story) => !needle || story.title.toLowerCase().includes(needle),
      matchesType: (story) => !selectedTypes.length || selectedTypes.includes(typeOf(story)),
      matchesCharacter: (story) =>
        !selectedCharacters.length || selectedCharacters.includes(characterOf(story)),
      matchesStatus: (story) => !statuses.length || statuses.includes(statusOf(story)),
    }
  }, [
    search,
    selectedTypes,
    selectedCharacters,
    statuses,
    shortStoryMode,
    get,
    membersOfCollection,
    collectionStatus,
    uncollectedStories,
  ])

  const visible = useMemo(() => {
    const filtered = stories.filter(
      (story) =>
        facets.matchesSearch(story) &&
        facets.matchesType(story) &&
        facets.matchesCharacter(story) &&
        facets.matchesStatus(story),
    )

    return [...filtered].sort(SORTS[sort].compare)
    // `stories` arrives asynchronously, so it must be a dependency -- otherwise
    // the list stays empty after the fetch resolves.
  }, [stories, facets, sort])

  /**
   * The mode decides which kind of entry represents a short story, and nothing
   * else. Novels and plays always show; every entry is the same kind of card.
   *
   *   flat     -- short stories individually; collections are hidden, since
   *               showing a collection beside its own contents would list the
   *               same reading twice.
   *   grouped  -- collections instead, each with a progress indicator. The full
   *               per-story checklist lives on the collection's page.
   *
   * The two short stories in no collection are shown in both modes: no
   * collection would carry them, so hiding them would make them unreachable.
   */
  const modeFiltered = useMemo(() => visible.filter(facets.inMode), [visible, facets])

  /**
   * How many entries each facet value would yield.
   *
   * Each count applies every *other* filter plus the value being counted, so a
   * number says exactly what ticking that box would show -- including (0) for a
   * combination with no results, which saves a click to find a dead end. Counts
   * respect the short-story mode, so Short Story reads 166 individually and 22
   * grouped by collection.
   */
  const facetCounts = useMemo(() => {
    const tally = (matchesOwnFacet, keyOf) => {
      const counts = new Map()

      for (const story of stories) {
        if (!facets.inMode(story)) continue
        if (!facets.matchesSearch(story)) continue
        if (!matchesOwnFacet(story)) continue

        const key = keyOf(story)
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      return counts
    }

    return {
      // Each facet's own selection is excluded from its own counts; the other
      // two still apply.
      types: tally(
        (s) => facets.matchesCharacter(s) && facets.matchesStatus(s),
        facets.typeOf,
      ),
      characters: tally(
        (s) => facets.matchesType(s) && facets.matchesStatus(s),
        facets.characterOf,
      ),
      statuses: tally(
        (s) => facets.matchesType(s) && facets.matchesCharacter(s),
        facets.statusOf,
      ),
    }
  }, [stories, facets])

  /**
   * Progress over the whole catalog, and over the current filter when one is
   * applied.
   *
   * Both count distinct works -- novels, plays and short stories -- so the
   * number matches the home and statistics pages and does not lurch when the
   * short-story mode is toggled. In grouped mode a collection card stands for
   * its member stories, so it contributes those rather than itself; that is
   * what keeps 47/282 reading the same in both modes.
   */
  const progress = useMemo(() => {
    const overall = summarize(distinctWorkSlugs)

    // Expand each visible card to the works it represents, de-duplicated: a
    // story in two filtered-in collections must not be counted twice.
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
      // Only worth a second bar when it says something different.
      showFiltered: filtered.total > 0 && filtered.total !== overall.total,
    }
  }, [summarize, distinctWorkSlugs, modeFiltered, membersOfCollection])

  /**
   * The list broken into sections, as [label, stories] pairs.
   *
   * An explicit "Group by" wins. With no grouping, sections are derived from
   * the active sort so the jump rail always has somewhere to go: decades when
   * sorted by year, first letters when sorted by title. Those implicit
   * sections follow the existing order rather than reordering anything, so the
   * list looks the same as before -- just with headings in it.
   */
  const grouped = useMemo(() => {
    const keyOf = (story) => {
      if (groupBy === 'type') return story.type ?? 'Unknown'
      if (groupBy === 'character') return story.character ?? 'Standalone'
      if (groupBy === 'decade') return story.year ? `${Math.floor(story.year / 10) * 10}s` : 'Unknown'

      // groupBy === 'none': follow the sort.
      if (sort.startsWith('year')) {
        return story.year ? `${Math.floor(story.year / 10) * 10}s` : 'Unknown'
      }
      // Same key the title sort uses, so the letter headings run in order.
      const letter = sortableTitle(story)[0]
      return letter ? letter.toUpperCase() : '#'
    }

    const buckets = new Map()
    for (const story of modeFiltered) {
      const key = keyOf(story)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(story)
    }

    const entries = [...buckets.entries()]

    // Explicit grouping sorts its own headings; implicit sections are already
    // in the right order because the list was sorted before bucketing.
    if (groupBy === 'none') return entries

    return entries.sort((a, b) =>
      groupBy === 'decade' ? parseInt(a[0], 10) - parseInt(b[0], 10) : a[0].localeCompare(b[0]),
    )
  }, [modeFiltered, groupBy, sort])

  /** Rail entries, derived from whatever sections the list ended up with. */
  const sections = useMemo(
    () =>
      grouped
        .filter(([label]) => label)
        .map(([label, group]) => ({
          id: `section-${label.replace(/\W+/g, '-').toLowerCase()}`,
          label,
          count: group.length,
        })),
    [grouped],
  )

  const activeFilters =
    selectedTypes.length + selectedCharacters.length + statuses.length + (search ? 1 : 0)

  function clearFilters() {
    setSearch('')
    setSelectedTypes([])
    setSelectedCharacters([])
    setStatuses([])
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="mb-0">Checklist</h1>
        <span className="text-muted">
          Showing <strong>{modeFiltered.length}</strong> {modeFiltered.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <Card className="mb-4">
        <Card.Body className="py-3">
          <ProgressRow
            label="Whole catalog"
            read={progress.overall.read}
            total={progress.overall.total}
            percent={progress.overall.percentRead}
          />

          {/* A second bar only when the filter narrows things -- otherwise it
              would restate the line above. */}
          {progress.showFiltered && (
            <ProgressRow
              label="These filters"
              read={progress.filtered.read}
              total={progress.filtered.total}
              percent={progress.filtered.percentRead}
              variant="info"
              className="mt-3"
            />
          )}
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <div className="mb-3">
            <Form.Label as="div" className="mb-1">
              Short stories
            </Form.Label>
            <ToggleButtonGroup
              type="radio"
              name="short-story-mode"
              value={shortStoryMode}
              onChange={setShortStoryMode}
              size="sm"
            >
              {Object.entries(SHORT_STORY_MODES).map(([key, label]) => (
                <ToggleButton
                  key={key}
                  id={`short-story-mode-${key}`}
                  value={key}
                  variant="outline-primary"
                >
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Form.Text muted className="d-block">
              {shortStoryMode === 'grouped'
                ? 'Short stories are represented by the collections that include them; open a collection to check off its stories. Novels and plays are unaffected.'
                : 'Every short story is listed on its own. Collections are hidden.'}
            </Form.Text>
          </div>

          <Row className="g-3">
            <Col md={6} lg={4}>
              <Form.Label htmlFor="story-search">Search by title</Form.Label>
              <Form.Control
                id="story-search"
                type="search"
                placeholder="e.g. Orient Express"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>

            <Col md={6} lg={4}>
              <Form.Label htmlFor="story-sort">Sort by</Form.Label>
              <Form.Select id="story-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                {Object.entries(SORTS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={6} lg={4}>
              <Form.Label htmlFor="story-group">Group by</Form.Label>
              <Form.Select
                id="story-group"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                {Object.entries(GROUP_BY).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          <hr />

          <Row className="g-3">
            <Col md={4}>
              <fieldset>
                <legend className="fs-6 fw-semibold">Format</legend>
                {types.map((type) => (
                  <Form.Check
                    key={type}
                    type="checkbox"
                    id={`type-${type}`}
                    label={<FacetLabel name={type} count={facetCounts.types.get(type) ?? 0} />}
                    checked={selectedTypes.includes(type)}
                    onChange={() => toggleIn(selectedTypes, setSelectedTypes, type)}
                  />
                ))}
              </fieldset>
            </Col>

            <Col md={4}>
              <fieldset>
                <legend className="fs-6 fw-semibold">Detective</legend>
                {characters.map((character) => (
                  <Form.Check
                    key={character}
                    type="checkbox"
                    id={`char-${character}`}
                    label={
                      <FacetLabel
                        name={character}
                        count={facetCounts.characters.get(character) ?? 0}
                      />
                    }
                    checked={selectedCharacters.includes(character)}
                    onChange={() => toggleIn(selectedCharacters, setSelectedCharacters, character)}
                  />
                ))}
                <Form.Check
                  type="checkbox"
                  id="char-standalone"
                  label={
                    <FacetLabel
                      name="Standalone"
                      count={facetCounts.characters.get(STANDALONE) ?? 0}
                    />
                  }
                  checked={selectedCharacters.includes(STANDALONE)}
                  onChange={() => toggleIn(selectedCharacters, setSelectedCharacters, STANDALONE)}
                />
              </fieldset>
            </Col>

            <Col md={4}>
              <fieldset>
                <legend className="fs-6 fw-semibold">Reading status</legend>
                {Object.values(STATUS).map((status) => (
                  <Form.Check
                    key={status}
                    type="checkbox"
                    id={`status-${status}`}
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
                Clear filters <Badge bg="secondary">{activeFilters}</Badge>
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {modeFiltered.length === 0 ? (
        <Card body className="text-center text-muted">
          No stories match these filters.
        </Card>
      ) : (
        <div className="ch-list-layout">
          <div className="ch-list-main">
            {grouped.map(([heading, group]) => {
              const id = heading
                ? `section-${heading.replace(/\W+/g, '-').toLowerCase()}`
                : undefined

              return (
                <section key={heading || 'all'} className="mb-4">
                  {heading && (
                    <h2 id={id} className="ch-section-heading mb-3">
                      {heading}{' '}
                      <span className="text-muted fw-normal fs-6">({group.length})</span>
                    </h2>
                  )}
                  <Row xs={1} md={2} xl={3} className="g-3">
                    {group.map((story) => (
                      <Col key={story.slug}>
                        <StoryCard story={story} />
                      </Col>
                    ))}
                  </Row>
                </section>
              )
            })}
          </div>

          {/* Hidden on narrow screens, where a sticky side rail would eat the
              width the cards need. */}
          <aside className="ch-list-rail d-none d-lg-block">
            <JumpRail sections={sections} />
          </aside>
        </div>
      )}
    </>
  )
}

export default Checklist
