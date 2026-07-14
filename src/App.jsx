import { Routes, Route, Link, NavLink } from 'react-router-dom'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'

import Home from './pages/Home.jsx'
import About from './pages/About.jsx'
import Counter from './pages/Counter.jsx'

function App() {
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
        </Routes>
      </Container>
    </>
  )
}

export default App
