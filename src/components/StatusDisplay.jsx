/**
 * @file StatusDisplay.jsx
 * @description Component to display IP status information
 */

import React from 'react'
import { Alert, Spinner } from 'react-bootstrap'

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
      <div className='ip-status-card bg-white p-3 rounded shadow-sm mt-4'>
        <div className='d-flex justify-content-between align-items-center gap-2'>
          {/* Current IP */}
          <div className='text-start'>
            <div className='ip-label'>Current IP</div>
            <div className='ip-value'>
              {isLoading && !currentIp ? (
                <Spinner animation='border' size='sm' role='status' />
              ) : (
                currentIp || '—'
              )}
            </div>
          </div>

          {/* Sync status badge — shown only when both IPs are known */}
          {currentIp && storedIp && (
            <div className='text-center flex-shrink-0'>
              <span
                className={`badge rounded-pill ${ipMatch ? 'bg-success' : 'bg-warning text-dark'}`}
              >
                {ipMatch ? 'Synced' : 'Changed'}
              </span>
            </div>
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
        </div>
      </div>

      {status.message && (
        <Alert variant={status.type} className='shadow-sm mt-3'>
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
      )}
    </>
  )
}

export default StatusDisplay
