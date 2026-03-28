/**
 * @file main.jsx
 * @description Punto di ingresso (entry point) dell'applicazione React.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. ReactDOM.createRoot — come React "monta" l'app nel browser      │
 * │  2. ErrorBoundary       — componente classe per gestire gli errori  │
 * │  3. Componenti Classe   — differenze rispetto ai componenti funz.   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §1, §3, §14
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import UpdateModal from '@components/UpdateModal'
import '@/index.css'
import 'bootstrap/dist/css/bootstrap.min.css'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Componente Classe vs Componente Funzionale
// ─────────────────────────────────────────────────────────────────────────────
//
// React supporta DUE tipi di componenti:
//
// ① COMPONENTE FUNZIONALE (modo moderno, usato in TUTTO il resto del progetto)
//      const MyComp = () => <div>Ciao</div>
//   → È una semplice funzione JavaScript che restituisce JSX
//   → Da React 16.8 supporta gli Hook (useState, useEffect, ecc.)
//   → Sintassi più semplice, più leggibile, preferita oggi
//
// ② COMPONENTE CLASSE (modo classico, usato SOLO qui per ErrorBoundary)
//      class MyComp extends React.Component { render() { return <div /> } }
//   → Prima di React 16.8 era l'unico modo per gestire stato e lifecycle
//   → Gestisce lo stato tramite this.state e this.setState()
//   → Ha metodi speciali: componentDidMount, componentWillUnmount, render, ecc.
//
// 💡 PERCHÉ una CLASSE per ErrorBoundary e non un componente funzionale?
//    Il metodo statico `getDerivedStateFromError` (necessario per intercettare
//    gli errori dei figli durante il rendering) NON ha ancora un equivalente Hook.
//    L'ErrorBoundary è l'UNICO caso in questo progetto in cui la classe è necessaria.
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  // Il costruttore inizializza lo stato del componente.
  // Equivalente funzionale sarebbe: const [error, setError] = useState(null)
  // Il parametro `props` deve essere passato a super() — obbligatorio in React
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 METODO STATICO DEL CICLO DI VITA: getDerivedStateFromError
  // ─────────────────────────────────────────────────────────────────────────
  // Chiamato automaticamente da React quando un componente FIGLIO genera un
  // errore durante la fase di rendering.
  //
  // È `static` perché React deve poterlo chiamare PRIMA che il componente
  // venga istanziato (e perché non ha bisogno di accedere a `this`).
  //
  // Deve restituire un oggetto che aggiorna lo `state` → triggera un re-render
  // con la UI di fallback al posto dell'app crashata.
  // ─────────────────────────────────────────────────────────────────────────
  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    // Se c'è un errore nello stato, mostra la UI di fallback.
    // In un componente funzionale sarebbe: if (error) return <ErrorUI />
    if (this.state.error) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red' }}>
          <h2>Errore applicazione</h2>
          {/* pre + whiteSpace + wordBreak: lo stack trace resta leggibile
              anche su schermi piccoli o con messaggi molto lunghi */}
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.toString()}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }

    // Nessun errore → renderizza i figli normalmente.
    // `this.props.children` contiene tutto ciò che è scritto
    // tra i tag <ErrorBoundary>...</ErrorBoundary>
    return this.props.children
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: ReactDOM.createRoot — Il collegamento tra React e il browser DOM
// ─────────────────────────────────────────────────────────────────────────────
//
// React NON aggiorna il DOM direttamente. Usa un "Virtual DOM":
// una rappresentazione in memoria dell'interfaccia. Quando lo stato cambia:
//   1. React ricalcola il Virtual DOM (veloce, solo in memoria JavaScript)
//   2. Lo confronta con il Virtual DOM precedente → algoritmo di "diffing"
//   3. Aggiorna SOLO le parti del DOM reale che sono cambiate → "reconciliation"
//
// `ReactDOM.createRoot(domElement)`:
//   → Crea il "punto di ancoraggio" tra React e il DOM reale
//   → Il <div id="root"> si trova in index.html
//   → Da questo momento React ha il controllo esclusivo di quell'elemento
//
// `.render(<JSX />)`:
//   → Avvia il primo render dell'intera applicazione
//   → Costruisce l'albero dei componenti partendo da App
// ─────────────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  // ErrorBoundary avvolge l'intera app come "rete di sicurezza".
  // Se App o qualsiasi suo discendente lancia un errore durante il rendering,
  // ErrorBoundary lo cattura e mostra il messaggio di errore
  // invece di lasciare la pagina completamente bianca.
  //
  // 📚 CONCETTO: Composizione — i componenti React si compongono tramite
  // annidamento (come le scatole cinesi). L'albero che vediamo qui
  // diventa l'albero del Virtual DOM gestito da React.
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Service Worker Registration — PWA auto-update
// ─────────────────────────────────────────────────────────────────────────────
// Register service worker for PWA functionality and automatic updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/dyndnsupdater/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)

        // Check for updates every hour
        setInterval(
          () => {
            registration.update()
          },
          60 * 60 * 1000,
        )

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New version available - show modal with version info
              showUpdateModal(newWorker)
            }
          })
        })
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error)
      })
  })
}

/**
 * Show update modal with version information
 * @param {ServiceWorker} newWorker - The new service worker instance
 */
function showUpdateModal(newWorker) {
  // Get current version from localStorage or default
  const currentVersion = localStorage.getItem('app-version') || '0.4.0'

  // Fetch new version from version.json
  fetch('/dyndnsupdater/version.json')
    .then((response) => response.json())
    .then((versionData) => {
      const newVersion = versionData.version

      // Create modal container
      const modalContainer = document.createElement('div')
      modalContainer.id = 'update-modal-root'
      document.body.appendChild(modalContainer)

      // Create React root for modal
      const modalRoot = ReactDOM.createRoot(modalContainer)

      const handleUpdate = () => {
        // Update stored version
        localStorage.setItem('app-version', newVersion)
        // Skip waiting and reload
        newWorker.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      }

      const handleLater = () => {
        // Close modal
        modalRoot.unmount()
        document.body.removeChild(modalContainer)
      }

      // Render modal
      modalRoot.render(
        <UpdateModal
          show={true}
          currentVersion={currentVersion}
          newVersion={newVersion}
          onUpdate={handleUpdate}
          onLater={handleLater}
        />,
      )
    })
    .catch((error) => {
      console.error('❌ Error fetching version info:', error)
      // Fallback to simple confirm
      if (confirm("Nuova versione disponibile! Ricaricare l'app?")) {
        newWorker.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      }
    })
}
