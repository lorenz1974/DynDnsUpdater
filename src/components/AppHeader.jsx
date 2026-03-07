/**
 * @file AppHeader.jsx
 * @description Header component for the application
 */

import React from 'react'
import { Card } from 'react-bootstrap'

/**
 * Header component rendered as a Bootstrap Card.Header
 *
 * @returns {JSX.Element} The rendered header component
 */
const AppHeader = () => {
  return (
    <Card.Header className='text-center py-3 bg-secondary text-white'>
      <h3 className='mb-0 fs-4'>DynDNS Updater</h3>
    </Card.Header>
  )
}

export default AppHeader
