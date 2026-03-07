# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [Unreleased]

### Refactor

- **UI**: replaced all raw Bootstrap class strings with React Bootstrap components throughout the component tree
  - `AppContainer`: `Container` + `Card` (shadow) instead of `Container` with manual class attributes
  - `AppHeader`: `Card.Header` (bg-secondary, text-white) instead of a bare `<h3>`
  - `App.jsx`: `Card.Body` wrapper around `DynDnsForm` + `StatusDisplay`; `Card` imported directly
  - `DynDnsForm`: removed inline `bg-white rounded shadow-sm` attributes from `<Form>` — styling now inherited from the parent `Card.Body`
  - `StatusDisplay`: replaced `div.ip-status-card` with `Card` (bg-light, border-0) + `Card.Body` + `Stack` (horizontal layout) + `Badge` (pill, Synced / Changed); `Alert` for status messages
  - `AppFooter`: `Card.Footer` instead of a `div` with raw class strings
- **CSS**: removed `.ip-status-card` selector and promoted `.ip-label` / `.ip-value` to top-level rules

## [0.4.0](https://github.com/lorenz1974/DynDnsUpdater/compare/v0.3.2...v0.4.0) (2025-05-28)

### [0.3.2](https://github.com/lorenz1974/DynDnsUpdater/compare/v0.3.1...v0.3.2) (2025-04-22)
