/**
 * @file DynDnsService.js
 * @description Modulo di servizio per le operazioni API DynDNS e il rilevamento IP.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  CONCETTI ILLUSTRATI IN QUESTO FILE                                 │
 * │                                                                     │
 * │  1. Modulo ES puro — NON è un componente React né un Hook           │
 * │  2. Named exports — più export dallo stesso file                    │
 * │  3. async/await e fetch API — comunicazione con server esterni      │
 * │  4. Autenticazione HTTP Basic — Base64 e header Authorization       │
 * │  5. Separazione delle responsabilità — Service Layer pattern        │
 * │  6. Gestione degli ambienti — sviluppo vs produzione               │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 Note architetturali: vedi ARCHITECTURE.md §5 e REACT_GUIDE.md §11
 */

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Named Exports vs Default Export
// ─────────────────────────────────────────────────────────────────────────────
// Questo file usa NAMED exports (export const ...) invece di default export.
//
// DEFAULT export (un solo export per file, usato in componenti e hook):
//   export default MyComponent
//   import MyComponent from './MyComponent'  ← nome scelto dall'importatore
//
// NAMED exports (più export per file, usato in moduli utility):
//   export const funzioneA = () => {}
//   export const funzioneB = () => {}
//   import { funzioneA, funzioneB } from './DynDnsService'   ← nomi esatti
//   import * as DynDnsService from './DynDnsService'          ← tutto sotto namespace
//
// In useDynDnsUpdater.js si usa: import * as DynDnsService from '@components/DynDnsService'
// Questo raccoglie tutti gli export sotto l'oggetto DynDnsService → DynDnsService.fetchCurrentIp()
//
// 💡 PERCHÉ named exports qui?
//    → Il modulo espone più funzioni correlate (fetchCurrentIp, updateDynDns, ecc.)
//    → Il namespace DynDnsService.xxx rende chiaro da dove viene ogni funzione
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Costanti di configurazione come named exports
// ─────────────────────────────────────────────────────────────────────────────
// Esportare le costanti permette di:
//   → Testarle nei test unitari
//   → Usarle in altri moduli senza hardcodare i valori
//   → Centralizzare i cambiamenti (se l'URL cambia, lo cambio qui solo)
// ─────────────────────────────────────────────────────────────────────────────

/** URL del servizio per rilevare l'IP pubblico */
export const IP_INFO_ENDPOINT = 'https://ipinfo.io/json'

/** Path per l'aggiornamento DynDNS in sviluppo (gestito dal proxy Vite) */
export const DYNDNS_DEV_PATH = '/nic/update'

/** Path per il proxy PHP in produzione */
export const DYNDNS_PROD_PATH = '/dyndns-proxy.php'

// ─────────────────────────────────────────────────────────────────────────────
// 📚 CONCETTO: Service Layer — perché separare la logica HTTP da React?
// ─────────────────────────────────────────────────────────────────────────────
// DynDnsService.js è un modulo JavaScript PURO: non importa nulla da React.
// Non usa useState, useEffect, useCallback — è solo JavaScript.
//
// VANTAGGI di questa separazione:
//   1. TESTABILITÀ: si può testare la logica HTTP senza simulare React
//   2. RIUTILIZZABILITÀ: potrebbe essere usato in Node.js, altri framework
//   3. LEGGIBILITÀ: il hook (useDynDnsUpdater) si concentra sulla logica React,
//      il servizio si concentra sulla comunicazione di rete
//   4. MANUTENIBILITÀ: se DynDNS cambia API, modifico solo questo file
//
// ANALOGIA: è come un "Data Access Layer" in architetture backend.
//   useDynDnsUpdater = Business Logic Layer (cosa fare e quando)
//   DynDnsService    = Data Access Layer   (come comunicare con l'API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina se l'app è in modalità sviluppo in base all'hostname.
 *
 * PERCHÉ questa distinzione?
 *   → In sviluppo (localhost): Vite fornisce un proxy che risolve il CORS
 *   → In produzione (server reale): non c'è Vite, serve un proxy PHP
 *
 * CORS (Cross-Origin Resource Sharing): politica di sicurezza del browser
 * che blocca le richieste HTTP verso un dominio diverso da quello della pagina.
 * Il browser blocca: pagina su localhost:5173 → richiesta a dyndns.org
 *
 * @returns {boolean} true se siamo su localhost/127.0.0.1
 */
