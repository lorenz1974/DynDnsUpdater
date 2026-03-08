/**
 * @file AppFooter.jsx
 * @description Componente footer dell'applicazione con informazioni sulla versione.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI ILLUSTRATI IN QUESTO FILE                                 │
 * │                                                                     │
 * │  1. Import di dati da file JSON — leggere configurazioni build-time │
 * │  2. Espressioni JSX — calcoli inline nel markup                     │
 * │  3. Entità HTML in JSX — &copy;, &mdash;, &middot;                 │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import React from 'react'
import { Card } from 'react-bootstrap'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Import di file JSON come modulo
// ─────────────────────────────────────────────────────────────────────────────
// Vite (e webpack) permettono di importare file JSON come se fossero moduli JS.
// Il file JSON viene parsato automaticamente e diventa un oggetto JavaScript.
//
// VANTAGGI:
//   → La versione è definita in UN SOLO POSTO (package.json)
//     e viene usata sia da npm che dall'UI
//   → Se aggiorni la versione con `npm version patch`, il footer si aggiorna
//     automaticamente al prossimo build (senza toccare AppFooter.jsx)
//   → È un esempio di "Single Source of Truth": un solo punto di verità
//
// NOTA: questo è un import "build-time" (risolto da Vite durante il build).
// In produzione, il valore è già incorporato nel bundle JavaScript,
// non viene letto dinamicamente dal file system.
// ─────────────────────────────────────────────────────────────────────────────
import packageJson from '../../package.json'

/**
 * Footer dell'applicazione con copyright, versione e data di rilascio.
 *
 * Legge la versione e la data di rilascio direttamente da package.json
 * in modo da mantenere un'unica fonte di verità per questi dati.
 *
 * @returns {JSX.Element} Il footer renderizzato come Card.Footer di Bootstrap
 */
const AppFooter = () => {
  // Destrutturazione dei campi necessari da package.json
  // `releaseDate` è un campo personalizzato aggiunto a package.json
  const { version, releaseDate } = packageJson

  return (
    // Card.Footer: si integra con la Card circostante (bordo superiore, sfondo coordinato)
    // text-center: centra il testo
    // text-muted: colore grigio attenuato (Bootstrap utility)
    // fs-9: font-size molto piccolo (classe custom in App.css)
    // py-2: padding verticale ridotto per un footer compatto
    <Card.Footer className='text-center text-muted fs-9 py-2'>
      {/* Riga 1: copyright con l'anno corrente calcolato dinamicamente */}
      <div>
        {/* &copy; = simbolo © in HTML
            new Date().getFullYear() = anno corrente come numero (es. 2026)
            &mdash; = trattino lungo — in HTML */}
        &copy; {new Date().getFullYear()} DynDNS Updater &mdash; All rights reserved.
      </div>

      {/* Riga 2: versione e data di rilascio da package.json */}
      <div>
        {/* `version` e `releaseDate` sono interpolati nel JSX con {} */}
        {/* &middot; = punto centrato · in HTML (separatore visivo) */}
        Version {version} &middot; Released on {releaseDate}
      </div>
    </Card.Footer>
  )
}

export default AppFooter
