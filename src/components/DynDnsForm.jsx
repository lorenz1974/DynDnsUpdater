/**
 * @file DynDnsForm.jsx
 * @description Form component for DynDNS settings with conditional submit button state
 */

import React, { useState } from 'react'
import { Form, Button, Spinner, InputGroup } from 'react-bootstrap'

/**
 * Form component for DynDNS settings
 * Renders a form with hostname, username, password fields and a force update checkbox.
 * The submit button is disabled when:
 * 1. Any required field is empty, or
 * 2. A request is currently loading, or
 * 3. Current IP equals stored IP and force update is not checked
 *
 * @param {Object} props - Component props
 * @param {Object} props.formData - Form field values containing hostname, username and password
 * @param {Function} props.onInputChange - Handler for input changes in form fields
 * @param {Function} props.onSubmit - Handler for form submission
 * @param {boolean} props.forceUpdate - Flag to force update regardless of IP change
 * @param {Function} props.onForceUpdateChange - Handler for force update checkbox change
 * @param {boolean} props.isLoading - Flag indicating if a request is in progress
 * @param {string} props.currentIp - Currently detected IP address
 * @param {string} props.storedIp - IP address stored in DynDNS/localStorage
 * @param {number} props.refreshInterval - Current refresh interval in seconds
 * @param {Array} props.refreshIntervals - Available refresh interval options
 * @param {Function} props.onRefreshIntervalChange - Handler for refresh interval changes
 * @param {string} props.timeUntilRefresh - Formatted time remaining until next refresh
 * @returns {JSX.Element} The rendered form component
 */
const DynDnsForm = ({
  formData,
  onInputChange,
  onSubmit,
  forceUpdate,
  onForceUpdateChange,
  isLoading,
  currentIp,
  storedIp,
  refreshInterval,
  refreshIntervals,
  onRefreshIntervalChange,
  timeUntilRefresh,
}) => {
  const [showPassword, setShowPassword] = useState(false)

  /**
   * Determines if the update button should be disabled
   * The button should be disabled if:
   * - Form is incomplete (any required field is empty)
   * - A request is currently in progress
   * - Current IP matches stored IP and force update is not enabled
   *
   * @type {boolean}
   */
  const isUpdateDisabled =
    isLoading ||
    !formData.hostname ||
    !formData.username ||
    !formData.password ||
    // Disable if IPs match and force update is not checked
    (currentIp && storedIp && currentIp === storedIp && !forceUpdate)

  /**
   * Get button tooltip text based on disabled state
   * Provides user feedback about why the button might be disabled
   *
   * @type {string}
   */
  const getButtonTooltip = () => {
    if (!formData.hostname || !formData.username || !formData.password) {
      return 'All fields are required'
    } else if (isLoading) {
      return 'Update in progress'
    } else if (
      currentIp &&
      storedIp &&
      currentIp === storedIp &&
      !forceUpdate
    ) {
      return 'IP is already up-to-date. Check "Force update" to update anyway'
    }
    return ''
  }

  return (
    <Form onSubmit={onSubmit}>
      <Form.Group className='mb-3' controlId='hostname'>
        <Form.Label className='form-label'>Hostname</Form.Label>
        <Form.Control
          type='text'
          placeholder='Enter hostname'
          value={formData.hostname}
          onChange={onInputChange}
          disabled={isLoading}
          required
        />
      </Form.Group>

      <Form.Group className='mb-3' controlId='username'>
        <Form.Label className='form-label'>Username</Form.Label>
        <Form.Control
          type='text'
          placeholder='Enter username'
          value={formData.username}
          onChange={onInputChange}
          disabled={isLoading}
          required
        />
      </Form.Group>

      <Form.Group className='mb-3' controlId='password'>
        <Form.Label className='form-label'>Password</Form.Label>
        <InputGroup>
          <Form.Control
            type={showPassword ? 'text' : 'password'}
            placeholder='Enter password'
            value={formData.password}
            onChange={onInputChange}
            disabled={isLoading}
            required
          />
          <Button
            variant='outline-secondary'
            onClick={() => setShowPassword((v) => !v)}
            disabled={isLoading}
            type='button'
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </Button>
        </InputGroup>
      </Form.Group>

      <Form.Group className='mb-3' controlId='refreshInterval'>
        <Form.Label className='form-label'>Auto-refresh Interval</Form.Label>
        <Form.Select
          value={refreshInterval}
          onChange={onRefreshIntervalChange}
          disabled={isLoading}
          aria-label='Select refresh interval'
        >
          {refreshIntervals.map((interval) => (
            <option key={interval.value} value={interval.value}>
              {interval.label}
            </option>
          ))}
        </Form.Select>
        <Form.Text className='text-muted'>
          Next refresh in: {timeUntilRefresh}
        </Form.Text>
      </Form.Group>

      <Form.Group className='mb-3' controlId='forceUpdate'>
        <Form.Check
          type='checkbox'
          checked={forceUpdate}
          onChange={onForceUpdateChange}
          disabled={isLoading}
          label='Force update'
        />
        {currentIp && storedIp && currentIp === storedIp && (
          <Form.Text className='text-muted'>
            IP addresses are identical. Force update to proceed anyway.
          </Form.Text>
        )}
      </Form.Group>

      <Button
        variant='secondary'
        type='submit'
        disabled={isUpdateDisabled}
        className='w-100 mt-2'
        title={getButtonTooltip()}
      >
        {isLoading ? (
          <>
            <Spinner
              as='span'
              animation='border'
              size='sm'
              role='status'
              aria-hidden='true'
              className='me-2'
            />
            Updating...
          </>
        ) : (
          'Update DynDNS'
        )}
      </Button>
    </Form>
  )
}

export default DynDnsForm
