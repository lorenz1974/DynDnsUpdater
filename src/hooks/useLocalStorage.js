/**
 * @file useLocalStorage.js
 * @description Custom Hook per la persistenza dei dati nel localStorage con integrazione React.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Custom Hook — cos'è e perché crearne uno                        │
 * │  2. useState con lazy initialization — ottimizzazione al primo render│
 * │  3. useRef — riferimento stabile senza causare re-render            │
 * │  4. useEffect — sincronizzazione con sistemi esterni (localStorage) │
 * │  5. useCallback — stabilizzare funzioni tra i render                │
 * │  6. Forma funzionale di setState — aggiornamento basato su prev     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §5, §6, §7, §8, §10
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Cos'è un Custom Hook e perché crearne uno?
// ─────────────────────────────────────────────────────────────────────────────
// Un Custom Hook è una funzione JavaScript il cui nome inizia con `use` e che
// può chiamare altri Hook React al suo interno.
//
// PROBLEMA senza Custom Hook:
//   Ogni componente che vuole usare localStorage dovrebbe ripetere la stessa
//   logica: leggere, serializzare JSON, gestire errori, sincronizzare lo stato.
//
// SOLUZIONE con Custom Hook:
//   Encapsulo tutta questa logica in useLocalStorage() e la uso come useState().
//   Qualsiasi componente può usarla con un'interfaccia familiare:
//     const [valore, setValore] = useLocalStorage('chiave', defaultValue)
//
// 💡 La regola dei Hook:
//   - Il nome DEVE iniziare con `use` (es. useLocalStorage, non localStorageHook)
//   - Possono essere chiamati SOLO all'inizio di componenti funzionali o di altri Hook
//   - NON possono essere chiamati in modo condizionale (if, loop, nested functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Hook che usa localStorage come stato React.
 *
 * Fornisce:
 * - Serializzazione/deserializzazione automatica JSON
 * - Persistenza tra sessioni del browser
 * - Recupero graceful dagli errori di storage
 * - Interfaccia identica a useState (incluso l'aggiornamento funzionale)
 * - Protezione da loop infiniti di re-render
 *
 * @param {string} key           - Chiave per salvare/caricare da localStorage
 * @param {any}    initialValue  - Valore iniziale se la chiave non esiste ancora
 * @returns {Array} [storedValue, setValue] — come useState
 */