export const isDevelopment = () => {
  const hostname = window.location.hostname
  // startsWith() per gestire casi come 'localhost:3000' (meno comune)
  return hostname === 'localhost' || hostname.startsWith('localhost:') || hostname === '127.0.0.1'
}

/**
 * Restituisce il base path dell'applicazione nel server di produzione.
 *
 * L'app è deployata su /dyndnsupdater/ (tutto minuscolo, case-sensitive su Linux).
 * Questo valore deve corrispondere esattamente al campo `base` in vite.config.js.
 *
 * In un progetto più grande questo verrebbe da import.meta.env.BASE_URL
 * (variabile d'ambiente di Vite), ma per semplicità è hardcodato qui.
 *
 * @returns {string} Il base path (es. '/dyndnsupdater')
 */
export const getBasePath = () => {
  // In uno scenario reale: return import.meta.env.BASE_URL
  return '/dyndnsupdater'
}

/**
 * Costruisce l'URL corretto per l'aggiornamento DynDNS in base all'ambiente.
 *
 * SVILUPPO (localhost):
 *   Vite dev server ha un proxy configurato in vite.config.js che intercetta
 *   le richieste a /nic/update e le forwarda a https://members.dyndns.org/nic/update
 *   → Questo risolve il problema CORS senza server aggiuntivi
 *
 * PRODUZIONE (server reale):
 *   Non c'è Vite. Un file PHP (dyndns-proxy.php) fa da intermediario:
 *   browser → PHP (stessa origine, nessun CORS) → dyndns.org
 *
 * @param {string} targetUrl - URL target per il proxy PHP (default: dyndns.org)
 * @returns {string} URL da usare per la richiesta di aggiornamento
 */
export const getDynDnsUpdatePath = (targetUrl = 'https://members.dyndns.org/nic/update') => {
  if (!isDevelopment()) {
    // PRODUZIONE: usa il proxy PHP.
    // encodeURIComponent() converte l'URL in formato sicuro per query string:
    //   'https://dyndns.org/nic/update' → 'https%3A%2F%2Fdyndns.org%2Fnic%2Fupdate'
    return `${getBasePath()}${DYNDNS_PROD_PATH}?targetUrl=${encodeURIComponent(targetUrl)}`
  } else {
    // SVILUPPO: usa il proxy Vite (configurato in vite.config.js)
    // Il percorso /nic/update viene intercettato da Vite e reindirizzato
    return DYNDNS_DEV_PATH
  }
}

/**
 * Recupera l'IP pubblico corrente tramite il servizio ipinfo.io.
 *
 * ipinfo.io restituisce un oggetto JSON con l'IP e altre informazioni:
 *   { ip: "1.2.3.4", city: "Milan", country: "IT", ... }
 * Noi usiamo solo il campo `ip`.
 *
 * Questo servizio non richiede autenticazione per un uso di base.
 * Ha un limite di 50.000 richieste/mese per i client non autenticati.
 *
 * @async
 * @returns {Promise<Object|null>} Oggetto con l'IP (e altri dati) oppure null in caso di errore
 */
