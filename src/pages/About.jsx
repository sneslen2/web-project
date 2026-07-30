import { Link } from 'react-router-dom'
import Alert from 'react-bootstrap/Alert'
import Card from 'react-bootstrap/Card'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Row from 'react-bootstrap/Row'
import { useStories } from '../data/StoriesProvider.jsx'

/**
 * About Agatha Christie.
 *
 * The prose sticks to widely-documented biography. Catalog figures are computed
 * from the scraped data rather than typed in, so they can't drift out of sync
 * with the checklist.
 */
function About() {
  const { stories, types, characters, yearRange } = useStories()
  const countOf = (type) => stories.filter((s) => s.type === type).length

  return (
    <>
      <h1 className="mb-3">About Agatha Christie</h1>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Body>
              <p className="lead">
                Agatha Christie (1890&ndash;1976) is the best-selling novelist of all time, with
                billions of copies sold worldwide and translations into more than a hundred
                languages.
              </p>
              <p>
                Born Agatha Mary Clarissa Miller in Torquay, Devon, she began writing detective
                fiction after a dare from her sister Madge. Her first novel,{' '}
                <em>The Mysterious Affair at Styles</em>, was written while she volunteered in a
                hospital dispensary during the First World War &mdash; work that gave her the
                knowledge of poisons recurring throughout her fiction. It was rejected by six
                publishers before appearing in {yearRange.min}, introducing the Belgian detective
                Hercule Poirot.
              </p>
              <p>
                Over the following five decades she wrote the novels, short stories, and plays
                catalogued here, alongside romances published under the name Mary Westmacott. Her
                play <em>The Mousetrap</em> opened in London in 1952 and became the longest-running
                stage production in history.
              </p>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>Her recurring detectives</Card.Header>
            <ListGroup variant="flush">
              {characters.map((character) => {
                const count = stories.filter((s) => s.character === character).length
                return (
                  <ListGroup.Item
                    key={character}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <span>{character}</span>
                    <span className="text-muted small">{count} stories</span>
                  </ListGroup.Item>
                )
              })}
              <ListGroup.Item className="d-flex justify-content-between align-items-center">
                <span className="text-muted">Standalone (no recurring detective)</span>
                <span className="text-muted small">
                  {stories.filter((s) => !s.character).length} stories
                </span>
              </ListGroup.Item>
            </ListGroup>
          </Card>

          <Alert variant="light" className="border">
            Fuller biographical detail, and per-detective introductions, can go here. Kept brief
            for now rather than padded with unverified claims.
          </Alert>
        </Col>

        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>The catalog at a glance</Card.Header>
            <ListGroup variant="flush">
              {types.map((type) => (
                <ListGroup.Item key={type} className="d-flex justify-content-between">
                  <span>{type}</span>
                  <strong>{countOf(type)}</strong>
                </ListGroup.Item>
              ))}
              <ListGroup.Item className="d-flex justify-content-between bg-body-secondary">
                <span>Total</span>
                <strong>{stories.length}</strong>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span>Published</span>
                <strong>
                  {yearRange.min}&ndash;{yearRange.max}
                </strong>
              </ListGroup.Item>
            </ListGroup>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title as="h2" className="h6">
                About this data
              </Card.Title>
              <Card.Text className="small text-muted">
                Catalog information is drawn from agathachristie.com. Counts include some
                adaptations and Mary Westmacott titles, so they run higher than the commonly cited
                66 novels.
              </Card.Text>
              <Link to="/checklist" className="small">
                Browse the full checklist &rarr;
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default About
