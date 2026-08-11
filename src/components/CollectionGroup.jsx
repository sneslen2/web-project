import { Link } from 'react-router-dom'
import Badge from 'react-bootstrap/Badge'
import Card from 'react-bootstrap/Card'
import ListGroup from 'react-bootstrap/ListGroup'
import CollectionProgress from './CollectionProgress.jsx'
import { encodeSlug } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/**
 * One collection in the checklist's grouped mode: the collection itself, then
 * its member stories nested beneath it.
 *
 * `members` is already filtered and sorted by the checklist, so a search or
 * status filter narrows what shows inside each collection. `memberTotal` is the
 * collection's full size, so the header can say "3 of 11 shown" rather than
 * pretending the collection only has 3 stories.
 */
function CollectionGroup({ collection, members, memberTotal, allMemberSlugs }) {
  const { get, toggleRead, summarise } = useProgress()

  // Roll-up covers the whole collection, not just the filtered subset -- a
  // progress bar that moved when you typed in the search box would be nonsense.
  const summary = summarise(allMemberSlugs)

  const filtered = members.length !== memberTotal

  return (
    <Card className="mb-3">
      <Card.Header>
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <Link to={`/story/${encodeSlug(collection.slug)}`} className="fw-semibold">
              {collection.title}
            </Link>
            {collection.year && <span className="text-muted small"> &middot; {collection.year}</span>}
          </div>
          <Badge bg="secondary" className="flex-shrink-0">
            {filtered ? `${members.length} of ${memberTotal}` : memberTotal}
          </Badge>
        </div>
        <CollectionProgress summary={summary} className="mt-2" />
      </Card.Header>

      <ListGroup variant="flush">
        {members.map((story) => {
          const record = get(story.slug)
          const isRead = record.status === STATUS.READ

          return (
            <ListGroup.Item
              key={story.slug}
              className="d-flex justify-content-between align-items-center gap-2"
            >
              <span className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  className="form-check-input mt-0 flex-shrink-0"
                  checked={isRead}
                  onChange={() => toggleRead(story.slug)}
                  aria-label={`Mark ${story.title} as read`}
                />
                <Link to={`/story/${encodeSlug(story.slug)}`}>{story.title}</Link>
              </span>

              <span className="d-flex align-items-center gap-2 flex-shrink-0">
                {record.rating != null && (
                  <span className="small text-warning">{'★'.repeat(record.rating)}</span>
                )}
                {record.status === STATUS.READING && (
                  <Badge bg="warning" text="dark">
                    Reading
                  </Badge>
                )}
              </span>
            </ListGroup.Item>
          )
        })}

        {members.length === 0 && (
          <ListGroup.Item className="text-muted small">
            No stories in this collection match the current filters.
          </ListGroup.Item>
        )}
      </ListGroup>
    </Card>
  )
}

export default CollectionGroup