const useLocalStorage = (key, initialValue) => {
  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useRef per una chiave stabile
  // ───────────────────────────────────────────────────────────────────────────
  // useRef crea un oggetto { current: valore } che persiste tra i render
  // SENZA causare un re-render quando viene modificato.
  //
  // Usiamo un ref per la chiave perché:
  //   → Il callback `initialize` ha bisogno della chiave aggiornata
  //   → Se mettessimo `key` nell'array di dipendenze di ogni useCallback,
  //     le funzioni verrebbero ricreate ogni volta che la chiave cambia
  //   → Con il ref, `initialize` può usare keyRef.current (sempre aggiornato)
  //     senza essere nell'array di dipendenze → meno ricreazioni di funzioni
  //
  // 💡 Regola: useRef quando hai bisogno di un valore "mutable" che:
  //    - Non deve apparire nella UI
  //    - Non deve causare re-render quando cambia
  // ───────────────────────────────────────────────────────────────────────────
  const keyRef = useRef(key)

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useCallback per una funzione di inizializzazione stabile
  // ───────────────────────────────────────────────────────────────────────────
  // `initialize` è estratta come callback per poterla riutilizzare:
  //   1. Come argomento a useState (lazy initialization)
  //   2. Nell'useEffect che ricarica il valore quando la chiave cambia
  //
  // Se fosse una funzione normale (non useCallback), verrebbe ricreata ad ogni
  // render e l'useEffect che la osserva si rieseguirebbe continuamente.
  // ───────────────────────────────────────────────────────────────────────────
  const initialize = useCallback(() => {
    try {
      // Tenta di leggere e deserializzare i dati da localStorage
      const item = localStorage.getItem(keyRef.current)
      // JSON.parse(null) → errore; `item ? ...` gestisce il caso "non trovato"
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // localStorage può fallire in modalità private/incognito o se lo storage è pieno
      console.error('❌ Error loading data from localStorage:', error)
      return initialValue  // Fallback graceful: usa il valore di default
    }
  }, [initialValue])
  // [initialValue]: se cambia il valore di default, reinizializza
  // keyRef.current: si accede tramite ref, non è una dipendenza dichiarata

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useState con Lazy Initialization (inizializzazione pigra)
  // ───────────────────────────────────────────────────────────────────────────
  // useState accetta DUE tipi di argomenti:
  //
  //   ① Valore diretto:  useState(JSON.parse(localStorage.getItem(key)))
  //      → JSON.parse e localStorage vengono chiamati AD OGNI RENDER (spreco!)
  //
  //   ② Funzione inizializzatrice: useState(initialize)
  //      → `initialize` viene chiamata UNA SOLA VOLTA al primo render
  //      → Nei render successivi, React ignora questo argomento
  //
  // 💡 Usa la lazy initialization ogni volta che il valore iniziale è costoso
  //    da calcolare (lettura da storage, parsing JSON, ecc.)
  //
  // NOTA: passiamo il RIFERIMENTO alla funzione (initialize), non la chiamiamo
  // direttamente (initialize()). React la chiamerà internamente solo al mount.
  // ───────────────────────────────────────────────────────────────────────────
  const [storedValue, setStoredValue] = useState(initialize)

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useEffect per sincronizzare il ref con la prop
  // ───────────────────────────────────────────────────────────────────────────
  // Questo effect tiene keyRef.current aggiornato quando la prop `key` cambia.
  // Necessario perché il ref non si aggiorna automaticamente come lo state.
  //
  // Con [key] come dipendenza: eseguito al mount e ogni volta che `key` cambia.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    keyRef.current = key
  }, [key])

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Forma funzionale vs valore diretto in setState
  // ───────────────────────────────────────────────────────────────────────────
  // setValue supporta entrambe le forme (compatibilità con l'API di useState):
  //
  //   Forma diretta:     setValue('nuovo valore')
  //   Forma funzionale:  setValue(prev => ({ ...prev, campo: 'nuovo' }))
  //
  // La forma funzionale è utile quando il nuovo valore dipende dal precedente
  // e si vuole evitare race conditions con aggiornamenti asincroni.
  //
  // 💡 NOTA sulle dipendenze dell'useCallback:
  //    Intenzionalmente non includiamo `storedValue` nelle dipendenze.
  //    Se lo facessimo, setValue verrebbe ricreata ad ogni cambio di stato,
  //    il che causerebbe re-render inutili nei componenti che la ricevono
  //    come prop. La forma funzionale `value(storedValue)` accede al valore
  //    corrente tramite il closure della funzione passata dall'utente.
  // ───────────────────────────────────────────────────────────────────────────
  const setValue = useCallback(
    (value) => {
      try {
        // Supporta la forma funzionale: se `value` è una funzione,
        // la chiama con il valore corrente (come fa React con setStato)
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // 1. Aggiorna lo stato React → provoca re-render con il nuovo valore
        setStoredValue(valueToStore)

        // 2. Persiste in localStorage per la sessione successiva
        localStorage.setItem(keyRef.current, JSON.stringify(valueToStore))
      } catch (error) {
        // Non crashare se localStorage non è disponibile (es. modalità privata)
        console.error('❌ Error saving data to localStorage:', error)
      }
    },
    [] // Array vuoto: vedi nota sopra sulle dipendenze
  )

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useEffect per sincronizzare quando la chiave cambia
  // ───────────────────────────────────────────────────────────────────────────
  // Se la prop `key` cambia (raro ma possibile), questo effect ricarica
  // il valore dalla nuova chiave nel localStorage.
  //
  // Il confronto JSON prima di setStoredValue() è un'ottimizzazione importante:
  //   → Previene loop infiniti (setStoredValue → re-render → useEffect → ...)
  //   → React già fa un confronto di riferimento per i primitivi, ma non per
  //     oggetti complessi come { hostname, password, ... }
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const newValue = initialize()
    // Confronto JSON per prevenire aggiornamenti di stato inutili.
    // Se il valore non è cambiato, non aggiorniamo lo stato (nessun re-render).
    if (JSON.stringify(newValue) !== JSON.stringify(storedValue)) {
      setStoredValue(newValue)
    }
  }, [key, initialize])
  // [key, initialize]: rieseguito quando cambia la chiave o la funzione di init

  // ─────────────────────────────────────────────────────────────────────────
  // Interfaccia identica a useState: [valore, setter]
  // Il chiamante può usare questo hook esattamente come useState.
  // ─────────────────────────────────────────────────────────────────────────
  return [storedValue, setValue]
}

export default useLocalStorage
