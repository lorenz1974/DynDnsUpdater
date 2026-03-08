/**
 * @file useDynDnsUpdater.js
 * @description Custom Hook centrale per la gestione degli aggiornamenti DynDNS e il monitoraggio IP.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Custom Hook come "cervello" dell'applicazione                   │
 * │  2. useState — gestione di più stati correlati                      │
 * │  3. useRef vs useState — quando NON serve un re-render              │
 * │  4. useCallback — funzioni esposte come API pubblica del hook       │
 * │  5. Array di dipendenze — come React sa quando ricreare le funzioni │
 * │  6. Operazioni async dentro useCallback                             │
 * │  7. Separazione tra stato persistente e stato temporaneo           │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §5, §7, §8, §10
 */

import { useState, useCallback, useRef } from 'react'
import * as DynDnsService from '@components/DynDnsService'
import useLocalStorage from '@hooks/useLocalStorage'

// ─────────────────────────────────────────────────────────────────────────────
// Costante per la chiave di localStorage: dichiarata fuori dal hook
// per evitare che venga ricreata ad ogni render (best practice).
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_STORAGE_KEY = 'dyndnsData'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Custom Hook come separazione della logica di business
// ─────────────────────────────────────────────────────────────────────────────
// useDynDnsUpdater è il "cervello" dell'app: contiene TUTTA la logica di business.
//
// Vantaggi di questa separazione:
//   → App.jsx rimane snello (≈50 righe di orchestrazione)
//   → La logica è testabile indipendentemente dalla UI
//   → Se cambia il provider DynDNS, si modifica solo questo hook + DynDnsService
//   → Più sviluppatori possono lavorare in parallelo (UI vs logica)
//
// Confronto: se mettessimo tutto in App.jsx, il componente avrebbe 300+ righe
// mescolando JSX, stati, fetch, comparazioni IP → illeggibile e non testabile.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Hook per la gestione degli aggiornamenti DynDNS e il monitoraggio IP.
 *
 * Responsabilità principali:
 * - Gestione stato del form con persistenza in localStorage
 * - Rilevamento IP pubblico corrente
 * - Confronto IP e decisione se aggiornare DynDNS
 * - Invio richiesta di aggiornamento a DynDNS
 * - Feedback di stato e gestione errori per l'UI
 *
 * @returns {Object} Stato e funzioni per gestire gli aggiornamenti DynDNS
 */
