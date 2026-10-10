# SPEC — Casco Sentinella (HackTurin 2026, Track "City Signals")

> Nome di lavoro, modificabile. Questo documento è la **fonte di verità** del progetto.
> Se il codice e la SPEC divergono, si aggiorna prima la SPEC (con l'accordo del team), poi il codice.

Legenda affidabilità delle informazioni:
- **[VERIFICATO]** = confermato da documentazione ufficiale o da test fatto dal team.
- **[DA VERIFICARE]** = ipotesi ragionevole, va confermata in Fase 0 prima di costruirci sopra.
- **[SIMULATO]** = parte volutamente finta nella demo, da dichiarare apertamente ai giudici.

---

## 1. Problema e idea in una frase

A Torino bici e monopattini sono coinvolti in circa 600 incidenti l'anno e le buche causano centinaia di incidenti, ma il Comune non ha una mappa aggiornata di **dove** e **perché** chi va in bici o in monopattino cade, né dei "quasi incidenti".

**Casco Sentinella** è un casco sensorizzato che:
1. rileva localmente (sulla scheda, senza cloud) urti da dissesto stradale e cadute;
2. se dopo una caduta la persona resta immobile, avvia un **allarme di emergenza con coordinate** (in demo: chiamata 112 **simulata**, modello eCall delle auto);
3. invia **ogni evento** (anche le buche senza caduta e le cadute senza allarme) a una **mappa aperta di Torino**: pubblica in forma aggregata (heatmap), dettagliata per il Comune (lista, stato, priorità).

Allineamento Track 3 (Hacker Manual): rileva ciò che accade nel mondo fisico (IMU) → elabora con logica/AI locale → produce azioni utili (soccorso, segnalazione manutenzione, mappa dei punti critici).

## 2. Architettura

```
 [CASCO — Arduino UNO Q]
   MCU STM32U585 (sketch Arduino, Zephyr)        Linux QRB2210 (Python, App Lab)
   ├─ legge IMU Modulino Movement (Qwiic/I2C)    ├─ interroga l'MCU via Bridge (polling)
   ├─ rileva SHOCK e CADUTA, calcola feature      ├─ classifica la CAUSA dell'evento
   ├─ macchina a stati allarme (buzzer, LED,      ├─ aggiunge posizione [SIMULATO: percorso]
   │   pulsante annulla)                          ├─ coda locale + invio HTTP al server
   └─ espone "get_event" sul Bridge               └─ heartbeat periodico (casco online)
                         │ Wi-Fi (HTTP/JSON)
                         ▼
 [LAPTOP — Server Python FastAPI + SQLite]
   ├─ API REST eventi / heartbeat / statistiche
   ├─ arricchimento (fascia oraria, severità, cella hotspot)
   └─ serve le pagine web statiche
                         │
                         ▼
 [WEB — Leaflet + OpenStreetMap]
   ├─ /           Mappa pubblica (heatmap aggregata, nessun dato personale)
   ├─ /comune     Dashboard Comune (lista eventi, stato, top hotspot, export CSV)
   └─ /emergenza  Pannello "112 SIMULATO" (pacchetto dati stile eCall)
```

Principio di progetto: **la parte safety-critical (caduta + immobilità + allarme) gira sull'MCU**, che è real-time e non dipende da Linux o dalla rete. La classificazione della causa e la comunicazione girano su Linux, dove si modificano senza ricompilare il firmware.

### 2.1 Hardware

| Componente | Uso | Stato |
|---|---|---|
| Arduino UNO Q 4 GB | MCU + Linux + Wi-Fi | Nel kit (1 per team). Compilazione Blink già riuscita; upload su scheda **[DA VERIFICARE]** |
| Arduino Modulino Movement (LSM6DSOX, acc+gyro 6 assi) | Rilevamento urti e cadute | Nel kit (1). Connettore Qwiic |
| Pulsante (tact switch) o Grove Touch Sensor | Annullare l'allarme | Inventario |
| Grove Passive Buzzer (o buzzer equivalente) | Allarme acustico | Inventario |
| LED (anche matrice LED della UNO Q) | Stato del sistema | Inventario / a bordo |
| Powerbank USB-C | Alimentazione sul casco | Del team **[DA VERIFICARE]** che eroghi abbastanza corrente per la UNO Q |
| Casco + supporto stampato 3D | Meccanica | Del team |

Fatti hardware rilevanti:
- UNO Q = MPU Qualcomm QRB2210 (Debian Linux) + MCU STM32U585 (Arduino Core su Zephyr). Wi-Fi e Bluetooth a bordo. **[VERIFICATO — datasheet/manuale Arduino]**
- Header e connettore Qwiic della UNO Q sono a **3,3 V**. Non collegare segnali a 5 V ai pin. **[VERIFICATO — manuale]**
- Il Qwiic è sul **bus I2C secondario → oggetto `Wire1`**, non `Wire`. Esempi community usano `Modulino.begin(Wire1)`. **[DA VERIFICARE sulla nostra versione di libreria]**
- Indirizzo I2C Modulino Movement: default 0x6A (fonti citano anche 0x6B / 0x7E). **[DA VERIFICARE con I2C scan]**
- Fondo scala accelerometro LSM6DSOX: configurabile fino a ±16 g; il default della libreria non è noto. **[DA VERIFICARE]** Impatti forti possono saturare: accettabile in demo, da documentare.
- Comunicazione MCU↔Linux: libreria `Arduino_RouterBridge` (`Bridge.begin()`, `Bridge.provide()` sull'MCU; `Bridge.call()` lato Python). Il manuale avverte che chiamare `Bridge.call()`, `Serial.print()` o `Monitor.print()` **dentro** una funzione registrata con `provide()` può bloccare il sistema. Le fonti non concordano sulla possibilità che l'MCU avvii la chiamata verso Linux → **usiamo il polling da Python** (`Bridge.call("get_event")`), che funziona in ogni caso. **[DA VERIFICARE in Fase 0]**
- Struttura di un'app App Lab (cartelle sketch + python, file di configurazione): **[DA VERIFICARE]** copiandola da un esempio ufficiale (es. Blink) sulla nostra versione di App Lab. Non inventare la struttura.
- Nell'inventario **non c'è un GPS** → posizione **[SIMULATO]** da percorso predefinito.

### 2.2 Software e dipendenze

| Dove | Linguaggio | Dipendenze consentite |
|---|---|---|
| MCU (UNO Q) | C++ Arduino | `Arduino_Modulino` (o `Arduino_LSM6DSOX` se più controllabile), `Arduino_RouterBridge`. Niente altro senza motivo. |
| Linux (UNO Q) | Python 3 | **Solo libreria standard** (`json`, `urllib.request`, `uuid`, `time`, `math`) + il modulo Bridge fornito da App Lab. Evitare `pip install` sulla scheda. |
| Laptop server | Python 3.11+ | `fastapi`, `uvicorn`, `pydantic` (inclusa in FastAPI). DB: `sqlite3` della libreria standard. Test: `pytest`, `httpx`. |
| Web | HTML + JS vanilla | Leaflet 1.9.4 + Leaflet.heat 0.2.0, **copiati in locale** in `server/static/vendor/` (niente CDN a runtime). Le tile OpenStreetMap richiedono internet: fallback = hotspot del telefono. |

Ambiente del team: Windows 11, PowerShell, VS Code, Git, Arduino IDE 2, Arduino App Lab. Comandi e istruzioni devono essere compatibili con PowerShell.

## 3. Contratto dati (interfaccia tra i sottosistemi)

Questo è il punto di integrazione tra le persone del team: **non cambiarlo senza aggiornare la SPEC e avvisare tutti.**
(I commenti `//` negli esempi sono solo esplicativi: il JSON reale non li contiene.)

### 3.1 MCU → Linux (stringa JSON restituita da `get_event`)

`get_event` restituisce `""` se non ci sono eventi in coda, altrimenti **un** evento (coda FIFO sull'MCU, capacità ≥ 8 eventi; se piena, scarta il più vecchio e incrementa un contatore `dropped`).

```json
{
  "kind": "SHOCK",                 // "SHOCK" (urto senza caduta) | "FALL" (caduta)
  "mcu_ms": 123456,                // millis() dell'evento: inizio dell'episodio d'impatto (FALL) o picco dello shock (SHOCK)
  "mcu_now_ms": 141200,            // millis() nel momento in cui get_event() restituisce l'evento (serve a calcolare l'età)
  "alarm": "NONE",                 // FALL: "SENT" | "CANCELED" | "MOVEMENT_RESUMED"; SHOCK: "NONE"
  "f": {
    "shock_peak_g": 3.4,           // SHOCK: picco a_dyn dello shock. FALL: picco a_dyn dello shock PRECURSORE (§5.2), 0 se assente
    "shock_to_impact_ms": 650,     // FALL: ms tra fine del precursore e inizio impatto; -1 se nessun precursore. SHOCK: -1
    "impact_peak_g": 6.2,          // FALL: picco |a| nell'episodio d'impatto. SHOCK: 0
    "gyro_peak_dps": 410,          // picco velocità angolare dell'episodio
    "freefall_ms": 120,            // FALL: più lunga sequenza con |a| < T_FREEFALL_G nel secondo prima dell'impatto (solo feature)
    "rotation_deg": 82,            // angolo tra gravità prima e dopo l'evento
    "still_s": 9.8                 // FALL: secondi di immobilità continua misurati. SHOCK: 0
  },
  "sat": false,                    // true se l'accelerometro ha saturato
  "dropped": 0,
  "fw": "0.1.0"
}
```

### 3.2 Casco (Linux) → Server: `POST /api/events`

```json
{
  "event_id": "uuid4",                       // generato su Linux; il server è idempotente su questo campo
  "device_id": "casco-01",
  "age_ms": 18450,                           // età dell'evento al momento dell'invio (vedi sotto)
  "age_uncertain": false,                    // opzionale: true se Linux si è riavviato con l'evento in coda
  "device_ts": "2026-10-11T10:15:30+02:00",  // solo informativo: ora Linux della UNO Q, potrebbe essere sbagliata
  "lat": 45.07, "lon": 7.68,
  "position_source": "simulated_route",      // in demo sempre questo valore
  "type": "CADUTA_DA_DISSESTO",              // vedi §4
  "confidence": 0.7,                         // 0..1
  "emergency": true,                         // true solo se alarm == "SENT"
  "alarm_state": "SENT",
  "features": { ... },                       // copia di "f" dall'MCU
  "classifier": "rules-v1",
  "simulated": false,                        // true solo per i dati generati dallo script di seed
  "fw": "0.1.0"
}
```

**Orario dell'evento.** Una FALL viene emessa solo a fine sequenza di allarme (fino a ~20 s dopo la caduta in DEMO, ~60 s in REALISTICO) e l'evento può restare in coda se la rete manca. Inoltre l'orologio della UNO Q potrebbe non essere sincronizzato. Quindi:
- Linux, quando riceve l'evento: `age_at_poll_ms = mcu_now_ms − mcu_ms` e salva il proprio `time.monotonic()`;
- Linux, a ogni tentativo di invio: `age_ms = age_at_poll_ms + (monotonic_ora − monotonic_alla_ricezione) × 1000`;
- Server: `ts = received_at − age_ms`. **L'unico orologio di riferimento è quello del laptop.**

### 3.3 Heartbeat: `POST /api/heartbeat`

`{ "device_id": "casco-01", "lat": .., "lon": .., "queue_len": 0, "mcu_ok": true, "mcu_state": "MONITORING", "mcu_dropped": 0, "imu_hz": 98.7, "fw": "0.1.0" }` ogni 5 s. I campi `mcu_*`, `imu_hz` e `fw` arrivano da `get_status()`; se il Bridge non risponde: `mcu_ok=false` e campi `mcu_*` a `null`.

### 3.4 Campi aggiunti dal server

`id` (intero autoincrementale, usato dal polling del web), `received_at`, `ts` (calcolato come sopra), `status` (`NUOVO` | `VERIFICATO` | `IN_LAVORAZIONE` | `RISOLTO` | `FALSO_POSITIVO`), `severity` (1–5, §4), `time_slot` (`notte` 0–6, `mattina` 6–12, `pomeriggio` 12–18, `sera` 18–24), `cell_id` (cella griglia ~100 m per gli hotspot), `source` (`helmet` | `demo_seed`).

## 4. Tassonomia eventi (cosa sappiamo distinguere con la sola IMU)

| `type` | Come si riconosce (`rules-v1`, in quest'ordine) | Severità | `confidence` | Allarme |
|---|---|---|---|---|
| `BUCA` | `kind == "SHOCK"` | 1 se `shock_peak_g` < 3 g, altrimenti 2 (valore in config server) | 0.6 | No |
| `CADUTA_DA_DISSESTO` | `kind == "FALL"` e `shock_to_impact_ms ≥ 0` (c'è un **precursore**, §5.2) | 4 | 0.7 | Se immobile |
| `IMPATTO_VIOLENTO` | `kind == "FALL"`, nessun precursore, `impact_peak_g ≥ T_VIOLENT_G` (possibile urto con veicolo/ostacolo) | 5 | 0.5 | Se immobile |
| `CADUTA_SENZA_CAUSA_RILEVATA` | `kind == "FALL"`, nessun precursore, impatto sotto `T_VIOLENT_G` (es. scivolata su binari o bagnato) | 3 | 0.5 | Se immobile |

`confidence` in `rules-v1` è un **valore convenzionale fisso per tipo**, non una probabilità calibrata: l'interfaccia non deve mostrarlo come percentuale (al massimo "alta/media"). `T_VIOLENT_G` per il classificatore sta in `config.py` sul lato Linux, allineato al valore di `config.h`.

Regole di comunicazione (anche nel pitch):
- L'IMU **non può** sapere se c'è "troppo traffico" né se l'urto è con un'auto: `IMPATTO_VIOLENTO` significa "impatto compatibile con un urto", non "investimento accertato". Il contesto (fascia oraria) lo aggiunge il server; in futuro dati di traffico esterni.
- Ogni evento va sulla mappa, **anche se l'allarme viene annullato o la persona si rialza**: sono proprio questi dati che oggi nessuno raccoglie.
- `FRENATA_BRUSCA` / quasi-incidente: **fuori MVP** (dal casco il segnale è disturbato dai movimenti della testa). Eventuale stretch goal.

## 5. Firmware MCU

### 5.1 Acquisizione
- Lettura IMU a **100 Hz** target con temporizzazione `millis()`/`micros()`, senza `delay()` nel loop. Misurare la frequenza reale e registrarla in `docs/TEST_LOG.md`.
- Ring buffer degli ultimi 2 s di campioni (acc xyz in g, gyro xyz in dps).
- Calcoli per campione: `a_mag = |a|`, `a_dyn = | |a| − 1 g |`, `w_mag = |ω|`.
- All'avvio: stato `CALIBRATING` (2 s fermo) per stimare vettore gravità e rumore; LED fisso durante la calibrazione.

### 5.2 Rilevamento

**Episodio**: intervallo continuo in cui `a_dyn ≥ T_SHOCK_G`. Due superamenti separati da meno di `SHOCK_MERGE_MS` fanno parte dello stesso episodio. Un episodio è chiuso quando `a_dyn` resta sotto soglia per almeno `SHOCK_MERGE_MS`.

**Tipi di episodio** (decisi mentre l'episodio è in corso):
- **Episodio d'impatto**: se durante l'episodio `a_mag ≥ T_IMPACT_G` → è il **candidato caduta**: si entra subito in `IMPACT_ANALYSIS`, con istante d'impatto = inizio dell'episodio. Un episodio d'impatto **non è mai** precursore di sé stesso.
- **Episodio di shock**: episodio chiuso senza superare `T_IMPACT_G` → diventa lo **shock in attesa** (`pending_shock`: picco, istante di fine). Se ne arriva un altro mentre il primo è in attesa, si tiene quello con il picco maggiore (un solo evento SHOCK, niente doppioni).

**Shock in attesa**:
- Se entro `SHOCK_TO_FALL_MAX_MS` dalla sua fine **non** inizia un episodio d'impatto → si emette un evento `SHOCK` e si azzera.
- Se inizia un episodio d'impatto → il timeout dello shock in attesa viene **sospeso** finché `IMPACT_ANALYSIS` non si conclude (evita il doppione SHOCK + FALL).

**Precursore**: lo shock in attesa vale come precursore della caduta solo se `inizio_impatto − fine_shock ≥ SHOCK_GAP_MIN_MS` (e ≤ `SHOCK_TO_FALL_MAX_MS`). Razionale fisico, da confermare con le prove: tra la buca e l'arrivo della testa a terra passano alcune centinaia di ms; due picchi più vicini fanno parte dello stesso impatto.

**Esito di `IMPACT_ANALYSIS`**:
- caduta confermata (`rotation_deg ≥ ROT_FALL_DEG`) → lo shock in attesa, se è un precursore valido, viene consumato nelle feature della FALL (`shock_peak_g`, `shock_to_impact_ms`); altrimenti viene scartato. Nessun evento SHOCK separato. → `STILLNESS_CHECK`;
- caduta non confermata → si emette **un solo** evento `SHOCK` con picco = max(shock in attesa, `a_dyn` dell'impatto) → `MONITORING`.

**Conferma caduta**: dopo l'impatto, attendere `POST_IMPACT_SETTLE_MS`, poi calcolare `rotation_deg` tra gravità media pre-evento (0,5 s prima dell'inizio dell'impatto, dal ring buffer) e post-evento (media su 1 s dopo l'assestamento). Caduta confermata se `rotation_deg ≥ ROT_FALL_DEG`.

**Caduta libera**: non è un innesco (nel MVP il solo innesco è l'episodio d'impatto). Si calcola solo come feature `freefall_ms` dal ring buffer.

**Immobilità**: su finestra mobile di 1 s, deviazione standard di `a_mag` < `STILL_ACC_STD_G` e `w_mag` medio < `STILL_GYRO_DPS`.

### 5.3 Macchina a stati allarme

```
CALIBRATING → MONITORING
MONITORING → (episodio d'impatto, §5.2) → IMPACT_ANALYSIS
IMPACT_ANALYSIS → (rotazione < soglia) → emette un solo SHOCK (§5.2), poi MONITORING
IMPACT_ANALYSIS → (caduta confermata) → STILLNESS_CHECK (shock in attesa consumato come precursore o scartato)
STILLNESS_CHECK → (immobile per T_STILL_S) → PRE_ALARM
STILLNESS_CHECK → (scade STILL_TIMEOUT_S senza aver raggiunto T_STILL_S di immobilità continua,
                   cioè la persona si muove/si rialza) → emette FALL alarm=MOVEMENT_RESUMED → COOLDOWN
PRE_ALARM (buzzer intermittente + LED, conto alla rovescia T_CANCEL_S)
   → pulsante premuto → emette FALL alarm=CANCELED → COOLDOWN
   → tempo scaduto    → emette FALL alarm=SENT → ALARM_ACTIVE
ALARM_ACTIVE (buzzer lento finché pressione lunga del pulsante ≥ 2 s) → COOLDOWN
COOLDOWN (COOLDOWN_S, ignora nuovi eventi) → MONITORING
```

Regole: ogni transizione stampa una riga di log (rate-limited) sulla console MCU (`Monitor` o oggetto indicato dal manuale UNO Q **[DA VERIFICARE]**). Il pulsante usa `INPUT_PULLUP` e debounce software (≥ 30 ms). Stato sicuro all'avvio: buzzer spento.

### 5.4 Parametri (tutti in `config.h`, due profili)

Valori **iniziali da calibrare**: NON sono valori validati, servono solo per partire.

| Parametro | DEMO | REALISTICO | Note |
|---|---|---|---|
| `T_SHOCK_G` | 1.5 | 1.5 | accelerazione dinamica, da calibrare con colpi sul casco |
| `T_IMPACT_G` | 3.0 | 3.0 | |
| `T_VIOLENT_G` | 6.0 | 6.0 | limitato dal fondo scala |
| `T_FREEFALL_G` | 0.4 | 0.4 | solo per la feature `freefall_ms` |
| `SHOCK_MERGE_MS` | 100 | 100 | unisce superamenti vicini nello stesso episodio |
| `SHOCK_GAP_MIN_MS` | 200 | 200 | distanza minima shock → impatto per contare come precursore |
| `SHOCK_TO_FALL_MAX_MS` | 1500 | 1500 | |
| `POST_IMPACT_SETTLE_MS` | 1000 | 1000 | |
| `ROT_FALL_DEG` | 50 | 50 | |
| `STILL_ACC_STD_G` / `STILL_GYRO_DPS` | 0.05 / 10 | 0.05 / 10 | |
| `T_STILL_S` | 8 | 30 | durata immobilità prima del pre-allarme (valore reale da definire) |
| `STILL_TIMEOUT_S` | 20 | 60 | |
| `T_CANCEL_S` | 10 | 20 | |
| `COOLDOWN_S` | 5 | 10 | |

### 5.5 Funzioni esposte sul Bridge
- `get_event()` → stringa JSON (§3.1) o `""`. Deve essere veloce: solo pop dalla coda, nessuna stampa, nessuna chiamata al Bridge all'interno.
- `get_status()` → JSON breve `{"state": "MONITORING", "fw": "0.1.0", "dropped": 0, "hz": 98.7}`; Linux lo copia nell'heartbeat come `mcu_state`, `fw`, `mcu_dropped`, `imu_hz` (§3.3).
- (Opzionale) `set_profile("DEMO"|"REALISTICO")`.

## 6. Python su Linux (UNO Q)

- Loop principale: ogni 100–200 ms `Bridge.call("get_event")`; ogni 5 s heartbeat.
- **Posizione [SIMULATO]**: `data/demo_route.json` = lista ordinata di punti (lat, lon, nome). Due modalità in `config.py`:
  - `ROUTE_MODE="walk"`: posizione che avanza lungo il percorso a velocità configurabile (default 15 km/h), in loop;
  - `ROUTE_MODE="hotspot_step"`: ad ogni evento si usa il punto successivo della lista (per far cadere gli eventi della demo su luoghi significativi).
- **Classificatore `rules-v1`** in `classifier.py`, funzione pura `classify(kind, features) -> (type, confidence)` secondo la tabella §4 (stesso ordine delle regole, `confidence` fissa per tipo). Unit test con vettori di feature sintetici, incluso il caso "FALL con impatto forte e nessun precursore" che deve dare `IMPATTO_VIOLENTO`.
- **Età dell'evento**: calcolo di `age_ms` come in §3.2 con `time.monotonic()`; `age_ms` va ricalcolato a ogni tentativo di invio dalla coda (salvare in coda `age_at_poll_ms` e il monotonic di ricezione, non `age_ms`). Nota: il monotonic si azzera al riavvio di Linux; eventi in coda dopo un riavvio → inviarli con `age_ms` dell'ultimo calcolo e campo `age_uncertain: true`.
- **Affidabilità rete**: coda su file `queue.jsonl`; reinvio ogni 5 s; il server è idempotente su `event_id`, quindi i reinvii non creano doppioni. Timeout HTTP 3 s.
- Config in `config.py`: `SERVER_URL` (es. `http://<IP-laptop>:8000`), `DEVICE_ID`, intervalli, modalità percorso.
- Log su console: una riga per evento (tipo, allarme, coordinate, esito invio).

## 7. Server (laptop)

FastAPI su `0.0.0.0:8000`. SQLite in `server/data/events.db` (non versionato).

| Metodo e percorso | Funzione |
|---|---|
| `POST /api/events` | Inserisce evento (idempotente su `event_id`), calcola `ts = received_at − age_ms`, `severity`, `time_slot` (da `ts`), `cell_id` |
| `GET /api/events` | Filtri: `type`, `from`/`to` (su `ts`, per i filtri di periodo), `after_id` (per il polling), `status`, `limit`, `public` (se `public=1`: niente `device_id`, coordinate arrotondate a 3 decimali ≈ 100 m) |
| `PATCH /api/events/{event_id}` | Cambia `status` (dashboard Comune) |
| `GET /api/emergencies?after_id=` | Eventi con `emergency=true` |
| `POST /api/heartbeat`, `GET /api/devices` | Stato caschi online (online se heartbeat < 15 s) |
| `GET /api/stats` | Conteggi per tipo e top 10 celle hotspot (somma severità) |
| `GET /api/export.csv` | Esporta eventi (open data) |
| `GET /health` | Stato server |
| `GET /`, `/comune`, `/emergenza` | Pagine statiche |

Nessuna autenticazione in demo (dichiararlo come limite). Validazione input con modelli pydantic; coordinate fuori da un riquadro attorno a Torino → 422.

## 8. Web

Comune a tutte le pagine: banner visibile **"Demo HackTurin — include dati storici SIMULATI"**; attribuzione OpenStreetMap obbligatoria; aggiornamento con polling ogni 2 s (`after_id=` ultimo `id` ricevuto: **non** usare `ts`, perché un evento arrivato dalla coda può avere un `ts` più vecchio di eventi già mostrati).

- **`/` Mappa pubblica**: Torino centrata (≈ 45.07, 7.69, zoom 13); layer heatmap pesata per severità (attivabile); marker colorati per tipo con legenda; filtri per tipo e periodo (7/30/90 giorni); contatori per tipo; nessun dato personale. Nuovi eventi in tempo reale con breve animazione.
- **`/comune` Dashboard**: tabella eventi ordinabile (tipo, severità, data, stato, fonte); clic → zoom sulla mappa; cambio stato; top 10 hotspot; pulsante esporta CSV; marker del casco online in movimento (heartbeat).
- **`/emergenza` 112 SIMULATO**: all'arrivo di un evento `emergency=true` compare una scheda rossa a schermo intero con suono: tipo evento, ora, coordinate (con link alla mappa), feature principali, `device_id`. Scritta fissa: **"SIMULAZIONE — nessuna chiamata reale al 112"**. Modello di riferimento: pacchetto dati minimo (MSD) dell'eCall delle auto (Reg. UE 2015/758).

## 9. Dati demo e strumenti

- `data/hotspots_input.json`: elenco di luoghi **reali** citati dalla stampa/dati come critici (vedi `docs/PIANO_TEAM_E_DEMO.md` §Fonti): corso Regina Margherita (controviale tra via Montebello e via Tarino), piazza Rivoli, corso Regina Margherita/corso Potenza/corso Lecce, corso Peschiera/corso Trapani, corso Giambone/corso Corsica, via Nizza, via Po/piazza Vittorio Veneto, San Salvario, Vanchiglia.
- `tools/geocode_hotspots.py`: geocodifica i nomi con Nominatim (OSM), max 1 richiesta/s, User-Agent esplicito, salva `data/hotspots.json`. **Un umano verifica i punti sulla mappa** prima dell'uso. Non scrivere coordinate a memoria.
- `tools/seed_demo_data.py`: genera ~300 eventi negli ultimi 90 giorni attorno agli hotspot (dispersione ~60 m), mix di tipi, `simulated=true`, `source="demo_seed"`. La **distribuzione è inventata** e va dichiarata tale; solo i luoghi sono reali.
- `tools/simulate_helmet.py`: imita il casco (eventi + heartbeat) senza hardware, con opzioni `--type`, `--emergency`, `--rate`. Serve per sviluppare server e mappa in parallelo al firmware.
- (Stretch) `tools/import_aperto_2020.py`: scarica e ispeziona `Elenco_Incidenti_2020.csv` (AperTO, Polizia Municipale). Solo se contiene coordinate o indirizzi utilizzabili → layer separato "Dati reali Polizia Municipale 2020". Prima ispezionare le colonne e riportarle al team.

## 10. Struttura del repository

```
casco-sentinella/
├── PROMPT_CLAUDE_CODE.md     (prompt per fase da incollare in Claude Code)
├── README.md                 (come avviare e riprodurre la demo)
├── docs/
│   ├── SPEC.md               (questo file)
│   ├── PIANO_TEAM_E_DEMO.md
│   ├── CABLAGGIO.md          (si compila solo con collegamenti verificati)
│   └── TEST_LOG.md           (risultati dei test reali: data, cosa, esito)
├── helmet_app/               (app App Lab: struttura e NOMI dei file copiati da un esempio ufficiale, Prompt 3)
│   ├── <cartella sketch>     (firmware MCU + config.h; il .ino principale si chiama come richiesto da App Lab/IDE)
│   └── <cartella python>     (main.py, classifier.py, route.py, config.py)
├── server/
│   ├── app.py, db.py, models.py, requirements.txt
│   ├── static/ (index.html, comune.html, emergenza.html, app.js, style.css, vendor/)
│   └── tests/
├── tools/ (simulate_helmet.py, seed_demo_data.py, geocode_hotspots.py)
└── data/ (hotspots_input.json, hotspots.json, demo_route.json)
```

## 11. Fasi, criteri di accettazione e ordine di lavoro

Regola d'oro: **prima un percorso end-to-end funzionante, poi la qualità.** Commit Git ad ogni criterio superato; tag `demo-ok-N` quando la demo completa funziona.

**Fase 0 — Smoke test hardware (casco)** *(blocca Fasi 2–3)*
- [ ] Sketch che stampa acc/gyro dal Modulino via Qwiic (`Wire1`), con I2C scan che mostra l'indirizzo.
- [ ] Frequenza di campionamento reale misurata.
- [ ] Bridge: Python riceve una stringa dall'MCU via `Bridge.call("get_event")`.
- [ ] Python sulla UNO Q fa una `POST` HTTP verso il laptop (stessa rete Wi-Fi; se fallisce: hotspot del telefono per entrambi; consentire Python nel firewall di Windows su rete privata).
- [ ] Documentato il flusso di lavoro: come si porta il codice dal repo in App Lab e come si avvia l'app.
- Esito di ogni punto in `docs/TEST_LOG.md`.

**Fase 1 — Server + mappa + simulatore** *(nessuna dipendenza hardware: parte subito in parallelo)*
- [ ] `simulate_helmet.py` invia un evento → compare sulla mappa entro 3 s.
- [ ] Evento `emergency=true` → la scheda 112 SIMULATO compare su `/emergenza`.
- [ ] Heatmap con dati di seed; filtri per tipo; dashboard Comune con cambio stato ed export CSV.
- [ ] Test pytest verdi per API (inserimento, idempotenza, filtri, `public=1`).

**Fase 2 — Firmware rilevamento + allarme**
- [ ] Colpo secco sul casco tenuto dritto → evento SHOCK (una sola volta).
- [ ] Casco fatto cadere senza colpo prima → FALL con `shock_to_impact_ms = -1` (verifica che l'impatto non diventi precursore di sé stesso).
- [ ] Colpo, poi caduta dopo ~0,5 s → un solo evento FALL con `shock_to_impact_ms ≥ 200`, nessun SHOCK separato.
- [ ] Casco fatto cadere su un materassino e lasciato fermo → STILLNESS_CHECK → PRE_ALARM con buzzer → `SENT` dopo `T_CANCEL_S`.
- [ ] Pressione del pulsante durante PRE_ALARM → `CANCELED`.
- [ ] Casco ripreso in mano durante STILLNESS_CHECK → `MOVEMENT_RESUMED`.

**Fase 3 — Integrazione end-to-end** *(milestone critica)*
- [ ] Caduta reale del casco → evento classificato sulla mappa pubblica, sulla dashboard e (se allarme) su `/emergenza`.
- [ ] Server spento durante un evento → riacceso → l'evento arriva dalla coda senza doppioni.
- [ ] Tag Git `demo-ok-1`.

**Fase 4 — Calibrazione e classificazione**
- [ ] Sessione di prove registrate (≥ 10 per tipo, vedi protocollo nel piano team), feature salvate in CSV con etichetta.
- [ ] Soglie in `config.h` aggiornate; tabella di confusione semplice in `docs/TEST_LOG.md`.
- [ ] (Stretch) albero decisionale addestrato sul laptop sulle feature registrate, esportato come funzione Python pura `rules-v2` (nessuna dipendenza sulla scheda). Usare solo se migliora i risultati misurati.

**Fase 5 — Robustezza e consegna**
- [ ] README con avvio passo-passo (PowerShell). Script demo provato 3 volte di fila senza errori.
- [ ] Repository GitHub pubblico, nessun segreto nel codice.

## 12. Fuori scope (non implementare senza decisione del team)

Chiamata reale al 112 o SMS reali; GPS reale; app smartphone; autenticazione/utenti; deploy cloud; rilevamento traffico; sensori di distanza per i sorpassi (i ToF disponibili hanno portata di pochi metri: inutili per veicoli in avvicinamento); modelli deep learning.

## 13. Limiti da dichiarare in demo

1. Posizione simulata (manca il GPS); in un prodotto: GPS o smartphone.
2. Allarme 112 simulato; un prodotto reale passerebbe dallo smartphone (come già fanno gli smartwatch con rilevamento cadute) o da una centrale operativa. Fatti trovati: il disciplinare tecnico NUE 112 del Ministero dell'Interno definisce gli "Alert" come chiamate di soccorso automatiche da dispositivi di allarme ([interno.gov.it](https://www.interno.gov.it/sites/default/files/2022-03/nue_112_disciplinare_tecnico_operativo_17_luglio_2018.pdf)); la Provincia di Trento ha segnalato numerosi falsi allarmi da smartwatch ([comunicato](https://www.ufficiostampa.provincia.tn.it/Comunicati/Smartwatch-numerosi-falsi-allarmi-alla-Centrale-112)) → motivo per cui usiamo immobilità + conto alla rovescia annullabile. Non abbiamo trovato una specifica pubblica per collegare dispositivi di terzi direttamente alla centrale.
3. Soglie calibrate su prove con il casco fatto cadere o colpito, non su cadute reali in bici/monopattino.
4. Dal casco una buca si sente meno che da un sensore sul manubrio: la rilevazione delle buche è meno sensibile.
5. Dati storici della heatmap simulati; luoghi reali.
6. Privacy: nella mappa pubblica nessun identificativo e coordinate arrotondate; i dati completi solo al Comune e all'emergenza.

## 14. Registro modifiche della SPEC

**v0.2 (10/10/2026 sera)** — risolte le incongruenze segnalate da Claude Code dopo il Prompt 0. **Cambia il contratto dati §3: avvisare P1, P2, P3.**
- §5.2 riscritto: rilevamento a **episodi**; l'episodio d'impatto non è mai precursore di sé stesso; precursore valido solo se finisce ≥ `SHOCK_GAP_MIN_MS` prima dell'impatto; timeout dello shock sospeso durante `IMPACT_ANALYSIS` (niente doppioni SHOCK + FALL); caduta libera solo come feature, non più come innesco. Nuovi parametri `SHOCK_MERGE_MS`, `SHOCK_GAP_MIN_MS`; tolto `FREEFALL_MIN_MS`.
- §3.1: aggiunto `mcu_now_ms`; precisati significato di `mcu_ms` e delle feature per SHOCK/FALL.
- §3.2: `ts` sostituito da `age_ms` (+ `device_ts` informativo, `age_uncertain` opzionale); il server calcola `ts = received_at − age_ms`. L'orologio della UNO Q non serve più.
- §3.3: heartbeat con `mcu_state`, `mcu_dropped`, `imu_hz`, `fw` da `get_status()`.
- §3.4, §7, §8: `id` autoincrementale; polling del web con `after_id` invece di `since`.
- §4: `confidence` fissa per tipo (convenzionale, non mostrata come percentuale); ordine delle regole esplicito.
- §10: nomi di cartelle e file di `helmet_app/` dettati dall'esempio ufficiale App Lab, non dalla SPEC.
- §11 Fase 2: due test in più sul precursore.
- §13: punto 112 aggiornato con le fonti trovate.
