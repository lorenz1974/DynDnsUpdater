# Guida React per DynDNS Updater
## Documentazione Educativa

> Questo documento spiega i concetti fondamentali di React utilizzati in questo progetto,
> con spiegazioni delle scelte architetturali e dei motivi per cui certi Hook
> sono stati preferiti ad altri. Pensato per chi vuole imparare React usando
> un progetto reale come riferimento.

---

## Indice

1. [Cos'è React e come funziona](#1-cosè-react-e-come-funziona)
2. [JSX — Scrivere HTML dentro JavaScript](#2-jsx--scrivere-html-dentro-javascript)
3. [Componenti — I mattoncini dell'interfaccia](#3-componenti--i-mattoncini-dellinterfaccia)
4. [Props — Come i dati scorrono verso il basso](#4-props--come-i-dati-scorrono-verso-il-basso)
5. [useState — Lo stato del componente](#5-usestate--lo-stato-del-componente)
6. [useEffect — Gli effetti collaterali](#6-useeffect--gli-effetti-collaterali)
7. [useRef — Riferimenti senza re-render](#7-useref--riferimenti-senza-re-render)
8. [useCallback — Funzioni memoizzate](#8-usecallback--funzioni-memoizzate)
9. [useMemo — Valori calcolati memoizzati](#9-usememo--valori-calcolati-memoizzati)
10. [Custom Hooks — Riutilizzare la logica](#10-custom-hooks--riutilizzare-la-logica)
11. [Scelte Architetturali](#11-scelte-architetturali)
12. [Il Problema delle Stale Closures](#12-il-problema-delle-stale-closures)
13. [Componenti Controllati vs Non Controllati](#13-componenti-controllati-vs-non-controllati)
14. [Error Boundaries](#14-error-boundaries)

---

## 1. Cos'è React e come funziona

React è una **libreria JavaScript** (non un framework completo) per costruire interfacce utente.
Il suo principio fondamentale è il **Virtual DOM**.

### Virtual DOM — Come React ottimizza gli aggiornamenti

Il DOM (Document Object Model) del browser è lento da manipolare direttamente. React risolve
questo problema mantenendo in memoria una rappresentazione virtuale dell'interfaccia.

```
Stato cambia
     ↓
React ricalcola il Virtual DOM (veloce, solo in memoria)
     ↓
React confronta il nuovo Virtual DOM con quello precedente (diffing)
     ↓
React aggiorna SOLO le parti del DOM reale che sono cambiate (reconciliation)
```

Questo approccio rende le applicazioni React performanti anche con interfacce complesse.

### Il ciclo di vita di un componente

Ogni componente React attraversa queste fasi:

```
1. MOUNT    → Il componente viene creato e inserito nel DOM
2. UPDATE   → Lo stato o le props cambiano → il componente si ri-renderizza
3. UNMOUNT  → Il componente viene rimosso dal DOM
```

Gli Hook come `useEffect` permettono di agganciarsi a queste fasi.

---

## 2. JSX — Scrivere HTML dentro JavaScript

JSX (JavaScript XML) è una sintassi che permette di scrivere HTML dentro JavaScript.
Non è HTML vero: viene trasformato da Babel in chiamate `React.createElement()`.

```jsx
// Quello che scrivi:
const elemento = <h1 className="titolo">Ciao Mondo</h1>

// Quello che Babel produce (semplificato):
const elemento = React.createElement('h1', { className: 'titolo' }, 'Ciao Mondo')
```

### Differenze JSX vs HTML

| HTML | JSX | Motivo |
|------|-----|--------|
| `class="..."` | `className="..."` | `class` è una parola riservata in JavaScript |
| `for="..."` | `htmlFor="..."` | `for` è una parola riservata in JavaScript |
| `onclick="..."` | `onClick={...}` | Gli eventi in JSX usano camelCase e ricevono funzioni |
| `style="color: red"` | `style={{ color: 'red' }}` | Lo stile è un oggetto JavaScript, non una stringa |

### Espressioni dentro JSX

Le `{ }` in JSX permettono di inserire qualsiasi espressione JavaScript:

```jsx
const nome = 'Lorenzo'
const eta = 25

return (
  <div>
    <p>Nome: {nome}</p>              {/* Variabile */}
    <p>Età: {eta}</p>                {/* Variabile numerica */}
    <p>Adulto: {eta >= 18 ? 'Sì' : 'No'}</p>  {/* Ternario */}
    <p>Anno: {new Date().getFullYear()}</p>     {/* Espressione */}
  </div>
)
```

> In questo progetto si vede in `AppFooter.jsx`:
> ```jsx
> &copy; {new Date().getFullYear()} DynDNS Updater
> ```

---

## 3. Componenti — I mattoncini dell'interfaccia

Un componente React è una **funzione** (o classe) che:
- Riceve dati in ingresso tramite **props**
- Restituisce JSX da visualizzare

```jsx
// Componente funzionale (modo moderno, preferito)
const Saluto = ({ nome }) => {
  return <h1>Ciao, {nome}!</h1>
}

// Utilizzo
<Saluto nome="Lorenzo" />
```

### Componenti Funzionali vs Componenti Classe

**Componenti Funzionali** (usati quasi ovunque in questo progetto):
```jsx
const MyComponent = (props) => {
  const [count, setCount] = useState(0)  // Usa gli Hook
  return <div>{count}</div>
}
```

**Componenti Classe** (usati solo per `ErrorBoundary` in `main.jsx`):
```jsx
class MyComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = { count: 0 }  // Stato tramite this.state
  }

  render() {
    return <div>{this.state.count}</div>
  }
}
```

**Perché i componenti funzionali sono preferiti oggi?**

- Sintassi più semplice e concisa
- Supportano gli Hook (da React 16.8)
- Più facili da testare
- Migliori performance (React può ottimizzarli meglio)
- Il codice è più leggibile e manutenibile

**Perché esiste ancora `ErrorBoundary` come classe?** → Vedi [sezione 14](#14-error-boundaries).

### Dove si trovano i componenti in questo progetto

```
src/
├── App.jsx                    ← Componente radice (Smart Container)
└── components/
    ├── AppContainer.jsx       ← Layout: avvolge tutto in un Card Bootstrap
    ├── AppHeader.jsx          ← Header statico
    ├── AppFooter.jsx          ← Footer con versione da package.json
    ├── DynDnsForm.jsx         ← Form con campi e pulsante
    └── StatusDisplay.jsx      ← Mostra IP corrente e stato
```

---

## 4. Props — Come i dati scorrono verso il basso

Le **props** (proprietà) sono il meccanismo per passare dati da un componente genitore
a un componente figlio. Il flusso è **unidirezionale**: dall'alto verso il basso.

```jsx
// Il genitore passa i dati
const Genitore = () => {
  const [nome, setNome] = useState('Lorenzo')

  return <Figlio nome={nome} onCambia={setNome} />
}

// Il figlio li riceve tramite props
const Figlio = ({ nome, onCambia }) => {
  return (
    <div>
      <p>{nome}</p>
      <button onClick={() => onCambia('Mario')}>Cambia</button>
    </div>
  )
}
```

### Props in questo progetto

In `App.jsx`, il componente `StatusDisplay` riceve solo i dati che servono:

```jsx
<StatusDisplay
  currentIp={dynDns.currentIp}   // Stringa: IP rilevato
  storedIp={dynDns.storedIp}     // Stringa: IP salvato su DynDNS
  status={dynDns.status}          // Oggetto: { message, type }
  isLoading={dynDns.isLoading}   // Booleano: richiesta in corso?
/>
```

**Principio del minimo privilegio**: ogni componente riceve SOLO le props
che effettivamente usa. Non si passa l'intero oggetto `dynDns` a `StatusDisplay`
perché quel componente non ha bisogno di funzioni o di altri dati.

### La prop speciale `children`

```jsx
// AppContainer riceve `children` — tutto ciò che è scritto dentro di esso
const AppContainer = ({ children }) => (
  <div className="container">
    {children}   {/* Qui vengono renderizzati i figli */}
  </div>
)

// Utilizzo
<AppContainer>
  <AppHeader />
  <MainContent />
  <AppFooter />
</AppContainer>
```

---

## 5. useState — Lo stato del componente

`useState` è l'Hook fondamentale per gestire dati che cambiano nel tempo.
Quando lo stato cambia, React **ri-renderizza** il componente.

```jsx
const [valore, setValore] = useState(valoreIniziale)
//     ↑              ↑                    ↑
//  Valore corrente  Funzione per          Valore al primo render
//                   aggiornare
```

### Regola fondamentale: non modificare lo stato direttamente!

```jsx
// ❌ SBAGLIATO — React non rileverà il cambiamento
stato.nome = 'Mario'

// ✅ CORRETTO — React aggiorna e ri-renderizza
setStato({ ...stato, nome: 'Mario' })
```

### Aggiornamento basato sul valore precedente

Quando il nuovo stato dipende da quello vecchio, usa la **forma funzionale**:

```jsx
// ❌ Potrebbe usare un valore obsoleto in certi scenari asincroni
setContatore(contatore + 1)

// ✅ Usa sempre il valore più recente
setContatore(prev => prev + 1)
```

In questo progetto si vede in `useLocalStorage.js`:
```jsx
setSavedData(prev => ({
  ...prev,
  refreshInterval: newInterval
}))
```

### Inizializzazione pigra (Lazy Initialization)

Se il valore iniziale è costoso da calcolare, puoi passare una **funzione**:

```jsx
// ✅ La funzione viene chiamata UNA SOLA VOLTA al primo render
const [data, setData] = useState(() => {
  const item = localStorage.getItem('key')
  return item ? JSON.parse(item) : defaultValue
})

// ❌ Questo chiamerebbe localStorage ad ogni render
const [data, setData] = useState(JSON.parse(localStorage.getItem('key')))
```

In `useLocalStorage.js` si usa esattamente questa tecnica:
```jsx
const [storedValue, setStoredValue] = useState(initialize)  // initialize è una funzione
```

---

## 6. useEffect — Gli effetti collaterali

Un **effetto collaterale** è qualsiasi operazione che va oltre il semplice calcolo del JSX:
chiamate API, timer, manipolazione diretta del DOM, sottoscrizioni a eventi.

```jsx
useEffect(() => {
  // Codice dell'effetto (eseguito dopo il render)

  return () => {
    // Funzione di cleanup (eseguita prima del prossimo effetto o all'unmount)
  }
}, [dipendenza1, dipendenza2])  // Array delle dipendenze
```

### Quando viene eseguito `useEffect`?

| Array dipendenze | Quando viene eseguito |
|------------------|-----------------------|
| `[]` (vuoto) | Solo al primo render (mount) |
| `[a, b]` | Ogni volta che `a` o `b` cambiano |
| Omesso | Ad ogni render |

### Esempi da questo progetto

**Eseguito solo al mount** (in `App.jsx`):
```jsx
useEffect(() => {
  dynDns.performInitialCheck()
}, [dynDns])
// In pratica come []: performInitialCheck è stabile grazie a useCallback
```

**Cleanup del timer** (in `useRefreshTimer.js`):
```jsx
useEffect(() => {
  return () => {
    // Questa funzione viene chiamata quando il componente viene smontato
    // IMPORTANTE: senza cleanup il timer continuerebbe a girare
    // anche dopo che il componente è stato rimosso dal DOM (memory leak!)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
}, [])  // [] = solo al mount/unmount
```

**Sincronizzare la chiave** (in `useLocalStorage.js`):
```jsx
useEffect(() => {
  keyRef.current = key  // Aggiorna il ref quando la chiave cambia
}, [key])
```

---

## 7. useRef — Riferimenti senza re-render

`useRef` crea un oggetto `{ current: valore }` che persiste tra i render
**senza causare un re-render** quando viene modificato.

```jsx
const riferimento = useRef(valoreIniziale)

// Lettura
console.log(riferimento.current)

// Scrittura — NON causa un re-render!
riferimento.current = nuovoValore
```

### Quando usare useRef invece di useState?

| Usa `useState` quando... | Usa `useRef` quando... |
|--------------------------|------------------------|
| Il valore deve aggiornarsi nella UI | Il valore è solo "interno" alla logica |
| Il cambiamento deve causare un re-render | Il cambiamento NON deve causare un re-render |
| Es: testo mostrato a schermo | Es: ID di un timer, flag "già eseguito" |

### Esempi da questo progetto

**Flag per evitare esecuzione multipla** (in `useDynDnsUpdater.js`):
```jsx
// ✅ useRef — non vogliamo un re-render quando il flag cambia
const initialCheckDone = useRef(false)

// In performInitialCheck:
if (!initialCheckDone.current) {
  initialCheckDone.current = true  // Non causa re-render
  checkAndUpdateIp()
}

// ❌ useState sarebbe sbagliato qui:
// const [initialCheckDone, setInitialCheckDone] = useState(false)
// → setInitialCheckDone(true) causerebbe un re-render inutile
```

**Riferimento al timer** (in `useRefreshTimer.js`):
```jsx
// ✅ useRef — l'ID del timer è un dettaglio interno, non serve nella UI
const timerRef = useRef(null)

timerRef.current = setInterval(..., 1000)  // Salva l'ID del timer
clearInterval(timerRef.current)             // Usa l'ID per fermarlo
```

**Riferimento alla callback aggiornata** (per evitare stale closures):
```jsx
const callbackRef = useRef(onRefreshCallback)

useEffect(() => {
  callbackRef.current = onRefreshCallback  // Tiene sempre l'ultima versione
}, [onRefreshCallback])
```

---

## 8. useCallback — Funzioni memoizzate

`useCallback` restituisce una versione **memoizzata** di una funzione.
La funzione viene ricreata solo quando le sue dipendenze cambiano.

```jsx
const miaFunzione = useCallback(() => {
  // corpo della funzione
}, [dipendenza1, dipendenza2])
```

### Perché NON definire sempre le funzioni normalmente?

In React, ogni volta che un componente si ri-renderizza, **tutte le funzioni
definite al suo interno vengono ricreate** come nuovi oggetti in memoria.

```jsx
// ❌ Ad ogni render, handleClick è un NUOVO oggetto funzione
const Componente = () => {
  const handleClick = () => console.log('click')  // Nuova funzione ad ogni render!

  return <Figlio onClick={handleClick} />
}
```

Questo è un problema perché:
1. Il figlio riceve una prop diversa ad ogni render del genitore
2. Se il figlio usa `React.memo` o `useEffect([handleClick])`, si ri-renderizza inutilmente
3. Causa catene di ri-render non necessarie

```jsx
// ✅ Con useCallback, handleClick è la STESSA funzione tra un render e l'altro
const Componente = () => {
  const handleClick = useCallback(() => {
    console.log('click')
  }, [])  // [] = nessuna dipendenza = mai ricreata

  return <Figlio onClick={handleClick} />
}
```

### Quando useCallback è utile in questo progetto

**In `App.jsx`**: `handleTimerRefresh` viene passato a `useRefreshTimer`.
Se venisse ricreato ad ogni render, il timer si resetterebbe continuamente.

```jsx
// ✅ Stabile tra i render: il timer non si resetta ad ogni render di App
const handleTimerRefresh = useCallback(() => {
  dynDns.checkAndUpdateIp()
}, [dynDns])
```

**In `useDynDnsUpdater.js`**: tutte le funzioni dell'hook usano `useCallback`
perché vengono esposte come props a componenti figli.

```jsx
const handleInputChange = useCallback((e) => {
  const { id, value } = e.target
  setFormData(prev => ({
    ...prev,
    [id.replace('form', '').toLowerCase()]: value,
  }))
}, [])  // Nessuna dipendenza: la funzione non usa variabili esterne
```

### Quando useCallback NON serve

`useCallback` ha un costo: React deve confrontare le dipendenze ad ogni render.
Non usarlo su ogni funzione — solo quando:
- La funzione viene passata come prop a componenti figli
- La funzione è una dipendenza di un `useEffect`
- La funzione è computazionalmente costosa

```jsx
// ❌ Inutile: questa funzione non esce dal componente
const handleClick = useCallback(() => {
  setContatore(prev => prev + 1)
}, [])

// ✅ Sufficiente:
const handleClick = () => setContatore(prev => prev + 1)
```

---

## 9. useMemo — Valori calcolati memoizzati

`useMemo` memoizza il **risultato** di un calcolo costoso.

```jsx
const valoreCalcolato = useMemo(() => {
  // calcolo costoso
  return risultato
}, [dipendenza1, dipendenza2])
```

### Differenza tra useMemo e useCallback

| Hook | Memoizza | Uso tipico |
|------|----------|------------|
| `useCallback(fn, deps)` | Una **funzione** | Passare callback stabili come props |
| `useMemo(() => val, deps)` | Un **valore** | Evitare calcoli costosi ad ogni render |

```jsx
// useCallback — memoizza la FUNZIONE stessa
const fn = useCallback(() => calcolo(), [deps])

// useMemo — memoizza il RISULTATO della funzione
const valore = useMemo(() => calcolo(), [deps])

// Equivalenza: useCallback(fn) ≈ useMemo(() => fn)
```

### Perché useMemo non è usato in questo progetto?

In questo progetto, i valori calcolati sono semplici (confronti tra stringhe,
booleani) e non richiedono memoizzazione:

```jsx
// In StatusDisplay.jsx — calcolo banale, useMemo sarebbe overkill
const ipMatch = currentIp && storedIp && currentIp === storedIp

// In DynDnsForm.jsx — booleano da condizioni semplici
const isUpdateDisabled = isLoading || !formData.hostname || ...
```

`useMemo` sarebbe appropriato per:
- Ordinare/filtrare grandi array di dati
- Calcoli matematici complessi
- Trasformazioni di dati che richiedono molte operazioni

---

## 10. Custom Hooks — Riutilizzare la logica

Un **Custom Hook** è una funzione JavaScript il cui nome inizia con `use` e
che può chiamare altri Hook di React.

```jsx
// Un custom hook è solo una funzione che usa Hook React
const useMioHook = (parametro) => {
  const [stato, setStato] = useState(null)

  useEffect(() => {
    // logica...
  }, [parametro])

  return stato
}
```

### Perché i Custom Hook?

Il problema che risolvono: **due componenti diversi che condividono la stessa logica**.
Prima dei Hook, la soluzione erano pattern complessi (HOC, render props).
Oggi si estrae la logica in un Custom Hook.

```jsx
// ❌ Prima dei Custom Hook: logica duplicata
const ComponenteA = () => {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  return <div>{data}</div>
}

const ComponenteB = () => {
  const [data, setData] = useState(null)  // Stessa logica duplicata!
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  return <span>{data}</span>
}
```

```jsx
// ✅ Con Custom Hook: logica centralizzata
const useFetchData = () => {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  return data
}

const ComponenteA = () => <div>{useFetchData()}</div>
const ComponenteB = () => <span>{useFetchData()}</span>
```

### Custom Hook in questo progetto

```
src/hooks/
├── useLocalStorage.js    → Persistenza dei dati (localStorage + useState)
├── useDynDnsUpdater.js   → Tutta la logica di business (API, form, stato)
└── useRefreshTimer.js    → Timer con countdown e cleanup automatico
```

**`useLocalStorage`**: astrae `localStorage` rendendolo utilizzabile come `useState`.
Gestisce serializzazione JSON, errori di storage, e aggiornamenti chiave.

**`useDynDnsUpdater`**: il "cervello" dell'app. Se fosse tutto in `App.jsx`,
il file diventerebbe illeggibile. Separandolo, `App.jsx` rimane pulito
e la logica è testabile indipendentemente.

**`useRefreshTimer`**: il timer con countdown. Gestisce `setInterval`, cleanup,
e il problema delle stale closures — complessità nascosta in un'interfaccia semplice.

---

## 11. Scelte Architetturali

### Pattern Smart Container / Presentational

Questo progetto separa i componenti in due categorie:

**Componenti "Smart" (Container)**: contengono logica, stato, chiamate API.
```
App.jsx ← Smart Container: usa hooks, coordina tutto
```

**Componenti "Presentazionali" (Dumb/Pure)**: ricevono dati via props, li mostrano.
```
StatusDisplay.jsx  ← Solo rendering, nessuno stato interno
AppHeader.jsx      ← Completamente statico
AppFooter.jsx      ← Legge package.json, nessuno stato
AppContainer.jsx   ← Solo layout
```

**DynDnsForm.jsx** è a metà: ha solo `useState(showPassword)` per il toggle
della password, ma tutta la logica importante arriva via props.

**Vantaggi di questa separazione:**
1. I componenti presentazionali sono facilissimi da testare (input fissi → output prevedibile)
2. La logica è in un posto solo → più facile trovare e correggere bug
3. I componenti UI possono essere riutilizzati con dati diversi
4. Il codice è leggibile: guardando `App.jsx` si capisce il flusso senza entrare nei dettagli

### Perché i Custom Hook invece di mettere tutto in App.jsx?

```
App.jsx senza hook: 300+ righe mescolando UI e logica → difficile da leggere
App.jsx con hook: 50 righe di pura orchestrazione → chiarissimo
```

Ogni Custom Hook ha una **singola responsabilità**:
- `useLocalStorage` → persistenza
- `useDynDnsUpdater` → logica di business DynDNS
- `useRefreshTimer` → gestione del timer

### Perché DynDnsService.js è separato dagli Hook?

`DynDnsService.js` **non è un componente React né un Hook** — è un modulo
JavaScript puro con funzioni `async`. Separarlo dall'hook permette di:

1. Testarlo indipendentemente (non richiede React)
2. Riutilizzarlo in altri contesti (Node.js, altri framework)
3. Cambiare il provider DynDNS senza toccare la logica React

```
useDynDnsUpdater.js     ← "Cosa fare e quando" (logica React)
DynDnsService.js         ← "Come farlo" (comunicazione API)
```

### Perché il flusso dati è unidirezionale?

```
App (stato) → Props → DynDnsForm (UI)
                         ↓ (evento utente)
              Callback → App (aggiorna stato)
                         ↓
              Props → StatusDisplay (mostra risultato)
```

**Mai il contrario**: un figlio non modifica direttamente lo stato del genitore.
Usa una **callback** ricevuta via props. Questo rende il flusso prevedibile
e i bug più facili da tracciare.

### Perché React Bootstrap invece di CSS puro?

React Bootstrap fornisce componenti React già pronti (`Card`, `Form`, `Button`, `Badge`...)
con Bootstrap integrato. Vantaggi:
- Non si scrive CSS Bootstrap come classi stringa (`className="col-md-4 mt-3 p-2"`)
- Si usano componenti semantici (`<Stack direction="horizontal">`)
- Accessibilità gestita automaticamente (ARIA, ruoli)
- Responsive design già incluso

---

## 12. Il Problema delle Stale Closures

Questo è uno dei concetti più insidiosi di React con gli Hook.

### Cos'è una closure?

Una closure è una funzione che "ricorda" le variabili del suo contesto di creazione.

```javascript
const crea = (x) => {
  return () => console.log(x)  // La funzione interna "ricorda" x
}

const fn = crea(5)
fn()  // Stampa: 5 (anche se x non esiste più nell'outer scope)
```

### Il problema con setInterval

```jsx
// ❌ ESEMPIO DI BUG CON STALE CLOSURE
const Contatore = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      // count qui è sempre 0!
      // La funzione è stata creata quando count era 0
      // e non "vede" i valori aggiornati
      console.log(count)         // Sempre 0
      setCount(count + 1)        // Aggiunge sempre 1 a 0 → sempre 1
    }, 1000)
    return () => clearInterval(timer)
  }, [])  // [] = la funzione del timer non viene mai ricreata

  return <div>{count}</div>
}
```

### La soluzione con useRef

```jsx
// ✅ SOLUZIONE: usare un ref per accedere al valore corrente
const Contatore = () => {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)  // Ref parallelo

  const incrementa = () => {
    countRef.current += 1    // Aggiorna il ref
    setCount(countRef.current)  // Aggiorna lo stato per il render
  }

  useEffect(() => {
    const timer = setInterval(() => {
      countRef.current += 1              // Il ref ha sempre il valore attuale
      setCount(countRef.current)         // Aggiorna la UI
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <div>{count}</div>
}
```

### Come viene risolto in `useRefreshTimer.js`

```jsx
const timerRef = useRef(null)       // ID del timer
const countdownRef = useRef(init)   // Countdown (non nello state)
const callbackRef = useRef(cb)      // Callback sempre aggiornata
const enabledRef = useRef(enabled)  // Flag sempre aggiornato

// Aggiorna i ref quando i valori cambiano
useEffect(() => { callbackRef.current = onRefreshCallback }, [onRefreshCallback])
useEffect(() => { enabledRef.current = enabled }, [enabled])

// Il setInterval usa solo ref → mai stale closures!
timerRef.current = setInterval(() => {
  countdownRef.current -= 1        // Usa il ref, non lo state
  setTimeRemaining(countdownRef.current)  // Solo questo aggiorna la UI

  if (countdownRef.current <= 0) {
    callbackRef.current()          // Chiama sempre l'ultima callback
    countdownRef.current = intervalToUse  // Reset tramite ref
  }
}, 1000)
```

---

## 13. Componenti Controllati vs Non Controllati

### Componenti Controllati

Il valore dell'input è controllato da React (`value` + `onChange`):

```jsx
// ✅ Controllato: React conosce sempre il valore corrente
const [nome, setNome] = useState('')

<input
  value={nome}                          // Valore dettato da React
  onChange={(e) => setNome(e.target.value)}  // React aggiorna lo stato
/>
```

**Tutti gli input in `DynDnsForm.jsx` sono controllati:**
```jsx
<Form.Control
  value={formData.hostname}    // Valore da React
  onChange={onInputChange}     // Aggiorna React
/>
```

### Componenti Non Controllati

Il DOM gestisce il valore, React lo legge solo quando necessario:

```jsx
// Non controllato: il DOM gestisce il valore
const inputRef = useRef(null)

<input ref={inputRef} defaultValue="iniziale" />

// Per leggere il valore:
console.log(inputRef.current.value)
```

**Perché questo progetto usa componenti controllati?**
- React ha sempre il "source of truth" dello stato del form
- Facile validazione in tempo reale
- Facile sincronizzazione con `localStorage`
- Il comportamento è prevedibile e testabile

---

## 14. Error Boundaries

Gli **Error Boundaries** catturano gli errori JavaScript che avvengono nel
rendering dei componenti figli e mostrano una UI di fallback.

### Perché solo con classi?

React 16.8 ha introdotto gli Hook, ma `getDerivedStateFromError` e `componentDidCatch`
non hanno ancora un equivalente Hook. La ragione tecnica è che gli Error Boundaries
devono funzionare **durante la fase di rendering** (sincrona), mentre gli Hook
sono progettati per la fase post-rendering (asincrona).

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  // Chiamato durante il rendering quando un figlio lancia un errore
  // Deve restituire un aggiornamento di stato (come getDerivedState)
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  // Chiamato dopo il rendering per il logging (effetto collaterale)
  componentDidCatch(error, info) {
    console.error('Errore catturato:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <div>Qualcosa è andato storto!</div>
    }
    return this.props.children
  }
}
```

In `main.jsx` l'Error Boundary avvolge l'intera app: se qualcosa crasha durante
lo sviluppo, invece di una schermata bianca, si vede l'errore formattato.

---

## Riepilogo dei Pattern Usati

| Concetto | Dove | Perché |
|----------|------|--------|
| Custom Hook | `useLocalStorage`, `useDynDnsUpdater`, `useRefreshTimer` | Separare e riutilizzare la logica |
| `useState` | Ovunque | Dati che cambiano e aggiornano la UI |
| `useEffect` | Hook e `App.jsx` | Side effects: timer, mount iniziale, sync |
| `useRef` | `useRefreshTimer`, `useDynDnsUpdater` | Dati interni che NON devono causare re-render |
| `useCallback` | `App.jsx`, `useDynDnsUpdater` | Stabilizzare funzioni passate come props |
| `useMemo` | Non usato (valori troppo semplici) | Memoizzare calcoli costosi |
| Smart Container | `App.jsx` | Centralizzare stato e logica |
| Presentational | `StatusDisplay`, `AppHeader`, `AppFooter` | Solo UI, nessuna logica |
| Unidirectional flow | Tutto | Dati solo dall'alto verso il basso |
| Controlled inputs | `DynDnsForm` | React come "source of truth" |
| Error Boundary | `main.jsx` | Catch degli errori di rendering |
| Lazy init | `useLocalStorage` | Leggere `localStorage` una sola volta |
| Stale closure fix | `useRefreshTimer` | Refs per valori dentro `setInterval` |

---

*Per la documentazione tecnica dettagliata (firma delle funzioni, flusso degli eventi, mappa dello stato) vedi [ARCHITECTURE.md](ARCHITECTURE.md).*