const useDynDnsUpdater = () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Stratificazione dello stato — persistente vs temporaneo
  // ─────────────────────────────────────────────────────────────────────────
  // Questo hook gestisce DUE livelli di stato:
  //
  // LIVELLO 1 — PERSISTENTE (sopravvive alla chiusura del browser):
  //   `savedData` tramite useLocalStorage → hostname, username, password, storedIp, refreshInterval
  //
  // LIVELLO 2 — TEMPORANEO (esiste solo nella sessione corrente):
  //   `formData`, `currentIp`, `status`, `isLoading`, `forceUpdate`
  //
  // PERCHÉ questa separazione?
  //   → `savedData` (localStorage) non deve essere aggiornato ad ogni keystroke
  //   → `formData` (useState) riflette l'input in tempo reale con aggiornamenti veloci
  //   → I dati vengono "salvati" in localStorage solo al submit (nel finally)
  // ─────────────────────────────────────────────────────────────────────────

  // Dati persistenti: sopravvivono al refresh della pagina.
  // useLocalStorage ha la stessa API di useState: [valore, setter]
  const [savedData, setSavedData] = useLocalStorage(LOCAL_STORAGE_KEY, {
    hostname:        '',
    username:        '',
    password:        '',
    storedIp:        '',    // Ultimo IP registrato su DynDNS
    refreshInterval: 300,  // Default: 5 minuti (in secondi)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Inizializzare useState dai dati persistenti
  // ─────────────────────────────────────────────────────────────────────────
  // Il form viene pre-compilato con i valori salvati in localStorage.
  // `savedData.hostname || ''` gestisce il caso di valore null/undefined.
  //
  // PERCHÉ formData separato da savedData?
  //   → formData = "bozza corrente" (aggiornata ad ogni tasto premuto)
  //   → savedData = "ultimo salvataggio" (aggiornata solo al submit)
  //   → Evita write continue su localStorage durante la digitazione
  // ─────────────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    hostname: savedData.hostname || '',
    username: savedData.username || '',
    password: savedData.password || '',
  })

  // IP rilevato dall'API ipinfo.io (aggiornato ad ogni controllo)
  const [currentIp, setCurrentIp] = useState('')

  // IP registrato su DynDNS (inizializzato da localStorage, aggiornato dopo update riuscito)
  const [storedIp, setStoredIp] = useState(savedData.storedIp || '')

  // Messaggio di feedback per l'utente: tipo ('success'|'danger') corrisponde a varianti Bootstrap
  const [status, setStatus] = useState({ message: '', type: '' })

  // true durante le chiamate API → disabilita il form e mostra spinner nel pulsante
  const [isLoading, setIsLoading] = useState(false)

  // Stato del checkbox "Force Update": se true, aggiorna DynDNS anche se l'IP non è cambiato
  const [forceUpdate, setForceUpdate] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO CHIAVE: useRef vs useState — quando il valore non deve causare re-render
  // ─────────────────────────────────────────────────────────────────────────
  // `initialCheckDone` è un flag "interno": indica se il controllo automatico
  // al mount è già stato eseguito (per non eseguirlo più volte).
  //
  // CONFRONTO:
  //   ❌ Con useState:  setInitialCheckDone(true) → React ri-renderizza App inutilmente
  //   ✅ Con useRef:    initialCheckDone.current = true → Nessun re-render
  //
  // Il valore cambia una volta sola (false → true) e non influenza l'UI.
  // Non ha senso causare un re-render per questo: useRef è la scelta giusta.
  //
  // 💡 Regola: useRef per valori "interni" al hook che non devono comparire
  //    nell'interfaccia e non devono triggerare re-render.
  // ─────────────────────────────────────────────────────────────────────────
  const initialCheckDone = useRef(false)

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useCallback per funzioni esposte nell'API pubblica del hook
  // ─────────────────────────────────────────────────────────────────────────
  // Tutte le funzioni di questo hook usano useCallback perché:
  //   → Vengono passate come props ai componenti figli (onSubmit, onInputChange, ecc.)
  //   → Se cambiano ad ogni render, i figli si ri-renderizzano inutilmente
  //   → L'array di dipendenze controlla quando la funzione viene ricreata
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica se tutti i campi obbligatori del form sono compilati.
   * Usato per abilitare/disabilitare il timer e il pulsante di submit.
   *
   * @returns {boolean} true se hostname, username e password sono presenti
   */
  const isFormDataComplete = useCallback(() => {
    // `!!` converte in booleano: !!'' = false, !!'testo' = true
    // `&&` short-circuit: se hostname è vuoto, non valuta gli altri
    return !!(formData.hostname && formData.username && formData.password)
  }, [formData])
  // [formData]: ricrea la funzione quando il form cambia, così la validità è aggiornata

  /**
   * Gestisce i cambiamenti degli input del form.
   *
   * I campi hanno id come 'hostname', 'username', 'password' (React Bootstrap
   * usa `controlId` sul Form.Group come id del Form.Control).
   * Questo handler usa il `id` direttamente come chiave del campo nello stato.
   *
   * @param {Event} e - Evento di input change
   */
  const handleInputChange = useCallback((e) => {
    const { id, value } = e.target
    // Spread operator (...prev): copia tutti i campi precedenti
    // [id]: Computed Property Name — usa la variabile `id` come chiave dell'oggetto
    setFormData((prev) => ({
      ...prev,
      // Esempio: id='hostname' → aggiorna formData.hostname = value
      [id.replace('form', '').toLowerCase()]: value,
    }))
  }, [])
  // [] = nessuna dipendenza: setFormData è stabile (React garantisce la stabilità dei setter)

  /**
   * Gestisce il cambio del checkbox "Force Update".
   *
   * @param {Event} e - Evento change della checkbox
   */
  const handleForceUpdateChange = useCallback((e) => {
    setForceUpdate(e.target.checked)
  }, [])

  /**
   * Salva i dati correnti (form + IP) in localStorage.
   * Chiamata nel blocco `finally` di checkAndUpdateIp() per garantire
   * che venga eseguita sia in caso di successo che di errore.
   */
  const updateSavedData = useCallback(() => {
    setSavedData({
      ...formData,                                    // hostname, username, password correnti
      storedIp,                                       // Ultimo IP registrato su DynDNS
      refreshInterval: savedData.refreshInterval,    // Intervallo (non cambia qui)
    })
  }, [formData, storedIp, savedData.refreshInterval, setSavedData])

  /**
   * Recupera l'IP pubblico corrente dall'API ipinfo.io.
   * Delega la chiamata HTTP a DynDnsService (separation of concerns).
   *
   * @async
   * @returns {Promise<string|null>} L'IP corrente oppure null se c'è un errore
   */
  const fetchCurrentIp = useCallback(async () => {
    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: async/await dentro useCallback
    // ─────────────────────────────────────────────────────────────────────
    // useCallback può avvolgere funzioni async senza problemi.
    // La funzione async restituisce una Promise; useCallback conserva
    // il riferimento alla funzione, non il valore della Promise.
    //
    // try/catch con async/await è equivalente a .then().catch() ma più leggibile.
    // ─────────────────────────────────────────────────────────────────────
    try {
      const data = await DynDnsService.fetchCurrentIp()
      if (!data) {
        throw new Error('Failed to fetch IP data')
      }
      setCurrentIp(data.ip)  // Aggiorna lo stato → re-render con il nuovo IP visibile
      return data.ip
    } catch (error) {
      console.error('❌ Error retrieving IP:', error)
      setStatus({
        message: 'Unable to retrieve current IP address',
        type: 'danger',
      })
      return null  // null segnala al chiamante che c'è stato un errore
    }
  }, [])
  // [] = usa solo setter stabili (setCurrentIp, setStatus)

  /**
   * Funzione principale: controlla l'IP corrente e aggiorna DynDNS se necessario.
   *
   * Implementa il flusso completo:
   * validate → fetch IP → compare → updateDynDns (se necessario) → persist → feedback
   *
   * @async
   * @returns {Promise<void>}
   */
  const checkAndUpdateIp = useCallback(async () => {
    // Guard clause: non procedere se il form non è compilato
    if (!isFormDataComplete()) return

    // Attiva l'indicatore di caricamento PRIMA dell'operazione asincrona.
    // Fornisce feedback immediato: il pulsante si disabilita, lo spinner appare.
    setIsLoading(true)

    try {
      const ip = await fetchCurrentIp()
      if (!ip) {
        // fetchCurrentIp ha già impostato il messaggio di errore nello state
        setIsLoading(false)
        return
      }

      // LOGICA DECISIONALE: quando aggiornare DynDNS?
      //   - IP diverso da quello memorizzato → aggiornamento necessario
      //   - forceUpdate = true → aggiornamento anche se IP uguale (scelta utente)
      if (ip !== storedIp || forceUpdate) {
        const result = await DynDnsService.updateDynDns(
          formData.hostname,
          formData.username,
          formData.password,
          ip
        )

        if (result.success) {
          setStoredIp(ip)  // Salva il nuovo IP come "registrato su DynDNS"
          setStatus({ message: result.message, type: 'success' })
        } else {
          setStatus({ message: result.message, type: 'danger' })
        }
      } else {
        // IP invariato e forceUpdate = false → nessun aggiornamento necessario
        setStatus({
          message: 'IP address is already up-to-date.',
          type: 'success',
        })
      }
    } catch (error) {
      console.error('❌ Error during update process:', error)
      setStatus({
        message: `An unexpected error occurred: ${error.message}`,
        type: 'danger',
      })
    } finally {
      // ───────────────────────────────────────────────────────────────────
      // 📚 CONCETTO: Il blocco `finally` per operazioni di cleanup
      // ───────────────────────────────────────────────────────────────────
      // `finally` viene SEMPRE eseguito, sia in caso di successo che di errore.
      // Perfetto per operazioni che devono avvenire in entrambi i casi:
      //   → updateSavedData(): persiste i dati anche dopo un errore parziale
      //   → setIsLoading(false): riattiva la UI in ogni caso
      // ───────────────────────────────────────────────────────────────────
      updateSavedData()
      setIsLoading(false)
    }
  }, [formData, storedIp, forceUpdate, fetchCurrentIp, isFormDataComplete, updateSavedData])
  // Tutte le variabili usate dentro la funzione sono nelle dipendenze.
  // eslint-plugin-react-hooks avvisa se mancano dipendenze (importante!).

  /**
   * Gestisce il submit del form.
   *
   * @param {Event} e - Evento submit del form HTML
   */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()  // Previene il reload della pagina (comportamento HTML di default)
    // Non avviare una nuova richiesta se ce n'è già una in corso (previene race conditions)
    if (!isLoading) {
      await checkAndUpdateIp()
    }
  }, [isLoading, checkAndUpdateIp])

  /**
   * Aggiorna l'intervallo di refresh e lo persiste in localStorage.
   *
   * @param {number} newInterval - Nuovo intervallo in secondi
   */
  const setRefreshInterval = useCallback((newInterval) => {
    // Forma funzionale: preserva tutti gli altri campi, aggiorna solo refreshInterval
    setSavedData(prev => ({
      ...prev,
      refreshInterval: newInterval
    }))
  }, [setSavedData])

  /**
   * Esegue il controllo IP iniziale al mount (se le credenziali sono salvate).
   * Il flag `initialCheckDone` (useRef) garantisce esecuzione unica.
   */
  const performInitialCheck = useCallback(() => {
    if (isFormDataComplete() && !initialCheckDone.current) {
      console.log('🔄 Automatic IP check on startup')
      initialCheckDone.current = true  // Flag: non eseguire di nuovo
      checkAndUpdateIp()               // Non serve await: operazione in background
    }
  }, [isFormDataComplete, checkAndUpdateIp])

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: API pubblica del Custom Hook
  // ─────────────────────────────────────────────────────────────────────────
  // Il hook espone un oggetto con due categorie:
  //
  // STATO (causerà re-render quando cambia):
  //   → Il componente che usa il hook si aggiorna automaticamente
  //
  // FUNZIONI (memoizzate con useCallback):
  //   → Stabili tra i render → i componenti figli non si ri-renderizzano inutilmente
  //
  // NOTA: `isFormDataComplete` è esposto come booleano (già valutato), non come
  // funzione. App.jsx lo usa come flag di abilitazione per useRefreshTimer,
  // e un booleano è più comodo di una funzione da chiamare.
  // ─────────────────────────────────────────────────────────────────────────
  return {
    // ── Stato ──────────────────────────────────────────────────────────────
    formData,                                         // { hostname, username, password }
    currentIp,                                        // IP rilevato dall'API ipinfo.io
    storedIp,                                         // IP attualmente registrato su DynDNS
    status,                                           // { message: string, type: string }
    isLoading,                                        // true durante le operazioni asincrone
    forceUpdate,                                      // true = forza aggiornamento anche se IP uguale
    refreshInterval: savedData.refreshInterval,       // Intervallo salvato in localStorage
    isFormDataComplete: isFormDataComplete(),          // Booleano (già valutato, non funzione)

    // ── Handler per eventi utente ───────────────────────────────────────────
    handleInputChange,        // onChange dei campi del form
    handleForceUpdateChange,  // onChange del checkbox forceUpdate
    handleSubmit,             // onSubmit del form
    setRefreshInterval,       // onChange del select intervallo

    // ── Azioni ─────────────────────────────────────────────────────────────
    fetchCurrentIp,           // Recupera solo l'IP (senza aggiornare DynDNS)
    checkAndUpdateIp,         // Ciclo completo: fetch IP → confronta → aggiorna DynDNS
    performInitialCheck,      // Controllo automatico al primo mount
  }
}

export default useDynDnsUpdater
