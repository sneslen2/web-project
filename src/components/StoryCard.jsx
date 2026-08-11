import { Link } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import ProgressBar from 'react-bootstrap/ProgressBar'
import { coverAt, encodeSlug, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/**
 * One entry in the checklist: cover, metadata, a read control, and a link
 * through to the full page. Novels, plays, short stories and collections all
 * use this same card so the grid stays uniform.
 *
 * A collection has no status of its own -- it is derived from its member
 * stories -- so instead of a checkbox it shows how far through the collection
 * you are and links to its page, where the per-story checklist lives. Marking a
 * collection read or unread also happens there, where the consequences can be
 * spelled out.
 */
function StoryCard({ story }) {
  const { get, toggleRead, setStatus, collectionStatus } = useProgress()
  const { membersOfCollection } = useStories()

  const memberSlugs = membersOfCollection(story.slug).map((m) => m.slug)
  const isCollection = memberSlugs.length > 0

  const record = get(story.slug)
  const isRead = isCollection
    ? collectionStatus(memberSlugs) === STATUS.READ
    : record.status === STATUS.READ
  const isReading = !isCollection && record.status === STATUS.READING

  const readCount = isCollection
    ? memberSlugs.filter((slug) => get(slug).status === STATUS.READ).length
    : 0
  const percentRead = isCollection ? Math.round((readCount / memberSlugs.length) * 100) : 0

  return (
    <Card
      className={`h-100 d-flex flex-column ${
        isRead ? 'border-success' : isReading ? 'border-warning' : ''
      }`}
    >
      <div className="d-flex p-3 gap-3">
        {story.cover ? (
          <Card.Img
            src={coverAt(story, 160)}
            alt={`Cover of ${story.title}`}
            style={{ width: '80px', height: 'auto', objectFit: 'contain', flexShrink: 0 }}
            loading="lazy"
          />
        ) : (
          <div
            className="bg-body-secondary d-flex align-items-center justify-content-center text-muted"
            style={{ width: '80px', height: '129px', flexShrink: 0, fontSize: '0.7rem' }}
          >
            No cover
          </div>
        )}

        <div className="flex-grow-1 min-width-0">
          <Card.Title as="h3" className="h6 mb-1">
            <Link
              to={`/story/${encodeSlug(story.slug)}`}
              className="text-decoration-none"
            >
              {story.title}
            </Link>
          </Card.Title>

          <div className="d-flex flex-wrap gap-1 mb-2">
            <Badge bg="secondary">{story.type}</Badge>
            <Badge bg="light" text="dark">
              {story.year}
            </Badge>
            {story.character && (
              <Badge bg="info" text="dark">
                {story.character}
              </Badge>
            )}
            {/* Read state is carried by the footer button; in-progress needs
                its own marker to be visible while scanning the grid. */}
            {isReading && (
              <Badge bg="warning" text="dark">
                Reading
              </Badge>
            )}
          </div>

          {/* A collection has no status of its own -- it is derived from its
              members -- so its card reports progress and links through to the
              page where the per-story checklist lives. */}
          {isCollection && (
            <div>
              <div className="small text-muted mb-1">
                {readCount} of {memberSlugs.length} stories read
              </div>
              <ProgressBar
                now={percentRead}
                variant={isRead ? 'success' : 'primary'}
                style={{ height: '0.4rem' }}
                // The count above already states this in text.
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Marking progress is the point of the checklist, so the control gets
          the full width of the card footer rather than a checkbox in a corner. */}
      {!isCollection && (
        <div className="px-3 pb-3 mt-auto">
          <Button
            variant={isRead ? 'success' : 'outline-success'}
            className="w-100 fw-semibold"
            onClick={() => toggleRead(story.slug)}
            // Communicates the toggle to screen readers, which would otherwise
            // hear only a label that changes unpredictably.
            aria-pressed={isRead}
          >
            {isRead ? '✓ Read' : 'Mark as read'}
          </Button>

          {/* Secondary by design: finishing is the primary action. Hidden once
              read, where "start reading" would be a step backwards. */}
          {!isRead && (
            <div className="text-center mt-2">
              <Button
                variant="link"
                size="sm"
                className="text-decoration-none p-0"
                onClick={() =>
                  setStatus(
                    story.slug,
                    isReading ? STATUS.UNREAD : STATUS.READING,
                  )
                }
              >
                {isReading ? 'Not reading anymore' : 'Start reading'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default StoryCard
