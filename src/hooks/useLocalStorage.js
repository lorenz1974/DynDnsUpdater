/**
 * @file useLocalStorage.js
 * @description Custom hook for managing data persistence in localStorage with React integration
 *
 * This hook provides a seamless interface between React state and localStorage,
 * allowing components to use persistent storage with the same API as useState.
 * It handles serialization/deserialization, error recovery, and synchronization.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook that allows using localStorage as React state
 *
 * This hook provides:
 * - Automatic serialization/deserialization of JSON data
 * - Persistence between browser sessions
 * - Error recovery for storage failures
 * - Synchronized React state with localStorage
 * - Protection against infinite re-render loops
 * - Support for functional state updates (like setState)
 *
 * @param {string} key - Key to use for saving/loading from localStorage
 * @param {any} initialValue - Initial value if nothing exists in localStorage
 * @returns {Array} - [storedValue, setValue] similar to useState API
 */
const useLocalStorage = (key, initialValue) => {
    // Use ref to store the key to avoid re-initializing when key is the same object with same values
    // This prevents unnecessary re-renders and initialization when passing an object key
    const keyRef = useRef(key);

    // Function to get the initial value from localStorage or use default
    // This is extracted as a callback to be reusable in the useEffect for key changes
    const initialize = useCallback(() => {
        try {
            // Attempt to retrieve and parse data from localStorage
            const item = localStorage.getItem(keyRef.current)
            // Return parsed item if it exists, otherwise return initialValue
            return item ? JSON.parse(item) : initialValue
        } catch (error) {
            // Log error and gracefully fall back to initialValue
            console.error('❌ Error loading data from localStorage:', error)
            return initialValue
        }
    }, [initialValue]);

    // State to store the current value
    // Using the initialize callback directly in useState ensures we only
    // try to access localStorage once during initialization
    const [storedValue, setStoredValue] = useState(initialize)

    // Update key ref if it changes
    // This ensures we always use the current key when saving/loading
    useEffect(() => {
        keyRef.current = key;
    }, [key]);

    // Function to update both state and localStorage
    // We don't include storedValue in the dependencies to prevent
    // unnecessary recreation of this function on every state change
    // This was identified as a key cause of potential infinite loops
    const setValue = useCallback(
        (value) => {
            try {
                // Allows passing a function like setState
                // This maintains compatibility with React's setState API
                const valueToStore = value instanceof Function ? value(storedValue) : value

                // Update React state first for immediate UI feedback
                setStoredValue(valueToStore)

                // Then persist to localStorage for persistence across sessions
                localStorage.setItem(keyRef.current, JSON.stringify(valueToStore))
            } catch (error) {
                // Log error but don't crash if localStorage fails
                console.error('❌ Error saving data to localStorage:', error)
            }
        },
        [] // We removed dependencies to prevent the function from being recreated
    );

    // Synchronize the value if key changes (rare but possible)
    // This effect ensures that if the key changes, we load the value
    // for the new key from localStorage
    useEffect(() => {
        const newValue = initialize();
        // Only update if value actually changed to prevent infinite loops
        // This JSON comparison prevents unnecessary state updates
        if (JSON.stringify(newValue) !== JSON.stringify(storedValue)) {
            setStoredValue(newValue);
        }
    }, [key, initialize]);

    return [storedValue, setValue]
}

export default useLocalStorage