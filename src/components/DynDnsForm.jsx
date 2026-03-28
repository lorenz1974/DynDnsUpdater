/**
 * @file DynDnsForm.jsx
 * @description Componente form per le impostazioni DynDNS.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Componenti Controllati — React come "fonte di verità" del form  │
 * │  2. useState locale — stato interno del componente (showPassword)   │
 * │  3. Props come interfaccia — comunicazione genitore↔figlio          │
 * │  4. Callback come props — "lifting state up"                        │
 * │  5. Rendering condizionale — if, ternario, &&                       │
 * │  6. Rendering di liste — .map() con key                             │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §4, §5, §13
 */

import React, { useState } from 'react'
import { Form, Button, Spinner, InputGroup } from 'react-bootstrap'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Componente "quasi presentazionale" con stato locale minimo
// ─────────────────────────────────────────────────────────────────────────────
// DynDnsForm è principalmente presentazionale (riceve tutto via props),
// ma ha UN PICCOLO stato locale: `showPassword` per il toggle visibilità password.
//
// PERCHÉ questo stato è LOCALE e non nel genitore (App.jsx)?
//   → Appartiene esclusivamente a questo componente
//   → App.jsx non ha bisogno di sapere se la password è visibile o no
//   → Il principio è: tieni lo stato il più vicino possibile a dove è usato
//
// TUTTO IL RESTO arriva via props da App.jsx:
//   → formData, onInputChange, onSubmit: gestione del form
//   → isLoading: stato di caricamento
//   → currentIp, storedIp: per la logica di abilitazione del pulsante
//   → refreshInterval, refreshIntervals, onRefreshIntervalChange: timer
//   → timeUntilRefresh: countdown visualizzato
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Componente form per l'inserimento delle credenziali DynDNS e la configurazione.
 *
 * Il pulsante "Update DynDNS" è disabilitato se:
 * 1. Il form non è completo (un campo è vuoto)
 * 2. Una richiesta è in corso (isLoading = true)
 * 3. L'IP è già aggiornato e forceUpdate non è selezionato
 *
 * @param {Object}   props
 * @param {Object}   props.formData                - Valori dei campi { hostname, username, password }
 * @param {Function} props.onInputChange           - Handler per i cambiamenti degli input
 * @param {Function} props.onSubmit                - Handler per il submit del form
 * @param {boolean}  props.forceUpdate             - Stato del checkbox "Force Update"
 * @param {Function} props.onForceUpdateChange     - Handler per il cambio del checkbox
 * @param {boolean}  props.isLoading               - true durante una richiesta in corso
 * @param {string}   props.currentIp               - IP corrente rilevato
 * @param {string}   props.storedIp                - IP registrato su DynDNS
 * @param {number}   props.refreshInterval         - Intervallo corrente in secondi
 * @param {Array}    props.refreshIntervals        - Opzioni per il select { value, label }[]
 * @param {Function} props.onRefreshIntervalChange - Handler per il cambio dell'intervallo
 * @param {string}   props.timeUntilRefresh        - Countdown in formato "MM:SS"
 * @returns {JSX.Element} Il form renderizzato
 */
