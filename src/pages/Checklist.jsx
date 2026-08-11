import { useMemo, useState } from 'react'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup'
import CollectionGroup from '../components/CollectionGroup.jsx'
import StoryCard from '../components/StoryCard.jsx'
import { STANDALONE, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'
import { usePersistentState } from '../usePersistentState.js'

const SORTS = {
  'year-asc': { label: 'Publication date (oldest first)', compare: (a, b) => (a.year ?? 0) - (b.year ?? 0) },
  'year-desc': { label: 'Publication date (newest first)', compare: (a, b) => (b.year ?? 0) - (a.year ?? 0) },
  'title-asc': { label: 'Title (A–Z)', compare: (a, b) => a.title.localeCompare(b.title) },
  'title-desc': { label: 'Title (Z–A)', compare: (a, b) => b.title.localeCompare(a.title) },
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

function Checklist() {
  const { get, collectionStatus } = useProgress()
  const {
    stories,
    types,
    characters,
    membersOfCollection,
    collectionsContaining,
    uncollectedStories,
  } = useStories()

  const [search, setSearch] = useState('')
  // Selected filter values. Named distinctly from the `types`/`characters`
  // facet lists above, which are the full sets available.
  const [selectedTypes, setSelectedTypes] = useState([]) // empty == all
  const [selectedCharacters, setSelectedCharacters] = useState([]) // empty == all
  const [statuses, setStatuses] = useState([]) // empty == all
  const [sort, setSort] = useState('year-asc')
  const [groupBy, setGroupBy] = useState('none')
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

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()

    const filtered = stories.filter((story) => {
      if (needle && !story.title.toLowerCase().includes(needle)) return false
      if (selectedTypes.length && !selectedTypes.includes(story.type)) return false

      if (selectedCharacters.length) {
        // STANDALONE is a sentinel: the data uses null for "no detective".
        const key = story.character ?? STANDALONE
        if (!selectedCharacters.includes(key)) return false
      }

      if (statuses.length) {
        // A collection stores no status of its own -- it is derived from its
        // members, so filtering on the stored value would never match one.
        const memberSlugs = membersOfCollection(story.slug).map((m) => m.slug)
        const status = memberSlugs.length
          ? collectionStatus(memberSlugs)
          : get(story.slug).status

        if (!statuses.includes(status)) return false
      }

      return true
    })

    return [...filtered].sort(SORTS[sort].compare)
    // `stories` arrives asynchronously, so it must be a dependency -- otherwise
    // the list stays empty after the fetch resolves.
  }, [
    stories,
    search,
    selectedTypes,
    selectedCharacters,
    statuses,
    sort,
    get,
    membersOfCollection,
    collectionStatus,
  ])

  /**
   * Grouped mode: collections carry their member stories, and short stories
   * are removed from the top-level list so they are not shown twice.
   *
   * A story in several collections appears under each of them. That is
   * deliberate -- it reflects how the books are actually published, and since
   * progress is keyed by slug, ticking it in one place updates every other.
   *
   * A collection is shown when it OR any of its members matches the filters.
   *
   * Testing the collection's own values alone would be wrong on both axes. The
   * anthologies are mixed, so Midsummer Mysteries is tagged Hercule Poirot but
   * holds Marple, Quin, Parker Pyne and Tommy & Tuppence stories -- filtering
   * on the tag would silently hide every one of them. Likewise a filter on
   * "Read" surfaces a part-finished collection, because the stories in it that
   * you have read do match; the header count and roll-up bar show it is
   * partial.
   */
  const collectionView = useMemo(() => {
    if (shortStoryMode !== 'grouped') return null

    const visibleSlugs = new Set(visible.map((s) => s.slug))
    const passes = (story) => visibleSlugs.has(story.slug)

    // Every collection in the catalog, not just those in `visible` -- one whose
    // own tag failed the filter still belongs here if its contents matched.
    const collections = stories
      .filter((story) => story.type === COLLECTION)
      .map((collection) => {
        const all = membersOfCollection(collection.slug)
        return {
          collection,
          members: all.filter(passes),
          memberTotal: all.length,
          // Roll-up covers the whole book, so the bar means "how far through
          // this collection am I" rather than shifting with every filter.
          allMemberSlugs: all.map((m) => m.slug),
        }
      })
      .filter((entry) => passes(entry.collection) || entry.members.length > 0)
      .sort((a, b) => SORTS[sort].compare(a.collection, b.collection))

    // Everything shown as a standalone card: novels, plays, and the short
    // stories that belong to no collection. The uncollected shorts keep their
    // Short Story label -- they are listed independently, not relabelled.
    const uncollected = new Set(uncollectedStories().map((s) => s.slug))
    const others = visible
      .filter((story) => story.type !== COLLECTION)
      .filter((story) => story.type !== SHORT_STORY || uncollected.has(story.slug))
      .sort(SORTS[sort].compare)

    return { collections, others }
  }, [shortStoryMode, visible, stories, membersOfCollection, uncollectedStories, sort])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [['', visible]]

    const buckets = new Map()
    for (const story of visible) {
      let key
      if (groupBy === 'type') key = story.type ?? 'Unknown'
      else if (groupBy === 'character') key = story.character ?? 'Standalone'
      else key = story.year ? `${Math.floor(story.year / 10) * 10}s` : 'Unknown'

      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(story)
    }

    // Sort group headings: decades chronologically, others alphabetically.
    return [...buckets.entries()].sort((a, b) =>
      groupBy === 'decade' ? parseInt(a[0], 10) - parseInt(b[0], 10) : a[0].localeCompare(b[0]),
    )
  }, [visible, groupBy])

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
          {collectionView ? (
            <>
              <strong>{collectionView.collections.length}</strong> collections,{' '}
              <strong>{collectionView.others.length}</strong> other works
            </>
          ) : (
            <>
              Showing <strong>{visible.length}</strong> of {stories.length}
            </>
          )}
        </span>
      </div>

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
                ? 'Short stories are nested under the collections that include them. Novels and plays are unaffected.'
                : 'Every short story is listed on its own.'}
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
                // Collection grouping already supplies the headings; a second
                // grouping on top of it would have nowhere to go.
                disabled={shortStoryMode === 'grouped'}
              >
                {Object.entries(GROUP_BY).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Form.Select>
              {shortStoryMode === 'grouped' && (
                <Form.Text muted>Grouping is by collection in this mode.</Form.Text>
              )}
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
                    label={type}
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
                    label={character}
                    checked={selectedCharacters.includes(character)}
                    onChange={() => toggleIn(selectedCharacters, setSelectedCharacters, character)}
                  />
                ))}
                <Form.Check
                  type="checkbox"
                  id="char-standalone"
                  label="Standalone"
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
                    label={status[0].toUpperCase() + status.slice(1)}
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

      {visible.length === 0 ? (
        <Card body className="text-center text-muted">
          No stories match these filters.
        </Card>
      ) : collectionView ? (
        <>
          {collectionView.collections.map((entry) => (
            <CollectionGroup
              key={entry.collection.slug}
              collection={entry.collection}
              members={entry.members}
              memberTotal={entry.memberTotal}
              allMemberSlugs={entry.allMemberSlugs}
            />
          ))}

          {/* Novels, plays, and any short story with no collection -- all as
              standalone cards, so switching modes never hides a story. */}
          {collectionView.others.length > 0 && (
            <section className="mb-4">
              <h2 className="h5 border-bottom pb-2 mb-3">
                Other works{' '}
                <span className="text-muted fw-normal">({collectionView.others.length})</span>
              </h2>
              <Row xs={1} md={2} xl={3} className="g-3">
                {collectionView.others.map((story) => (
                  <Col key={story.slug}>
                    <StoryCard story={story} />
                  </Col>
                ))}
              </Row>
            </section>
          )}
        </>
      ) : (
        grouped.map(([heading, group]) => (
          <section key={heading || 'all'} className="mb-4">
            {heading && (
              <h2 className="h5 border-bottom pb-2 mb-3">
                {heading} <span className="text-muted fw-normal">({group.length})</span>
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
        ))
      )}
    </>
  )
}

export default Checklist
