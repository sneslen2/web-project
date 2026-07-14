import { useState } from 'react'
import Badge from 'react-bootstrap/Badge'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Card from 'react-bootstrap/Card'

function Counter() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1 className="mb-3">Counter</h1>
      <Card style={{ maxWidth: '24rem' }}>
        <Card.Body className="text-center">
          <Card.Title>
            Count: <Badge bg="primary">{count}</Badge>
          </Card.Title>
          <ButtonGroup className="mt-2">
            <Button variant="outline-secondary" onClick={() => setCount((c) => c - 1)}>
              −
            </Button>
            <Button variant="outline-danger" onClick={() => setCount(0)}>
              Reset
            </Button>
            <Button variant="outline-success" onClick={() => setCount((c) => c + 1)}>
              +
            </Button>
          </ButtonGroup>
        </Card.Body>
      </Card>
    </>
  )
}

export default Counter
