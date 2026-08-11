import { Link } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
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
  const { get, toggleRead, collectionStatus } = useProgress()
  const { membersOfCollection } = useStories()

  const memberSlugs = membersOfCollection(story.slug).map((m) => m.slug)
  const isCollection = memberSlugs.length > 0

  const record = get(story.slug)
  const isRead = isCollection
    ? collectionStatus(memberSlugs) === STATUS.READ
    : record.status === STATUS.READ

  const readCount = isCollection
    ? memberSlugs.filter((slug) => get(slug).status === STATUS.READ).length
    : 0
  const percentRead = isCollection ? Math.round((readCount / memberSlugs.length) * 100) : 0

  return (
    <Card className={`h-100 ${isRead ? 'border-success' : ''}`}>
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
          </div>

          {isCollection ? (
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
          ) : (
            <Form.Check
              type="checkbox"
              id={`read-${story.slug}`}
              label={isRead ? 'Read' : 'Mark as read'}
              checked={isRead}
              onChange={() => toggleRead(story.slug)}
            />
          )}
        </div>
      </div>
    </Card>
  )
}

export default StoryCard
