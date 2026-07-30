import { Link } from 'react-router-dom'
import Button from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Row from 'react-bootstrap/Row'
import { useStories } from '../data/StoriesProvider.jsx'
import { STATUS, useProgress } from '../progress/ProgressProvider.jsx'

function Home() {
  const { get } = useProgress()
  const { stories } = useStories()

  const readCount = stories.filter((s) => get(s.slug).status === STATUS.READ).length
  const readingCount = stories.filter((s) => get(s.slug).status === STATUS.READING).length
  // Guard the divisor: CatalogGate normally prevents an empty catalog reaching
  // here, but NaN in a progress bar is a bad failure mode to leave possible.
  const pct = stories.length ? Math.round((readCount / stories.length) * 100) : 0

  // Next unread in publication order -- the obvious "what now?" answer.
  const nextUp = stories
    .filter((s) => get(s.slug).status === STATUS.UNREAD)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))[0]

  return (
    <>
      <Card className="mb-4 bg-dark text-light border-0">
        <Card.Body className="py-5 text-center">
          <h1 className="display-5">The Christie Project</h1>
          <p className="lead mb-4">
            Track your way through Agatha Christie&rsquo;s complete works &mdash; {stories.length}{' '}
            novels, collections, plays, and short stories.
          </p>
          <Button as={Link} to="/checklist" variant="light" size="lg">
            Open the checklist
          </Button>
        </Card.Body>
      </Card>

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-baseline mb-2">
            <Card.Title as="h2" className="h5 mb-0">
              Your progress
            </Card.Title>
            <span className="text-muted">
              {readCount} of {stories.length} read
              {readingCount > 0 && `, ${readingCount} in progress`}
            </span>
          </div>
          <ProgressBar now={pct} label={pct >= 8 ? `${pct}%` : ''} style={{ height: '1.5rem' }} />

          {nextUp && (
            <p className="mt-3 mb-0">
              <span className="text-muted">Next in publication order: </span>
              <Link to={`/story/${encodeURIComponent(nextUp.slug)}`}>{nextUp.title}</Link>{' '}
              <span className="text-muted">({nextUp.year})</span>
            </p>
          )}
        </Card.Body>
      </Card>

      <Row className="g-3">
        {[
          {
            title: 'Checklist',
            body: 'Every story, filterable by format, detective, decade, and reading status.',
            to: '/checklist',
            cta: 'Browse stories',
          },
          {
            title: 'My statistics',
            body: 'Completion by format and detective, average rating, and what you finished recently.',
            to: '/statistics',
            cta: 'See statistics',
          },
          {
            title: 'About Agatha Christie',
            body: 'A short introduction to the best-selling novelist of all time and her recurring detectives.',
            to: '/about',
            cta: 'Read about her',
          },
        ].map((card) => (
          <Col md={4} key={card.title}>
            <Card className="h-100">
              <Card.Body className="d-flex flex-column">
                <Card.Title as="h3" className="h6">
                  {card.title}
                </Card.Title>
                <Card.Text className="flex-grow-1 text-muted small">{card.body}</Card.Text>
                <Button as={Link} to={card.to} variant="outline-primary" size="sm">
                  {card.cta}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  )
}

export default Home
