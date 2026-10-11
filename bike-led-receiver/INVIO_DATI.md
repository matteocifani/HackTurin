# Invio dati: UNO Q → `casco-sentinella`

Stato: implementato; provato in locale contro il server vero (sezione 8) e, secondo l'utente, sull'hardware: un evento di caduta è stato ricevuto da `casco-sentinella`. Dei test sull'hardware non ho i log: restano non verificati i punti della sezione 7 che non ha confermato.

## 1. Cosa fa

Quando la fall detection del Modulino Movement conclude una caduta, la UNO Q invia un evento al server `casco-sentinella` (FastAPI + SQLite + mappa web) che gira su un computer locale. Invia anche un heartbeat ogni 5 s, così il casco risulta «online».

```
Modulino Movement ─► sketch (MCU) ─Bridge.notify("alert")─► main.py (Linux UNO Q)
                                                              │ uplink.on_alert()  (solo append a una deque)
                                                              ▼
                                                        thread di invio ── HTTP POST ──► casco-sentinella
                                                        (coda, retry)                    /api/events
                                                                                         /api/heartbeat
```

La striscia LED non c'entra: continua a dipendere solo dal Pi.

## 2. Decisioni

| Tema | Scelta | Motivo |
|---|---|---|
| Destinazione | `casco-sentinella` su computer locale (Mac o Windows) | È il backend che mostra mappa, dashboard del Comune e pannello 112 |
| Mittente | Il Python della UNO Q | La SPEC §6 lo prevede già; il Pi non legge dal socket |
| Posizione | Punto fisso (piazza Castello 45.0703, 7.6869), `position_source="simulated_route"` | Nessun GPS. Con quel valore la UI scrive «posizione SIMULATA». Va dichiarato ai giudici |
| Eventi inviati | Solo `FALL` e `NOFALL` | I falsi positivi (soglia 0,5 g) riempirebbero la mappa |
| `type` | Sempre `CADUTA_SENZA_CAUSA_RILEVATA` | Non rileviamo il precursore né l'urto con veicolo, quindi non distinguiamo le cause |
| Pi (detection LED) | Non inviate | Il server non ha un tipo evento per loro |
| Thread | Un thread di invio, handler Bridge solo `append` | Una POST bloccante nel loop di `main.py` fermerebbe ricezione TCP e watchdog dello sketch |
| Retry | Coda in memoria da 50, ritenta ogni 5 s, timeout 3 s | Il server è idempotente su `event_id`: un reinvio non crea doppioni |
| URL del server | File `python/server_url.txt`, riletto a ogni richiesta | L'IP dell'hotspot cambia a ogni riconnessione |

## 3. Eventi

Sequenza nello sketch (soglie da `sketch.ino`):

| t dall'impatto | Cosa succede | Sketch emette | Python invia |
|---|---|---|---|
| 0 | dRMS > 0,5 g | `alert("IMPACT", drms_mg)` | niente: annota istante e valore |
| < 3 s, nessuna inclinazione > 47° | torna normale | `log("FALSE POSITIVE…")` | niente |
| < 3 s, inclinazione > 47° | cade di lato | `log("TILT…")` | niente, attende l'esito |
| 10 s, non si è mossa | allarme | `alert("FALL", tilt_deg)` | **caduta con allarme** |
| 10 s, si è mossa | nessun allarme | `alert("NOFALL", tilt_deg)` (nuovo) + `log` | **caduta senza allarme** |

Campi dell'evento (`POST /api/events`):

| Campo | `FALL` | `NOFALL` |
|---|---|---|
| `type` | `CADUTA_SENZA_CAUSA_RILEVATA` | idem |
| `alarm_state` | `SENT` | `MOVEMENT_RESUMED` |
| `emergency` | `true` (compare in `/emergenza`) | `false` |
| `features` | `{tilt_deg, impact_drms_mg}` | idem |
| `confidence` | 0,5 (valore convenzionale, non una probabilità) | idem |
| `device_id` | `casco-01` | idem |
| `origin` / `simulated` | `helmet` / `false` | idem |
| `event_id` | uuid4, fisso per tutti i retry | idem |
| `age_ms` | tempo dall'`IMPACT`, ricalcolato a ogni tentativo | idem |

