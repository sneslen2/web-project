import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import Nav from 'react-bootstrap/Nav'
import Spinner from 'react-bootstrap/Spinner'
import { useAuth } from '../auth/AuthProvider.jsx'
import { validateUsername } from '../auth/username.js'

/**
 * Combined sign in / create account page. One form, one toggle -- less
 * duplication than two near-identical pages.
 */
function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [username, setUsername] = useState('')
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

    // Validated up front: an invalid username would otherwise come back from
    // the API as a confusing complaint about the email address it was turned
    // into, which the user never typed.
    const usernameProblem = validateUsername(username)
    if (usernameProblem) {
      setError(usernameProblem)
      return
    }

    setBusy(true)

    if (mode === 'signin') {
      const { error: signInError } = await signIn(username, password)
      setBusy(false)
      if (signInError) {
        // Supabase phrases this as "Invalid login credentials" for a wrong
        // password AND for an account that does not exist. Restate it in terms
        // of what was actually typed.
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'That username and password do not match an account.'
            : signInError.message,
        )
        return
      }
      navigate(destination, { replace: true })
    } else {
      const { error: signUpError, needsEmailConfirmation } = await signUp(
        username,
        password,
      )
      setBusy(false)
      if (signUpError) {
        setError(
          signUpError.message === 'User already registered'
            ? 'That username is already taken.'
            : signUpError.message,
        )
        return
      }
      if (needsEmailConfirmation) {
        // Usernames map to addresses at a domain that cannot receive mail, so
        // a confirmation link can never arrive. This is a misconfiguration,
        // not something the user can resolve -- say so plainly.
        setError(
          'The account was created but cannot be used until email confirmation ' +
            'is turned off for this project in the Supabase dashboard ' +
            '(Authentication → Providers → Email).',
        )
        return
      }
      // Confirmation is off, so signUp already returned a session.
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
          <Form.Group className="mb-3" controlId="login-username">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              // Phones default to capitalising the first letter, which would
              // silently change the username the user thinks they typed.
              autoCapitalize="none"
              spellCheck="false"
            />
            {mode === 'signup' && (
              <Form.Text muted>
                3&ndash;30 characters: letters, numbers, dots, underscores, hyphens.
              </Form.Text>
            )}
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
