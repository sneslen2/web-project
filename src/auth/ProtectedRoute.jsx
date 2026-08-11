import { Navigate, useLocation } from 'react-router-dom'
import Spinner from 'react-bootstrap/Spinner'
import { useAuth } from './AuthProvider.jsx'

/**
 * Gate for pages that require a signed-in user.
 *
 *   <Route element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
 *
 * Note this is a convenience for the *UI* only -- it stops the page rendering,
 * not the data being fetched. The actual access control lives in the Row Level
 * Security policies on the database, which a client cannot talk its way past.
 */
export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Still restoring the persisted session; don't decide yet.
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading…</span>
        </Spinner>
      </div>
    )
  }

  if (!session) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
