/**
 * @file AppContainer.jsx
 * @description Container component for the application layout
 */

import React from 'react'
import { Container, Card } from 'react-bootstrap'

/**
 * Container component that wraps the application inside a Bootstrap Card
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} The rendered container component
 */
const AppContainer = ({ children }) => {
  return (
    <Container className='px-2' style={{ maxWidth: '600px' }}>
      <Card className='shadow-sm'>{children}</Card>
    </Container>
  )
}

export default AppContainer
