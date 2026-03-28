# DynDNS Updater

**Version 0.4.8** — A Progressive Web Application built with React and React Bootstrap that automatically updates your device's IP address using the DynDNS service.

> For detailed architecture documentation, module signatures, and event flow diagrams see [ARCHITECTURE.md](ARCHITECTURE.md).

## Overview

DynDNS Updater is a lightweight, client-side application that helps maintain your dynamic DNS entries up-to-date by automatically detecting IP address changes and updating your DynDNS records accordingly.

The production deployment is served at `/dyndnsupdater/` (all lowercase, case-sensitive). The Vite `base` config and `DynDnsService.getBasePath()` must match this path.

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

The application follows a well-structured architecture that separates concerns between UI components and business logic hooks. All UI is built with **React Bootstrap** components (`Card`, `Badge`, `Stack`, `Form`, `Alert`, `Spinner`, etc.) — no raw HTML elements with manually written Bootstrap class strings.

### Component Hierarchy and Relationships

```
App (Root Container)
└── AppContainer          → Container + Card (shadow)
      ├── AppHeader        → Card.Header (bg-secondary)
      ├── Card.Body        → (in App.jsx)
      │     ├── DynDnsForm    → Form / InputGroup / Button / Spinner
      │     └── StatusDisplay → Card (bg-light) + Badge + Stack + Alert
      └── AppFooter        → Card.Footer
```

### Data Flow and Component Interactions

The application follows a unidirectional data flow pattern:

1. **App Component (Container)**: Acts as the central orchestrator that:

   - Initialises and integrates the custom hooks
   - Passes state and callbacks to child components
   - Coordinates interactions between components

2. **Custom Hooks (Business Logic)**:

   - `useDynDnsUpdater`: Manages form state, IP detection, and DynDNS updates
   - `useRefreshTimer`: Handles auto-refresh timing and countdown display
   - `useLocalStorage`: Provides data persistence across sessions

3. **UI Components (Presentation)**:
   - Receive data and callbacks as props from the App component
   - Render the UI using React Bootstrap components
   - Forward user actions back to the App component via callbacks

This architecture provides several benefits:

- Clean separation between business logic and UI
- Improved testability of individual components
- Better code organisation and maintainability
- Reusable hooks that can be shared across components

### Core Components

#### `App.jsx`

The main application container that orchestrates the component hierarchy and serves as the central state coordination point. It integrates `useDynDnsUpdater` and `useRefreshTimer`, distributes props to child components, and wraps the two main sections in a `Card.Body`.

```javascript
return (
  <AppContainer>
    <AppHeader />
    <Card.Body className='p-3 p-md-4'>
      <DynDnsForm {...formProps} />
      <StatusDisplay {...statusProps} />
    </Card.Body>
    <AppFooter />
  </AppContainer>
)
```

**Why it's structured this way**: The App component follows the "Smart Container" pattern, centralising application logic while delegating UI rendering to specialised child components.

#### `AppContainer.jsx`

Wraps the entire application in a Bootstrap `Container` (for centering and max-width) and a `Card` (for the white card surface with shadow).

**Why it's used**: Isolating layout concerns in a dedicated component keeps the rest of the tree clean and makes responsive adjustments straightforward.

#### `AppHeader.jsx`

Renders a `Card.Header` with the application title, styled with Bootstrap's secondary colour scheme.

**Why it's used**: Leveraging `Card.Header` ensures the title integrates correctly with the surrounding `Card` border and padding.

#### `DynDnsForm.jsx`

The primary user interface for inputting DynDNS credentials and configuration. Built entirely with React Bootstrap components:

```javascript
// Key features
- Form.Group / Form.Control / Form.Label for each field
- InputGroup for password field with Show/Hide toggle
- Form.Select for the auto-refresh interval
- Form.Check for the force-update toggle
- Button + Spinner for the submit action
```

**Why it's structured this way**: This component isolates all form-related concerns, making it straightforward to update validation logic or add new fields without touching the rest of the application.

#### `StatusDisplay.jsx`

Presents real-time information about the application's state using React Bootstrap components:

