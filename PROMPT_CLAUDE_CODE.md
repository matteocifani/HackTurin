# Prompt per Claude Code — Casco Sentinella

Come usarlo: apri la cartella `casco-sentinella` in VS Code, avvia Claude Code nella cartella, incolla **un prompt alla volta**. Il `CLAUDE.md` è uno solo, nella cartella superiore `HackTurin 2026`: Claude Code lo carica in automatico anche se lo avvii dentro `casco-sentinella`. Aspetta il resoconto finale, prova davvero quello che dice, scrivi l'esito in `docs/TEST_LOG.md`, poi passa al prompt successivo.
Più persone possono lavorare in parallelo su prompt diversi (P1, P2, P3) purché ognuna tocchi solo le sue cartelle.

Primo avvio del repository (PowerShell, una volta sola, da chi crea il repo):

```powershell
cd "C:\Users\39334\Documents\Hackaton\HackTurin 2026\casco-sentinella"
git init
git add .
git commit -m "Spec iniziale Casco Sentinella"
# poi creare il repo pubblico su GitHub e seguire le istruzioni "push an existing repository"
```

---

## Prompt 0 — Avvio (chiunque, 5 minuti)

```
Leggi docs/SPEC.md e docs/TEST_LOG.md (le regole generali le hai già dal CLAUDE.md). Non scrivere ancora codice applicativo.
1) Riassumi in massimo 10 righe cosa costruiamo e come sono divisi MCU, Linux UNO Q e laptop.
2) Elenca tutte le ipotesi marcate [DA VERIFICARE] e per ognuna il test minimo che la conferma.
3) Crea solo lo scheletro del repository come in SPEC §10 (cartelle vuote con un README di una riga dove serve, .gitignore per Python/SQLite/venv), poi fai un commit.
Se qualcosa nella SPEC è contraddittorio o ambiguo, segnalalo prima di procedere.
```

## Prompt 1 — Server, mappa e simulatore (P3, parte subito)

```
Implementa la Fase 1 della SPEC (§7 server, §8 web, §9 strumenti: simulate_helmet.py, seed_demo_data.py, geocode_hotspots.py).
Vincoli: FastAPI + SQLite (sqlite3 standard), web in HTML/JS vanilla, Leaflet 1.9.4 e Leaflet.heat 0.2.0 scaricati una volta in server/static/vendor/ (nessuna CDN a runtime), attribuzione OpenStreetMap, banner "dati SIMULATI" visibile, pannello /emergenza con la scritta "SIMULAZIONE — nessuna chiamata reale al 112".
Per gli hotspot: crea data/hotspots_input.json con i luoghi elencati in SPEC §9 e geocodificali con lo script (Nominatim, 1 richiesta/s, User-Agent esplicito). Non scrivere coordinate a memoria. Dopo la geocodifica mostrami l'elenco dei punti trovati, così li controllo sulla mappa.
Scrivi test pytest per: inserimento evento, idempotenza su event_id, filtri, public=1 senza device_id e con coordinate arrotondate, validazione coordinate fuori Torino.
Alla fine dammi i comandi PowerShell esatti per: creare il venv, installare le dipendenze, avviare il server su 0.0.0.0:8000, popolare i dati di seed, lanciare il simulatore. Verifica tu stesso i criteri di accettazione della Fase 1 che puoi verificare e dimmi quali richiedono un controllo visivo da parte mia.
```

## Prompt 2 — Fase 0 lato MCU (P1, con la scheda collegata)

```
Fase 0 della SPEC, solo lato MCU. Scrivi uno sketch di test minimo (separato dal firmware finale) per Arduino UNO Q che:
1) fa uno scan I2C sul bus Wire1 (connettore Qwiic) e stampa gli indirizzi trovati;
2) inizializza il Modulino Movement e stampa acc (g) e gyro (dps) a circa 10 righe al secondo;
3) misura e stampa ogni 5 s la frequenza reale di lettura dell'IMU alla massima velocità possibile senza delay.
Prima di scrivere il codice controlla gli esempi della libreria Arduino_Modulino installata e la documentazione UNO Q per: oggetto da usare per il bus Qwiic, oggetto da usare per stampare sulla console (Serial o Monitor), fondo scala dell'accelerometro e se è configurabile. Dimmi cosa hai trovato e da dove.
Poi spiegami passo-passo come caricarlo (App Lab o Arduino IDE 2) e cosa devo vedere se funziona. Spiega in breve cosa fa ogni parte del codice. Non andare oltre questa fase.
```

## Prompt 3 — Fase 0 Bridge e rete (P2, con la scheda collegata)

