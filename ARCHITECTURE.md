# DynDNS Updater — Architecture & Application Flow

> Version 0.4.1 — Updated 2026-03-08

---

## Table of Contents

1. [Component Tree](#1-component-tree)
2. [Startup Sequence](#2-startup-sequence)
3. [Module Reference](#3-module-reference)
   - [main.jsx](#mainjs)
   - [App.jsx](#appjsx)
   - [AppContainer.jsx](#appcontainerjsx)
   - [AppHeader.jsx](#appheaderjsx)
   - [AppFooter.jsx](#appfooterjsx)
   - [DynDnsForm.jsx](#dyndnsformjsx)
   - [StatusDisplay.jsx](#statusdisplayjsx)
4. [Hook Reference](#4-hook-reference)
   - [useLocalStorage](#uselocalstoragekey-initialvalue)
   - [useDynDnsUpdater](#usedynDnsupdater)
   - [useRefreshTimer](#userefreshtimerinitialinterval-onrefreshcallback-enabled)
5. [Service Reference](#5-service-reference)
   - [DynDnsService.js](#dyndnsservicejs)
6. [Event Flows](#6-event-flows)
   - [Form Submit](#form-submit-flow)
   - [Auto-Refresh](#auto-refresh-flow)
   - [Interval Change](#interval-change-flow)
7. [State Map](#7-state-map)
8. [Proxy Strategy](#8-proxy-strategy)

---

## 1. Component Tree

```
main.jsx
└── ErrorBoundary
    └── App                          ← Smart Container (state + hooks)
        └── AppContainer             ← Layout wrapper (Container + Card)
            ├── AppHeader            ← Card.Header (static)
            ├── Card.Body
            │   ├── DynDnsForm       ← Controlled form (no local state except showPassword)
            │   └── StatusDisplay    ← Pure display (read-only props)
            └── AppFooter            ← Card.Footer (reads package.json)
```

---

## 2. Startup Sequence

```
1. main.jsx
   └─ ReactDOM.createRoot → renders <ErrorBoundary><App /></ErrorBoundary>

2. App() renders
   ├─ useDynDnsUpdater()                 ← initialises business logic hook
   │   └─ useLocalStorage('dyndnsData')  ← reads savedData from localStorage
   ├─ useCallback(handleTimerRefresh)    ← wraps dynDns.checkAndUpdateIp
   └─ useRefreshTimer(interval, cb, enabled)  ← starts countdown

3. useEffect (mount)
   └─ dynDns.performInitialCheck()
       ├─ if credentials complete → checkAndUpdateIp()
       │       ├─ DynDnsService.fetchCurrentIp()   → GET https://ipinfo.io/json
       │       ├─ compare ip vs storedIp
       │       └─ if changed → DynDnsService.updateDynDns(...)
       └─ else → no-op (waits for user input)

4. UI renders with initial state from localStorage
```

---

## 3. Module Reference

### `main.jsx`

Entry point. Wraps `<App>` in a class-based `ErrorBoundary`.

| Export | Type | Description |
|--------|------|-------------|
| `ErrorBoundary` | Class component | Catches render errors, shows red pre-formatted error message |
| *(default render)* | — | `ReactDOM.createRoot('#root').render(...)` |

---

### `App.jsx`

Smart Container. Owns no state directly — delegates entirely to hooks.

**Constants defined here:**

| Name | Type | Value |
|------|------|-------|
| `REFRESH_INTERVALS` | `Object[]` | Array of `{ value: number, label: string }` from 15 s to 3600 s |

**Hooks called:**

| Hook | Arguments | Returns (used) |
|------|-----------|----------------|
| `useDynDnsUpdater()` | — | `dynDns` object (see §4) |
| `useCallback` | `() => dynDns.checkAndUpdateIp()`, `[dynDns]` | `handleTimerRefresh` |
| `useRefreshTimer` | `dynDns.refreshInterval`, `handleTimerRefresh`, `dynDns.isFormDataComplete` | `refreshTimer` object |
| `useCallback` | interval-change handler, `[refreshTimer, dynDns]` | `handleRefreshIntervalChange` |
| `useEffect` | `() => dynDns.performInitialCheck()`, `[dynDns]` | *(side effect on mount)* |

**Props passed to children:**

`DynDnsForm` receives:
```
formData, onInputChange, onSubmit, forceUpdate, onForceUpdateChange,
isLoading, currentIp, storedIp, refreshInterval, refreshIntervals,
onRefreshIntervalChange, timeUntilRefresh
```

`StatusDisplay` receives:
```
currentIp, storedIp, status, isLoading
```

---

### `AppContainer.jsx`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Anything rendered inside the Card |

**Renders:** `<Container maxWidth=600px> → <Card shadow-sm> → {children}`

---

### `AppHeader.jsx`

No props. Renders `<Card.Header>` with static title "DynDNS Updater".

---

### `AppFooter.jsx`

No props. Reads `version` and `releaseDate` from `package.json` at build time.

**Renders:** `<Card.Footer>` with copyright, version, and release date.

---

### `DynDnsForm.jsx`

**Local state:**

| State | Initial | Description |
|-------|---------|-------------|
| `showPassword` | `false` | Toggles password field visibility |

**Props received:**

| Prop | Type | Description |
|------|------|-------------|
| `formData` | `{ hostname, username, password }` | Controlled field values |
| `onInputChange` | `(Event) => void` | Fired on every keystroke; maps `id` → field name |
| `onSubmit` | `(Event) => void` | Fired on form submit |
| `forceUpdate` | `boolean` | Checkbox state |
| `onForceUpdateChange` | `(Event) => void` | Checkbox handler |
| `isLoading` | `boolean` | Disables all inputs and button during request |
| `currentIp` | `string` | Shown as hint for "IPs identical" warning |
| `storedIp` | `string` | Used to compute `isUpdateDisabled` |
| `refreshInterval` | `number` | Selected value in the `<Form.Select>` |
| `refreshIntervals` | `Array<{value,label}>` | Options for the select |
| `onRefreshIntervalChange` | `(Event) => void` | Fires when user picks a new interval |
| `timeUntilRefresh` | `string` | Formatted `MM:SS` countdown label |

**Computed internally:**

| Variable | Logic |
|----------|-------|
| `isUpdateDisabled` | `isLoading \|\| !hostname \|\| !username \|\| !password \|\| (ipsMatch && !forceUpdate)` |

---

### `StatusDisplay.jsx`

Pure display component. No local state, no side effects.

**Props received:**

| Prop | Type | Description |
|------|------|-------------|
| `currentIp` | `string` | Current public IP (may be empty) |
| `storedIp` | `string` | IP registered in DynDNS |
| `status` | `{ message: string, type: string }` | Bootstrap Alert variant + text |
| `isLoading` | `boolean` | Shows Spinner inside IP fields and Alert |

**Renders:**
- `Card` (bg-light) with horizontal `Stack`:  Current IP | Badge (Synced/Changed) | Registered IP
- `Alert` (only when `status.message` is non-empty)

---

## 4. Hook Reference

### `useLocalStorage(key, initialValue)`

**Location:** `src/hooks/useLocalStorage.js`

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `key` | `string` | localStorage key |
| `initialValue` | `any` | Default if key is not found |

**Returns:** `[storedValue, setValue]`

| Return | Type | Description |
|--------|------|-------------|
| `storedValue` | `any` | Current value (React state, synced with localStorage) |
| `setValue` | `(value \| Function) => void` | Sets state + persists JSON to localStorage; supports functional update pattern |

**Internal state/refs:**

| Name | Type | Purpose |
|------|------|---------|
| `keyRef` | `ref<string>` | Stable reference to key, avoids re-init |
| `storedValue` | `useState` | React-reactive copy of localStorage value |

**Effects:**
1. `[key]` → updates `keyRef.current`
2. `[key, initialize]` → re-reads localStorage when key changes, updates state if value differs

---

### `useDynDnsUpdater()`

**Location:** `src/hooks/useDynDnsUpdater.js`

**Parameters:** none

**Internal state:**

| Name | Initial value | Description |
|------|---------------|-------------|
| `savedData` *(via useLocalStorage)* | `{ hostname:'', username:'', password:'', storedIp:'', refreshInterval:300 }` | Persisted credentials and settings |
| `formData` | `{ hostname, username, password }` from savedData | In-memory form state |
| `currentIp` | `''` | Last detected public IP |
| `storedIp` | `savedData.storedIp` | IP currently registered on DynDNS |
| `status` | `{ message:'', type:'' }` | Alert message for UI |
| `isLoading` | `false` | True during async operations |
| `forceUpdate` | `false` | Whether to skip IP comparison |
| `initialCheckDone` *(ref)* | `false` | Guards single initial check |

**Exposed functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `isFormDataComplete()` | — | `boolean` | `true` if hostname + username + password are all non-empty |
| `handleInputChange(e)` | `Event` | `void` | Strips `'form'` prefix from `e.target.id`, lowercases → updates `formData` |
| `handleForceUpdateChange(e)` | `Event` | `void` | Sets `forceUpdate = e.target.checked` |
| `updateSavedData()` | — | `void` | Persists `formData + storedIp + refreshInterval` to localStorage |
| `fetchCurrentIp()` | — | `Promise<string \| null>` | Calls `DynDnsService.fetchCurrentIp()`, updates `currentIp` state; returns IP string or `null` on error |
| `checkAndUpdateIp()` | — | `Promise<void>` | Full update cycle: validate → fetch IP → compare → `updateDynDns` if needed → `updateSavedData` |
| `handleSubmit(e)` | `Event` | `Promise<void>` | Prevents default, calls `checkAndUpdateIp()` if not already loading |
| `setRefreshInterval(n)` | `number` | `void` | Updates `savedData.refreshInterval` in localStorage |
| `performInitialCheck()` | — | `void` | Calls `checkAndUpdateIp()` once on mount if credentials are complete |

**Return object:**

```js
{
  // State
  formData,           // { hostname, username, password }
  currentIp,          // string
  storedIp,           // string
  status,             // { message, type }
  isLoading,          // boolean
  forceUpdate,        // boolean
  refreshInterval,    // number (from savedData)
  isFormDataComplete, // boolean (evaluated, not function ref)

  // Handlers
  handleInputChange,
  handleForceUpdateChange,
  handleSubmit,
  setRefreshInterval,

  // Actions
  fetchCurrentIp,
  checkAndUpdateIp,
  performInitialCheck,
}
```

---

### `useRefreshTimer(initialInterval, onRefreshCallback, enabled)`

**Location:** `src/hooks/useRefreshTimer.js`

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `initialInterval` | `number` | — | Countdown start value in seconds |
| `onRefreshCallback` | `Function` | — | Called when countdown reaches 0 |
| `enabled` | `boolean` | `true` | `false` stops/prevents the timer |

**Internal state/refs:**

| Name | Type | Description |
|------|------|-------------|
| `interval` | `useState<number>` | Current interval value (can change dynamically) |
| `timeRemaining` | `useState<number>` | Visible countdown in seconds |
| `timerRef` | `ref<IntervalID>` | Reference to active `setInterval` |
| `countdownRef` | `ref<number>` | Countdown value used inside the interval callback (avoids stale closure) |
| `callbackRef` | `ref<Function>` | Always points to latest `onRefreshCallback` |
| `enabledRef` | `ref<boolean>` | Always reflects latest `enabled` value |

**Effects:**
1. `[onRefreshCallback]` → updates `callbackRef.current`
2. `[enabled]` → updates `enabledRef.current`
3. `[enabled, resetTimer]` → starts timer when enabled becomes `true`, clears when `false`
4. `[]` (unmount) → clears interval to prevent memory leak

**Exposed functions:**

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `resetTimer(newInterval?)` | `number \| null` | `void` | Clears existing timer, sets new interval if provided, resets countdown, starts new `setInterval` |
| `formatTimeRemaining(seconds)` | `number` | `string` | Converts seconds → `"MM:SS"` |
| `setInterval(newInterval)` | `number` | `void` | Alias: calls `resetTimer(newInterval)` |

**Return object:**

```js
{
  interval,                // number — current interval in seconds
  timeRemaining,           // number — seconds remaining
  formattedTimeRemaining,  // string — "MM:SS"
  setInterval,             // (n: number) => void
  resetTimer,              // (n?: number) => void
  isRunning,               // boolean — true if interval is active
}
```

---

## 5. Service Reference

### `DynDnsService.js`

**Location:** `src/components/DynDnsService.js`
*(Not a React component — pure ES module with named exports)*

**Constants:**

| Name | Value |
|------|-------|
| `IP_INFO_ENDPOINT` | `'https://ipinfo.io/json'` |
| `DYNDNS_DEV_PATH` | `'/nic/update'` |
| `DYNDNS_PROD_PATH` | `'/dyndns-proxy.php'` |

---

#### `isDevelopment() → boolean`

Returns `true` if `window.location.hostname` is `localhost` or `127.0.0.1`.

---

#### `getBasePath() → string`

Returns `'/dyndnsupdater'` (hardcoded, matches the Vite `base` config).

---

#### `getDynDnsUpdatePath(targetUrl?) → string`

| Param | Type | Default |
|-------|------|---------|
| `targetUrl` | `string` | `'https://members.dyndns.org/nic/update'` |

| Environment | Returns |
|-------------|---------|
| Development | `/nic/update` (Vite proxy handles CORS) |
| Production  | `/dyndnsupdater/dyndns-proxy.php?targetUrl=<encoded>` |

---

#### `fetchCurrentIp() → Promise<Object | null>`

**Parameters:** none

**Returns:**
```js
// Success
{ ip: "1.2.3.4", ... }  // full ipinfo.io JSON

// Failure
null
```

**Side effects:** logs to console on error.

---

#### `updateDynDns(hostname, user, passwd, ip) → Promise<Object>`

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `hostname` | `string` | FQDN to update (e.g. `myhost.dyndns.org`) |
| `user` | `string` | DynDNS username |
| `passwd` | `string` | DynDNS password |
| `ip` | `string` | New IP address to register |

**Returns:**

```js
// All possible return shapes:
{ success: false, message: 'All fields are required' }
{ success: false, message: 'Authentication failed...', code: 'badauth' }
{ success: true,  message: 'IP address is already up-to-date...', code: 'nochg', ip }
{ success: true,  message: 'DynDNS successfully updated!', code: 'good', ip }
{ success: false, message: '...not a fully-qualified domain name.', code: 'notfqdn' }
{ success: false, message: '...does not exist in this user account.', code: 'nohost' }
{ success: false, message: 'DynDNS service is temporarily unavailable.', code: '911' }
{ success: false, message: 'Account has been blocked for abuse.', code: 'abuse' }
{ success: false, message: 'Unexpected response: <text>', code: 'unknown' }
{ success: false, message: 'Unable to update DynDNS: <error.message>', code: 'error' }
```

**Request details:**
- Method: `GET`
- Auth: `Authorization: Basic <base64(user:passwd)>`
- User-Agent: `React DynDNS Updater`
- Dev URL: `/nic/update?hostname=...&myip=...&wildcard=NOCHG&mx=NOCHG&backmx=NOCHG`
- Prod URL: `/dyndnsupdater/dyndns-proxy.php?targetUrl=...&hostname=...&myip=...&...`

---

## 6. Event Flows

### Form Submit Flow

```
User clicks "Update DynDNS"
  └─ DynDnsForm: onSubmit(e)
      └─ App: dynDns.handleSubmit(e)
          ├─ e.preventDefault()
          ├─ guard: if isLoading → return
          └─ checkAndUpdateIp()
              ├─ guard: if !isFormDataComplete() → return
              ├─ setIsLoading(true)
              ├─ fetchCurrentIp()
              │   └─ DynDnsService.fetchCurrentIp()
              │       └─ GET https://ipinfo.io/json
              │           ├─ ok  → return { ip, ... }
              │           └─ err → return null  [status: 'Unable to retrieve current IP']
              ├─ if ip !== storedIp || forceUpdate:
              │   └─ DynDnsService.updateDynDns(hostname, user, passwd, ip)
              │       ├─ validates inputs
              │       ├─ builds auth header
              │       ├─ GET <proxy-url>?hostname=...&myip=...
              │       └─ returns { success, message, code, ip? }
              │           ├─ success → setStoredIp(ip), setStatus('success')
              │           └─ failure → setStatus('danger')
              ├─ else → setStatus('IP is already up-to-date')
              └─ finally:
                  ├─ updateSavedData()  → localStorage.setItem(...)
                  └─ setIsLoading(false)
```

### Auto-Refresh Flow

```
useRefreshTimer: setInterval every 1 second
  └─ countdownRef.current -= 1
  └─ setTimeRemaining(n)   → DynDnsForm shows updated MM:SS
  └─ if countdownRef <= 0:
      ├─ callbackRef.current()   → handleTimerRefresh → dynDns.checkAndUpdateIp()
      │   (same flow as Form Submit, without e.preventDefault)
      └─ countdownRef.current = interval  (reset for next cycle)
```

### Interval Change Flow

```
User selects new interval in DynDnsForm <Form.Select>
  └─ onChange → App: handleRefreshIntervalChange(e)
      ├─ parseInt(e.target.value)
      ├─ refreshTimer.setInterval(newInterval)
      │   └─ resetTimer(newInterval)
      │       ├─ clearInterval(timerRef.current)
      │       ├─ setIntervalValue(newInterval)
      │       ├─ countdownRef.current = newInterval
      │       └─ new setInterval(..., 1000)
      └─ dynDns.setRefreshInterval(newInterval)
          └─ setSavedData(prev => ({ ...prev, refreshInterval: newInterval }))
              └─ localStorage.setItem('dyndnsData', JSON.stringify(...))
```

---

## 7. State Map

```
localStorage['dyndnsData']
  ↕ (useLocalStorage)
savedData: { hostname, username, password, storedIp, refreshInterval }

useDynDnsUpdater state
  ├── formData       { hostname, username, password }  ← typed by user
  ├── currentIp      string                            ← from ipinfo.io
  ├── storedIp       string                            ← from DynDNS response / localStorage
  ├── status         { message, type }                 ← API result
  ├── isLoading      boolean                           ← during fetch
  └── forceUpdate    boolean                           ← checkbox

useRefreshTimer state
  ├── interval          number  ← seconds between refreshes
  └── timeRemaining     number  ← seconds until next refresh
```

---

## 8. Proxy Strategy

| Environment | Detection | DynDNS request goes to |
|-------------|-----------|------------------------|
| Development (`localhost`) | `isDevelopment() === true` | Vite dev server proxy → `http://members.dyndns.org/nic/update` |
| Production | `isDevelopment() === false` | `/dyndnsupdater/dyndns-proxy.php?targetUrl=...` (PHP pass-through) |

The PHP proxy (`public/dyndns-proxy.php`) forwards the request without storing credentials, resolving CORS limitations in production.
