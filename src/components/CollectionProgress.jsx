import ProgressBar from 'react-bootstrap/ProgressBar'

/**
 * Read/reading/unread roll-up across a collection's member stories.
 *
 * Derived and read-only. The collection has its own independent status in the
 * progress card; this reports on its members without changing either.
 */
function CollectionProgress({ summary, className = '' }) {
  if (summary.total === 0) return null

  const { total, read, reading, percentRead, averageRating } = summary

  return (
    <div className={className}>
      <div className="d-flex justify-content-between align-items-baseline small mb-1">
        <span>
          <strong>
            {read} of {total}
          </strong>{' '}
          {total === 1 ? 'story' : 'stories'} read
          {reading > 0 && <span className="text-muted"> &middot; {reading} in progress</span>}
        </span>
        {averageRating != null && (
          <span className="text-muted">
            average <span className="text-warning">★</span> {averageRating}
          </span>
        )}
      </div>

      <ProgressBar
        // Labelled on the wrapper: the bar is decorative once the counts above
        // say the same thing in text.
        aria-hidden="true"
        style={{ height: '0.5rem' }}
      >
        <ProgressBar variant="success" now={percentRead} key="read" />
        <ProgressBar
          variant="warning"
          now={total ? Math.round((reading / total) * 100) : 0}
          key="reading"
        />
      </ProgressBar>
    </div>
  )
}

export default CollectionProgress
