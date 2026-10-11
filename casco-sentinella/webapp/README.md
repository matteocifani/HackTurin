# webapp — interfaccia web di Casco Sentinella

Frontend delle tre pagine (`/` mappa pubblica, `/comune` dashboard, `/emergenza` centrale 112 simulata)
costruito con il **design system del kit IAMAimpresa** (`components/ui`, `components/ds`, `styles/tokens.css`,
vendorizzati e non modificati) su Next.js 16 + React 19 + Tailwind v4, con la mappa Leaflet (react-leaflet).

**A runtime non serve Node**: la build è un export statico (`out/`) copiato in `server/static/ui/`, che il server
FastAPI serve insieme alle API (`/api/*`). Chi fa la demo avvia solo il server Python come sempre.

## Dove gira cosa

| Parte | Dove | Note |
|---|---|---|
| Pagine React (questa cartella) | browser | chiamano `/api/*` sulla stessa origine, polling 2 s con `after_id` (SPEC §8) |
| API, DB, arricchimento | laptop, FastAPI (`server/`) | invariati: contratto SPEC §3, 19 test pytest |
| Build statica | `server/static/ui/` | committata: il repo si avvia senza installare pnpm |

## Modificare la UI e ripubblicare

Prerequisiti (solo per chi modifica il frontend): Node ≥ 22 e pnpm (`corepack enable` oppure `npm i -g pnpm`).

```powershell
cd casco-sentinella\webapp
pnpm install          # una volta
pnpm pubblica         # next build + copia di out/ in ..\server\static\ui\
```

Poi riavvia (o lascia girare) il server FastAPI: le route `/`, `/comune`, `/emergenza` servono i file nuovi.
Se `server/static/ui/` manca, FastAPI torna automaticamente alle pagine precedenti; quelle restano comunque
raggiungibili sotto `/legacy`, `/legacy/comune`, `/legacy/emergenza`.

Sviluppo con ricarica automatica (server FastAPI acceso sulla 8000):

```powershell
pnpm dev              # http://localhost:3000, le chiamate /api/* vengono girate alla 8000
```

## Struttura

- `app/` — layout (shell comune, banner "dati SIMULATI", toaster) e le tre pagine.
- `components/casco/` — nostro codice: `shell-casco.tsx` (AppShell del kit con nav e marchio FBL),
  `mappa.tsx` (Leaflet: marker, heatmap, casco "C", popup), `vivo.tsx` (stato connessione).
- `lib/casco/` — `api.ts` (tipi del contratto dati, etichette, colori, client HTTP) e `use-eventi.ts`
  (hook di polling condiviso).
- `components/ui`, `components/ds`, `styles/`, `hooks/`, `lib/*.ts` — design system del kit IAMAimpresa, **non modificare**.

## Licenza e crediti

Il design system proviene dal kit IAMAimpresa (partner dell'hackathon), usato alle condizioni della
`LICENSE-iamaimpresa-kit.txt` inclusa in questa cartella. I marchi IAMAimpresa non sono usati nell'interfaccia.
Mappa: tile © OpenStreetMap contributors. Font Geist (Vercel, OFL) tramite `@fontsource-variable/geist`.
