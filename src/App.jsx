/**
 * @file App.jsx
 * @author Lorenzo Lione <https://github.com/lorenz1974>
 * @description Componente radice dell'applicazione DynDNS Updater.
 * @version 0.4.0
 * @created April 2025
 * @license MIT
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Pattern Smart Container — separazione logica/presentazione      │
 * │  2. useCallback — perché e quando memoizzare le funzioni            │
 * │  3. useEffect   — effetti collaterali al mount del componente       │
 * │  4. Props       — come i dati scorrono verso i figli                │
 * │  5. Composizione — come i componenti si annidano                   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §4, §6, §8, §11
 */

import React, { useEffect, useCallback } from 'react'
import { Card } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import '@/App.css'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Import con alias di percorso
// ─────────────────────────────────────────────────────────────────────────────
// Gli alias @components e @hooks sono configurati in vite.config.js.
// Puntano rispettivamente a src/components/ e src/hooks/.
// Vantaggio: evitano percorsi relativi fragili come '../../../components/...'
// che si rompono quando si sposta un file.
// ─────────────────────────────────────────────────────────────────────────────
import AppContainer from '@components/AppContainer'   // Layout: Container + Card Bootstrap
import AppHeader from '@components/AppHeader'          // Header statico (Card.Header)
import DynDnsForm from '@components/DynDnsForm'        // Form credenziali e configurazione
import StatusDisplay from '@components/StatusDisplay'  // Visualizzazione IP e stato
import AppFooter from '@components/AppFooter'          // Footer con versione (Card.Footer)

