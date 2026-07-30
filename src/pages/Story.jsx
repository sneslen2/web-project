import { Link, useParams } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import { coverAt, getStory } from '../data/stories.js'
import { STATUS, STATUS_LABELS, useProgress } from '../progress/ProgressProvider.jsx'

/** 1-5 stars. Rendered as buttons so it works by keyboard. */
function RatingPicker({ value, onChange }) {
  return (
    <div className="d-flex align-items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Button
          key={star}
          variant="link"
          className="p-0 fs-4 text-decoration-none"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          aria-pressed={value === star}
          onClick={() => onChange(value === star ? null : star)}
        >
          <span className={star <= (value ?? 0) ? 'text-warning' : 'text-secondary opacity-25'}>★</span>
        </Button>
      ))}
      {value != null && (
        <Button variant="link" size="sm" className="text-muted" onClick={() => onChange(null)}>
          clear
        </Button>
      )}
    </div>
  )
}

function Story() {
  const { slug } = useParams()
  const story = getStory(slug)
  const { get, setStatus, setRating, setNotes } = useProgress()

  if (!story) {
    return (
      <Alert variant="warning">
        <Alert.Heading>Story not found</Alert.Heading>
        <p className="mb-0">
          No story matches “{slug}”. <Link to="/checklist">Back to the checklist</Link>.
        </p>
      </Alert>
    )
  }

  const record = get(story.slug)

  return (
    <>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
          Home
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/checklist' }}>
          Checklist
        </Breadcrumb.Item>
        <Breadcrumb.Item active>{story.title}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="g-4">
        <Col md={4} lg={3}>
          {story.cover ? (
            <img
              src={coverAt(story, 500)}
              alt={`Cover of ${story.title}`}
              className="img-fluid rounded shadow-sm"
            />
          ) : (
            <div className="bg-body-secondary rounded d-flex align-items-center justify-content-center text-muted py-5">
              No cover available
            </div>
          )}
        </Col>

        <Col md={8} lg={9}>
          <h1>{story.title}</h1>

          <div className="d-flex flex-wrap gap-2 mb-3">
            <Badge bg="secondary">{story.type}</Badge>
            <Badge bg="light" text="dark">
              First published {story.year}
            </Badge>
            {story.character ? (
              <Badge bg="info" text="dark">
                {story.character}
              </Badge>
            ) : (
              <Badge bg="light" text="dark">
                Standalone
              </Badge>
            )}
          </div>

          {/* The detail scrape will add synopsis / moreAbout / trivia / quote /
              extractPdf / related. Until then, say so plainly rather than
              rendering an empty region. */}
          {story.synopsis ? (
            <div className="mb-4">
              {story.synopsis.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <Alert variant="light" className="border">
              Synopsis and story details will appear here once the detail scrape finishes.
            </Alert>
          )}

          <Card className="mb-4">
            <Card.Header>My progress</Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <div>
                  <ButtonGroup>
                    {Object.values(STATUS).map((status) => (
                      <ToggleButton
                        key={status}
                        id={`status-toggle-${status}`}
                        type="radio"
                        variant="outline-primary"
                        name="status"
                        value={status}
                        checked={record.status === status}
                        onChange={() => setStatus(story.slug, status)}
                      >
                        {STATUS_LABELS[status]}
                      </ToggleButton>
                    ))}
                  </ButtonGroup>
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rating</Form.Label>
                <RatingPicker
                  value={record.rating}
                  onChange={(rating) => setRating(story.slug, rating)}
                />
              </Form.Group>

              {record.finishedOn && (
                <p className="text-muted small">
                  Finished on {new Date(record.finishedOn).toLocaleDateString()}
                </p>
              )}

              <Form.Group controlId="story-notes">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Suspicions, favourite clues, who you thought did it…"
                  value={record.notes}
                  onChange={(e) => setNotes(story.slug, e.target.value)}
                />
                <Form.Text muted>Saved automatically.</Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          {story.url && (
            <p>
              <a href={story.url} target="_blank" rel="noreferrer">
                View on agathachristie.com
              </a>
            </p>
          )}
        </Col>
      </Row>
    </>
  )
}

export default Story
