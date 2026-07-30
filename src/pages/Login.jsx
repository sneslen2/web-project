import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import { useAuth } from '../auth/AuthProvider.jsx'

/**
 * Combined sign in / create account page. One form, one toggle -- less
 * duplication than two near-identical pages.
 */
function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Where ProtectedRoute bounced them from, if applicable.
  const destination = location.state?.from ?? '/notes'

  async function handleSubmit(event) {
    // The page is a static file with no server to POST to, so the default
    // form submission must be suppressed.
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)

    if (mode === 'signin') {
      const { error: signInError } = await signIn(email, password)
      setBusy(false)
      if (signInError) {
        setError(signInError.message)
        return
      }
      navigate(destination, { replace: true })
    } else {
      const { error: signUpError, needsEmailConfirmation } = await signUp(
        email,
        password,
      )
      setBusy(false)
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      if (needsEmailConfirmation) {
        // Account created but not yet usable -- say so rather than pretending
        // they're logged in.
        setNotice(
          `Account created. Check ${email} for a confirmation link, then sign in.`,
        )
        setMode('signin')
        setPassword('')
        return
      }
      // Email confirmation is off, so signUp already returned a session.
      navigate(destination, { replace: true })
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError(null)
    setNotice(null)
  }

  return (
    <Card className="mx-auto" style={{ maxWidth: '28rem' }}>
      <Card.Header>
        <Nav variant="tabs" activeKey={mode}>
          <Nav.Item>
            <Nav.Link eventKey="signin" onClick={() => switchMode('signin')}>
              Sign in
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="signup" onClick={() => switchMode('signup')}>
              Create account
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </Card.Header>

      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="login-email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="login-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
            />
            {mode === 'signup' && (
              <Form.Text muted>At least 6 characters.</Form.Text>
            )}
          </Form.Group>

          <Button type="submit" variant="primary" disabled={busy} className="w-100">
            {busy && (
              <Spinner as="span" animation="border" size="sm" className="me-2" />
            )}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}

export default Login
