import { useMemo, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import { CHARACTERS, TYPES, stories } from '../data/stories.js'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/** A labelled completion bar, reused for each breakdown row. */
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
  const { records, get, reset } = useProgress()
  const [confirming, setConfirming] = useState(false)

  const stats = useMemo(() => {
    const read = stories.filter((s) => get(s.slug).status === STATUS.READ)
    const reading = stories.filter((s) => get(s.slug).status === STATUS.READING)

    const countBy = (keyFor, keys) =>
      keys.map((key) => {
        const inGroup = stories.filter((s) => keyFor(s) === key)
        return {
          label: key,
          total: inGroup.length,
          read: inGroup.filter((s) => get(s.slug).status === STATUS.READ).length,
        }
      })

    const rated = Object.entries(records)
      .filter(([, r]) => r.rating != null)
      .map(([slug, r]) => ({ slug, rating: r.rating }))

    const averageRating = rated.length
      ? (rated.reduce((sum, r) => sum + r.rating, 0) / rated.length).toFixed(2)
      : null

    // Decades, derived so a re-scrape with new years needs no edit here.
    const decades = [...new Set(stories.map((s) => (s.year ? Math.floor(s.year / 10) * 10 : null)))]
      .filter((d) => d != null)
      .sort((a, b) => a - b)

    const recentlyFinished = Object.entries(records)
      .filter(([, r]) => r.finishedOn)
      .sort((a, b) => b[1].finishedOn.localeCompare(a[1].finishedOn))
      .slice(0, 5)
      .map(([slug, r]) => ({
        slug,
        title: stories.find((s) => s.slug === slug)?.title ?? slug,
        finishedOn: r.finishedOn,
      }))

    return {
      total: stories.length,
      read: read.length,
      reading: reading.length,
      byType: countBy((s) => s.type, TYPES),
      byCharacter: countBy((s) => s.character, CHARACTERS),
      byDecade: countBy((s) => (s.year ? Math.floor(s.year / 10) * 10 : null), decades).map((row) => ({
        ...row,
        label: `${row.label}s`,
      })),
      averageRating,
      ratedCount: rated.length,
      notesCount: Object.values(records).filter((r) => r.notes?.trim()).length,
      recentlyFinished,
    }
  }, [records, get])

  const overallPct = Math.round((stats.read / stats.total) * 100)

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
          { label: 'Stories read', value: stats.read, sub: `of ${stats.total}` },
          { label: 'Completion', value: `${overallPct}%`, sub: 'of the catalog' },
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
                    <span>{item.title}</span>
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