const DynDnsForm = ({
  formData,
  onInputChange,
  onSubmit,
  forceUpdate,
  onForceUpdateChange,
  isLoading,
  currentIp,
  storedIp,
  refreshInterval,
  refreshIntervals,
  onRefreshIntervalChange,
  timeUntilRefresh,
}) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: useState locale — stato che appartiene solo a questo componente
  // ─────────────────────────────────────────────────────────────────────────
  // `showPassword` controlla se il campo password mostra il testo o i puntini.
  // È stato locale perché:
  //   → Non interessa il genitore (App.jsx non ha bisogno di saperlo)
  //   → Non deve persistere dopo che il componente si smonta
  //   → Cambia solo in risposta a click dentro questo componente
  //
  // Confronto con i dati del form (gestiti dal genitore):
  //   showPassword = stato UI locale     → rimane qui
  //   formData.password = dato business → gestito dall'hook in App.jsx
  // ─────────────────────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Computed value — calcolo derivato dallo stato
  // ─────────────────────────────────────────────────────────────────────────
  // `isUpdateDisabled` non è uno state ma un VALORE DERIVATO:
  // viene calcolato ad ogni render dalle props correnti.
  //
  // PERCHÉ non usare useState per questo?
  //   → Sarebbe necessario aggiornarlo ogni volta che cambiano isLoading,
  //     formData, currentIp, storedIp, forceUpdate → bug difficile da gestire
  //   → Come valore derivato, è sempre coerente con le props attuali
  //   → È l'approccio "React-way": deriva l'UI dallo stato, non tenerla sincronizzata
  //
  // Operatori logici:
  //   || = OR: disabilita se UNA QUALSIASI condizione è vera
  //   && = AND: tutte le condizioni devono essere vere per la parte finale
  // ─────────────────────────────────────────────────────────────────────────
  const isUpdateDisabled =
    isLoading ||                // Richiesta in corso → disabilita
    !formData.hostname ||       // Hostname vuoto → disabilita
    !formData.username ||       // Username vuoto → disabilita
    !formData.password ||       // Password vuota → disabilita
    // IP identici e forceUpdate non selezionato → disabilita
    // (ma solo se ENTRAMBI gli IP sono noti: && currentIp && storedIp)
    (currentIp && storedIp && currentIp === storedIp && !forceUpdate)

  /**
   * Restituisce il testo del tooltip del pulsante in base allo stato corrente.
   * Fornisce feedback all'utente spiegando perché il pulsante è disabilitato.
   *
   * @returns {string} Il testo del tooltip (vuoto se il pulsante è abilitato)
   */
  const getButtonTooltip = () => {
    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: Guard Clauses — early return per leggibilità
    // ─────────────────────────────────────────────────────────────────────
    // Invece di if/else annidati, usiamo early return:
    //   1. Prima controlla il caso più urgente (form incompleto)
    //   2. Poi il caso di loading
    //   3. Poi il caso di IP identici
    //   4. Se nessuno dei precedenti, return stringa vuota (pulsante abilitato)
    // ─────────────────────────────────────────────────────────────────────
    if (!formData.hostname || !formData.username || !formData.password) {
      return 'All fields are required'
    } else if (isLoading) {
      return 'Update in progress'
    } else if (currentIp && storedIp && currentIp === storedIp && !forceUpdate) {
      return 'IP is already up-to-date. Check "Force update" to update anyway'
    }
    return ''  // Pulsante abilitato: nessun tooltip necessario
  }

  return (
    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: Componente Controllato (Controlled Component)
    // ─────────────────────────────────────────────────────────────────────
    // In HTML, gli input gestiscono il proprio valore internamente (non controllato).
    // In React con componenti controllati:
    //   → `value={formData.hostname}` → React DETTA il valore dell'input
    //   → `onChange={onInputChange}` → ad ogni keystroke, React aggiorna lo stato
    //   → Il valore nell'input RISPECCHIA SEMPRE lo stato React
    //
    // Il "flusso unidirezionale" in azione:
    //   utente digita → onChange → setFormData (in useDynDnsUpdater)
    //   → re-render → value={formData.hostname} aggiornato → input aggiornato
    //
    // PERCHÉ componenti controllati?
    //   → React ha sempre il controllo del valore → facile validare, trasformare
    //   → Sincronizzazione immediata con localStorage possibile
    //   → Fonte di verità unica: il valore esiste in formData, non nel DOM
    // ─────────────────────────────────────────────────────────────────────
    <Form onSubmit={onSubmit}>

      {/* ── Campo Hostname ───────────────────────────────────────────────── */}
      {/* Form.Group + controlId: Bootstrap gestisce il collegamento label↔input
          (attributo `for`/`htmlFor`) automaticamente tramite il controlId */}
      <Form.Group className='mb-3' controlId='hostname'>
        <Form.Label className='form-label'>Hostname</Form.Label>
        <Form.Control
          type='text'
          placeholder='Enter hostname'
          value={formData.hostname}      // Controlled: valore dettato da React
          onChange={onInputChange}       // Aggiorna formData ad ogni keystroke
          disabled={isLoading}           // Disabilita durante la richiesta
          required                       // Validazione HTML5 nativa
        />
      </Form.Group>

      {/* ── Campo Username ───────────────────────────────────────────────── */}
      <Form.Group className='mb-3' controlId='username'>
        <Form.Label className='form-label'>Username</Form.Label>
        <Form.Control
          type='text'
          placeholder='Enter username'
          value={formData.username}
          onChange={onInputChange}
          disabled={isLoading}
          required
        />
      </Form.Group>

      {/* ── Campo Password con toggle visibilità ─────────────────────────── */}
      <Form.Group className='mb-3' controlId='password'>
        <Form.Label className='form-label'>Password</Form.Label>
        {/* InputGroup: raggruppa visivamente input + pulsante adiacente */}
        <InputGroup>
          {/* type='text' mostra il testo, type='password' mostra puntini */}
          <Form.Control
            type={showPassword ? 'text' : 'password'}
            placeholder='Enter password'
            value={formData.password}
            onChange={onInputChange}
            disabled={isLoading}
            required
          />
          {/* v => !v: forma funzionale che inverte il booleano corrente */}
          <Button
            variant='outline-secondary'
            onClick={() => setShowPassword((v) => !v)}
            disabled={isLoading}
            type='button'    // Impedisce che questo button faccia submit del form
            tabIndex={-1}    // Escludi dalla navigazione con Tab (migliore UX)
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {/* Rendering condizionale inline con ternario */}
            {showPassword ? 'Hide' : 'Show'}
          </Button>
        </InputGroup>
      </Form.Group>

      {/* ── Select per l'intervallo di refresh ───────────────────────────── */}
      <Form.Group className='mb-3' controlId='refreshInterval'>
        <Form.Label className='form-label'>Auto-refresh Interval</Form.Label>
        <Form.Select
          value={refreshInterval}              // Controlled: valore corrente (es. 300)
          onChange={onRefreshIntervalChange}   // Aggiorna timer + localStorage
          disabled={isLoading}
          aria-label='Select refresh interval'
        >
          {/* ─────────────────────────────────────────────────────────────
              📚 CONCETTO: Rendering di liste con .map() e la prop `key`
              ─────────────────────────────────────────────────────────────
              .map() trasforma un array di oggetti in un array di JSX.
              La prop `key` è OBBLIGATORIA quando si renderizza una lista:
                → Aiuta React a identificare quale elemento è cambiato
                → Permette aggiornamenti efficienti del DOM (diffing)
                → DEVE essere univoca tra i fratelli (non globalmente)
                → NON usare l'indice del map come key se l'ordine può cambiare!
                  Qui usiamo interval.value (es. 15, 30, 60...) che è stabile.
              ───────────────────────────────────────────────────────────── */}
          {refreshIntervals.map((interval) => (
            <option key={interval.value} value={interval.value}>
              {interval.label}
            </option>
          ))}
        </Form.Select>
        {/* Form.Text: testo di aiuto sotto il campo (colore muted) */}
        <Form.Text className='text-muted'>
          Next refresh in: {timeUntilRefresh}
        </Form.Text>
      </Form.Group>

      {/* ── Checkbox Force Update ─────────────────────────────────────────── */}
      <Form.Group className='mb-3' controlId='forceUpdate'>
        <Form.Check
          type='checkbox'
          checked={forceUpdate}            // Controlled: valore dettato da React
          onChange={onForceUpdateChange}   // Aggiorna stato in useDynDnsUpdater
          disabled={isLoading}
          label='Force update'
        />
        {/* ─────────────────────────────────────────────────────────────
            📚 CONCETTO: Rendering condizionale con &&
            ─────────────────────────────────────────────────────────────
            `condizione && <JSX />` mostra il JSX SOLO se la condizione è true.
            Se la condizione è false, React non renderizza nulla.
            Equivalente a: if (condizione) return <JSX />
            ───────────────────────────────────────────────────────────── */}
        {currentIp && storedIp && currentIp === storedIp && (
          <Form.Text className='text-muted'>
            IP addresses are identical. Force update to proceed anyway.
          </Form.Text>
        )}
      </Form.Group>

      {/* ── Pulsante Submit ───────────────────────────────────────────────── */}
      <Button
        variant='secondary'
        type='submit'                    // Questo button triggera il submit del form
        disabled={isUpdateDisabled}      // Calcolato sopra: true → pulsante grigio
        className='w-100 mt-2'          // w-100: larghezza 100% del contenitore
        title={getButtonTooltip()}       // Tooltip HTML nativo al passaggio del mouse
      >
        {/* ─────────────────────────────────────────────────────────────
            📚 CONCETTO: Rendering condizionale con ternario nel JSX
            ─────────────────────────────────────────────────────────────
            Durante il caricamento: mostra Spinner + testo "Updating..."
            Altrimenti: mostra solo testo "Update DynDNS"
            ───────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <>
            {/* Fragment <>...</>: raggruppa elementi senza aggiungere un tag DOM extra */}
            <Spinner
              as='span'           // Renderizza lo spinner come <span> (inline)
              animation='border'  // Stile di animazione Bootstrap
              size='sm'           // Dimensione piccola
              role='status'       // Attributo ARIA per accessibilità
              aria-hidden='true'  // Nasconde ai screen reader (c'è già il testo)
              className='me-2'    // Margin-end: spazio a destra dello spinner
            />
            Updating...
          </>
        ) : (
          'Update DynDNS'
        )}
      </Button>
    </Form>
  )
}

export default DynDnsForm
