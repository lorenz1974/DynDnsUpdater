/**
 * @file StatusDisplay.jsx
 * @description Componente per la visualizzazione dello stato IP e dei messaggi di aggiornamento.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Componente Puro — solo output visuale, zero logica              │
 * │  2. Valore derivato — calcolato da props senza state               │
 * │  3. Rendering condizionale — &&, ternari                            │
 * │  4. Rendering condizionale con Spinner (loading state)              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Per approfondire: vedi REACT_GUIDE.md §4, §11
 */

import React from 'react'
import { Card, Badge, Stack, Alert, Spinner } from 'react-bootstrap'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Componente Puramente Presentazionale (Pure Component)
// ─────────────────────────────────────────────────────────────────────────────
// StatusDisplay è il componente più "puro" del progetto:
//   → Nessuno stato locale
//   → Nessun effetto collaterale
//   → Nessuna callback esportata verso il genitore
//   → Input: props → Output: JSX (solo visualizzazione)
//
// È come una "funzione pura" in matematica: dato lo stesso input (props),
// produce sempre lo stesso output (JSX). Questo lo rende:
//   → Facilissimo da testare: mock delle props → verifica output
//   → Prevedibile: non ha comportamenti nascosti
//   → Riutilizzabile: mostrare lo stato IP ovunque nell'app
//
// CONFRONTO con i componenti "Smart":
//   useDynDnsUpdater  = "il cervello" (logica, stato, API)
//   StatusDisplay     = "gli occhi" (solo mostra ciò che riceve)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Componente per la visualizzazione dell'IP corrente, dell'IP registrato
 * e dei messaggi di stato (successo/errore).
 *
 * @param {Object}  props
 * @param {string}  props.currentIp  - IP pubblico corrente (può essere vuoto)
 * @param {string}  props.storedIp   - IP registrato su DynDNS (può essere vuoto)
 * @param {Object}  props.status     - Messaggio di stato { message: string, type: string }
 * @param {boolean} props.isLoading  - true durante una richiesta in corso
 * @returns {JSX.Element} Il pannello di stato renderizzato
 */
const StatusDisplay = ({ currentIp, storedIp, status, isLoading }) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Valore Derivato — calcolo da props senza useState
  // ─────────────────────────────────────────────────────────────────────────
  // `ipMatch` NON è uno stato (useState) — è un VALORE DERIVATO calcolato
  // ad ogni render dalle props correnti.
  //
  // PERCHÉ non usare useState?
  //   Con useState: dovresti sincronizzare ipMatch ogni volta che currentIp
  //   o storedIp cambiano → complessità, possibili bug di sincronizzazione
  //
  //   Come valore derivato: viene sempre calcolato correttamente dalle props
  //   attuali, senza rischio di essere "stale" (obsoleto)
  //
  // Condizioni della logica:
  //   && currentIp   → entrambi gli IP devono essere non-vuoti prima di confrontarli
  //   && storedIp    → confrontare '' === '' sarebbe sempre true (falso positivo!)
  //   && currentIp === storedIp → confronto effettivo
  // ─────────────────────────────────────────────────────────────────────────
  const ipMatch = currentIp && storedIp && currentIp === storedIp

  return (
    // Fragment (<>...</>) raggruppa due elementi JSX senza aggiungere tag al DOM
    <>
      {/* ── Sezione IP (Card leggera) ────────────────────────────────────── */}
      <Card className='mt-3 border-0 bg-light'>
        {/* Card.Body con padding ridotto per compattezza */}
        <Card.Body className='py-2 px-3'>
          {/* Stack orizzontale: allinea gli elementi su una riga
              justify-content-between: spinge IP corrente e IP registrato agli estremi
              align-items-center: allinea verticalmente al centro */}
          <Stack
            direction='horizontal'
            className='justify-content-between align-items-center'
          >
            {/* ── IP Corrente (sinistra) ──────────────────────────────────── */}
            <div>
              <div className='ip-label'>Current IP</div>
              <div className='ip-value'>
                {/* ─────────────────────────────────────────────────────────
                    📚 CONCETTO: Rendering condizionale a tre vie con ternario
                    ─────────────────────────────────────────────────────────
                    Ternario annidato: A ? B : C  dove C è D || E
                      - isLoading && !currentIp → stiamo caricando e non abbiamo IP → Spinner
                      - currentIp → mostra l'IP
                      - '—' → placeholder se IP non ancora disponibile
                    ───────────────────────────────────────────────────────── */}
                {isLoading && !currentIp ? (
                  <Spinner animation='border' size='sm' role='status' />
                ) : (
                  currentIp || '—'   // || '—': se currentIp è '' o null, mostra il trattino
                )}
              </div>
            </div>

            {/* ── Badge di sincronizzazione (centro) ─────────────────────── */}
            {/* ─────────────────────────────────────────────────────────────
                📚 CONCETTO: Rendering condizionale con &&
                ─────────────────────────────────────────────────────────────
                Il badge compare SOLO quando entrambi gli IP sono noti.
                Prima di avere entrambi gli IP, non ha senso mostrare
                "Synced" o "Changed" (confronto senza dati).
                ───────────────────────────────────────────────────────────── */}
            {currentIp && storedIp && (
              // Ternario sugli attributi: ipMatch=true → success/verde, false → warning/giallo
              // text='dark' su sfondo giallo per leggibilità; undefined = testo bianco di default
              <Badge
                bg={ipMatch ? 'success' : 'warning'}
                text={ipMatch ? undefined : 'dark'}
                pill
              >
                {ipMatch ? 'Synced' : 'Changed'}
              </Badge>
            )}

            {/* ── IP Registrato (destra) ─────────────────────────────────── */}
            <div className='text-end'>
              <div className='ip-label'>Registered IP</div>
              <div className='ip-value'>
                {/* Stessa logica di currentIp:
                    loading senza dati → spinner | altrimenti → IP o placeholder */}
                {isLoading && !storedIp ? (
                  <Spinner animation='border' size='sm' role='status' />
                ) : (
                  storedIp || '—'
                )}
              </div>
            </div>
          </Stack>
        </Card.Body>
      </Card>

      {/* ── Alert del messaggio di stato ──────────────────────────────────── */}
      {/* ─────────────────────────────────────────────────────────────────────
          📚 CONCETTO: Rendering condizionale — mostra Alert solo se c'è un messaggio
          ─────────────────────────────────────────────────────────────────────
          `status.message && (...)` = mostra l'Alert SOLO se message è non-vuoto.
          La stringa vuota ('') è "falsy" in JavaScript → non renderizza nulla.
          ───────────────────────────────────────────────────────────────────── */}
      {status.message && (
        // Alert di Bootstrap: variant='success'|'danger' → verde o rosso
        // Il tipo di variant viene da status.type (impostato in useDynDnsUpdater)
        <Alert variant={status.type} className='mt-3'>
          {/* Durante il caricamento: mostra Spinner + testo di processo
              Altrimenti: mostra il messaggio dell'ultimo aggiornamento */}
          {isLoading ? (
            <Stack direction='horizontal' gap={2}>
              {/* gap={2}: spazio tra spinner e testo (0.5rem in Bootstrap) */}
              <Spinner animation='border' size='sm' role='status' />
              <span>Processing request...</span>
            </Stack>
          ) : (
            status.message
          )}
        </Alert>
      )}
    </>
  )
}

export default StatusDisplay