```javascript
// Structure
- Card (border-0, bg-light)  →  IP address area
  └── Stack (horizontal)
        ├── Current IP label + value
        ├── Badge (Synced / Changed, pill)
        └── Registered IP label + value
- Alert  →  status messages and errors
```

**Why it's used**: Separating status display from other components allows for focused updates and keeps the IP comparison logic contained in one place.

#### `AppFooter.jsx`

Renders a `Card.Footer` with version and release date sourced from `package.json`.

**Why it's used**: `Card.Footer` provides the correct border and background automatically, eliminating the need for manual styling classes.

#### `DynDnsService.js`

A service module (not a React component) that encapsulates API communication logic:

```javascript
// Core functionality
- IP address detection using external services
- DynDNS update protocol implementation
- Error handling and response parsing
- Authentication header management
```

**Why it's structured this way**: Isolating all external API interactions makes it easy to update API endpoints, modify authentication methods, or handle changes in the DynDNS protocol without affecting any UI component.

### Custom Hooks

#### `useLocalStorage.js`

A specialised hook for persistent data storage that provides:

```javascript
// Implementation details
- Automatic serialisation/deserialisation of JSON data
- Value persistence across browser sessions
- Synchronisation with React state
- Error handling for storage failures
- Default values when no stored data exists
```

**Why it's used**: This hook abstracts away the complexities of `localStorage`, offering an interface similar to React's `useState` but with persistence.

#### `useRefreshTimer.js`

A sophisticated timer management hook that:

```javascript
// Advanced features
- Maintains accurate countdown display (MM:SS)
- Handles proper cleanup to prevent memory leaks
- Supports dynamic interval changes
- Enables pause/resume functionality
- Self-corrects for time drift
```

**Why it's structured this way**: Using refs and careful effect management, this hook solves the complex problem of integrating timer functionality with React's lifecycle.

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

**Why it's used**: Encapsulating the core application logic here separates it from presentation concerns, keeping the App component clean and making the logic independently testable.

## Component Calling Sequence

When the application starts, components are initialised in this sequence:

1. **App Component Initialisation**:

   ```javascript
   const App = () => {
     const dynDns = useDynDnsUpdater()

     const refreshTimer = useRefreshTimer(
       dynDns.refreshInterval,
       () => dynDns.checkAndUpdateIp(),
       dynDns.isFormDataComplete
     )

     useEffect(() => {
       dynDns.performInitialCheck()
     }, [dynDns])

     return (
       <AppContainer>
         <AppHeader />
         <Card.Body className='p-3 p-md-4'>
           <DynDnsForm {...formProps} />
           <StatusDisplay {...statusProps} />
         </Card.Body>
         <AppFooter />
       </AppContainer>
     )
   }
   ```

2. **On Form Submission**:

   ```javascript
   // DynDnsForm -> App -> useDynDnsUpdater -> DynDnsService
   onSubmit={(e) => {
     e.preventDefault()
     dynDns.handleSubmit(e)
   }}
   ```

3. **During Auto-Refresh**:
   ```javascript
   // useRefreshTimer -> App -> useDynDnsUpdater -> DynDnsService
   timerRef.current = setInterval(() => {
     if (countdownRef.current <= 0) {
       callbackRef.current() // dynDns.checkAndUpdateIp()
     }
   }, 1000)
   ```

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
6. **State Persistence**: Saves credentials and last known IP to `localStorage`
7. **UI Feedback**: Updates `StatusDisplay` with results

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

Each error type has specific recovery strategies, user feedback messages, and logging behaviours.

## Security Considerations

The application makes several security trade-offs:

- **Credential storage**: Credentials are stored in `localStorage`, which is accessible to JavaScript in the same origin. This convenience comes with the understanding that physical device access could compromise credentials.

- **Authentication forwarding**: The PHP proxy forwards authentication headers rather than storing credentials server-side, eliminating the need for backend database security.

- **No sensitive operations**: The application only updates IP addresses, limiting potential security impact.

These decisions balance usability and security for a single-purpose utility application.

## Browser Compatibility

The application works on major modern browsers (Chrome, Firefox, Safari, Edge) on both desktop and mobile platforms.

## License

MIT
