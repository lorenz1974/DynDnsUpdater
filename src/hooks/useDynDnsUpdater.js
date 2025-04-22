/**
 * @file useDynDnsUpdater.js
 * @description Custom hook for managing DynDNS updates and IP address monitoring
 *
 * This hook serves as the central controller for the application, implementing the core business
 * logic for detecting IP changes and updating DynDNS records. It manages form state, coordinates
 * API calls, and provides status feedback for the UI components.
 */

import { useState, useCallback, useRef } from 'react'
import * as DynDnsService from '@components/DynDnsService'
import useLocalStorage from '@hooks/useLocalStorage'

// Constants for localStorage and default settings
const LOCAL_STORAGE_KEY = 'dyndnsData'

/**
 * Custom hook for managing DynDNS updates and IP monitoring
 *
 * This hook implements the central business logic for the DynDNS Updater application:
 * - Form state management with persistence
 * - IP detection and comparison
 * - DynDNS update requests
 * - Status and error handling
 * - Auto-refresh coordination
 *
 * @returns {Object} - State and functions for managing DynDNS updates
 */
const useDynDnsUpdater = () => {
    // Form data saved in localStorage for persistence between sessions
    // This ensures user credentials and settings are remembered
    const [savedData, setSavedData] = useLocalStorage(LOCAL_STORAGE_KEY, {
        hostname: '',
        username: '',
        password: '',
        storedIp: '',
        refreshInterval: 300, // Default to 5 minutes
    })

    // Form data state with initial values from localStorage
    // We use separate state to avoid unnecessary localStorage writes during typing
    const [formData, setFormData] = useState({
        hostname: savedData.hostname || '',
        username: savedData.username || '',
        password: savedData.password || '',
    })

    // IP address states track both the current detected IP and the last known stored IP
    // Keeping these separate allows for comparison to determine if an update is needed
    const [currentIp, setCurrentIp] = useState('')
    const [storedIp, setStoredIp] = useState(savedData.storedIp || '')

    // Status message states for user feedback
    // These are separated from other state to allow for targeted UI updates
    const [status, setStatus] = useState({ message: '', type: '' })
    const [isLoading, setIsLoading] = useState(false)
    const [forceUpdate, setForceUpdate] = useState(false)

    // Initialization flag prevents multiple automatic checks on startup
    // Using a ref instead of state avoids triggering re-renders
    const initialCheckDone = useRef(false)

    /**
     * Checks if form data is complete with all required fields
     *
     * This validation ensures we don't attempt API calls with incomplete data
     *
     * @returns {boolean} - true if data is complete, false otherwise
     */
    const isFormDataComplete = useCallback(() => {
        return !!(formData.hostname && formData.username && formData.password)
    }, [formData])

    /**
     * Handles changes in form inputs with standardized field naming
     *
     * Automatically converts form IDs to appropriate field names by
     * removing the 'form' prefix and converting to lowercase
     *
     * @param {Event} e - Input change event
     */
    const handleInputChange = useCallback((e) => {
        const { id, value } = e.target
        setFormData((prev) => ({
            ...prev,
            // Remove 'form' prefix from IDs like 'formHostname' -> 'hostname'
            [id.replace('form', '').toLowerCase()]: value,
        }))
    }, [])

    /**
     * Handles changes in the Force Update checkbox
     *
     * When enabled, this allows updates even when the IP hasn't changed
     *
     * @param {Event} e - Checkbox change event
     */
    const handleForceUpdateChange = useCallback((e) => {
        setForceUpdate(e.target.checked)
    }, [])

    /**
     * Updates saved data in localStorage
     *
     * This function persists the current form data, stored IP, and refresh interval
     * to ensure settings are remembered between sessions
     */
    const updateSavedData = useCallback(() => {
        setSavedData({
            ...formData,
            storedIp,
            refreshInterval: savedData.refreshInterval,
        })
    }, [formData, storedIp, savedData.refreshInterval, setSavedData])

    /**
     * Fetches the current IP from ipinfo.io service
     *
     * Uses the DynDnsService module to abstract the actual API call,
     * and updates the UI state with the result
     *
     * @returns {Promise<string|null>} - The current IP or null if error
     */
    const fetchCurrentIp = useCallback(async () => {
        try {
            const data = await DynDnsService.fetchCurrentIp()
            if (!data) {
                throw new Error('Failed to fetch IP data')
            }
            setCurrentIp(data.ip)
            return data.ip
        } catch (error) {
            console.error('❌ Error retrieving IP:', error)
            setStatus({
                message: 'Unable to retrieve current IP address',
                type: 'danger',
            })
            return null
        }
    }, [])

    /**
     * Checks if IP needs updating and performs update if necessary
     *
     * This is the core function that:
     * 1. Validates form data completeness
     * 2. Fetches the current IP
     * 3. Compares with stored IP
     * 4. Performs DynDNS update if needed or forced
     * 5. Updates UI with status messages
     *
     * @returns {Promise<void>}
     */
    const checkAndUpdateIp = useCallback(async () => {
        // Don't proceed if required form data is missing
        if (!isFormDataComplete()) return

        // Set loading state to true before starting operation
        // This provides immediate feedback to the user
        setIsLoading(true)

        try {
            const ip = await fetchCurrentIp()
            if (!ip) {
                setIsLoading(false)
                return
            }

            // Perform update if IP has changed or force update is selected
            // This avoids unnecessary API calls when the IP hasn't changed
            if (ip !== storedIp || forceUpdate) {
                const result = await DynDnsService.updateDynDns(
                    formData.hostname,
                    formData.username,
                    formData.password,
                    ip
                )

                if (result.success) {
                    setStoredIp(ip)
                    setStatus({
                        message: result.message,
                        type: 'success',
                    })
                } else {
                    setStatus({
                        message: result.message,
                        type: 'danger',
                    })
                }
            } else {
                setStatus({
                    message: 'IP address is already up-to-date.',
                    type: 'success',
                })
            }
        } catch (error) {
            console.error('❌ Error during update process:', error)
            setStatus({
                message: `An unexpected error occurred: ${error.message}`,
                type: 'danger',
            })
        } finally {
            // Update saved data regardless of success/failure
            // to ensure we persist any new IP information
            updateSavedData()

            // Always set loading state to false when complete
            // This ensures the UI returns to interactive state
            setIsLoading(false)
        }
    }, [formData, storedIp, forceUpdate, fetchCurrentIp, isFormDataComplete, updateSavedData])

    /**
     * Handles form submission to update DynDNS
     *
     * Prevents default form submission behavior and ensures
     * we don't start multiple simultaneous update processes
     *
     * @param {Event} e - Form submit event
     */
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        // Only proceed if not already loading
        // This prevents multiple simultaneous requests
        if (!isLoading) {
            await checkAndUpdateIp()
        }
    }, [isLoading, checkAndUpdateIp])

    /**
     * Sets the refresh interval and persists it to localStorage
     *
     * This allows the UI to control how frequently automatic updates occur
     *
     * @param {number} newInterval - New interval in seconds
     */
    const setRefreshInterval = useCallback((newInterval) => {
        setSavedData(prev => ({
            ...prev,
            refreshInterval: newInterval
        }))
    }, [setSavedData])

    /**
     * Performs initial IP check if credentials are available
     *
     * This function runs once when the component mounts to
     * automatically check IP status if credentials are present
     */
    const performInitialCheck = useCallback(() => {
        if (isFormDataComplete() && !initialCheckDone.current) {
            console.log('🔄 Automatic IP check on startup')
            initialCheckDone.current = true
            checkAndUpdateIp()
        }
    }, [isFormDataComplete, checkAndUpdateIp])

    return {
        // State values
        formData,
        currentIp,
        storedIp,
        status,
        isLoading,
        forceUpdate,
        refreshInterval: savedData.refreshInterval,
        isFormDataComplete: isFormDataComplete(),

        // Event handlers
        handleInputChange,
        handleForceUpdateChange,
        handleSubmit,
        setRefreshInterval,

        // Action methods
        fetchCurrentIp,
        checkAndUpdateIp,
        performInitialCheck,
    }
}

export default useDynDnsUpdater