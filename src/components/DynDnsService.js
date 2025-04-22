/**
 * @file DynDnsService.js
 * @description Service module for managing DynDNS API operations and IP detection
 *
 * This service handles all external API communication, including IP detection and
 * DynDNS updates. It implements environment-specific paths for development vs production
 * environments and provides detailed error handling for each API response.
 */

// Constants for URLs and paths
export const IP_INFO_ENDPOINT = 'https://ipinfo.io/json';
export const DYNDNS_DEV_PATH = '/nic/update';
export const DYNDNS_PROD_PATH = '/dyndns-proxy.php';

/**
 * Determines if the app is running in development mode based on the hostname
 *
 * This function is used to determine which approach to use for API calls:
 * - In development: Use Vite's built-in proxy to handle CORS
 * - In production: Use the PHP proxy script
 *
 * @returns {boolean} - true if in development mode, false otherwise
 */
export const isDevelopment = () => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname.startsWith('localhost:') || hostname === '127.0.0.1';
};

/**
 * Gets the base path of the application
 *
 * Handles cases where the app is deployed in a subdirectory instead of at the root.
 * In real environments, this would ideally be configured via environment variables.
 *
 * @returns {string} - The base path of the application
 */
export const getBasePath = () => {
    // In a real scenario, we would get this from import.meta.env or similar
    return '/dyndnsupdater';
};

/**
 * Gets the appropriate URL for DynDNS update based on the environment
 *
 * This handles the different approaches needed for development vs production:
 * - Development: Uses Vite's proxy configured in vite.config.js
 * - Production: Uses the PHP proxy script with the correct base path
 *
 * @param {string} targetUrl - Optional target URL for the PHP proxy (used in production)
 * @returns {string} - The URL to use for DynDNS updates
 */
export const getDynDnsUpdatePath = (targetUrl = 'https://members.dyndns.org/nic/update') => {
    if (!isDevelopment()) {
        // In production, use the PHP proxy with the targetUrl parameter
        // We need to add the base path before the proxy path
        return `${getBasePath()}${DYNDNS_PROD_PATH}?targetUrl=${encodeURIComponent(targetUrl)}`;
    } else {
        // In development, the proxy is configured in vite.config.js and doesn't need the base path
        return DYNDNS_DEV_PATH;
    }
};

/**
 * Retrieves the current IP address from the ipinfo.io service
 *
 * Uses the ipinfo.io API which provides IP information in JSON format.
 * This separation of concerns isolates the API call from the business logic.
 *
 * @async
 * @returns {Promise<Object|null>} - Object with IP information or null if an error occurred
 */
export const fetchCurrentIp = async () => {
    try {
        const response = await fetch(IP_INFO_ENDPOINT);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('❌ Error retrieving IP:', error);
        return null;
    }
};

/**
 * Updates the DynDNS service with the new IP address
 *
 * This function:
 * 1. Validates the required inputs
 * 2. Prepares authentication and parameters
 * 3. Uses the appropriate update URL based on environment
 * 4. Makes the API request to DynDNS
 * 5. Interprets the response based on DynDNS API documentation
 *
 * @async
 * @param {string} hostname - The hostname to update
 * @param {string} user - DynDNS username
 * @param {string} passwd - DynDNS password
 * @param {string} ip - New IP address to set
 * @returns {Promise<Object>} - Result object with success status, message, and code
 */
export const updateDynDns = async (hostname, user, passwd, ip) => {
    // Validate required inputs to prevent unnecessary API calls
    if (!hostname || !user || !passwd || !ip) {
        return {
            success: false,
            message: 'All fields are required',
        };
    }

    try {
        // Create base64 encoded credentials for Basic authentication
        // DynDNS uses Basic Auth for API authentication
        const authInfo = btoa(`${user}:${passwd}`);
        const headers = {
            Authorization: `Basic ${authInfo}`,
            'User-Agent': 'React DynDNS Updater', // User-Agent helps identify the client
        };

        // Prepare the parameters according to DynDNS API requirements
        // See: https://help.dyn.com/remote-access-api/perform-update/
        const queryParams = {
            hostname,
            myip: ip,
            wildcard: 'NOCHG',  // Don't change wildcard setting
            mx: 'NOCHG',        // Don't change MX record
            backmx: 'NOCHG'     // Don't change backup MX setting
        };

        // Get the base update path based on the environment (dev/prod)
        let updateUrl = getDynDnsUpdatePath();

        // Parameter handling differs between development and production
        if (isDevelopment()) {
            // For development: add parameters to the Vite proxy path
            // Vite's proxy will forward the full URL with parameters to DynDNS
            updateUrl += '?' + new URLSearchParams(queryParams).toString();
        } else {
            // For production: add parameters for the PHP proxy
            // The PHP proxy will forward these parameters to the target URL
            Object.entries(queryParams).forEach(([key, value]) => {
                updateUrl += `&${key}=${encodeURIComponent(value)}`;
            });
        }

        console.log(`🔄 Sending DynDNS update request via ${isDevelopment() ? 'Vite proxy' : 'PHP proxy'} to:`, updateUrl);

        // Make the actual API request
        const response = await fetch(updateUrl, {
            method: 'GET',
            headers,
            credentials: 'same-origin', // Important for proxy authentication
        });

        const responseText = await response.text();
        console.log('📡 DynDNS API response:', responseText);

        // Handle HTTP errors first
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} - ${responseText}`);
        }

        // Parse the DynDNS API response codes
        // Each response code has a specific meaning according to the DynDNS API
        // Reference: https://help.dyn.com/remote-access-api/return-codes/
        if (responseText.includes('badauth')) {
            return {
                success: false,
                message: 'Authentication failed. Please check your username and password.',
                code: 'badauth'
            };
        } else if (responseText.includes('nochg')) {
            return {
                success: true,
                message: 'IP address is already up-to-date on DynDNS servers.',
                code: 'nochg',
                ip
            };
        } else if (responseText.includes('good')) {
            return {
                success: true,
                message: 'DynDNS successfully updated!',
                code: 'good',
                ip
            };
        } else if (responseText.includes('notfqdn')) {
            return {
                success: false,
                message: 'The hostname specified is not a fully-qualified domain name.',
                code: 'notfqdn'
            };
        } else if (responseText.includes('nohost')) {
            return {
                success: false,
                message: 'The hostname specified does not exist in this user account.',
                code: 'nohost'
            };
        } else if (responseText.includes('911')) {
            return {
                success: false,
                message: 'DynDNS service is temporarily unavailable.',
                code: '911'
            };
        } else if (responseText.includes('abuse')) {
            return {
                success: false,
                message: 'Account has been blocked for abuse.',
                code: 'abuse'
            };
        } else {
            // Fallback for other responses not specifically handled
            return {
                success: false,
                message: `Unexpected response from DynDNS: ${responseText}`,
                code: 'unknown'
            };
        }
    } catch (error) {
        // Catch and handle any network or other errors
        console.error('❌ DynDNS update error:', error);
        return {
            success: false,
            message: `Unable to update DynDNS: ${error.message}`,
            code: 'error'
        };
    }
};