export const fetchCurrentIp = async () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 📚 CONCETTO: Fetch API e async/await
  // ─────────────────────────────────────────────────────────────────────────
  // La Fetch API è l'API moderna del browser per le richieste HTTP.
  // Restituisce una Promise che si risolve con un oggetto Response.
  //
  // async/await è syntactic sugar sopra le Promise:
  //   `await fetch(url)` è equivalente a `fetch(url).then(response => ...)`
  //   ma la scrittura sequenziale (await) è molto più leggibile.
  //
  // IMPORTANTE: fetch non rigetta la Promise per errori HTTP (404, 500 ecc.)!
  // Solo i problemi di rete (offline, timeout) causano un rigetto.
  // Bisogna controllare response.ok manualmente.
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const response = await fetch(IP_INFO_ENDPOINT)
    // response.ok = true se status HTTP è 200-299
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
    // response.json() deserializza il corpo della risposta come JSON
    return await response.json()
  } catch (error) {
    console.error('❌ Error retrieving IP:', error)
    return null  // Restituisce null invece di propagare l'eccezione (gestita in useDynDnsUpdater)
  }
}

/**
 * Aggiorna il record DynDNS con il nuovo indirizzo IP.
 *
 * Implementa il protocollo DynDNS Remote Access API:
 * - Autenticazione via HTTP Basic (Authorization: Basic base64(user:pass))
 * - Richiesta GET con parametri nell'URL
 * - Risposta in formato testo con codici specifici (good, nochg, badauth, ecc.)
 *
 * @async
 * @param {string} hostname - L'hostname DynDNS da aggiornare (es. myhost.dyndns.org)
 * @param {string} user     - Username DynDNS
 * @param {string} passwd   - Password DynDNS
 * @param {string} ip       - Nuovo indirizzo IP da registrare
 * @returns {Promise<Object>} Risultato con { success, message, code?, ip? }
 */
