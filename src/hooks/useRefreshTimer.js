/**
 * @file useRefreshTimer.js
 * @description Custom hook for managing automatic refresh timer with intelligent countdown
 *
 * This hook implements an auto-refresh mechanism with a visible countdown. It handles
 * timer cleanup on unmount, dynamic interval changes, and synchronization between
 * the timer and React's component lifecycle to prevent memory leaks and ensure
 * accurate timing behaviors.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook to manage a refresh timer with countdown
 *
 * This hook creates and manages a timer that counts down to zero and then executes
 * a callback function. Key advantages over simple setInterval:
 * - Proper cleanup to prevent memory leaks
 * - Accurate visual countdown display
 * - Supports dynamic interval changes
 * - Handles enable/disable state
 * - Manages references to prevent stale closures
 *
 * @param {number} initialInterval - Initial interval in seconds
 * @param {Function} onRefreshCallback - Function to call when timer expires
 * @param {boolean} enabled - Flag to enable/disable the timer
 * @returns {Object} - State and functions to manage the timer
 */
const useRefreshTimer = (initialInterval, onRefreshCallback, enabled = true) => {
    // State for current interval
    const [interval, setIntervalValue] = useState(initialInterval)

    // State for remaining time (visible countdown)
    const [timeRemaining, setTimeRemaining] = useState(initialInterval)

    // Refs to maintain references between renders
    // Using refs prevents issues with stale closures in the interval callback
    // and ensures the timer always has access to current values
    const timerRef = useRef(null)
    const countdownRef = useRef(initialInterval)
    const callbackRef = useRef(onRefreshCallback)
    const enabledRef = useRef(enabled)

    // Update callback ref when callback changes
    // This ensures we always call the most recent callback function
    // without having to recreate the interval
    useEffect(() => {
        callbackRef.current = onRefreshCallback
    }, [onRefreshCallback])

    // Update enabled ref when enabled flag changes
    // This allows the interval callback to check the current enabled state
    // without needing to be recreated
    useEffect(() => {
        enabledRef.current = enabled
    }, [enabled])

    /**
     * Reset timer with a new interval
     *
     * This function:
     * 1. Clears any existing timer to prevent multiple timers
     * 2. Updates the interval value if a new one is provided
     * 3. Resets the countdown to the full interval value
     * 4. Creates a new timer that runs every second
     *
     * @param {number} newInterval - New interval in seconds (optional)
     */
    const resetTimer = useCallback((newInterval = null) => {
        // Clear existing timer if present
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        // Use provided interval or current one
        const intervalToUse = newInterval !== null ? newInterval : interval

        // Update interval state if changed
        if (newInterval !== null && newInterval !== interval) {
            setIntervalValue(newInterval)
        }

        // Reset countdown
        countdownRef.current = intervalToUse
        setTimeRemaining(intervalToUse)

        // If not enabled, don't start a new timer
        if (!enabledRef.current) return

        // Set new timer that updates every second
        // Using setInterval for predictable timing with 1-second resolution
        timerRef.current = setInterval(() => {
            countdownRef.current -= 1
            setTimeRemaining(countdownRef.current)

            // When countdown reaches zero, execute callback
            if (countdownRef.current <= 0) {
                // Execute callback function
                if (typeof callbackRef.current === 'function' && enabledRef.current) {
                    callbackRef.current()
                }

                // Reset countdown for next cycle
                countdownRef.current = intervalToUse
                setTimeRemaining(intervalToUse)
            }
        }, 1000)
    }, [interval])

    /**
     * Format seconds into a readable string (MM:SS)
     *
     * Converts raw seconds into a human-readable format with
     * leading zeros for consistent display
     *
     * @param {number} seconds - Total seconds to format
     * @returns {string} - Time formatted as MM:SS
     */
    const formatTimeRemaining = useCallback((seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }, [])

    // Effect to start/stop timer when enabled state changes
    // This ensures the timer starts when enabled becomes true
    // and stops when enabled becomes false
    useEffect(() => {
        if (enabled) {
            resetTimer()
        } else if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [enabled, resetTimer])

    // Cleanup when component unmounts
    // This prevents memory leaks by ensuring the interval is cleared
    // even if the component unmounts during an active countdown
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }, [])

    return {
        interval,
        timeRemaining,
        formattedTimeRemaining: formatTimeRemaining(timeRemaining),
        setInterval: (newInterval) => {
            resetTimer(newInterval)
        },
        resetTimer,
        isRunning: !!timerRef.current
    }
}

export default useRefreshTimer