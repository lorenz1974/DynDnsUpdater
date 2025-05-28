<?php
/**
 * DynDNS Proxy Script
 *
 * This script acts as a proxy between the client-side DynDNS Updater application
 * and various DynDNS service providers. It forwards requests to the specified
 * DynDNS service and returns the response to the client.
 *
 * @author Lorenzo Lione <https://github.com/lorenz1974>
 * @version 1.1.1
 * @license MIT
 */

// Set appropriate headers to allow cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
header('Content-Type: text/plain');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log function for debugging purposes
function logMessage($message) {
    // Set to true to enable logging
    $enableLogging = false;

    if ($enableLogging) {
        $logFile = __DIR__ . '/dyndns_proxy.log';
        $timestamp = date('[Y-m-d H:i:s]');
        file_put_contents($logFile, "$timestamp $message" . PHP_EOL, FILE_APPEND);
    }
}

// Get all headers from the current request - renamed to avoid conflicts
function getRequestHeaders() {
    $headers = [];

    // Use getallheaders() function if available
    if (function_exists('getallheaders')) {
        return getallheaders();
    }

    // Otherwise manually extract headers from $_SERVER
    foreach ($_SERVER as $name => $value) {
        if (substr($name, 0, 5) === 'HTTP_') {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$name] = $value;
        } elseif ($name === 'CONTENT_TYPE' || $name === 'CONTENT_LENGTH') {
            $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', $name))));
            $headers[$name] = $value;
        }
    }

    return $headers;
}

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo "Method Not Allowed";
    exit;
}

// Get request parameters
$targetUrl = isset($_GET['targetUrl']) ? $_GET['targetUrl'] : 'https://members.dyndns.org/nic/update';
$hostname = isset($_GET['hostname']) ? $_GET['hostname'] : '';
$myip = isset($_GET['myip']) ? $_GET['myip'] : '';
$wildcard = isset($_GET['wildcard']) ? $_GET['wildcard'] : 'NOCHG';
$mx = isset($_GET['mx']) ? $_GET['mx'] : 'NOCHG';
$backmx = isset($_GET['backmx']) ? $_GET['backmx'] : 'NOCHG';

// Validate required parameters
if (empty($hostname) || empty($myip)) {
    http_response_code(400);
    echo "Bad Request: Missing required parameters";
    logMessage("Missing required parameters: hostname or myip");
    exit;
}

// Validate target URL
if (!filter_var($targetUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo "Bad Request: Invalid target URL";
    logMessage("Invalid target URL: $targetUrl");
    exit;
}

// Get all headers from the original request
$requestHeaders = getRequestHeaders();

// Get the authorization header specifically
$authHeader = '';
if (isset($requestHeaders['Authorization'])) {
    $authHeader = $requestHeaders['Authorization'];
} elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    // Some server configurations use this instead
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
    // Handle PHP_AUTH_USER and PHP_AUTH_PW
    $authHeader = 'Basic ' . base64_encode($_SERVER['PHP_AUTH_USER'] . ':' . $_SERVER['PHP_AUTH_PW']);
}

// Build the query string for the DynDNS request
$queryParams = [
    'hostname' => $hostname,
    'myip' => $myip,
    'wildcard' => $wildcard,
    'mx' => $mx,
    'backmx' => $backmx
];
$queryString = http_build_query($queryParams);

// Construct the final URL
$finalUrl = $targetUrl . (strpos($targetUrl, '?') !== false ? '&' : '?') . $queryString;

// Log the request
logMessage("Making request to: $finalUrl");

// Check if cURL extension is available
$response = null;
$httpCode = 500;
$error = '';

if (function_exists('curl_init')) {
    // Use cURL if available
    // Initialize cURL session
    $ch = curl_init();

    // Set cURL options
    curl_setopt($ch, CURLOPT_URL, $finalUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'DynDNS-Proxy/1.1.1');

    // Prepare headers to forward
    $forwardHeaders = [];

    // Add authorization header if present
    if (!empty($authHeader)) {
        $forwardHeaders[] = "Authorization: $authHeader";
        logMessage("Authorization header found and will be forwarded");
    } else {
        logMessage("No Authorization header found in the request");
    }

    // Forward other relevant headers
    if (!empty($requestHeaders['User-Agent'])) {
        curl_setopt($ch, CURLOPT_USERAGENT, $requestHeaders['User-Agent']);
    }

    if (!empty($requestHeaders['Accept'])) {
        $forwardHeaders[] = "Accept: " . $requestHeaders['Accept'];
    }

    if (!empty($requestHeaders['Accept-Language'])) {
        $forwardHeaders[] = "Accept-Language: " . $requestHeaders['Accept-Language'];
    }

    // Debug log for all headers being forwarded
    if (!empty($forwardHeaders)) {
        logMessage("Forwarding headers: " . json_encode($forwardHeaders));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $forwardHeaders);
    }

    // Execute the request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);

    // Close cURL session
    curl_close($ch);
} else {
    // Use file_get_contents as a fallback when cURL is not available
    logMessage("cURL not available, using file_get_contents() instead");

    try {
        // Create a stream context with the necessary options
        $opts = [
            'http' => [
                'method' => 'GET',
                'timeout' => 30,
                'follow_location' => 1,
                'user_agent' => 'DynDNS-Proxy/1.1.1',
            ]
        ];

        // Add authorization header if present
        if (!empty($authHeader)) {
            if (!isset($opts['http']['header'])) {
                $opts['http']['header'] = '';
            }
            $opts['http']['header'] .= "Authorization: $authHeader\r\n";
            logMessage("Authorization header found and will be forwarded");
        }

        // Forward other relevant headers
        if (!empty($requestHeaders['User-Agent'])) {
            $opts['http']['user_agent'] = $requestHeaders['User-Agent'];
        }

        if (!empty($requestHeaders['Accept'])) {
            if (!isset($opts['http']['header'])) {
                $opts['http']['header'] = '';
            }
            $opts['http']['header'] .= "Accept: " . $requestHeaders['Accept'] . "\r\n";
        }

        if (!empty($requestHeaders['Accept-Language'])) {
            if (!isset($opts['http']['header'])) {
                $opts['http']['header'] = '';
            }
            $opts['http']['header'] .= "Accept-Language: " . $requestHeaders['Accept-Language'] . "\r\n";
        }

        // Create a stream context
        $context = stream_context_create($opts);

        // Get the response
        $response = file_get_contents($finalUrl, false, $context);

        // Get HTTP status code from headers
        if (isset($http_response_header[0])) {
            preg_match('{HTTP/\S*\s(\d{3})}', $http_response_header[0], $match);
            $httpCode = $match[1] ?? 200;
        } else {
            $httpCode = 200;
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        $httpCode = 500;
        $response = false;
    }
}

// Check for request errors
if ($response === false) {
    http_response_code(500);
    echo "Error: " . $error;
    logMessage("Request error: $error");
    exit;
}

// Set the response status code to match the DynDNS server's response
http_response_code($httpCode);

// Log the response
logMessage("Response: HTTP $httpCode - $response");

// Return the response from the DynDNS server
echo $response;
?>