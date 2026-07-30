import { Link } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import { coverAt, encodeSlug } from '../data/stories.js'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/**
 * One story in the checklist: cover, metadata, a read checkbox, and a link
 * through to the full page.
 */
function StoryCard({ story }) {
  const { get, toggleRead } = useProgress()
  const record = get(story.slug)
  const isRead = record.status === STATUS.READ

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

          <Form.Check
            type="checkbox"
            id={`read-${story.slug}`}
            label={isRead ? 'Read' : 'Mark as read'}
            checked={isRead}
            onChange={() => toggleRead(story.slug)}
          />
        </div>
      </div>
    </Card>
  )
}

export default StoryCard
