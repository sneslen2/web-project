import { Link } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'

function Home() {
  return (
    <>
      <h1 className="mb-3">Home</h1>

      <Alert variant="success">
        This is a pure client-side React SPA — no server, no Next.js. It's ready
        to host on GitHub Pages.
      </Alert>

      <Card>
        <Card.Body>
          <Card.Title>Getting started</Card.Title>
          <Card.Text>
            Use the navigation bar to move between pages. Routing is handled
            entirely in the browser, so links never hit a server.
          </Card.Text>
          <Button as={Link} to="/counter" variant="primary">
            Try the Counter
          </Button>
        </Card.Body>
      </Card>
    </>
  )
}

export default Home
