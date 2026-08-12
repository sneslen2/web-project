import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import { encodeSlug, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/** A labeled completion bar, reused for each breakdown row. */
function CompletionRow({ label, read, total }) {
  const pct = total ? Math.round((read / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small">
        <span>{label}</span>
        <span className="text-muted">
          {read} / {total} ({pct}%)
        </span>
      </div>
      <ProgressBar now={pct} label={pct >= 10 ? `${pct}%` : ''} style={{ height: '1.25rem' }} />
    </div>
  )
}

function Statistics() {
  const { records, get, reset, collectionStatus, summarize } = useProgress()
  const {
    stories,
    distinctWorks,
    distinctWorkSlugs,
    collections,
    types,
    characters,
    membersOfCollection,
  } = useStories()
  const [confirming, setConfirming] = useState(false)

  const stats = useMemo(() => {
    // Collections are containers, not works. Counting a collection alongside
    // the stories inside it would tally the same reading twice -- and since
    // reading all 20 collections covers 164 of the 302 rows, a naive total
    // reported 7% complete for more than half the catalog.
    //
    // The headline figures come from the same summarize() call the home page
    // uses, so the two pages cannot report different completion.
    const works = distinctWorks
    const overall = summarize(distinctWorkSlugs)

    // `works` excludes collections and `types` no longer offers Collection as a
    // format, so nothing here needs to special-case them.
    const countBy = (keyFor, keys) =>
      keys
        .map((key) => {
          const inGroup = works.filter((s) => keyFor(s) === key)
          return {
            label: key,
            total: inGroup.length,
            read: inGroup.filter((s) => get(s.slug).status === STATUS.READ).length,
          }
        })
        // A detective whose only entries were collections now has nothing left.
        .filter((row) => row.total > 0)

    // Reported separately rather than mixed into the catalog total.
    const collectionRows = collections.map((collection) => {
      const memberSlugs = membersOfCollection(collection.slug).map((m) => m.slug)
      return {
        slug: collection.slug,
        title: collection.title,
        total: memberSlugs.length,
        read: memberSlugs.filter((slug) => get(slug).status === STATUS.READ).length,
        status: collectionStatus(memberSlugs),
      }
    })

    // Ratings on collections are excluded so one opinion is not counted twice
    // alongside ratings of the stories inside.
    const workSlugs = new Set(works.map((s) => s.slug))
    const rated = Object.entries(records)
      .filter(([slug, r]) => r.rating != null && workSlugs.has(slug))
      .map(([slug, r]) => ({ slug, rating: r.rating }))

    const averageRating = rated.length
      ? (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(2)
      : null

    // Decades, derived so a re-scrape with new years needs no edit here.
    const decades = [...new Set(works.map((s) => (s.year ? Math.floor(s.year / 10) * 10 : null)))]
      .filter((d) => d != null)
      .sort((a, b) => a - b)

    const recentlyFinished = Object.entries(records)
      .filter(([slug, r]) => r.finishedOn && workSlugs.has(slug))
      .sort((a, b) => b[1].finishedOn.localeCompare(a[1].finishedOn))
      .slice(0, 5)
      .map(([slug, r]) => ({
        slug,
        title: stories.find((s) => s.slug === slug)?.title ?? slug,
        finishedOn: r.finishedOn,
      }))

    return {
      total: overall.total,
      read: overall.read,
      reading: overall.reading,
      percentRead: overall.percentRead,
      byType: countBy((s) => s.type, types),
      byCharacter: countBy((s) => s.character, characters),
      byDecade: countBy((s) => (s.year ? Math.floor(s.year / 10) * 10 : null), decades).map((row) => ({
        ...row,
        label: `${row.label}s`,
      })),
      collections: collectionRows,
      collectionsComplete: collectionRows.filter((c) => c.total > 0 && c.read === c.total).length,
      averageRating,
      ratedCount: rated.length,
      notesCount: Object.values(records).filter((r) => r.notes?.trim()).length,
      recentlyFinished,
    }
    // `stories` and the facet lists arrive asynchronously from Supabase, so they
    // must be dependencies -- otherwise the stats compute once against an empty
    // catalog and never refresh.
  }, [
    stories,
    distinctWorks,
    distinctWorkSlugs,
    collections,
    membersOfCollection,
    collectionStatus,
    summarize,
    types,
    characters,
    records,
    get,
  ])

  return (
    <>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="mb-0">My Statistics</h1>
        {stats.read + stats.reading > 0 && (
          <Button variant="outline-danger" size="sm" onClick={() => setConfirming(true)}>
            Reset all progress
          </Button>
        )}
      </div>

      {stats.read === 0 ? (
        <Alert variant="info">
          Nothing marked as read yet. Head to the <Alert.Link href="#/checklist">checklist</Alert.Link>{' '}
          to start tracking.
        </Alert>
      ) : null}

      <Row className="g-3 mb-4">
        {[
          { label: 'Stories read', value: stats.read, sub: `of ${stats.total} works` },
          { label: 'Completion', value: `${stats.percentRead}%`, sub: 'of the catalog' },
          { label: 'In progress', value: stats.reading, sub: 'currently reading' },
          {
            label: 'Average rating',
            value: stats.averageRating ?? '—',
            sub: stats.ratedCount ? `across ${stats.ratedCount} rated` : 'none rated yet',
          },
        ].map((tile) => (
          <Col key={tile.label} xs={6} lg={3}>
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="display-6">{tile.value}</div>
                <div className="fw-semibold">{tile.label}</div>
                <div className="text-muted small">{tile.sub}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="mb-4">
        <Card.Header>Overall progress</Card.Header>
        <Card.Body>
          <CompletionRow label="Entire catalog" read={stats.read} total={stats.total} />
          <p className="text-muted small mb-0">
            Counts novels, plays, and short stories. Collections are not counted as separate works
            &mdash; the stories inside them are, so nothing is tallied twice.
          </p>
        </Card.Body>
      </Card>

      <Row className="g-4">
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>By format</Card.Header>
            <Card.Body>
              {stats.byType.map((row) => (
                <CompletionRow key={row.label} {...row} />
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>By detective</Card.Header>
            <Card.Body>
              {stats.byCharacter.map((row) => (
                <CompletionRow key={row.label} {...row} />
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>By decade</Card.Header>
            <Card.Body style={{ maxHeight: '24rem', overflowY: 'auto' }}>
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Decade</th>
                    <th className="text-end">Read</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byDecade.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="text-end">{row.read}</td>
                      <td className="text-end text-muted">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>By collection</span>
              <span className="text-muted small fw-normal">
                {stats.collectionsComplete} of {stats.collections.length} complete
              </span>
            </Card.Header>
            <Card.Body style={{ maxHeight: '24rem', overflowY: 'auto' }}>
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th className="text-end">Read</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.collections.map((row) => (
                    <tr key={row.slug}>
                      <td>
                        <Link to={`/story/${encodeSlug(row.slug)}`}>{row.title}</Link>
                      </td>
                      <td className="text-end">{row.read}</td>
                      <td className="text-end text-muted">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>Recently finished</Card.Header>
            {stats.recentlyFinished.length === 0 ? (
              <Card.Body className="text-muted">Nothing finished yet.</Card.Body>
            ) : (
              <ListGroup variant="flush">
                {stats.recentlyFinished.map((item) => (
                  <ListGroup.Item
                    key={item.slug}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <Link to={`/story/${encodeSlug(item.slug)}`}>{item.title}</Link>
                    <small className="text-muted">
                      {new Date(item.finishedOn).toLocaleDateString()}
                    </small>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>
      </Row>

      <p className="text-muted small mt-4">
        {stats.notesCount > 0 && `${stats.notesCount} stories have notes. `}
        Progress is currently saved in this browser only.
      </p>

      <Modal show={confirming} onHide={() => setConfirming(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset all progress?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          This clears every read status, rating, finish date, and note. It cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              reset()
              setConfirming(false)
            }}
          >
            Reset everything
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default Statistics