export const updateDynDns = async (hostname, user, passwd, ip) => {
  // Validazione dei parametri obbligatori prima di fare la chiamata HTTP
  if (!hostname || !user || !passwd || !ip) {
    return {
      success: false,
      message: 'All fields are required',
    }
  }

  try {
    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: Autenticazione HTTP Basic
    // ─────────────────────────────────────────────────────────────────────
    // HTTP Basic Auth invia le credenziali nell'header Authorization.
    // Le credenziali vengono codificate in Base64 (NON cifrate!):
    //   'username:password' → base64 → 'dXNlcm5hbWU6cGFzc3dvcmQ='
    //
    // btoa() = Binary To Ascii = codifica in Base64 (funzione nativa del browser)
    //
    // IMPORTANTE: Base64 NON è cifratura! È solo encoding.
    // Le credenziali sono visibili a chiunque possa intercettare il traffico.
    // HTTPS (TLS/SSL) cifra la connessione → le credenziali sono protette in transito.
    //
    // Il proxy PHP o il proxy Vite gestiscono questa richiesta,
    // quindi le credenziali viaggiano solo fino al proxy (non al browser finale).
    // ─────────────────────────────────────────────────────────────────────
    const authInfo = btoa(`${user}:${passwd}`)  // Base64 encode di "user:password"
    const headers = {
      Authorization: `Basic ${authInfo}`,        // Standard HTTP Basic Auth header
      'User-Agent': 'React DynDNS Updater',      // Identifica il client alla API DynDNS
    }

    // Parametri richiesti dall'API DynDNS Remote Access
    // Ref: https://help.dyn.com/remote-access-api/perform-update/
    const queryParams = {
      hostname,             // FQDN da aggiornare (es. miodominio.dyndns.org)
      myip:     ip,         // Nuovo IP da registrare
      wildcard: 'NOCHG',   // Non modificare il record wildcard (*.hostname)
      mx:       'NOCHG',   // Non modificare il record MX (mail exchange)
      backmx:   'NOCHG',   // Non modificare il backup MX
    }

    // Costruisce l'URL di base in base all'ambiente (sviluppo vs produzione)
    let updateUrl = getDynDnsUpdatePath()

    // ─────────────────────────────────────────────────────────────────────
    // Aggiunge i parametri all'URL in modo diverso per sviluppo e produzione
    // ─────────────────────────────────────────────────────────────────────
    if (isDevelopment()) {
      // SVILUPPO: URLSearchParams serializza i parametri come query string
      // new URLSearchParams({hostname:'...', myip:'...'}).toString()
      // → 'hostname=miodominio.dyndns.org&myip=1.2.3.4&wildcard=NOCHG&...'
      updateUrl += '?' + new URLSearchParams(queryParams).toString()
    } else {
      // PRODUZIONE: aggiunge i parametri uno per uno all'URL già parzialmente costruito
      // L'URL già termina con '?targetUrl=...', quindi aggiungiamo con '&'
      Object.entries(queryParams).forEach(([key, value]) => {
        updateUrl += `&${key}=${encodeURIComponent(value)}`
      })
    }

    console.log(`🔄 Sending DynDNS update request via ${isDevelopment() ? 'Vite proxy' : 'PHP proxy'} to:`, updateUrl)

    // ─────────────────────────────────────────────────────────────────────
    // Esecuzione della richiesta HTTP
    // ─────────────────────────────────────────────────────────────────────
    const response = await fetch(updateUrl, {
      method:      'GET',              // DynDNS usa GET (i parametri sono nell'URL)
      headers,                         // Authorization + User-Agent
      credentials: 'same-origin',     // Invia cookies/auth solo allo stesso dominio
    })

    // DynDNS restituisce testo semplice, non JSON
    const responseText = await response.text()
    console.log('📡 DynDNS API response:', responseText)

    // Controlla prima gli errori HTTP prima di parsare la risposta
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${responseText}`)
    }

    // ─────────────────────────────────────────────────────────────────────
    // 📚 CONCETTO: Parsing della risposta DynDNS
    // ─────────────────────────────────────────────────────────────────────
    // L'API DynDNS restituisce stringhe di testo con codici specifici.
    // Usiamo String.includes() per verificare la presenza di ciascun codice.
    // Ref completo: https://help.dyn.com/remote-access-api/return-codes/
    //
    // La struttura if/else if garantisce che solo un caso venga gestito
    // anche se la risposta contenesse più codici (improbabile ma possibile).
    // ─────────────────────────────────────────────────────────────────────

    if (responseText.includes('badauth')) {
      // Credenziali errate: username o password sbagliati
      return { success: false, message: 'Authentication failed. Please check your username and password.', code: 'badauth' }
    } else if (responseText.includes('nochg')) {
      // IP già registrato: nessuna modifica necessaria (risposta positiva)
      return { success: true, message: 'IP address is already up-to-date on DynDNS servers.', code: 'nochg', ip }
    } else if (responseText.includes('good')) {
      // Aggiornamento riuscito: il nuovo IP è stato registrato
      return { success: true, message: 'DynDNS successfully updated!', code: 'good', ip }
    } else if (responseText.includes('notfqdn')) {
      // Hostname non è un FQDN (Fully Qualified Domain Name) valido
      return { success: false, message: 'The hostname specified is not a fully-qualified domain name.', code: 'notfqdn' }
    } else if (responseText.includes('nohost')) {
      // Hostname non trovato nell'account utente
      return { success: false, message: 'The hostname specified does not exist in this user account.', code: 'nohost' }
    } else if (responseText.includes('911')) {
      // Errore lato DynDNS (problema temporaneo del loro server)
      return { success: false, message: 'DynDNS service is temporarily unavailable.', code: '911' }
    } else if (responseText.includes('abuse')) {
      // Account bloccato per abuso (troppe richieste o comportamento anomalo)
      return { success: false, message: 'Account has been blocked for abuse.', code: 'abuse' }
    } else {
      // Risposta non riconosciuta: restituisce il testo grezzo per il debug
      return { success: false, message: `Unexpected response from DynDNS: ${responseText}`, code: 'unknown' }
    }
  } catch (error) {
    // Cattura errori di rete (offline, timeout, CORS) o errori HTTP
    console.error('❌ DynDNS update error:', error)
    return {
      success: false,
      message: `Unable to update DynDNS: ${error.message}`,
      code:    'error'
    }
  }
}
