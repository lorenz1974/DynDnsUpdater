/**
 * @file AppContainer.jsx
 * @description Container component for the application layout
 */

import React from 'react'
import { Container } from 'react-bootstrap'

/**
 * Container component that wraps the application
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} The rendered container component
 */
const AppContainer = ({ children }) => {
  return (
    <Container
      className='p-4 rounded shadow-sm bg-light w-100'
      style={{ maxWidth: '600px' }}
    >
      {children}
    </Container>
  )
}

export default AppContainer
