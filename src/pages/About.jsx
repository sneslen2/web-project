import ListGroup from 'react-bootstrap/ListGroup'

function About() {
  const stack = [
    'React + JavaScript (no TypeScript, no Next.js)',
    'Vite — build tool and dev server',
    'react-bootstrap + bootstrap — UI components and styling',
    'react-router-dom — declarative client-side routing (HashRouter)',
  ]

  return (
    <>
      <h1 className="mb-3">About</h1>
      <p>This dummy project demonstrates the following stack:</p>
      <ListGroup>
        {stack.map((item) => (
          <ListGroup.Item key={item}>{item}</ListGroup.Item>
        ))}
      </ListGroup>
    </>
  )
}

export default About
