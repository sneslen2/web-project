import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row'
import ToggleButton from 'react-bootstrap/ToggleButton'
import CollectionProgress from '../components/CollectionProgress.jsx'
import ConfirmClearCollection from '../components/ConfirmClearCollection.jsx'
import { coverAt, encodeSlug, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, STATUS_LABELS, useProgress } from '../progress/ProgressProvider.jsx'
import { todayLocal } from '../today.js'

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
  const { getStory, membersOfCollection, collectionsContaining } = useStories()
  const story = getStory(slug)
  const {
    get,
    setStatus,
    setRating,
    setNotes,
    setFinishedOn,
    summarize,
    collectionStatus,
    setCollectionStatus,
    previewCollectionClear,
  } = useProgress()
  const [clearing, setClearing] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Prefer real history so "back" returns to wherever the user actually came
  // from -- the checklist, the stats page, or a collection -- with their scroll
  // position intact. On a cold load (direct link, refresh, shared URL) there is
  // no in-app history to pop, so fall back to the checklist.
  const cameFromApp = location.key !== 'default'
  function handleBack() {
    if (cameFromApp) {
      navigate(-1)
    } else {
      navigate('/checklist')
    }
  }

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

  // Caps the date picker: a finish date in the future is a typo, not a plan.
  const today = todayLocal()

  // Collections list their contents; stories link back to the collections that
  // include them. Both are empty for novels and plays, so both sections vanish.
  const members = membersOfCollection(story.slug)
  const parentCollections = collectionsContaining(story.slug)
  const memberSlugs = members.map((m) => m.slug)
  const memberSummary = summarize(memberSlugs)

  // A collection has no stored status of its own -- it is derived from its
  // members, and setting it writes through to them.
  const isCollection = members.length > 0
  const displayStatus = isCollection ? collectionStatus(memberSlugs) : record.status

  // A collection of other-author stories has no single author of its own. 0 for
  // Christie's own collections, whose members carry no author at all.
  const assortedAuthors =
    new Set(members.map((m) => m.otherAuthor).filter(Boolean)).size > 1

  function handleStatusChange(status) {
    if (!isCollection) {
      setStatus(story.slug, status)
      return
    }

    // Clearing a collection discards finish dates, so confirm first. Marking
    // one read only adds, and needs no interruption.
    if (status === STATUS.UNREAD) {
      setClearing(true)
      return
    }
    setCollectionStatus(memberSlugs, status)
  }

  return (
    <>
      <Button
        variant="link"
        onClick={handleBack}
        className="ch-back px-0 mb-3 text-decoration-none"
      >
        <span aria-hidden="true">&larr;</span>{' '}
        {cameFromApp ? 'Back' : 'Back to the checklist'}
      </Button>

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
            {/* Extras only: who actually wrote it. Null for Christie's own
                work, and for a collection whose stories have different
                authors -- there the members carry their own credit. */}
            {story.otherAuthor && (
              <Badge bg="light" text="dark">
                By {story.otherAuthor}
              </Badge>
            )}
            {!story.otherAuthor && assortedAuthors && (
              <Badge bg="light" text="dark">
                By assorted authors
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
                        checked={displayStatus === status}
                        // Reading is not settable on a collection: it is what
                        // the members already say, and writing it through would
                        // overwrite their individual progress.
                        disabled={isCollection && status === STATUS.READING}
                        onChange={() => handleStatusChange(status)}
                      >
                        {STATUS_LABELS[status]}
                      </ToggleButton>
                    ))}
                  </ButtonGroup>
                </div>
                {isCollection && (
                  <Form.Text muted>
                    Follows the {members.length} stories in this collection. Marking it read or
                    unread updates all of them.
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rating</Form.Label>
                <RatingPicker
                  value={record.rating}
                  onChange={(rating) => setRating(story.slug, rating)}
                />
              </Form.Group>

              {/* Collections have no record of their own -- their members each
                  carry their own finish date. */}
              {!isCollection && (
                <Form.Group className="mb-3" controlId="story-finished-on">
                  <Form.Label>Date finished</Form.Label>
                  <Form.Control
                    type="date"
                    value={record.finishedOn ?? ''}
                    // A finish date in the future is a typo, not a plan.
                    max={today}
                    onChange={(e) => setFinishedOn(story.slug, e.target.value)}
                  />
                  <Form.Text muted>
                    {record.status === STATUS.READ
                      ? 'Clear this if you would rather not record when you finished.'
                      : 'Setting a date marks this as read.'}
                  </Form.Text>
                </Form.Group>
              )}

              <Form.Group controlId="story-notes">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Suspicions, favorite clues, who you thought did it…"
                  value={record.notes}
                  onChange={(e) => setNotes(story.slug, e.target.value)}
                />
                <Form.Text muted>Saved automatically.</Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* A collection's contents, with the reading progress rolled up from
              its member stories. Replaces the old "Other stories you might
              enjoy" heading, which was mislabeling a table of contents. */}
          {members.length > 0 && (
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Stories in this collection</span>
                <Badge bg="secondary">{members.length}</Badge>
              </Card.Header>
              <Card.Body className="pb-2">
                <CollectionProgress summary={memberSummary} className="mb-2" />
              </Card.Body>
              <ListGroup variant="flush">
                {members.map((member) => {
                  const memberRecord = get(member.slug)
                  const isRead = memberRecord.status === STATUS.READ

                  return (
                    <ListGroup.Item
                      key={member.slug}
                      className="d-flex justify-content-between align-items-center gap-2"
                    >
                      <span className="d-flex align-items-center gap-2">
                        {/* Marks progress at a glance without making the row a
                            control -- status is edited on the story's own page. */}
                        <span
                          className={isRead ? 'text-success' : 'text-secondary opacity-25'}
                          aria-hidden="true"
                        >
                          {isRead ? '✓' : '○'}
                        </span>
                        <Link to={`/story/${encodeSlug(member.slug)}`}>{member.title}</Link>
                      </span>

                      <span className="d-flex align-items-center gap-2 flex-shrink-0">
                        {memberRecord.rating != null && (
                          <span className="small text-warning">
                            {'★'.repeat(memberRecord.rating)}
                          </span>
                        )}
                        {memberRecord.status !== STATUS.UNREAD && (
                          <Badge bg={isRead ? 'success' : 'warning'} text={isRead ? undefined : 'dark'}>
                            {STATUS_LABELS[memberRecord.status]}
                          </Badge>
                        )}
                      </span>
                    </ListGroup.Item>
                  )
                })}
              </ListGroup>
            </Card>
          )}

          {/* The reverse link. A story can appear in several collections -- 64
              of them do -- and its progress is shared across all of them. */}
          {parentCollections.length > 0 && (
            <section className="mb-4">
              <h2 className="h5">
                {parentCollections.length === 1
                  ? 'Appears in this collection'
                  : 'Appears in these collections'}
              </h2>
              <ListGroup>
                {parentCollections.map((collection) => (
                  <ListGroup.Item key={collection.slug}>
                    <Link to={`/story/${encodeSlug(collection.slug)}`}>{collection.title}</Link>
                    {collection.year && (
                      <span className="text-muted small"> &middot; {collection.year}</span>
                    )}
                  </ListGroup.Item>
                ))}
              </ListGroup>
              {parentCollections.length > 1 && (
                <p className="text-muted small mt-2 mb-0">
                  Your status, rating, and notes for this story are shared across every collection
                  it appears in.
                </p>
              )}
            </section>
          )}

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

          {/* Recommendations. Skipped for collections, whose `related` field is
              really a table of contents and is rendered above instead. */}
          {members.length === 0 && story.related?.length > 0 && (
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

      {isCollection && (
        <ConfirmClearCollection
          show={clearing}
          onHide={() => setClearing(false)}
          onConfirm={() => {
            setCollectionStatus(memberSlugs, STATUS.UNREAD)
            setClearing(false)
          }}
          collectionTitle={story.title}
          preview={previewCollectionClear(memberSlugs)}
          // Members that also belong to another collection -- clearing here
          // clears them there too, which is worth saying out loud.
          sharedCount={
            members.filter((m) => collectionsContaining(m.slug).length > 1).length
          }
        />
      )}
    </>
  )
}

export default Story
