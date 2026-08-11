import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

/**
 * Confirms marking a collection unread.
 *
 * Marking a collection read is additive and needs no confirmation. Clearing one
 * is not: it wipes the finish date on every member, and because a story can
 * belong to several collections, it may clear a date earned by reading a
 * different book entirely. Finish dates cannot be reconstructed, so the count
 * is spelled out before the write.
 */
function ConfirmClearCollection({ show, onHide, onConfirm, collectionTitle, preview, sharedCount }) {
  const { affected, datedCount } = preview

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Mark this collection unread?</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p>
          This clears the reading status of{' '}
          <strong>
            {affected} {affected === 1 ? 'story' : 'stories'}
          </strong>{' '}
          in <em>{collectionTitle}</em>.
        </p>

        <ul className="mb-3">
          {datedCount > 0 && (
            <li>
              {datedCount} finish {datedCount === 1 ? 'date' : 'dates'} will be lost. This cannot be
              undone.
            </li>
          )}
          {sharedCount > 0 && (
            <li>
              {sharedCount} of these {sharedCount === 1 ? 'story appears' : 'stories appear'} in
              other collections too, and will be cleared there as well.
            </li>
          )}
          <li className="text-muted">Ratings and notes are kept.</li>
        </ul>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Mark {affected} {affected === 1 ? 'story' : 'stories'} unread
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ConfirmClearCollection
