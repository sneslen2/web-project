import Alert from 'react-bootstrap/Alert'
import Spinner from 'react-bootstrap/Spinner'
import { useStories } from '../data/StoriesProvider.jsx'

/**
 * Renders children only once the catalog has loaded.
 *
 * The catalog now comes from Supabase, so every page that reads it has three
 * states rather than one. This centralises the two uninteresting ones.
 */
function CatalogGate({ children }) {
  const { loading, error, stale, stories } = useStories()

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading the catalog…</span>
        </Spinner>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Couldn&rsquo;t load the catalog</Alert.Heading>
        <p>{error.message}</p>
        {error.hint && <p>{error.hint}</p>}
        <hr />
        <p className="mb-0 small">
          The story list is fetched from Supabase, with a cached copy in{' '}
          <code>catalog.json</code> as a fallback. Both were unavailable.
          {error.raw !== error.message && (
            <>
              {' '}
              Underlying error: <code>{error.raw}</code>
            </>
          )}
        </p>
      </Alert>
    )
  }

  // Schema applied but the import never run -- a blank page would be baffling,
  // so name the actual fix.
  if (stories.length === 0) {
    return (
      <Alert variant="warning">
        <Alert.Heading>The catalog is empty</Alert.Heading>
        <p className="mb-0">
          The <code>stories</code> table has no rows yet. Run{' '}
          <code>node scripts/import-stories.mjs</code> to load it.
        </p>
      </Alert>
    )
  }

  // Served from the snapshot. The catalog is readable, but anything needing a
  // live database -- signing in, saving progress -- will still fail, so say so
  // rather than letting those look like unrelated bugs.
  if (stale) {
    return (
      <>
        <Alert variant="warning" className="py-2 small">
          Showing a cached copy of the catalog &mdash; the database is unreachable (a free-tier
          Supabase project pauses after about a week of inactivity). Browsing works; signing in and
          saving progress will not.
        </Alert>
        {children}
      </>
    )
  }

  return children
}

export default CatalogGate
