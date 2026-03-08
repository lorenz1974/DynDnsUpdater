/**
 * @file AppHeader.jsx
 * @description Componente header dell'applicazione.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Componente Statico — nessuna prop, nessuno stato, nessuna logica│
 * │  2. Perché creare un componente per solo HTML statico?              │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import React from 'react'
import { Card } from 'react-bootstrap'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Componente Statico (Stateless Presentational Component)
// ─────────────────────────────────────────────────────────────────────────────
// AppHeader è il componente più semplice del progetto:
//   → Nessuna prop
//   → Nessuno stato
//   → Nessun effetto
//   → Solo JSX statico
//
// PERCHÉ un componente separato invece di scrivere direttamente in App.jsx?
//   → LEGGIBILITÀ: App.jsx descrive la STRUTTURA dell'app ad alto livello,
//     non i dettagli dell'header
//   → MANUTENIBILITÀ: se cambio il titolo o il colore dell'header, so
//     esattamente dove andare (AppHeader.jsx, non App.jsx)
//   → COERENZA: se l'header viene usato in più pagine, si cambia in un solo posto
//   → SINGLE RESPONSIBILITY: ogni file ha una sola ragione per cambiare
//
// 💡 Non ogni componente deve essere "utile" nel senso di gestire stato/logica.
//    Anche un contenitore di semplice HTML ha valore come unità di organizzazione.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Header dell'applicazione renderizzato come Card.Header di Bootstrap.
 *
 * Componente statico: nessuna prop, nessuno stato.
 * La separazione garantisce che il titolo e lo stile dell'header
 * siano localizzati in un unico punto del codebase.
 *
 * @returns {JSX.Element} L'header dell'applicazione
 */
const AppHeader = () => {
  return (
    // Card.Header: componente Bootstrap che si integra correttamente
    // con la Card circostante (bordo inferiore, sfondo coordinato)
    // bg-secondary: sfondo grigio Bootstrap
    // text-white: testo bianco (contrasto su sfondo scuro)
    // py-3: padding verticale (top + bottom) di 3 unità Bootstrap (1rem)
    <Card.Header className='text-center py-3 bg-secondary text-white'>
      {/* fs-4: font-size equivalente a h4 in Bootstrap (1.5rem)
          mb-0: rimuove il margin-bottom di default del tag h3 */}
      <h3 className='mb-0 fs-4'>DynDNS Updater</h3>
    </Card.Header>
  )
}

export default AppHeader
