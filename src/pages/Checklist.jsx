import { useMemo, useState } from 'react'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import StoryCard from '../components/StoryCard.jsx'
import { STANDALONE, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

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

function Checklist() {
  const { get } = useProgress()
  const { stories, types, characters } = useStories()

  const [search, setSearch] = useState('')
  // Selected filter values. Named distinctly from the `types`/`characters`
  // facet lists above, which are the full sets available.
  const [selectedTypes, setSelectedTypes] = useState([]) // empty == all
  const [selectedCharacters, setSelectedCharacters] = useState([]) // empty == all
  const [statuses, setStatuses] = useState([]) // empty == all
  const [sort, setSort] = useState('year-asc')
  const [groupBy, setGroupBy] = useState('none')

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

      if (statuses.length && !statuses.includes(get(story.slug).status)) return false

      return true
    })

    return [...filtered].sort(SORTS[sort].compare)
    // `stories` arrives asynchronously, so it must be a dependency -- otherwise
    // the list stays empty after the fetch resolves.
  }, [stories, search, selectedTypes, selectedCharacters, statuses, sort, get])

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
          Showing <strong>{visible.length}</strong> of {stories.length}
        </span>
      </div>

      <Card className="mb-4">
        <Card.Body>
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
              <Form.Select id="story-group" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
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
