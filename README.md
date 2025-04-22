# DynDNS Updater

A Progressive Web Application built with React that automatically updates your device's IP address using the DynDNS service.

![DynDNS Updater](https://wips.plug.it/cips/tecnologia/cms/2017/04/indirizzo-ip.jpg)

## Overview

DynDNS Updater is a lightweight, client-side application that helps maintain your dynamic DNS entries up-to-date by automatically detecting IP address changes and updating your DynDNS records accordingly.

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Component Architecture and Data Flow

The application follows a well-structured architecture that separates concerns between UI components and business logic hooks:

### Component Hierarchy and Relationships

```
App (Root Container)
├── AppContainer (Layout Wrapper)
│   ├── AppHeader (Branding Component)
│   ├── DynDnsForm (User Input Component)
│   ├── StatusDisplay (Feedback Component)
│   └── AppFooter (Metadata Component)
```

### Data Flow and Component Interactions

The application follows a unidirectional data flow pattern:

1. **App Component (Container)**: Acts as the central orchestrator that:

   - Initializes and integrates the custom hooks
   - Passes state and callbacks to child components
   - Coordinates interactions between components

2. **Custom Hooks (Business Logic)**:

   - `useDynDnsUpdater`: Manages form state, IP detection, and DynDNS updates
   - `useRefreshTimer`: Handles auto-refresh timing and countdown display
   - `useLocalStorage`: Provides data persistence across sessions

3. **UI Components (Presentation)**:
   - Receive data and callbacks as props from the App component
   - Render the UI based on the current state
   - Forward user actions back to the App component via callbacks

This architecture provides several benefits:

- Clean separation between business logic and UI
- Improved testability of individual components
- Better code organization and maintainability
- Reusable hooks that can be shared across components

### Core Components

#### `App.jsx`

The main application container that orchestrates the component hierarchy and serves as the central state coordination point. It integrates the `useDynDnsUpdater` hook and distributes props to child components.

```javascript
// Key responsibilities
- Manages application state
- Handles form submission
- Coordinates between components
- Controls auto-refresh functionality
```

**Why it's structured this way**: The App component follows the "Smart Container" pattern, centralizing application logic while delegating UI rendering to specialized child components. This makes the application easier to maintain and test.

#### `AppContainer.jsx`

A layout wrapper component that provides consistent styling and structure for the application interface. Manages responsive behavior and creates visual hierarchy.

**Why it's used**: By isolating layout concerns in a dedicated component, the application maintains consistency while allowing other components to focus on their specific features.

#### `DynDnsForm.jsx`

The primary user interface for inputting DynDNS credentials and configuration:

```javascript
// Key features
- Input fields for hostname, username, and password
- Interval selection for auto-refresh timing
- Force update toggle option
- Update button with smart enabling/disabling logic
```

**Why it's structured this way**: This component isolates all form-related concerns, making it easier to update form validation logic or add new fields without affecting the rest of the application.

#### `StatusDisplay.jsx`

Presents real-time information about the application's state:

```javascript
// Information displayed
- Current IP address
- Last known IP address stored at DynDNS
- Status messages and error notifications
```

**Why it's used**: Separating status display from other components allows for more focused updates and prevents the UI from becoming cluttered.

#### `DynDnsService.js`

A service module (not a React component) that encapsulates API communication logic:

```javascript
// Core functionality
- IP address detection using external services
- DynDNS update protocol implementation
- Error handling and response parsing
- Authentication header management
```

**Why it's structured this way**: This service module isolates all external API interactions, making it easier to update API endpoints, modify authentication methods, or handle changes in the DynDNS protocol without affecting the rest of the application.

### Custom Hooks

#### `useLocalStorage.js`

A specialized hook for persistent data storage that provides:

```javascript
// Implementation details
- Automatic serialization/deserialization of JSON data
- Value persistence across browser sessions
- Synchronization with React state
- Error handling for storage failures
- Default values when no stored data exists
```

**Why it's used**: This hook abstracts away the complexities of localStorage, offering an interface similar to React's useState but with persistence. It handles edge cases like storage quotas, invalid JSON, and initialization timing, preventing common errors and reducing code duplication.

#### `useRefreshTimer.js`

A sophisticated timer management hook that:

```javascript
// Advanced features
- Maintains accurate countdown display
- Handles proper cleanup to prevent memory leaks
- Provides formatted time remaining (MM:SS)
- Supports dynamic interval changes
- Enables pause/resume functionality
- Self-corrects for time drift
```

**Why it's structured this way**: Using refs and careful effect management, this hook solves the complex problem of integrating timer functionality with React's lifecycle. It prevents memory leaks and provides a stable, accurate countdown that works reliably even when components re-render.

#### `useDynDnsUpdater.js`

The central business logic hook that:

```javascript
// Core responsibilities
- Coordinates IP detection and updates
- Manages form state and validation
- Handles update scheduling logic
- Processes API responses
- Maintains status information
- Implements error recovery strategies
```

**Why it's used**: This hook encapsulates the core application logic, separating it from presentation concerns. This makes the App component cleaner and allows the business logic to be reused or tested independently of the UI components.

## Component Calling Sequence

When the application starts, components are initialized in this sequence:

1. **App Component Initialization**:

   ```javascript
   // App.jsx (simplified)
   const App = () => {
     // Initialize the DynDNS logic hook first
     const dynDns = useDynDnsUpdater()

     // Set up timer with the refresh function from dynDns
     const refreshTimer = useRefreshTimer(
       dynDns.refreshInterval,
       () => dynDns.checkAndUpdateIp(),
       dynDns.isFormDataComplete
     )

     // Trigger initial IP check on mount
     useEffect(() => {
       dynDns.performInitialCheck()
     }, [dynDns])

     // Render the component hierarchy
     return (
       <AppContainer>
         <AppHeader />
         <DynDnsForm {...formProps} />
         <StatusDisplay {...statusProps} />
         <AppFooter />
       </AppContainer>
     )
   }
   ```

2. **On Form Submission**:

   ```javascript
   // DynDnsForm -> App -> useDynDnsUpdater -> DynDnsService
   // When user clicks "Update DynDNS":
   onSubmit={(e) => {
     e.preventDefault()
     dynDns.handleSubmit(e) // Calls checkAndUpdateIp internally
   }}
   ```

3. **During Auto-Refresh**:
   ```javascript
   // useRefreshTimer -> App -> useDynDnsUpdater -> DynDnsService
   // When timer reaches zero:
   timerRef.current = setInterval(() => {
     // When countdown reaches zero
     if (countdownRef.current <= 0) {
       // Call the refresh callback from App
       callbackRef.current() // dynDns.checkAndUpdateIp()
     }
   }, 1000)
   ```

This calling sequence ensures that:

- Business logic is centralized in custom hooks
- UI components remain focused on presentation
- Event handling follows a clear, predictable path
- The application responds appropriately to both user actions and timer events

## Implementation Details

### API Communication Flow

The update process follows this sequence:

1. **IP Detection**: Queries external services to determine the current public IP address
2. **Comparison**: Checks if detected IP differs from the last known IP
3. **Authentication**: Prepares Basic Auth headers with user credentials
4. **Update Request**: Sends update request to DynDNS via the appropriate channel:
   - In development: Through Vite's proxy to bypass CORS
   - In production: Through the PHP proxy script
5. **Response Processing**: Parses DynDNS response codes and updates application state
6. **State Persistence**: Saves credentials and last known IP to localStorage
7. **UI Feedback**: Updates status display with results

### Proxy Implementation

The `dyndns-proxy.php` script serves as a secure bridge between the client-side application and the DynDNS API:

```php
// Simplified proxy operation
1. Receives update request from client
2. Extracts authentication headers
3. Forwards request to DynDNS servers
4. Returns response back to client
```

This approach resolves cross-origin limitations while maintaining security by:

- Not storing credentials on the server
- Keeping request logic client-side
- Acting as a simple pass-through

### Auto-refresh Implementation

The auto-refresh mechanism intelligently manages updates:

```javascript
// Refresh logic
- Maintains countdown timer visible to user
- Only triggers updates when IP has changed (unless force update is enabled)
- Adjusts intervals dynamically based on user preference
- Handles background/foreground transitions gracefully
- Suspends during network errors with exponential backoff
```

### Error Handling Strategy

The application implements robust error handling:

```javascript
// Error scenarios addressed
- Network connectivity issues
- Invalid credentials
- DynDNS service limitations
- API rate limiting
- Malformed responses
- Storage access failures
```

Each error type has specific recovery strategies, user feedback messages, and logging behaviors.

## Security Considerations

The application makes several security tradeoffs:

- **Credential storage**: Credentials are stored in localStorage, which is accessible to JavaScript in the same origin. This convenience comes with the understanding that physical device access could compromise credentials.

- **Authentication forwarding**: The PHP proxy forwards authentication headers rather than storing credentials server-side, eliminating the need for backend database security.

- **No sensitive operations**: The application only updates IP addresses, limiting potential security impact.

These decisions balance usability and security for a single-purpose utility application.

## Browser Compatibility

The application works on major modern browsers (Chrome, Firefox, Safari, Edge) on both desktop and mobile platforms.

## License

MIT
