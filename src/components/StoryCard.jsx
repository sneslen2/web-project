import { Link } from 'react-router-dom'
import Card from 'react-bootstrap/Card'
import { coverAt, encodeSlug, useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

/**
 * One entry in the checklist, as a book plate: the cover art as a banner
 * fading into the panel, the title plated over it, then metadata and the
 * progress control. Novels, plays, short stories and collections all use this
 * same card so the grid stays uniform.
 *
 * A collection has no status of its own -- it is derived from its member
 * stories -- so instead of a control it shows how far through the collection
 * you are and links to its page, where the per-story checklist lives.
 */
function StoryCard({ story }) {
  const { get, toggleRead, setStatus, collectionStatus } = useProgress()
  const { membersOfCollection } = useStories()

  const members = membersOfCollection(story.slug)
  const memberSlugs = members.map((m) => m.slug)
  const isCollection = memberSlugs.length > 0

  // A collection of other-author stories has no single author of its own, so
  // the card reports how many contributed instead. 0 for Christie's own
  // collections, whose members carry no author.
  const authorCount = new Set(members.map((m) => m.otherAuthor).filter(Boolean)).size

  const record = get(story.slug)
  const isRead = isCollection
    ? collectionStatus(memberSlugs) === STATUS.READ
    : record.status === STATUS.READ
  const isReading = !isCollection && record.status === STATUS.READING

  const readCount = isCollection
    ? memberSlugs.filter((slug) => get(slug).status === STATUS.READ).length
    : 0
  const percentRead = isCollection ? Math.round((readCount / memberSlugs.length) * 100) : 0

  const state = isRead ? 'read' : isReading ? 'reading' : ''

  return (
    <Card className={`ch-plate h-100 ${state}`}>
      <div className="ch-plate-art">
        {story.cover ? (
          <img src={coverAt(story, 400)} alt="" loading="lazy" />
        ) : (
          <div className="ch-plate-nocover" aria-hidden="true">
            ❧
          </div>
        )}

        {/* Corner ribbon carries the state, so it reads at a glance while
            scrolling without competing with the title. */}
        {(isRead || isReading) && (
          <span className="ch-ribbon" aria-hidden="true">
            {isRead ? '✓' : '▸'}
          </span>
        )}

        <div className="ch-plate-title">
          <Card.Title as="h3" className="ch-plate-heading">
            <Link to={`/story/${encodeSlug(story.slug)}`}>{story.title}</Link>
          </Card.Title>
        </div>
      </div>

      <div className="ch-plate-meta">
        <span className="ch-tag">{story.type}</span>
        {story.year && <span className="ch-tag">{story.year}</span>}
        {story.character && <span className="ch-tag gold">{story.character}</span>}
        {/* Only the extras carry an author -- it is null for Christie's own
            writing, so this tag appears on the Extras page and nowhere else.
            A collection whose stories have different authors reads "Assorted",
            since no one name is right for the card that stands in for them. */}
        {story.otherAuthor ? (
          <span className="ch-tag wine">{story.otherAuthor}</span>
        ) : (
          isCollection && authorCount > 1 && <span className="ch-tag wine">Assorted</span>
        )}
        {isReading && <span className="ch-tag reading">Reading</span>}
      </div>

      {isCollection ? (
        <div className="ch-plate-action">
          <div className="ch-collection-count">
            {readCount} of {memberSlugs.length} stories read
          </div>
          <div className="ch-minibar" aria-hidden="true">
            <i style={{ width: `${percentRead}%` }} />
          </div>
        </div>
      ) : (
        <div className="ch-plate-action">

          {/* Secondary by design: finishing is the primary action. Hidden once
              read, where "start reading" would be a step backwards. */}
          {!isRead && (
            <button
              type="button"
              className="ch-btn-sub"
              onClick={() => setStatus(story.slug, isReading ? STATUS.UNREAD : STATUS.READING)}
            >
              {isReading ? 'Not reading anymore' : 'Start reading'}
            </button>
          )}
          
          <button
            type="button"
            className={`ch-btn ${isRead ? 'done' : ''}`}
            onClick={() => toggleRead(story.slug)}
            // Communicates the toggle to screen readers, which would otherwise
            // hear only a label that changes unpredictably.
            aria-pressed={isRead}
          >
            {isRead ? '✓ Read' : 'Mark as read'}
          </button>

          
        </div>
      )}
    </Card>
  )
}

export default StoryCard
