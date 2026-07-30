import { Link, useParams } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Breadcrumb from 'react-bootstrap/Breadcrumb'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import { coverAt, encodeSlug, useStories } from '../data/StoriesProvider.jsx'
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
  const { getStory } = useStories()
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
            {/* Collections only. */}
            {story.storyCount && (
              <Badge bg="light" text="dark">
                {story.storyCount} stories
              </Badge>
            )}
            {/* Pen name, collaboration, or adaptation credit. */}
            {story.attribution && (
              <Badge bg="warning" text="dark">
                {story.attribution}
              </Badge>
            )}
          </div>

          {/* Prose fields store paragraphs separated by a blank line. Coverage
              varies -- synopsis is on every story, moreAbout on ~93%, quote on
              ~30%, trivia on ~5% -- so each section renders only when present. */}
          {story.synopsis && (
            <div className="mb-4">
              {story.synopsis.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {story.extractPdf && (
            <p>
              <a href={story.extractPdf} target="_blank" rel="noreferrer" className="btn btn-outline-primary btn-sm">
                Read an extract (PDF)
              </a>
            </p>
          )}

          {story.quote?.text && (
            <figure className="border-start border-4 ps-3 my-4">
              <blockquote className="mb-1 fst-italic">{story.quote.text}</blockquote>
              {story.quote.author && (
                <figcaption className="text-muted small">&mdash; {story.quote.author}</figcaption>
              )}
            </figure>
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

          {story.moreAbout && (
            <section className="mb-4">
              <h2 className="h5">More about this story</h2>
              {story.moreAbout.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </section>
          )}

          {story.trivia?.length > 0 && (
            <Card className="mb-4">
              <Card.Header>Did you know?</Card.Header>
              <ListGroup variant="flush">
                {story.trivia.map((fact, i) => (
                  <ListGroup.Item key={i}>{fact}</ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          )}

          {story.related?.length > 0 && (
            <section className="mb-4">
              <h2 className="h5">Other stories you might enjoy</h2>
              <ListGroup>
                {story.related.map((item) => {
                  // Some related titles (graphic novels, non-fiction) fall outside
                  // the four scraped formats, so they have no page here -- link
                  // those out to the source site instead of a dead route.
                  const relatedSlug = (item.url || '').split('/').filter(Boolean).pop()
                  const inCatalog = relatedSlug && getStory(relatedSlug)

                  return (
                    <ListGroup.Item key={item.url || item.title}>
                      {inCatalog ? (
                        <Link to={`/story/${encodeSlug(relatedSlug)}`}>{item.title}</Link>
                      ) : (
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.title} <span className="text-muted small">(external)</span>
                        </a>
                      )}
                    </ListGroup.Item>
                  )
                })}
              </ListGroup>
            </section>
          )}

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
