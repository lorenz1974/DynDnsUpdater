/**
 * @file AppContainer.jsx
 * @description Componente contenitore per il layout dell'applicazione.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI REACT ILLUSTRATI IN QUESTO FILE                           │
 * │                                                                     │
 * │  1. Componente Presentazionale — nessuno stato, nessuna logica      │
 * │  2. props.children — composizione tramite slot di contenuto         │
 * │  3. Destrutturazione delle props                                    │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import React from 'react'
import { Container, Card } from 'react-bootstrap'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 PATTERN: Componente Presentazionale (Dumb Component)
// ─────────────────────────────────────────────────────────────────────────────
// AppContainer è un componente "presentazionale" o "dumb":
//   → Nessuno stato (useState)
//   → Nessun effetto collaterale (useEffect)
//   → Nessuna logica di business
//   → Riceve dati/contenuto tramite props e li visualizza
//
// Il suo unico scopo è definire il LAYOUT: centra l'app, la limita in larghezza
// (600px) e la avvolge nel componente Card di Bootstrap.
//
// PERCHÉ estrarre questo in un componente separato?
//   → Se volessimo cambiare il layout generale (es. max-width a 800px,
//     aggiungere un'ombra diversa), modifichiamo un solo file
//   → App.jsx rimane pulito dalla logica di layout
//   → Il componente è riutilizzabile per altre sezioni con lo stesso layout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Componente layout che avvolge l'applicazione in un Container Bootstrap
 * e in una Card con ombra.
 *
 * @param {Object}          props          - Props del componente
 * @param {React.ReactNode} props.children - Contenuto da renderizzare all'interno
 * @returns {JSX.Element} Il componente contenitore renderizzato
 */
const AppContainer = ({ children }) => {
  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: La prop speciale `children`
  // ─────────────────────────────────────────────────────────────────────────
  // `children` è una prop speciale in React: contiene automaticamente tutto
  // ciò che viene scritto TRA i tag di apertura e chiusura del componente.
  //
  // Utilizzo in App.jsx:
  //   <AppContainer>
  //     <AppHeader />       ← questi tre sono `children`
  //     <Card.Body />
  //     <AppFooter />
  //   </AppContainer>
  //
  // Questo pattern (chiamato "composizione") è molto potente: il componente
  // AppContainer non sa COSA verrà messo dentro — lo accetta come `children`
  // e lo posiziona dove dice il JSX ({children}).
  //
  // ALTERNATIVA MENO FLESSIBILE (da evitare):
  //   <AppContainer header={<AppHeader />} body={<Body />} />
  //   → Richiede di conoscere i componenti specifici → meno riutilizzabile
  // ─────────────────────────────────────────────────────────────────────────
  return (
    // Container di Bootstrap: centra il contenuto orizzontalmente
    // px-2: padding orizzontale per schermi molto piccoli
    // style.maxWidth: limita la larghezza massima per una migliore leggibilità
    <Container className='px-2' style={{ maxWidth: '600px' }}>
      {/* Card di Bootstrap: superficie bianca con angoli arrotondati e ombra
          shadow-sm: ombra leggera per dare profondità visiva alla card */}
      <Card className='shadow-sm'>
        {/* children: tutto il contenuto passato dall'esterno viene renderizzato qui
            AppHeader, Card.Body, AppFooter vengono inseriti in questo punto */}
        {children}
      </Card>
    </Container>
  )
}

export default AppContainer
