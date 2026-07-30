import { Link } from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'

function NotFound() {
  return (
    <Card body className="text-center py-5">
      <h1 className="h3">Page not found</h1>
      <p className="text-muted">
        That route doesn&rsquo;t exist &mdash; a rare unsolved case.
      </p>
      <div>
        <Button as={Link} to="/" variant="primary">
          Back to home
        </Button>
      </div>
    </Card>
  )
}

export default NotFound
