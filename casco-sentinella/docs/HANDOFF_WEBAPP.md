# HANDOFF — integrazione della nuova webapp (branch `webapp-refactor`) su `main`

Scritto l'11/10/2026 alle 14:35 (giorno di consegna, deadline Devpost 16:00). Serve alla prossima sessione per
decidere **come portare su `main` il refactor della webapp di casco-sentinella** fatto su `webapp-refactor`.
Le decisioni di progetto e il contesto di partenza sono già documentati altrove: qui ci sono solo stato,
rischi e procedura. Prima di tutto leggere `docs/SPEC.md` (§3, §8, §11, §12) e `docs/TEST_LOG.md`
(ultime tre righe = verifiche di questa UI).

## 1. Stato del branch

- Branch `webapp-refactor`, creato da `origin/main` (merge-base `90aaa27`), pushato su origin. Quattro commit,
  tutti dentro `casco-sentinella/`: `af233ed` (webapp + serving), `b0e578b` (README/TEST_LOG), `f7ffa89` (fix
  heatmap, InfoDot, README), `79ad861` (TEST_LOG dati live). Leggere i messaggi di commit per il dettaglio.
- `origin/main` è avanzato di 4 commit dopo il merge-base (`3a095ed`, `5a7ee9b`, `6ec5552`, `46095c7`): toccano
  `bike-led-receiver/`, `adas-posteriore/`, `pi/`. **Nessun file di `casco-sentinella/` è cambiato su main.**
- Prova di merge senza toccare il worktree, fatta alle 14:35: `git merge-tree --write-tree webapp-refactor
  origin/main` → exit 0, **nessun conflitto**. Ripetere la prova prima di integrare: main può muoversi ancora.
- Nessun tag `demo-ok-N` esiste nel repo. Worktree pulito a parte `mech/` (cartella non tracciata dell'utente,
  non toccarla).
- Nota: il commit `3a095ed` fa inviare a `bike-led-receiver` anche eventi BUCA al server di casco-sentinella
  (prima solo cadute). La nuova UI li mostra senza modifiche (tipo BUCA già previsto).

## 2. Cosa porta il branch su `main`

| Percorso | Cosa | Effetto su chi usa `main` |
|---|---|---|
| `casco-sentinella/webapp/` | progetto Next 16 statico col design system del kit IAMAimpresa + nostre pagine (`app/`, `components/casco/`, `lib/casco/`) | nessuno a runtime; serve pnpm/Node solo per ricompilare (vedi `webapp/README.md`) |
| `casco-sentinella/server/static/ui/` | build statica committata (~2.3 MB, 59 file con nomi hashati) | è ciò che FastAPI serve: senza questa cartella si torna automaticamente alle pagine vecchie |
| `casco-sentinella/server/app.py` | sole modifiche al backend: route `/`, `/comune`, `/emergenza` → `static/ui/*.html` con fallback; nuove route `/legacy*`; mount di `static/ui` su `/` dopo `/static` | API, contratto SPEC §3, DB, test (19/19 verdi) invariati |
| `casco-sentinella/README.md`, `docs/TEST_LOG.md` | sezione sulla UI; tre righe di verifica | — |

Non cambia nulla fuori da `casco-sentinella/`. `bike-led-receiver` continua a postare sullo stesso server e sulle
stesse API.

## 3. Decisioni già prese (non riaprirle senza motivo)

Riassunte nella memoria di sessione (`~/.claude/projects/<progetto>/memory/webapp-refactor-iamaimpresa.md`) e nei
commit. In breve: FastAPI unico server, frontend Next esportato in statico ("B2"); kit usato come sottoinsieme
(`components/ui`, `components/ds`, token) perché il kit è un'app Next+Supabase completa e non una libreria;
licenza del kit proprietaria ("Hackathon Source License 1.0", in `webapp/LICENSE-iamaimpresa-kit.txt`): l'utente
doveva chiedere agli organizzatori se il codice può stare nel repo pubblico Devpost; marchio del team **FBL**,
nessun marchio IAMAimpresa nella UI; cambio stato solo nel pannello di dettaglio; tema dark solo su `/emergenza`.

## 4. Come integrare: opzioni e raccomandazione

1. **Merge con commit di merge** (raccomandato): `git checkout main && git pull && git merge --no-ff
   webapp-refactor`, poi `git tag demo-ok-1` e push di branch e tag. Conserva la storia dei quattro commit e un
   punto unico di ritorno (`git revert -m 1 <merge>` ripristina le pagine vecchie in un colpo).
2. Rebase su main: inutile qui (nessun conflitto, nessuna sovrapposizione di file) e riscrive commit già pushati.
3. Squash: perde la separazione fra "webapp" e "fix": sconsigliato.

