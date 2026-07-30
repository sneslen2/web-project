import { useCallback, useEffect, useState } from 'react'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import ListGroup from 'react-bootstrap/ListGroup'
import Spinner from 'react-bootstrap/Spinner'
import { supabase } from '../supabaseClient.js'
import { useAuth } from '../auth/AuthProvider.jsx'

/**
 * SCAFFOLDING -- a deliberately generic "items" feature.
 *
 * `items` is a placeholder for whatever this app ends up storing. Rename the
 * table, the columns, and this component when the real domain is known; the
 * Supabase call shapes below stay the same.
 *
 * Three things make the per-user isolation work, and they're the parts worth
 * copying:
 *
 *  1. Queries carry no "where user_id = me" filter. RLS applies that on the
 *     server, so a tampered client still cannot read another user's rows.
 *  2. Inserts set `user_id` explicitly, because the RLS insert policy checks it
 *     against auth.uid().
 *  3. Errors are surfaced, not swallowed. An RLS rejection arrives here as an
 *     ordinary error, and ignoring it just looks like "the button does nothing".
 */
function Items() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data, error: selectError } = await supabase
      .from('items')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })

    if (selectError) {
      setError(selectError.message)
    } else {
      setError(null)
      setItems(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  async function handleAdd(event) {
    // No server to POST to on a static host, so stop the default submit.
    event.preventDefault()
    const title = draft.trim()
    if (!title) return

    setSaving(true)
    const { data, error: insertError } = await supabase
      .from('items')
      // user_id must be set explicitly: the RLS policy requires it to equal
      // auth.uid(). The column also defaults to auth.uid() in the schema, so
      // this is belt and braces.
      .insert({ title, user_id: user.id })
      .select('id, title, created_at')
      .single()

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setError(null)
    setDraft('')
    // Prepend, matching the newest-first order of the query above.
    setItems((current) => [data, ...current])
  }

  async function handleDelete(id) {
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setError(null)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return (
    <>
      <h1 className="mb-3">My Items</h1>
      <p className="text-muted">
        Signed in as <strong>{user.email}</strong>. These rows are visible only
        to this account.
      </p>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleAdd}>
            <InputGroup>
              <Form.Control
                placeholder="Add an item…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Item title"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !draft.trim()}
              >
                {saving ? 'Saving…' : 'Add'}
              </Button>
            </InputGroup>
          </Form>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading items…</span>
          </Spinner>
        </div>
      ) : items.length === 0 ? (
        <Alert variant="secondary">No items yet. Add one above.</Alert>
      ) : (
        <ListGroup>
          {items.map((item) => (
            <ListGroup.Item
              key={item.id}
              className="d-flex justify-content-between align-items-start gap-3"
            >
              <div>
                <div>{item.title}</div>
                <small className="text-muted">
                  {new Date(item.created_at).toLocaleString()}
                </small>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </Button>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </>
  )
}

export default Items