Il server calcola `ts = ricezione − age_ms`: l'unico orologio di riferimento è quello del computer, perché quello della UNO Q può essere sbagliato. Gravità assegnata dal server: 3 (fissa per quel tipo).

Heartbeat (`POST /api/heartbeat`, ogni 5 s): `{device_id, lat, lon, queue_len, mcu_ok}`. `mcu_ok` è `true` se l'ultima `Bridge.call("set_state")` è riuscita.

## 4. Comportamento in caso di guasto

| Situazione | Effetto |
|---|---|
| Server o hotspot irraggiungibile, 5xx, file URL mancante o vuoto | L'evento resta in coda e si ritenta ogni 5 s |
| Server risponde 4xx (es. 422) | L'evento viene scartato con una riga di log: un ritento non lo renderebbe valido e bloccherebbe la coda |
| Coda piena (50) | Si scarta il più vecchio |
| Container riavviato | **La coda in memoria si perde** (limite noto) |
| `IMPACT` perso o più vecchio di 30 s | `age_ms` parte da 0 e `impact_drms_mg` è `null` |

Il log mostra solo i cambi di esito per endpoint (`uplink /api/events ok`, `uplink /api/events URLError …`), per non riempire la console.

## 5. Uso

1. Sul computer del server (dalla cartella `casco-sentinella`, con il venv: vedi `server/README.md`):
   `python -m uvicorn app:app --app-dir server --host 0.0.0.0 --port 8000`. Su Windows consentire Python nel firewall su rete privata.
2. Scrivere l'URL in `bike-led-receiver/python/server_url.txt` (una riga, es. `http://172.20.10.5:8000`). Dopo ogni cambio di rete aggiornare l'IP; non serve riavviare l'app.
3. Reimportare l'app in App Lab (`zip -r bike-led-receiver.zip bike-led-receiver -x '*.DS_Store'`) e rieseguire il flash dello sketch: `NOFALL` è nuovo.
4. Controllare `/comune` ed `/emergenza` sul server.

Prova senza hardware: `python3 -I bike-led-receiver/python/uplink.py` (autoverifica contro un server finto, stampa `ok`).

## 6. Limiti

- **Posizione finta**: sempre lo stesso punto. Per il GPS vero basta cambiare `LAT, LON` in `uplink.py` (oggi costanti); nessun'altra parte dipende dalla posizione.
- **Categoria senza informazione**: ogni nostra caduta è «senza causa rilevata», quindi la mappa non distingue le cause.
- **`impact_drms_mg` non è il picco**: è il dRMS al primo campione sopra soglia (il picco resta nello sketch).
- **Falsi positivi invisibili al server**: si vedono solo nei log Python.
- **Nessuna autenticazione**: il server accetta chiunque sulla rete. Va bene sull'hotspot per la demo, non oltre.
- **`features` diverse dalla SPEC §3.1** (che prevede `shock_peak_g`, `impact_peak_g`, ecc.): dichiarare la differenza.

## 7. Non verificato

- Il flash dello sketch con `NOFALL` e il comportamento sull'hardware (compila solo in App Lab; `arduino-cli` non è installato).
- Gli errori intermittenti del Bridge dell'handoff (`utf-8 codec can't decode`, `Invalid RPC message`, `set_state timed out`), che potrebbero ripresentarsi con i nuovi `alert`.
- Se App Lab conserva `server_url.txt` al reimport del `.zip`, e se il container UNO Q raggiunge l'IP del computer sull'hotspot.
- Latenze reali, stabilità del Wi-Fi in movimento, soglie della fall detection fuori dal banco.

## 8. Verifiche fatte

- `uplink.py` autoverifica: coda con retry su 500, `event_id` stabile, `age_ms` ricalcolato, scarto su 422, `IMPACT` vecchio ignorato → `ok`.
- Server `casco-sentinella` avviato in locale (Python 3.13, DB temporaneo), test del server 19/19.
- End to end contro il server vero, con il vero `uplink.py` e un finto `alert`: `FALL` accettato come `SENT` (compare in `/api/emergencies`), `NOFALL` come `MOVEMENT_RESUMED` (non compare), `source=helmet`, `position_source=simulated_route`, `ts` coerente con `age_ms`, casco `online` in `/api/devices`.

Fuori ambito: `adas-posteriore/`, detection del Pi, GPS vero, evento `BUCA`, modifiche a `casco-sentinella`.
