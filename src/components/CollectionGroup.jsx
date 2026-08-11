import { Link } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Card from 'react-bootstrap/Card'
import ListGroup from 'react-bootstrap/ListGroup'
import CollectionProgress from './CollectionProgress.jsx'
import { coverAt, encodeSlug } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/** How many member stories to name on the card before summarising the rest. */
const PREVIEW_LIMIT = 3

/**
 * A collection in the checklist's grouped mode, as a card sized to sit in the
 * same grid as the novels and plays.
 *
 * Only the first few member stories are named -- some collections hold twenty,
 * and listing them all would make one card dwarf every other in the row. The
 * roll-up bar carries the actual progress; the full contents are one click
 * away on the collection's own page.
 *
 * `members` is already filtered by the checklist, so a search or status filter
 * narrows which stories are previewed. `memberTotal` is the collection's full
 * size, so the card can say "3 of 12" rather than implying it only has 3.
 */
function CollectionGroup({ collection, members, memberTotal, allMemberSlugs }) {
  const { get, summarise } = useProgress()

  // Roll-up covers the whole collection, not just the filtered subset -- a
  // progress bar that moved when you typed in the search box would be nonsense.
  const summary = summarise(allMemberSlugs)

  const filtered = members.length !== memberTotal
  const preview = members.slice(0, PREVIEW_LIMIT)
  const remaining = members.length - preview.length
  const isComplete = summary.total > 0 && summary.read === summary.total

  return (
    <Card className={`h-100 ${isComplete ? 'border-success' : ''}`}>
      <div className="d-flex p-3 gap-3">
        {collection.cover ? (
          <Card.Img
            src={coverAt(collection, 160)}
            alt={`Cover of ${collection.title}`}
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
            <Link to={`/story/${encodeSlug(collection.slug)}`} className="text-decoration-none">
              {collection.title}
            </Link>
          </Card.Title>

          <div className="d-flex flex-wrap gap-1 mb-2">
            <Badge bg="secondary">{collection.type}</Badge>
            {collection.year && (
              <Badge bg="light" text="dark">
                {collection.year}
              </Badge>
            )}
            <Badge bg="light" text="dark">
              {filtered ? `${members.length} of ${memberTotal} shown` : `${memberTotal} stories`}
            </Badge>
          </div>

          <CollectionProgress summary={summary} />
        </div>
      </div>

      {/* A taste of the contents, not the whole table of contents. */}
      {preview.length > 0 && (
        <ListGroup variant="flush" className="border-top">
          {preview.map((story) => {
            const isRead = get(story.slug).status === STATUS.READ

            return (
              <ListGroup.Item key={story.slug} className="py-1 px-3 small border-0">
                <span className="d-flex align-items-center gap-2">
                  <span
                    className={isRead ? 'text-success' : 'text-secondary opacity-25'}
                    aria-hidden="true"
                  >
                    {isRead ? '✓' : '○'}
                  </span>
                  <Link
                    to={`/story/${encodeSlug(story.slug)}`}
                    className="text-truncate text-decoration-none"
                  >
                    {story.title}
                  </Link>
                </span>
              </ListGroup.Item>
            )
          })}

          {remaining > 0 && (
            <ListGroup.Item className="py-1 px-3 small border-0">
              <Link
                to={`/story/${encodeSlug(collection.slug)}`}
                className="text-muted text-decoration-none"
              >
                and {remaining} more&hellip;
              </Link>
            </ListGroup.Item>
          )}
        </ListGroup>
      )}

      {members.length === 0 && (
        <Card.Body className="pt-0 text-muted small">
          No stories in this collection match the current filters.
        </Card.Body>
      )}
    </Card>
  )
}

export default CollectionGroup
