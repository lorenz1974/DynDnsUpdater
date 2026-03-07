/**
 * @file StatusDisplay.jsx
 * @description Component to display IP status information
 */

import React from 'react'
import { Card, Badge, Stack, Alert, Spinner } from 'react-bootstrap'

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
  const ipMatch = currentIp && storedIp && currentIp === storedIp

  return (
    <>
      <Card className='mt-3 border-0 bg-light'>
        <Card.Body className='py-2 px-3'>
          <Stack
            direction='horizontal'
            className='justify-content-between align-items-center'
          >
            {/* Current IP */}
            <div>
              <div className='ip-label'>Current IP</div>
              <div className='ip-value'>
                {isLoading && !currentIp ? (
                  <Spinner animation='border' size='sm' role='status' />
                ) : (
                  currentIp || '—'
                )}
              </div>
            </div>

            {/* Sync status badge — visible only when both IPs are known */}
            {currentIp && storedIp && (
              <Badge
                bg={ipMatch ? 'success' : 'warning'}
                text={ipMatch ? undefined : 'dark'}
                pill
              >
                {ipMatch ? 'Synced' : 'Changed'}
              </Badge>
            )}

            {/* Registered IP */}
            <div className='text-end'>
              <div className='ip-label'>Registered IP</div>
              <div className='ip-value'>
                {isLoading && !storedIp ? (
                  <Spinner animation='border' size='sm' role='status' />
                ) : (
                  storedIp || '—'
                )}
              </div>
            </div>
          </Stack>
        </Card.Body>
      </Card>

      {status.message && (
        <Alert variant={status.type} className='mt-3'>
          {isLoading ? (
            <Stack direction='horizontal' gap={2}>
              <Spinner animation='border' size='sm' role='status' />
              <span>Processing request...</span>
            </Stack>
          ) : (
            status.message
          )}
        </Alert>
      )}
    </>
  )
}

export default StatusDisplay
