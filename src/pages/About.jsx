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
  // Counts run over distinct works, not the raw catalog: a collection and the
  // short stories inside it are the same reading, so counting both would
  // inflate every figure on this page.
  const { distinctWorks, types, characters, yearRange } = useStories()
  const countOf = (type) => distinctWorks.filter((s) => s.type === type).length

  return (
    <>
      <h1 className="mb-3">About Agatha Christie</h1>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Body>
              <p className="lead">
                Dame Agatha Christie (1890&ndash;1976) is the best-selling fiction writer of all
                time. As of 2020 her novels had sold more than two billion copies in 44 languages,
                and she remains the most-translated individual author on record.
              </p>
              <p>
                She was born Agatha Mary Clarissa Miller in Torquay, Devon, the youngest of three
                children in a wealthy upper-middle-class family, and described her childhood as
                &ldquo;very happy.&rdquo; Educated at home at her mother&rsquo;s insistence, she was
                reading by the age of four and wrote her first poem at ten. Her father died when she
                was eleven &mdash; a loss she later said marked the end of her childhood.
              </p>
              <p>
                During the First World War she served with the Voluntary Aid Detachment of the
                British Red Cross, working 3,400 hours at the Town Hall Red Cross Hospital in
                Torquay, first as a nurse and then as a dispenser after qualifying as an
                apothecary&rsquo;s assistant. That knowledge of poisons runs through the fiction:
                arsenic, aconite, strychnine, digitalis, nicotine, and thallium all dispatch victims
                across her career, and she had no need of the invented poisons forbidden by the
                genre&rsquo;s conventions.
              </p>
              <p>
                She wrote her first detective novel, <em>The Mysterious Affair at Styles</em>, in
                1916. It introduced Hercule Poirot &mdash; a former Belgian police officer with
                &ldquo;magnificent moustaches&rdquo; and a head &ldquo;exactly the shape of an
                egg&rdquo; &mdash; a character drawn from the Belgian refugees she encountered in
                Torquay. Rejected by several publishers, it finally appeared in {yearRange.min}.
              </p>
              <p>
                Over the following five decades she wrote the novels, short stories, and plays
                cataloged here, alongside romances published under the name Mary Westmacott. Her
                play <em>The Mousetrap</em> opened in London in 1952 and became the longest-running
                stage production in history. She was appointed CBE in 1956 and promoted to Dame
                Commander of the Order of the British Empire in 1971, and died at home in
                Oxfordshire on 12 January 1976, aged 85. On her death, two West End theatres dimmed
                their outside lights in her honour.
              </p>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>Her recurring detectives</Card.Header>
            <ListGroup variant="flush">
              {characters.map((character) => {
                const count = distinctWorks.filter((s) => s.character === character).length
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
                  {distinctWorks.filter((s) => !s.character).length} stories
                </span>
              </ListGroup.Item>
            </ListGroup>
          </Card>

          <Card className="mb-4">
            <Card.Header>The eleven days</Card.Header>
            <Card.Body>
              <p>
                In August 1926, months after her mother&rsquo;s death, Christie&rsquo;s husband
                Archie asked for a divorce; he had fallen in love with Nancy Neele. On the evening of
                3 December, after a quarrel, Christie disappeared from their home in Sunningdale. Her
                car was found the next morning parked above a chalk quarry at Newlands Corner, an
                expired driving licence and some clothes still inside.
              </p>
              <p>
                The search became a national spectacle. More than 1,000 police officers, 15,000
                volunteers, and several aeroplanes combed the countryside; a newspaper offered a
                &pound;100 reward, and Sir Arthur Conan Doyle gave a spirit medium one of
                Christie&rsquo;s gloves. The story reached the front page of{' '}
                <em>The New York Times</em>.
              </p>
              <p className="mb-0">
                She was found eleven days later at a hotel in Harrogate, 184 miles north, registered
                under the surname of her husband&rsquo;s lover. Two doctors diagnosed genuine memory
                loss; her biographers variously attribute it to a fugue state, a nervous breakdown,
                or a deliberate act. Her autobiography never mentions it.
              </p>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>Archaeology and the later years</Card.Header>
            <Card.Body>
              <p>
                After her divorce she took the Orient Express to Istanbul and on to Baghdad. On a
                return visit to a dig in Iraq in 1930 she met the archaeologist Max Mallowan,
                thirteen years her junior; they married in Edinburgh that September and remained
                together until her death. She joined his expeditions for decades, and the travel
                furnished the settings for several novels &mdash; including{' '}
                <em>Murder on the Orient Express</em>, drawn from her own experience of
                international rail.
              </p>
              <p className="mb-0">
                During the Second World War she worked in the pharmacy at University College
                Hospital in London, updating her knowledge of poisons. It had a curious afterlife: in
                1977, medical staff who had read <em>The Pale Horse</em> solved a thallium poisoning
                case by recognising the symptoms she had described.
              </p>
            </Card.Body>
          </Card>

          <Alert variant="light" className="border small mb-0">
            Biographical detail on this page is drawn from the Wikipedia article on Agatha Christie.
            Catalog figures alongside it are computed from the scraped data, not typed in.
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
              {/* Sums the rows above. Collections are not listed as a format --
                  they hold short stories that are already counted -- so this
                  must not use the raw catalog length or it would exceed the
                  visible breakdown by the 20 collections. */}
              <ListGroup.Item className="d-flex justify-content-between bg-body-secondary">
                <span>Total</span>
                <strong>{distinctWorks.length}</strong>
              </ListGroup.Item>
              <ListGroup.Item className="d-flex justify-content-between">
                <span>Published</span>
                <strong>
                  {yearRange.min}&ndash;{yearRange.max}
                </strong>
              </ListGroup.Item>
            </ListGroup>
          </Card>

          <Card className="mb-4">
            <Card.Header>Poirot and Marple</Card.Header>
            <Card.Body className="small">
              <p>
                Poirot appeared in 33 novels and more than 50 short stories. Christie tired of him
                &mdash; by the end of the 1930s she found him &ldquo;insufferable,&rdquo; and by the
                1960s &ldquo;an egocentric creep&rdquo; &mdash; but unlike Conan Doyle she never
                killed off her detective while he was still popular. In 1975 he became the first
                fictional character to receive an obituary on the front page of{' '}
                <em>The New York Times</em>.
              </p>
              <p>
                Miss Marple debuted in short stories in 1927 and went on to appear in 12 novels and
                20 stories. Christie modelled her partly on her step-grandmother, who
                &ldquo;always expected the worst of everyone and everything, and&hellip; usually
                proved right.&rdquo;
              </p>
              <p className="mb-0 text-muted">
                The two never share a story. Christie explained that Poirot, &ldquo;a complete
                egoist, would not like&hellip; having suggestions made to him by an elderly spinster
                lady.&rdquo;
              </p>
            </Card.Body>
          </Card>

          <Card>
            <Card.Body>
              <Card.Title as="h2" className="h6">
                About this data
              </Card.Title>
              <Card.Text className="small text-muted">
                Catalog information is drawn from agathachristie.com. Counts cover Christie&rsquo;s
                own writing, including posthumous collections, so they run higher than the commonly
                cited 66 novels. The Mary Westmacott romances, the Detection Club collaborations,
                and novels by other authors are tracked separately under Extras.
              </Card.Text>
              <Link to="/checklist" className="small d-block">
                Browse the full checklist &rarr;
              </Link>
              <Link to="/extras" className="small">
                Browse the extras &rarr;
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default About
