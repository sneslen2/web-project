import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Dropdown from 'react-bootstrap/Dropdown'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Checklist from './pages/Checklist.jsx'
import Extras from './pages/Extras.jsx'
import Statistics from './pages/Statistics.jsx'
import Story from './pages/Story.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import CatalogGate from './components/CatalogGate.jsx'
import ScrollToTop from './ScrollToTop.jsx'
import { useHoverMenu } from './useHoverMenu.js'
import { useAuth } from './auth/AuthProvider.jsx'
import brandMark from './assets/keyhole.svg'

function App() {
  const { session, username, signOut } = useAuth()
  const navigate = useNavigate()
  const checklistMenu = useHoverMenu()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <>
      <Navbar variant="dark" expand="md" sticky="top" className="ch-navbar">
        <Container>
          <Navbar.Brand as={Link} to="/" className="ch-brand">
            {/* Decorative: the adjacent wordmark already names the site. */}
            <img src={brandMark} alt="" className="ch-brand-mark" />
            The Christie <em>Project</em>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
              {/* NavLink adds an "active" class on the matching route. */}
              <Nav.Link as={NavLink} to="/" end className="ch-nav-link">
                Home
              </Nav.Link>
              {/* Split rather than a plain Dropdown: Checklist stays a
                  one-click destination, and the caret opens the Extras
                  submenu beside it. Opens on hover; see useHoverMenu for why
                  closing is delayed. */}
              <div className="ch-nav-split" {...checklistMenu.hostProps}>
                <Nav.Link as={NavLink} to="/checklist" className="ch-nav-link">
                  Checklist
                </Nav.Link>
                <Dropdown align="end" show={checklistMenu.show} onToggle={checklistMenu.setShow}>
                  <Dropdown.Toggle
                    as="button"
                    type="button"
                    className="ch-nav-caret"
                    aria-label="More checklists"
                  />
                  <Dropdown.Menu variant="dark" className="ch-nav-menu">
                    <Dropdown.Item as={NavLink} to="/checklist" end>
                      Main catalog
                    </Dropdown.Item>
                    <Dropdown.Item as={NavLink} to="/extras">
                      Extras
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
              <Nav.Link as={NavLink} to="/statistics" className="ch-nav-link">
                Statistics
              </Nav.Link>
              <Nav.Link as={NavLink} to="/about" className="ch-nav-link">
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
                <Nav.Link as={NavLink} to="/login" className="ch-nav-link">
                  Sign in
                </Nav.Link>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Resets scroll on navigation, and restores it on Back. */}
      <ScrollToTop />

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
          {/* Westmacott, Detection Club, and other-author works. Tracked with
              the same progress store, counted separately. */}
          <Route
            path="/extras"
            element={
              <CatalogGate>
                <Extras />
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
