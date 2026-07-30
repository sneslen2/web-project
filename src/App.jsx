import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Counter from './pages/Counter.jsx'
import Login from './pages/Login.jsx'
import Items from './pages/Items.jsx'
import { useAuth } from './auth/AuthProvider.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'

function App() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="md" sticky="top">
        <Container>
          <Navbar.Brand as={Link} to="/">
            React + Bootstrap SPA
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
              {/* NavLink adds an "active" class on the matching route. */}
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about">
                About
              </Nav.Link>
              <Nav.Link as={NavLink} to="/counter">
                Counter
              </Nav.Link>
              {/* Only advertise the protected page once it's reachable. */}
              {session && (
                <Nav.Link as={NavLink} to="/items">
                  My Items
                </Nav.Link>
              )}
            </Nav>

            <Nav>
              {session ? (
                <div className="d-flex align-items-center gap-2">
                  <Navbar.Text className="text-truncate" style={{ maxWidth: '14rem' }}>
                    {session.user.email}
                  </Navbar.Text>
                  <Button variant="outline-light" size="sm" onClick={handleSignOut}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <Nav.Link as={NavLink} to="/login">
                  Sign in
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-4">
        {/* Declarative routing: each path renders one page component. */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/counter" element={<Counter />} />
          <Route path="/login" element={<Login />} />
          {/* ProtectedRoute redirects to /login when there's no session. The
              real enforcement is the RLS policies on the table, not this. */}
          <Route
            path="/items"
            element={
              <ProtectedRoute>
                <Items />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Container>
    </>
  )
}

export default App
