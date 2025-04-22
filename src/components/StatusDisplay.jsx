/**
 * @file StatusDisplay.jsx
 * @description Component to display IP status information
 */

import React from 'react'
import { Row, Col, Alert, Spinner } from 'react-bootstrap'

/**
 * Component to display IP status information
 *
 * @param {Object} props - Component props
 * @param {string} props.currentIp - Current detected IP address
 * @param {string} props.storedIp - Stored IP address in DynDNS
 * @param {Object} props.status - Status message information
 * @param {boolean} props.isLoading - Flag indicating if a request is in progress
 * @returns {JSX.Element} The rendered status component
 */
const StatusDisplay = ({ currentIp, storedIp, status, isLoading }) => {
  return (
    <>
      <Row className='mt-4 text-center'>
        <Col>
          <strong>Current IP:</strong>{' '}
          {isLoading && !currentIp ? (
            <Spinner animation='border' size='sm' role='status' />
          ) : (
            currentIp || 'Waiting...'
          )}
        </Col>
      </Row>
      <Row className='text-center'>
        <Col>
          <strong>Registered IP:</strong>{' '}
          {isLoading && !storedIp ? (
            <Spinner animation='border' size='sm' role='status' />
          ) : (
            storedIp || 'Not registered'
          )}
        </Col>
      </Row>
      {status.message && (
        <Row className='mt-3'>
          <Col>
            <Alert variant={status.type} className='shadow-sm'>
              {isLoading ? (
                <div className='d-flex align-items-center'>
                  <Spinner
                    animation='border'
                    size='sm'
                    role='status'
                    className='me-2'
                  />
                  <span>Processing request...</span>
                </div>
              ) : (
                status.message
              )}
            </Alert>
          </Col>
        </Row>
      )}
    </>
  )
}

export default StatusDisplay
