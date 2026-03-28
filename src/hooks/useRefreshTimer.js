/**
 * @file useRefreshTimer.js
 * @description Custom Hook per la gestione del timer di refresh automatico con countdown visibile.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Il problema delle "Stale Closures" con setInterval              │
 * │  2. useRef come soluzione alle stale closures                       │
 * │  3. useEffect con cleanup — prevenire i memory leak                 │
 * │  4. Più useEffect con dipendenze diverse — ognuno ha uno scopo      │
 * │  5. useCallback con dipendenze — quando ricreare la funzione        │
 * │  6. setInterval vs setTimeout — timing dei task ripetitivi          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §6, §7, §12
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PROBLEMA FONDAMENTALE: Stale Closures con setInterval
// ─────────────────────────────────────────────────────────────────────────────
// Le "stale closures" (chiusure stantie) sono uno dei bug più comuni in React.
// Si verificano quando una funzione "ricorda" un valore che era attuale quando
// è stata creata, ma che è diventato obsoleto nei render successivi.
//
// ESEMPIO DEL PROBLEMA:
//   const [count, setCount] = useState(0)
//
//   useEffect(() => {
//     const timer = setInterval(() => {
//       // `count` qui è sempre 0! La funzione del timer è stata creata
//       // al primo render (quando count era 0) e non "vede" i nuovi valori.
//       setCount(count + 1)  // → count è sempre 0 → sempre setta 1!
//     }, 1000)
//     return () => clearInterval(timer)
//   }, [])  // [] = la funzione del timer NON viene mai ricreata
//
// SOLUZIONE con useRef:
//   Usiamo dei ref per tenere i valori "aggiornati" accessibili dall'interno
//   del setInterval, senza dover ricreare il timer ad ogni render.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Hook per gestire un timer di refresh con countdown visibile.
 *
 * Risolve problemi comuni con setInterval in React:
 * - Stale closures (chiusure con valori obsoleti)
 * - Memory leak (timer che continuano dopo l'unmount)
 * - Aggiornamenti dinamici dell'intervallo senza resettare il ciclo
 * - Abilitazione/disabilitazione del timer
 *
 * @param {number}   initialInterval    - Intervallo iniziale in secondi
 * @param {Function} onRefreshCallback  - Funzione da chiamare quando il timer scade
 * @param {boolean}  enabled            - true = timer attivo, false = timer fermo
 * @returns {Object} Stato e funzioni per gestire il timer
 */
