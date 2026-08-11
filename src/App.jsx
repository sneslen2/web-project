import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Checklist from './pages/Checklist.jsx'
import Statistics from './pages/Statistics.jsx'
import Story from './pages/Story.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import CatalogGate from './components/CatalogGate.jsx'
import { useAuth } from './auth/AuthProvider.jsx'

function App() {
  const { session, username, signOut } = useAuth()
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
            The Christie Project
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
              {/* NavLink adds an "active" class on the matching route. */}
              <Nav.Link as={NavLink} to="/" end>
                Home
              </Nav.Link>
              <Nav.Link as={NavLink} to="/checklist">
                Checklist
              </Nav.Link>
              <Nav.Link as={NavLink} to="/statistics">
                Statistics
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about">
                About Christie
              </Nav.Link>
            </Nav>

            <Nav>
              {session ? (
                <div className="d-flex align-items-center gap-2">
                  <Navbar.Text className="text-truncate" style={{ maxWidth: '14rem' }}>
                    {username}
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
          {/* CatalogGate holds each catalog-dependent page until the Supabase
              fetch resolves, and shows one shared error/empty state instead of
              five copies. Login and NotFound don't need the catalog. */}
          <Route
            path="/"
            element={
              <CatalogGate>
                <Home />
              </CatalogGate>
            }
          />
          <Route
            path="/checklist"
            element={
              <CatalogGate>
                <Checklist />
              </CatalogGate>
            }
          />
          <Route
            path="/statistics"
            element={
              <CatalogGate>
                <Statistics />
              </CatalogGate>
            }
          />
          <Route
            path="/about"
            element={
              <CatalogGate>
                <About />
              </CatalogGate>
            }
          />
          {/* A checklist card opens into this. The slug comes from the story's
              agathachristie.com URL; Story renders a not-found state if it
              doesn't resolve. */}
          <Route
            path="/story/:slug"
            element={
              <CatalogGate>
                <Story />
              </CatalogGate>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </>
  )
}

export default App