// I Custom Hook sono importati come normali funzioni JavaScript.
// La convenzione `use` nel nome è obbligatoria: React li riconosce come Hook
// e applica le regole degli Hook (non possono essere chiamati in modo condizionale).
import useDynDnsUpdater from '@hooks/useDynDnsUpdater'  // Tutta la logica di business
import useRefreshTimer from '@hooks/useRefreshTimer'    // Gestione del timer con countdown

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Costanti dichiarate a livello di modulo (fuori dal componente)
// ─────────────────────────────────────────────────────────────────────────────
// REFRESH_INTERVALS è FUORI da App() perché:
//   → È un dato statico: non cambia mai durante il ciclo di vita dell'app
//   → Se fosse DENTRO App(), verrebbe ricreato come nuovo array ad ogni render
//     (spreco di memoria e possibili effetti collaterali su confronti di riferimento)
//   → Le costanti a livello di modulo vengono create UNA SOLA VOLTA all'import
//
// 💡 Regola: tutto ciò che non dipende da state o props va fuori dal componente.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Opzioni di intervallo per l'aggiornamento automatico (in secondi).
 * Ogni opzione ha `value` (usato dalla logica) e `label` (mostrato nell'UI).
 * @type {Array<{value: number, label: string}>}
 */
const REFRESH_INTERVALS = [
  { value: 15,   label: '15 seconds' },
  { value: 30,   label: '30 seconds' },
  { value: 45,   label: '45 seconds' },
  { value: 60,   label: '1 minute' },
  { value: 180,  label: '3 minutes' },
  { value: 300,  label: '5 minutes' },
  { value: 600,  label: '10 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '60 minutes' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Smart Container (Container/Presentational pattern)
// ─────────────────────────────────────────────────────────────────────────────
// App è un "Smart Container": conosce lo stato e la logica, ma delega
// il rendering dei dettagli UI ai componenti figli.
//
// RESPONSABILITÀ di App:
//   ✅ Inizializzare i Custom Hook (delegano lo stato)
//   ✅ Coordinare il flusso dati tra hook e componenti
//   ✅ Collegare il timer all'aggiornamento IP
//   ✅ Definire la gerarchia dei componenti
//
// NON RESPONSABILITÀ di App:
//   ❌ Renderizzare form, input, bottoni (→ DynDnsForm)
//   ❌ Mostrare IP e status (→ StatusDisplay)
//   ❌ Gestire timer internamente (→ useRefreshTimer)
//   ❌ Fare chiamate API direttamente (→ useDynDnsUpdater → DynDnsService)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Componente radice che orchestra tutta l'applicazione DynDNS Updater.
 *
 * Segue il pattern "Smart Container":
 * - Integra i custom hook per la logica di business
 * - Distribuisce stato e callback ai componenti figli tramite props
 * - Coordina auto-refresh e aggiornamento IP
 *
 * @returns {JSX.Element} L'albero dei componenti dell'applicazione
 */
const App = () => {
  // ───────────────────────────────────────────────────────────────────────────
  // useDynDnsUpdater: il "cervello" dell'applicazione.
  // Restituisce tutto ciò che serve: stato del form, IP, funzioni di handler.
  // Preferisco `dynDns.xxx` alla destrutturazione per rendere esplicita
  // la provenienza di ogni dato (miglior leggibilità).
  // ───────────────────────────────────────────────────────────────────────────
  const dynDns = useDynDnsUpdater()

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useCallback — perché memoizzare questa funzione?
  // ───────────────────────────────────────────────────────────────────────────
  // PROBLEMA senza useCallback:
  //   Ad ogni render di App, JavaScript crea una NUOVA funzione in memoria.
  //   Se passassimo questa funzione "nuda" a useRefreshTimer, il hook riceverebbe
  //   un nuovo riferimento ad ogni render → il suo useEffect([onRefreshCallback])
  //   si rieseguirebbe → il timer si resetterebbe (bug!).
  //
  // SOLUZIONE con useCallback:
  //   La funzione viene creata UNA SOLA VOLTA e riutilizzata tra render successivi.
  //   Viene ricreata solo se `dynDns` cambia (array di dipendenze [dynDns]).
  //
  // 💡 Quando serve useCallback?
  //    - Quando la funzione viene passata come prop a un componente figlio
  //    - Quando la funzione è una dipendenza di un useEffect
  // ───────────────────────────────────────────────────────────────────────────
  const handleTimerRefresh = useCallback(() => {
    console.log('🔄 Auto refresh triggered')
    dynDns.checkAndUpdateIp()
  }, [dynDns])
  // [dynDns] = se l'oggetto hook cambia (stato aggiornato), la callback
  //            viene ricreata per usare le versioni aggiornate delle funzioni interne

  // ───────────────────────────────────────────────────────────────────────────
  // useRefreshTimer: gestisce il conto alla rovescia e l'auto-refresh.
  // Riceve `dynDns.isFormDataComplete` (booleano) come flag di abilitazione:
  // se il form non è compilato, il timer rimane fermo (evita chiamate API inutili).
  // ───────────────────────────────────────────────────────────────────────────
  const refreshTimer = useRefreshTimer(
    dynDns.refreshInterval,       // Secondi tra un refresh e l'altro
    handleTimerRefresh,           // Cosa fare quando il timer scade (memoizzato!)
    dynDns.isFormDataComplete     // true = timer attivo, false = timer fermo
  )

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Sincronizzazione di due sistemi con un singolo handler
  // ───────────────────────────────────────────────────────────────────────────
  // Quando l'utente cambia l'intervallo, dobbiamo aggiornare DUE cose:
  //   1. refreshTimer.setInterval() → resetta il timer con il nuovo valore
  //   2. dynDns.setRefreshInterval() → salva la preferenza in localStorage
  //
  // Questo handler "glue" (collante) è la responsabilità di App.jsx:
  // conosce entrambi i sistemi e li coordina. I singoli hook non si "conoscono".
  // ───────────────────────────────────────────────────────────────────────────
  const handleRefreshIntervalChange = useCallback(
    (e) => {
      // parseInt con radix 10: converte la stringa del <select> in numero intero
      // Il valore di un <select> è sempre una stringa in JavaScript/HTML
      const newInterval = parseInt(e.target.value, 10)
      refreshTimer.setInterval(newInterval)    // Resetta il conto alla rovescia
      dynDns.setRefreshInterval(newInterval)   // Persiste la preferenza
    },
    [refreshTimer, dynDns]
  )

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useEffect per il controllo iniziale al mount
  // ───────────────────────────────────────────────────────────────────────────
  // Al primo avvio, se le credenziali sono già salvate in localStorage,
  // l'app controlla automaticamente l'IP senza attendere l'input dell'utente.
  //
  // useEffect è necessario perché:
  //   → Non si può eseguire codice async direttamente durante il rendering
  //   → useEffect garantisce che il DOM sia già stato aggiornato prima di
  //     avviare operazioni asincrone (fetch, timer, ecc.)
  //
  // Con [dynDns] come dipendenza, si comporta quasi come "eseguito al mount",
  // perché dynDns (l'oggetto hook) non cambia tra render.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    dynDns.performInitialCheck()
  }, [dynDns])

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: JSX e Composizione dei Componenti
  // ───────────────────────────────────────────────────────────────────────────
  // Il JSX descrive la struttura dell'interfaccia, non il comportamento.
  // Ogni componente riceve SOLO i dati che gli servono (minimo privilegio):
  //   - StatusDisplay non ha bisogno delle funzioni del form
  //   - DynDnsForm non ha bisogno dell'oggetto status
  //
  // Struttura visiva:
  //   AppContainer (max-width 600px, Card Bootstrap)
  //   ├── AppHeader  (Card.Header: titolo "DynDNS Updater")
  //   ├── Card.Body  (padding responsive p-3/p-md-4)
  //   │   ├── DynDnsForm    (form credenziali + timer)
  //   │   └── StatusDisplay (IP corrente, IP registrato, badge, alert)
  //   └── AppFooter  (Card.Footer: copyright e versione)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <AppContainer>
      <AppHeader />
      <Card.Body className='p-3 p-md-4'>
        {/* DynDnsForm riceve tutto ciò che serve per renderizzare e gestire il form.
            Le funzioni `onXxx` sono i callback che il form chiama per comunicare
            gli eventi dell'utente al genitore (pattern: "lifting state up"). */}
        <DynDnsForm
          formData={dynDns.formData}                             // Valori dei campi (controlled)
          onInputChange={dynDns.handleInputChange}               // Aggiorna formData ad ogni keystroke
          onSubmit={dynDns.handleSubmit}                         // Submit: avvia checkAndUpdateIp
          forceUpdate={dynDns.forceUpdate}                       // Stato checkbox "Force update"
          onForceUpdateChange={dynDns.handleForceUpdateChange}   // Toggle forceUpdate
          isLoading={dynDns.isLoading}                           // true → disabilita tutto durante fetch
          currentIp={dynDns.currentIp}                          // IP attuale (per messaggio "già aggiornato")
          storedIp={dynDns.storedIp}                            // IP su DynDNS (per confronto)
          refreshInterval={dynDns.refreshInterval}               // Intervallo selezionato (valore nel <select>)
          refreshIntervals={REFRESH_INTERVALS}                   // Opzioni del <select>
          onRefreshIntervalChange={handleRefreshIntervalChange}  // Cambia intervallo (aggiorna timer + storage)
          timeUntilRefresh={refreshTimer.formattedTimeRemaining} // Countdown visibile "MM:SS"
        />
        {/* StatusDisplay è un componente puramente presentazionale:
            riceve dati e li mostra, senza alcuna interazione o logica. */}
        <StatusDisplay
          currentIp={dynDns.currentIp}
          storedIp={dynDns.storedIp}
          status={dynDns.status}       // { message: string, type: 'success'|'danger' }
          isLoading={dynDns.isLoading}
        />
      </Card.Body>
      <AppFooter />
    </AppContainer>
  )
}

export default App
