/**
 * @file AppFooter.jsx
 * @description Footer component with application information
 */

import React from 'react'
import { Row, Col } from 'react-bootstrap'
import packageJson from '../../package.json'

/**
 * Footer component with application information
 *
 * @returns {JSX.Element} The rendered footer component
 */
const AppFooter = () => {
  const { version, releaseDate } = packageJson

  return (
    <Row className='mt-4'>
      <Col>
        <div
          className='bg-white p-3 rounded shadow-sm text-center'
          style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}
        >
          <Row className='fs-9'>
            <Col xs='12' className='mb-2'>
              &copy; {new Date().getFullYear()} DynDNS Updater - All rights
              reserved.
            </Col>
            <Col xs='12' className='mb-2'>
              <span className='me-3'>Version {version}</span>
              <span>Released on {releaseDate}</span>
            </Col>
          </Row>
        </div>
      </Col>
    </Row>
  )
}

export default AppFooter