```
Fase 0 della SPEC, collegamento MCU → Linux → laptop.
Prima di scrivere codice: chiedimi di aprire un esempio ufficiale di App Lab che usa il Bridge (es. Blink) e di incollarti la struttura delle cartelle e i file principali; useremo quella struttura per helmet_app/. Non inventarla.
Poi crea un'app minima:
- sketch: Bridge.begin(), Bridge.provide("get_event", ...) che restituisce una stringa JSON con un contatore (mai stampe o Bridge.call dentro la funzione registrata);
- python: ogni 500 ms Bridge.call("get_event"), stampa il risultato e ogni 5 s fa una POST con urllib.request (solo libreria standard) a SERVER_URL/api/heartbeat.
Dammi la procedura per trovare l'IP del laptop (ipconfig), per consentire Python nel firewall di Windows su rete privata e per provare la raggiungibilità. Indica cosa fare se la rete della sede blocca la comunicazione tra dispositivi (hotspot del telefono).
```

## Prompt 4 — Firmware completo (P1, dopo Fase 0 OK)

```
Implementa la Fase 2 della SPEC (§5) nel firmware di helmet_app: config.h con i due profili, ring buffer 2 s, rilevamento SHOCK e caduta, macchina a stati completa, pulsante con INPUT_PULLUP e debounce, buzzer, LED di stato, coda eventi FIFO e funzioni Bridge get_event/get_status con il JSON esatto di SPEC §3.1.
Usa millis() e nessun delay() nel loop. Log su console con rate limit (una riga per transizione di stato).
Prima di scrivere chiedimi i pin a cui ho collegato pulsante e buzzer e il tipo di buzzer (attivo o passivo); se non li so ancora, usa costanti segnaposto ben evidenti e dimmelo.
Alla fine: spiegami la macchina a stati con un esempio concreto di caduta, dammi la procedura di prova per ognuno dei 4 criteri della Fase 2 e cosa deve comparire sulla console.
```

## Prompt 5 — Python del casco (P2, può partire insieme al Prompt 4)

```
Implementa SPEC §6 in helmet_app/python: polling get_event, classificatore rules-v1 come funzione pura in classifier.py (tassonomia SPEC §4), percorso simulato con le due modalità (walk, hotspot_step) letto da data/demo_route.json, coda su file queue.jsonl con reinvio, heartbeat ogni 5 s, config.py.
Solo libreria standard sulla scheda. Il classificatore deve avere test pytest eseguibili sul laptop con vettori di feature sintetici per ogni tipo.
Crea data/demo_route.json usando i punti di data/hotspots.json (verificati) nell'ordine che rende la demo leggibile.
Finché il firmware non è pronto, aggiungi un'opzione FAKE_MCU=True che genera eventi finti con lo stesso formato di SPEC §3.1, così posso provare tutta la catena verso il server.
```

## Prompt 6 — Integrazione end-to-end (P2 + P1)

```
Fase 3 della SPEC. Guidami nel primo test end-to-end: casco reale → Linux → server → mappa.
Dammi una checklist ordinata (cosa avviare, in che ordine, cosa devo vedere a ogni passo). Se qualcosa non funziona, procedi così: sintomo → ipotesi ordinate per probabilità → test discriminante → risultato atteso → azione. Cambia una cosa alla volta.
Quando tutti i criteri della Fase 3 sono verificati da me, aggiorna docs/TEST_LOG.md con i risultati che ti riporto, fai commit e crea il tag demo-ok-1.
```

## Prompt 7 — Calibrazione (P1 + P4)

```
Fase 4 della SPEC. Aggiungi una modalità registrazione: il Python del casco salva in un CSV le feature di ogni evento (anche quelli scartati dalle soglie, se possibile) con un'etichetta che imposto prima di ogni serie di prove (classi e protocollo in docs/PIANO_TEAM_E_DEMO.md §3).
Poi scrivi uno script per il laptop che legge il CSV, mostra la distribuzione delle feature per classe, propone soglie e stampa una tabella di confusione per rules-v1.
Solo se migliora in modo misurabile: addestra un albero decisionale piccolo (profondità ≤ 3) sul laptop e generalo come funzione Python pura rules-v2 senza dipendenze. Dimmi chiaramente quanti dati abbiamo e quanto ci si può fidare del risultato.
```

## Prompt 8 — Consegna (P4)

```
Fase 5 della SPEC. Scrivi il README (avvio passo-passo in PowerShell, architettura, cosa è reale e cosa è simulato, limiti di SPEC §13, librerie usate e licenze, schema dei collegamenti da docs/CABLAGGIO.md).
Prepara una bozza del testo Devpost (problema, soluzione, come funziona, cosa abbiamo verificato con le prove, cosa resta da sviluppare) usando solo i risultati presenti in docs/TEST_LOG.md e i numeri con fonte di docs/PIANO_TEAM_E_DEMO.md §7.
Controlla che nel repo non ci siano password, token o IP privati da rimuovere e che il database e il venv non siano versionati.
```

---

## Modello per chiedere aiuto in caso di guasto

```
Sintomo: <cosa succede, esattamente>
Cosa mi aspettavo: <...>
Ultima cosa cambiata: <...>
Log/console: <incolla le righe>
Hardware coinvolto: <scheda, sensore, pin>
Aiutami a isolare il problema con un test alla volta, partendo dall'ipotesi più probabile.
```
