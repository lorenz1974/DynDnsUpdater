/**
 * @file App.jsx
 * @author Lorenzo Lione <https://github.com/lorenz1974>
 * @description Main application component for DynDNS Updater
 * @version 0.3.2
 * @created April 2025
 * @license MIT
 *
 * This is the root component that orchestrates the application's functionality.
 * It acts as the central coordinator between custom hooks and UI components,
 * managing data flow and user interactions throughout the application.
 */

import React, { useEffect, useCallback } from 'react'
import { Card } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@/App.css'

// Import components using aliases
// Each component has a specific responsibility for a clean separation of concerns
import AppContainer from '@components/AppContainer'
import AppHeader from '@components/AppHeader'
import DynDnsForm from '@components/DynDnsForm'
import StatusDisplay from '@components/StatusDisplay'
import AppFooter from '@components/AppFooter'

// Import custom hooks using aliases
// These hooks encapsulate the core business logic separate from UI rendering
import useDynDnsUpdater from '@hooks/useDynDnsUpdater'
import useRefreshTimer from '@hooks/useRefreshTimer'

/**
 * Refresh interval options in seconds
 * These values provide a range of refresh frequencies from 15 seconds to 60 minutes
 * @type {Object[]}
 */
const REFRESH_INTERVALS = [
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 45, label: '45 seconds' },
  { value: 60, label: '1 minute' },
  { value: 180, label: '3 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '60 minutes' },
]

/**
 * Main application component for DynDNS Updater
 *
 * This component:
 * 1. Integrates custom hooks for business logic
 * 2. Coordinates data flow between components
 * 3. Manages auto-refresh functionality
 * 4. Connects UI events to business logic functions
 * 5. Structures the component hierarchy
 *
 * The App component follows a "Smart Container" pattern - it contains most of the
 * application logic and state, while passing data and callbacks down to presentational
 * components that focus primarily on rendering the UI.
 *
 * @returns {JSX.Element} The rendered application component
 */
const App = () => {
  // Use the DynDNS updater hook to manage IP and DynDNS state
  // This hook contains all business logic related to DynDNS updates
  const dynDns = useDynDnsUpdater()

  // Callback for timer refresh action
  // This will be called when the timer completes each interval
  const handleTimerRefresh = useCallback(() => {
    console.log('🔄 Auto refresh triggered')
    dynDns.checkAndUpdateIp()
  }, [dynDns])

  // Use the refresh timer hook to manage automatic updates
  // This hook handles all timer-related functionality with proper cleanup
  // Note how we only enable the timer when form data is complete
  const refreshTimer = useRefreshTimer(
    dynDns.refreshInterval,
    handleTimerRefresh,
    dynDns.isFormDataComplete
  )

  // Handler for refresh interval changes from the UI
  // This keeps both the timer and storage settings in sync
  const handleRefreshIntervalChange = useCallback(
    (e) => {
      const newInterval = parseInt(e.target.value, 10)
      // Update the interval in both timer and storage
      refreshTimer.setInterval(newInterval)
      dynDns.setRefreshInterval(newInterval)
    },
    [refreshTimer, dynDns]
  )

  // Effect to perform initial IP check when component mounts
  // This provides a smoother user experience with auto-checking
  useEffect(() => {
    dynDns.performInitialCheck()
  }, [dynDns])

  // Component rendering using the extracted components
  // Each component receives only the props it needs following
  // the principle of least privilege
  return (
    <AppContainer>
      <AppHeader />
      <Card.Body className='p-3 p-md-4'>
        <DynDnsForm
          formData={dynDns.formData}
          onInputChange={dynDns.handleInputChange}
          onSubmit={dynDns.handleSubmit}
          forceUpdate={dynDns.forceUpdate}
          onForceUpdateChange={dynDns.handleForceUpdateChange}
          isLoading={dynDns.isLoading}
          currentIp={dynDns.currentIp}
          storedIp={dynDns.storedIp}
          refreshInterval={dynDns.refreshInterval}
          refreshIntervals={REFRESH_INTERVALS}
          onRefreshIntervalChange={handleRefreshIntervalChange}
          timeUntilRefresh={refreshTimer.formattedTimeRemaining}
        />
        <StatusDisplay
          currentIp={dynDns.currentIp}
          storedIp={dynDns.storedIp}
          status={dynDns.status}
          isLoading={dynDns.isLoading}
        />
      </Card.Body>
      <AppFooter />
    </AppContainer>
  )
}

export default App