Prerequisiti da chiudere **prima** del merge (non fatti al momento dell'handoff):
- Via libera dell'utente: la regola di questo progetto è che il merge su `main` e il tag `demo-ok-N` si fanno solo
  su suo ok esplicito.
- Risposta degli organizzatori sulla licenza del kit nel repo pubblico. Se negativa: valutare di tenere
  `webapp/` fuori dal repo pubblico (la build in `static/ui/` contiene comunque codice compilato del kit).
- Prova interattiva nel browser (vedi §5): finora la UI è stata verificata solo con screenshot headless e `curl`.
- Avvisare chi lavora su `bike-led-receiver`/`pi` che le pagine cambiano (le API no).

## 5. Checklist di verifica (prima e dopo il merge)

```powershell
cd casco-sentinella
.\.venv\Scripts\python.exe -m pytest server\tests -q            # atteso: 19 passed
.\.venv\Scripts\python.exe -m uvicorn app:app --app-dir server --host 0.0.0.0 --port 8000
```

Nel browser (http://127.0.0.1:8000): `/`, `/comune`, `/emergenza`, `/legacy/comune`. Da provare a mano, mai fatto:
clic su riga/marker → pannello laterale → cambio stato (toast); navigazione dalla sidebar; con la pagina aperta,
lanciare il simulatore e vedere toast su `/comune` e scheda rossa + suono su `/emergenza`:

```powershell
$env:PYTHONIOENCODING='utf-8'; .\.venv\Scripts\python.exe tools\simulate_helmet.py --server http://127.0.0.1:8000 --count 3 --rate 5 --emergency
```

(senza la variabile lo script si blocca sulla stampa del carattere "→" in console cp1252). Il DB demo
`server/data/events.db` contiene già due eventi SIM di prova (id 303 e 304) creati durante la verifica.

Riproducibilità della build: `cd webapp; pnpm install; pnpm pubblica` deve lasciare `git status` pulito a parte i
nomi hashati dei chunk, che cambiano a ogni build. Per questo su `main` conviene tenere **una sola build finale**
e non ricompilare senza motivo (ogni rebuild è un commit da ~60 file).

## 6. Attenzioni pratiche

- Toolchain: Node 24 e pnpm 12 ci sono sul laptop (`corepack` abilitato; `corepack enable` dava EPERM ma pnpm
  funziona). `python` non è su PATH (alias Microsoft Store): usare `py -3` o il venv. Node serve solo per
  ricompilare la UI, mai per la demo.
- Git su Windows avvisa "LF will be replaced by CRLF" per i file del build e del webapp: innocuo, non "normalizzare".
- Screenshot senza browser interattivo (ricetta usata, funziona): Edge headless con profilo temporaneo,
  `msedge.exe --headless=new --no-first-run --user-data-dir=<tmp> --window-size=1920,1080
  --virtual-time-budget=12000 --screenshot=<file.png> <url>`; con `--enable-logging=stderr --v=0` si vedono gli
  errori di console (così è stato trovato `L.heatLayer is not a function`). Usare nomi di file sempre diversi.
- Il server avviato in background da Claude Code è stato terminato per memoria bassa del sistema: avviarlo dal
  terminale dell'utente, non in background dalla sessione.
- L'estensione Chrome di Claude è stata rifiutata dall'utente in questa sessione: non riproporla.
- Il comando Bash del tool tronca i comandi molto lunghi (~10 KB): per file grandi usare il tool Write.

## 7. Cose aperte oltre al merge

- Video ≤ 2 min, README di consegna e testo Devpost: non toccati in questa sessione (piano in
  `docs/PIANO_TEAM_E_DEMO.md`).
- Eventuale evoluzione "B1" (backend in Next + Supabase, un solo processo Node): solo dopo la consegna, se il
  premio partner lo giustifica; richiede ripuntare `bike-led-receiver` e riscrivere i 19 test.
- Dettagli UI non rifiniti: heatmap disegnata sopra i marker sulla mappa pubblica (come nella UI precedente);
  nessun lavoro per telefono (schermo grande era il target).

## Suggested skills

- `mattpocock-skills:resolving-merge-conflicts` — solo se la nuova `git merge-tree` dovesse segnalare conflitti.
- `mattpocock-skills:code-review` con punto fisso `origin/main` — revisione Standards/Spec del branch prima del merge
  (spec = `docs/SPEC.md` §8).
- `code-review` (built-in, livello medium) — caccia a bug nel diff `origin/main...webapp-refactor`.
- `run` — per avviare il server e vedere la UI dal terminale dell'utente.
- `mattpocock-skills:grilling` — se l'utente vuole ridiscutere strategia di integrazione o licenza.

## Riferimenti

- Specifiche e verifiche: `docs/SPEC.md`, `docs/TEST_LOG.md`, `docs/PIANO_TEAM_E_DEMO.md`.
- Come si costruisce la UI: `webapp/README.md`; licenza del kit: `webapp/LICENSE-iamaimpresa-kit.txt`.
- Kit originale: https://github.com/IAMA-impresa/iamaimpresa-kit (pubblico durante l'hackathon).
- Repo del team: https://github.com/matteocifani/HackTurin — branch `webapp-refactor`.