const useRefreshTimer = (initialInterval, onRefreshCallback, enabled = true) => {
  // ───────────────────────────────────────────────────────────────────────────
  // STATO VISIBILE NELLA UI (causa re-render → aggiorna il display)
  // ───────────────────────────────────────────────────────────────────────────

  // L'intervallo corrente (in secondi): può cambiare se l'utente lo modifica
  const [interval, setIntervalValue] = useState(initialInterval)

  // I secondi rimanenti: aggiornati ogni secondo dal setInterval → aggiorna il display "MM:SS"
  const [timeRemaining, setTimeRemaining] = useState(initialInterval)

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO CHIAVE: useRef come soluzione alle Stale Closures
  // ───────────────────────────────────────────────────────────────────────────
  // Usiamo 4 ref per valori che devono essere LEGGIBILI dall'interno del setInterval
  // senza causare re-render e senza stale closure:
  //
  //   timerRef      → ID del timer (per poterlo fermare con clearInterval)
  //   countdownRef  → Secondi rimanenti (la vera "fonte di verità" del countdown)
  //   callbackRef   → La callback aggiornata (evita stale closure sulla callback)
  //   enabledRef    → Il flag enabled aggiornato (evita stale closure sul flag)
  //
  // PERCHÉ non useState per questi valori?
  //   → Il setInterval non "vede" i nuovi valori di useState (stale closure)
  //   → useRef.current è SEMPRE il valore attuale, anche dentro il setInterval
  //   → Modificare un ref NON causa re-render (vogliamo solo il ref per la logica)
  // ───────────────────────────────────────────────────────────────────────────

  // ID del timer attivo (null se il timer è fermo)
  const timerRef = useRef(null)

  // Il countdown "reale" dentro il setInterval.
  // NON usiamo `timeRemaining` (state) perché sarebbe stale dentro il timer.
  // Usiamo questo ref che è sempre aggiornato.
  const countdownRef = useRef(initialInterval)

  // Sempre punta all'ultima versione della callback.
  // Senza questo, il timer chiamerebbe sempre la callback del primo render (stale!).
  const callbackRef = useRef(onRefreshCallback)

  // Sempre punta all'ultimo valore di `enabled`.
  // Senza questo, il timer userebbe sempre il valore di enabled al momento della creazione.
  const enabledRef = useRef(enabled)

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useEffect per "sincronizzare" i ref con le prop
  // ───────────────────────────────────────────────────────────────────────────
  // Il pattern "ref come specchio" mantiene i ref sempre aggiornati:
  //   1. La prop `onRefreshCallback` cambia (esempio: App.jsx si ri-renderizza)
  //   2. React esegue questo useEffect (perché la dipendenza è cambiata)
  //   3. Il ref viene aggiornato con il nuovo valore
  //   4. Il prossimo tick del setInterval userà il ref aggiornato
  //
  // Questo pattern è molto più efficiente che ricreare il setInterval ogni volta
  // che la callback cambia.
  // ───────────────────────────────────────────────────────────────────────────

  // Aggiorna callbackRef ogni volta che la callback cambia
  useEffect(() => {
    callbackRef.current = onRefreshCallback
  }, [onRefreshCallback])

  // Aggiorna enabledRef ogni volta che il flag enabled cambia
  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  /**
   * Resetta il timer con un (eventuale) nuovo intervallo.
   *
   * Operazioni:
   * 1. Ferma il timer esistente (clearInterval)
   * 2. Aggiorna l'intervallo se viene fornito uno nuovo
   * 3. Resetta il countdown al valore pieno
   * 4. Avvia un nuovo setInterval (se enabled = true)
   *
   * @param {number|null} newInterval - Nuovo intervallo in secondi (null = usa quello corrente)
   */
  const resetTimer = useCallback((newInterval = null) => {
    // ─────────────────────────────────────────────────────────────────────
    // 1. Ferma il timer esistente per evitare timer multipli in parallelo
    // ─────────────────────────────────────────────────────────────────────
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. Determina l'intervallo da usare
    // ─────────────────────────────────────────────────────────────────────
    const intervalToUse = newInterval !== null ? newInterval : interval

    // Aggiorna lo stato dell'intervallo solo se è cambiato (evita re-render inutili)
    if (newInterval !== null && newInterval !== interval) {
      setIntervalValue(newInterval)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Resetta il countdown
    //    Aggiorna sia il ref (per la logica interna) che lo state (per la UI)
    // ─────────────────────────────────────────────────────────────────────
    countdownRef.current = intervalToUse
    setTimeRemaining(intervalToUse)

    // Se il timer non è abilitato, non avviare il setInterval
    if (!enabledRef.current) return

    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: setInterval con risoluzione di 1 secondo
    // ─────────────────────────────────────────────────────────────────────
    // setInterval(fn, 1000) chiama fn ogni ~1000ms.
    // NOTA: il timing non è esatto (dipende dal carico del browser/OS),
    // ma per un countdown visivo è più che sufficiente.
    //
    // ALTERNATIVA: setTimeout ricorsivo
    //   → Più preciso (si adatta al tempo trascorso)
    //   → Più complesso da gestire (cleanup manuale)
    //   → Non necessario per questo caso d'uso
    //
    // Il codice dentro il setInterval usa SOLO ref (countdownRef, callbackRef,
    // enabledRef) → NESSUNA stale closure perché i ref sono sempre aggiornati.
    // ─────────────────────────────────────────────────────────────────────
    timerRef.current = setInterval(() => {
      // Decrementa il countdown tramite il ref (non lo state → nessuna stale closure)
      countdownRef.current -= 1
      // Aggiorna lo state per far aggiornare la UI (il display "MM:SS")
      setTimeRemaining(countdownRef.current)

      // Quando il countdown arriva a zero, esegui la callback e resetta
      if (countdownRef.current <= 0) {
        // Controlla che il timer sia ancora abilitato prima di chiamare la callback
        if (typeof callbackRef.current === 'function' && enabledRef.current) {
          callbackRef.current()  // Chiama SEMPRE l'ultima versione della callback (ref)
        }

        // Resetta il countdown per il prossimo ciclo
        countdownRef.current = intervalToUse
        setTimeRemaining(intervalToUse)
      }
    }, 1000)
  }, [interval])
  // [interval]: ricrea resetTimer se l'intervallo cambia
  // (enabledRef, callbackRef, countdownRef sono ref → non nelle dipendenze)

  /**
   * Converte secondi nel formato "MM:SS" per il display visivo.
   *
   * @param {number} seconds - Secondi totali da formattare
   * @returns {string} Tempo nel formato "MM:SS" (es. "04:30")
   */
  const formatTimeRemaining = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)          // Parte intera dei minuti
    const secs = seconds % 60                      // Resto dei secondi
    // padStart(2, '0'): aggiunge uno zero iniziale se il numero è < 10
    // Esempio: 5 → '05', 12 → '12'
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])
  // [] = nessuna dipendenza: il calcolo non usa variabili esterne

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useEffect per reagire ai cambiamenti di `enabled`
  // ───────────────────────────────────────────────────────────────────────────
  // Questo effect gestisce lo start/stop del timer in base al flag `enabled`.
  //
  // Scenari:
  //   enabled passa da false a true → avvia il timer (resetTimer())
  //   enabled passa da true a false → ferma il timer (clearInterval)
  //
  // L'array di dipendenze [enabled, resetTimer] garantisce che l'effect
  // si riesegua ogni volta che uno di questi cambia.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (enabled) {
      resetTimer()  // Avvia il timer quando viene abilitato
    } else if (timerRef.current) {
      // Ferma il timer quando viene disabilitato (es. form incompleto)
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [enabled, resetTimer])

  // ───────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO FONDAMENTALE: useEffect con cleanup per prevenire memory leak
  // ───────────────────────────────────────────────────────────────────────────
  // PROBLEMA: setInterval continua a girare anche dopo che il componente
  // è stato rimosso dal DOM (unmount). Questo causa:
  //   → Memory leak (il timer mantiene vivi oggetti che non servono più)
  //   → Errori "Can't perform a React state update on an unmounted component"
  //   → Comportamento imprevedibile
  //
  // SOLUZIONE: La funzione di cleanup (return () => ...) viene chiamata
  // automaticamente da React quando il componente viene smontato.
  //
  // Con [] come dipendenze, questo effect:
  //   → Non esegue NULLA al mount (il corpo è vuoto → solo il return)
  //   → Esegue SOLO il cleanup all'unmount
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Il corpo è vuoto: nessun setup necessario qui (il timer viene avviato
    // dall'effect precedente che dipende da [enabled, resetTimer])

    return () => {
      // CLEANUP: eseguito quando App viene smontata
      // Ferma il timer se è ancora attivo → previene memory leak e errori React
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])  // [] = solo al mount (setup) e unmount (cleanup)

  // ─────────────────────────────────────────────────────────────────────────
  // API pubblica del hook
  // ─────────────────────────────────────────────────────────────────────────
  return {
    interval,            // Intervallo corrente in secondi (stato React → UI)
    timeRemaining,       // Secondi rimanenti (stato React → UI)

    // formattedTimeRemaining: calcolato in tempo reale da timeRemaining
    // Non serve useMemo perché formatTimeRemaining è O(1) (molto veloce)
    formattedTimeRemaining: formatTimeRemaining(timeRemaining),

    // setInterval: alias di resetTimer con un nuovo intervallo
    // Fornisce un'API più intuitiva per chi usa il hook dall'esterno
    setInterval: (newInterval) => {
      resetTimer(newInterval)
    },

    resetTimer,          // Resetta il timer (opzionalmente con un nuovo intervallo)

    // isRunning: true se il timer è attivo (comodità per l'UI)
    // !!null = false, !!number = true
    isRunning: !!timerRef.current
  }
}

export default useRefreshTimer
