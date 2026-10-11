# Riepilogo di sabato 10 ottobre

*Scritto nella notte tra sabato e domenica (verso l'1:30, ora italiana), da tutti i thread del progetto, dalla memoria, dalle cartelle condivise, dal repository GitHub e dal manuale dell'hackathon. Serve per ripartire domenica mattina senza dover rileggere tutto.*

---

## ⚠️ Prima di tutto: cosa dice il manuale sulla consegna

Il manuale dei partecipanti (pagina "Registrazione e consegna del progetto") dice che **la consegna avviene su Devpost** ed è obbligatoria. Stasera il messaggio era "il Devpost non va fatto": va ricontrollato con gli organizzatori, perché il manuale dice il contrario.

- **Scadenza:** domenica 11 ottobre alle 16:00, ora italiana. Le modifiche fatte dopo non contano.
- **Materiali obbligatori:**
  1. **descrizione del progetto con foto o schemi:** problema, soluzione, cosa fa il prototipo;
  2. **video dimostrativo di massimo 2 minuti**, con il prototipo in funzione;
  3. **repository GitHub pubblico** con tutto il codice, apribile senza autorizzazioni.
- **Senza Devpost o senza video si rischia l'esclusione** dalla valutazione.
- Si può scrivere in italiano o in inglese.
- **Consigliato, non obbligatorio:** indicare la challenge scelta; distinguere le funzioni che funzionano da quelle incomplete; spiegare la prova mostrata nel video; aggiungere schemi elettrici, distinta dei componenti, istruzioni e l'elenco di librerie e materiali già esistenti.
- **Dalle 16:00 alle 17:00 c'è la valutazione** in Sala meeting grande. I giudici possono chiedere una demo dal vivo o spiegazioni tecniche: il prototipo deve essere pronto e acceso.
- **Regola sull'originalità:** il progetto deve essere sviluppato durante l'hackathon e il team deve saper spiegare cosa ha fatto, cosa era già disponibile e come funziona. L'AI è ammessa per codice, ricerca e presentazioni.
- **Criteri di valutazione:** il manuale non ne elenca. C'è solo quello che chiede la challenge.
- **Premi:** City Signals ha un solo premio da 2.000 €. Smart Crossing e Beyond Solar hanno tre posti ciascuna (2.500, 1.000 e 500 €).
- **Licenza:** pubblicare su GitHub non sceglie la licenza. Se la volete (MIT era nel piano), va aggiunta un file `LICENSE`.

**Cosa cambia per noi:**
- **Devpost:** serve, a meno che gli organizzatori non dicano altro. Una bozza in inglese è già pronta in [devpost.md](devpost.md): non l'ho cancellata per questo.
- **Challenge:** il nostro progetto è pensato per **City Signals** ("come possono hardware e AI locale migliorare la vita a Torino"). Va scritto esplicitamente nella consegna, e il legame con Torino (dati sui quasi-incidenti, bus della città) va tenuto in evidenza.
- **Smart Crossing** chiede computer vision locale che riconosce pedoni, ciclisti e veicoli, luce secondo una regola esplicita, conteggio degli attraversamenti con la direzione e funzionamento offline. Il nostro sistema fa già quasi tutto tranne il conteggio, ma è pensato per un mezzo che si muove, non per un attraversamento. Non conviene cambiare challenge adesso: lo segnalo solo perché ha premi più alti.
- **Funzioni operative e incomplete:** va fatta una tabella onesta. La sezione "Cosa funziona davvero" qui sotto è la base.

---

## 1. Le decisioni della giornata, in ordine

| Ora (italiana) | Decisione |
|---|---|
| 11:20 | Idea di partenza: un casco da bici con sensori, come nel PDF "Casco sensorizzato". |
| 14:35 | Il metro e mezzo di sorpasso da solo non convince: diventa una delle misure, non il pitch. |
| 14:44 | Divisione dei compiti: **Raspberry Pi 4 sulla bici è il cuore** (visione), **Arduino UNO Q sul casco** (LED nella visione periferica, suono, caduta). SAM in tempo reale scartato perché troppo lento sulla Pi. |
| 15:00 | La webcam Deltaco va bene sulla Pi via USB. La chiavetta da 2 GB non basta: si passa a una da 31 GB. |
| 16:20 | Niente portatile in demo: tutto gira sulla Pi, con avvio automatico. |
| 19:27 | Tailscale non serve. |
| 19:40 | La Pi parte dalla chiavetta (Raspberry Pi OS 64 bit con desktop) e si collega all'hotspot del telefono. Con il Touch Display attaccato non si avvia (probabilmente alimentatore debole). |
| 23:00 | **Camera e ultrasuono puntano entrambi indietro,** uno sopra l'altro, nella stessa scatola stampata in 3D. |
| 23:28 | Dai test sul campo l'ultrasuono è preciso sotto i 40 cm e poco affidabile sopra: **la demo si fa in scala, con una macchinina**. Fusione: ultrasuono sotto 40 cm, camera sopra 60 cm, media pesata in mezzo. |
| 23:30 | Tutto il nostro lavoro va sul repo del team, in una cartella sola, senza toccare quelle dei compagni. |
| 23:50 | **Consiglio del mentor: non solo bici.** Il prodotto diventa un **ADAS posteriore retrofit per qualsiasi mezzo** senza ADAS (bici, monopattini, auto vecchie, furgoni, camion, bus). Il casco resta solo per le due ruote. |
| ~01:00 | Arduino UNO normale non più usata: l'HC-SR04 è collegato direttamente ai GPIO della Pi a 3,3 V. |
| 01:12 | 15 video da camera posteriore approvati da Matteo per migliorare il modello (esclusi camion_1, 2, 3, bus_1 e monopattino_1). |
| 01:17 | La cartella sul repo si chiama **`adas-posteriore/`**. |
| 01:21 | Il case 3D lo fa un compagno, non i thread. |

---

## 2. Com'è fatto oggi il sistema

```
 SUL MEZZO: Raspberry Pi 4 ("guardaspalle")              CASCO / CABINA: Arduino UNO Q
 ┌────────────────────────────────────────────┐          ┌──────────────────────────────────┐
 │ webcam Deltaco + HC-SR04, entrambi indietro│          │ STM32: strip LED WS2813          │
 │ YOLO26n NCNN 192x480 + ByteTrack (~8 fps)  │ GET /risk│   (tempia SX | dietro | tempia DX)│
 │ tempo all'impatto, traiettoria, velocità   │◄─────────┤   buzzer, IMU (testa, caduta)    │
 │ fusione camera/ultrasuono, auto-taratura   │ POST     │ Linux: ponte HTTP, SOS Telegram  │
 │ rischio per zona SX / DIETRO / DX          │ /event   └──────────────────────────────────┘
 │ profili per mezzo (--mezzo)                │
 │ pagina web :8000 (dashboard) e /test       │
 └────────────────────────────────────────────┘
```

- **Raspberry Pi 4:** hostname `guardaspalle`, utente `utente`, IP 172.20.10.2 sull'hotspot "iPhone di Matteo", ambiente Python `~/gs`, codice in `~/poc`. Parte da sola con `guardaspalle.service`.
- **Comando del servizio (demo in scala):**
  `bike_adas.py --source 0 --us-trig 23 --us-echo 24 --us-side B --scale 0.05 --near-red 15 --near-amber 30 --clips --stream`
  Il modello di default è `yolo26n_192x480_ncnn_model`. Accanto servono `profili_mezzo.py` e `dashboard.html`.
- **HC-SR04:** VCC al pin 1 (3,3 V), GND al pin 6, TRIG su GPIO23 (pin 16), ECHO su GPIO24 (pin 18), senza resistenze. Non mettere mai VCC a 5 V con l'ECHO collegato diretto.
- **Camera e ultrasuono non hanno firmware nostro:** li legge `bike_adas.py`. L'unico firmware nostro è quello del casco (`helmet_unoq/`).
- **UNO Q:** IP 172.20.10.4 sull'hotspot.
- **Pagine:** `http://172.20.10.2:8000` (vista dall'alto "stile Tesla") e `/test` (camera, ultrasuono e fusione affiancati, velocità di avvicinamento, grafico degli ultimi 20 secondi). Ricaricare con Cmd+Shift+R dopo ogni aggiornamento.
- **Come si aggiorna la Pi:** i file nuovi arrivano in `~/Downloads/guardaspalle_demo/` sul Mac, poi `scp` verso `~/poc/perception/` e riavvio del servizio.
- **Intoppi già incontrati:** "GPIO busy" se resta acceso uno script di prova; l'ultrasuono non legge se il venv non vede `gpiozero` (si risolve con `include-system-site-packages = true` in `~/gs/pyvenv.cfg`); un vecchio `ffmpeg` aperto in un'altra finestra blocca la webcam.

### La regola del rischio
`punteggio = peso del veicolo × urgenza × traiettoria`. L'urgenza va da 0 a 6 s dall'impatto fino a 1 a 1,5 s. La traiettoria vale 2,0 se il veicolo è in linea con te, 1,5 se passerà a meno di 1,5 m, 0,6 se passerà largo. I pesi vanno da 0,3 (persona) a 1,4 (bus e camion). Rosso (luce e suono) sopra 1, ambra (solo luce) sopra 0,35. Contano solo i veicoli che si avvicinano.

### Profili per mezzo (`--mezzo`)
| Mezzo | Avviso | Mezza larghezza | Sorpasso sicuro | Urgenza | Chi pesa di più |
|---|---|---|---|---|---|
| bici, monopattino | casco | 0,35 / 0,30 m | 1,5 m | 6 → 1,5 s | bus e camion |
| auto | cabina | 0,90 m | 1,9 m | 4 → 1,2 s | moto e mezzi pesanti nell'angolo cieco |
| furgone | cabina | 1,00 m | 2,0 m | 4,5 → 1,3 s | moto, bici |
| camion, bus | cabina | 1,25 m | 2,3 m | 5 → 1,5 s | bici e pedoni |

I valori dei mezzi a motore sono ragionevoli ma non tarati su strada.

---

## 3. Cosa funziona davvero e cosa no

| Parte | Stato |
|---|---|
| Pi con webcam, YOLO e pagina web, avvio automatico | **Funziona sulla Pi**, circa 8 fps |
| HC-SR04 sui GPIO a 3,3 V | **Funziona sulla Pi** (servizio: `[ultrasuono] GPIO TRIG=23 ECHO=24`) |
| Fusione camera/ultrasuono e pagina `/test` | **Sulla Pi.** Da provare con la macchinina vera |
| Velocità di avvicinamento | Scritta e provata in simulazione (rampa a 25 cm/s stimata 24,8). Da provare con la macchinina |
| YOLO26n 192×480 e auto-taratura della camera dall'ultrasuono | Provati in container (errore della camera dal 31% all'8% in un test sintetico). **Non ancora provati sulla Pi** |
| Filtro "un veicolo, un riquadro" | Provato sul video notturno: 0 doppioni. Va copiato sulla Pi |
| Profili per mezzo e dashboard che disegna il mezzo | Scritti e provati con `--fake` |
| Casco UNO Q (LED, buzzer, testa girata, caduta, SOS) | Sketch scritto. **Non risulta provato dal vivo nei thread.** Le API della UNO Q (Bridge, assi della Modulino, `tone()`) erano da verificare. La UNO Q parla con la Pi sull'hotspot (verificato sabato sera) |
| Touch Display | La Pi non parte con display e webcam insieme: probabilmente alimentatore debole |

---

## 4. Numeri misurati finora

- **Velocità sulla Pi 4:** YOLO11n NCNN a 320 circa 8 fps (sabato sera); YOLO26n e YOLO11n hanno la stessa velocità in NCNN.
- **Ultrasuono:** preciso sotto i 40 cm, poco affidabile sopra (prova sul campo di Matteo).
- **Video notturno in autostrada** (camera posteriore di un'auto, 146 s):
  - avvisi rossi: stile radar 27; profilo bici 11, auto 9, camion 9 (con yolo11n a 640). È il numero "27 contro 9";
  - con il modello di default della Pi (yolo26n 192×480) **solo 3 sorpassi veri su 10 diventano rossi**: 4 persi perché di notte YOLO non vede l'auto, 3 perché l'auto compare tardi già al bordo dell'immagine;
  - YOLO26n trova circa il doppio delle auto di notte rispetto a YOLO11n come rilevamenti totali (1752 contro 804), ma nelle finestre di sorpasso YOLO11n 192×480 con uno schiarimento gamma 0,5 vede di più (0,60 contro 0,45).
  - Il "27 contro 9" va ricalcolato con il modello finale prima di usarlo nel pitch.

---

## 5. Cosa sta andando avanti stanotte

- **Migliorare YOLO e misure** (proprietario di `bike_adas.py`, `test.html` e del modello): ha aggiunto la distanza dall'altezza del riquadro, l'avviso "di fianco" per le auto che compaiono già al bordo e un modo notte. Sta confrontando YOLO26n e YOLO11n con e senza modo notte. Valuta anche il fine-tuning sui video raccolti.
- **Video da camera posteriore:** porta i 15 video approvati nella cartella `prova_mezzo/`, fa girare il sistema su ognuno, scrive per ogni video i sorpassi veri, quelli persi e la causa, e prepara i fotogrammi etichettati per il fine-tuning.
- **Questo thread:** questo riepilogo, più le bozze per la consegna.

## 6. Idee aperte, non ancora scelte
Da [idee_vincenti_retrofit.md](../idee_vincenti_retrofit.md):
1. **Aggancio normativo nel pitch:** dal luglio 2024 l'UE impone l'avviso d'angolo cieco sui camion e bus nuovi; noi lo portiamo sui mezzi che circolano già. Londra obbliga già al retrofit. Costa solo una slide.
2. **Angolo cieco laterale per camion e bus** (svolta a destra con la bici accanto): stessa scatola montata di lato.
3. **Mappa dei quasi-incidenti a Torino** (City Signals): ogni evento rosso diventa un punto anonimo.
4. **Montaggio in 5 minuti** mostrato nel video.
5. **Occhio sul guidatore** con UNO Q e IMX219 (sonnolenza e distrazione, l'altro sistema che l'UE impone solo sul nuovo).
6. **Avvisi a voce** dalla pagina web, **luce anti-tamponamento** verso chi sta dietro, **targhe e volti sfocati** nelle clip, **ToF Modulino** di lato, **unità in cabina con OLED**.

---

## 7. Il lavoro dei compagni nel repository

*Letto senza modificare niente, dal repository [matteocifani/HackTurin](https://github.com/matteocifani/HackTurin) com'era alle 01:30. Gli orari sono italiani.*

### In breve
Ci sono **due progetti in parallelo** e **tre versioni del casco**:
- **il nostro**, `adas-posteriore/`: Pi con camera e ultrasuono, casco UNO Q che legge il rischio dalla Pi;
- **"bike-led-receiver"** di Daniele (con la caduta di Gianluca): la stessa idea bici + casco, ma con un altro protocollo, un altro sketch e una Pi che per ora manda dati finti;
- **"Casco Sentinella"** di Grinta-V (Nicolò): un casco che segnala buche e cadute a una **mappa di Torino per il Comune**. Il server è fatto e testato; il casco no.

Nessuno dei pezzi dei compagni legge ancora i dati della nostra Pi.

### Documenti nella radice (Daniele, sabato 22:50)
- `SCOPE.md` e `FATTIBILITA-BICI.md` si dichiarano superati.
- `MVP-BICI-CASCO.md` è il riferimento attuale per loro: Pi 4 + Deltaco + HC-SR04 sulla bici, UNO Q con Modulino Movement e due LED sul casco, collegamento Wi-Fi (in origine UDP), caduta con picco oltre 2,5 g, inclinazione oltre 45° e poi 3 s fermo. **Esclude tempo all'impatto, velocità, SOS e GPS**, cioè proprio quello che il nostro sistema fa.
- `HANDOFF.md` propone un'altra variante: il telefono come webcam e il riconoscimento sulla UNO Q.
- Sono solo documenti, niente è provato sull'hardware. Per la giuria vanno aggiornati o segnati come superati, perché contraddicono il progetto che presentiamo.

### `pi/sender.py` e `bike-led-receiver/` (Daniele, fino alle 01:08)
- `pi/sender.py` è un **rilevatore finto**: ripete una sequenza fissa (auto a destra, camion a destra, silenzio) e la manda in **TCP sulla porta 5005**, 10 messaggi al secondo, una riga JSON `{"seq": n, "cls": "car", "side": "L|C|R"}`. Sono passati da UDP a TCP perché il container di App Lab pubblica solo porte TCP.
- `bike-led-receiver/` è un'app App Lab per la UNO Q: server TCP sulla 5005, traduce classe e lato e li passa allo sketch con `Bridge.call("set_state", cls, side)`. Collegamento perso dopo 1,5 s.
- Lo sketch usa una strip NeoPixel da 30 LED sul **pin A0**, divisa in tre parti (sinistra, centro, destra). Colori: persona verde, bici blu, auto rossa, ambra lampeggiante se il collegamento cade. **Non ha buzzer né pulsante.**
- **Attenzione:** è rimasto `DEBUG_RED = True`, quindi oggi qualsiasi messaggio accende tutta la strip di rosso.
- Alle 01:08 Daniele ha unito la caduta di Gianluca nella stessa app. Gli avvisi di caduta per ora vengono solo stampati: "come mandarli alla Pi è ancora da decidere".
- Utile anche a noi: `sketch.yaml` elenca le dipendenze delle librerie Modulino che App Lab non trova da solo.

### `adas-posteriore/codice/helmet_unoq/fall_alert/` (Gianluca, 00:25)
- Rilevamento caduta con il Modulino Movement a circa 104 Hz: urto (variazione dell'accelerazione oltre 0,5 g), poi inclinazione oltre 47° entro 3 s, poi nessun movimento tra 5 e 10 s → "FALL". Altrimenti "falso positivo".
- Manda `Bridge.notify("alert", tipo, valore, ms)`. Un commento parla di invio al telefono via Bluetooth, che non esiste ancora.
- Probabilmente (è una mia deduzione) l'algoritmo viene dal progetto universitario "Casco sensorizzato", tra i cui autori c'è Gianluca. Va bene usarlo, ma il manuale chiede di dichiarare cosa era già disponibile prima dell'hackathon.

### `casco-sentinella/` (Grinta-V, da sabato 18:28, importato nel repo alle 23:15)
- Progetto per **City Signals**: il casco UNO Q riconosce urti e cadute e li classifica in BUCA, CADUTA_DA_DISSESTO, IMPATTO_VIOLENTO, CADUTA_SENZA_CAUSA_RILEVATA. Gli eventi vanno a un server sul portatile.
- **Il server funziona ed è testato** (TEST_LOG: "Mappa pubblica, /comune e /emergenza funzionano", test automatici verdi). FastAPI + SQLite sulla **porta 8000** del portatile.
  - `POST /api/events` per mandare un evento (con posizione, tipo, confidenza, se è un'emergenza, se è simulato), più `/api/heartbeat`, `/api/stats`, `/api/export.csv`.
  - Pagine: `/` mappa di calore di Torino, `/comune` dashboard per il Comune, `/emergenza` "112 SIMULATO".
  - 8 punti critici reali di Torino e circa 300 eventi simulati per la demo.
- **Il firmware del casco e l'app non esistono ancora** (solo README di una riga, cablaggio vuoto).
- La loro specifica mette i **sorpassi e i quasi-incidenti fuori dal loro MVP**.

### Come si collegano al nostro lavoro
1. **Il loro server è la mappa di Torino che a noi manca.** I nostri sorpassi pericolosi sono proprio i "quasi-incidenti" che loro hanno lasciato fuori: i due progetti si completano. Basterebbe che la Pi mandasse ogni evento rosso con `POST /api/events`, aggiungendo un tipo nuovo (per esempio `SORPASSO_STRETTO`) all'elenco in `server/models.py`, che oggi lo rifiuterebbe.
2. **Pi → casco: due protocolli diversi.** Il nostro casco chiede il rischio alla Pi (`GET /risk` in HTTP, 20 volte al secondo). Il loro aspetta che la Pi spinga i dati in TCP sulla 5005. Si può fare un piccolo adattatore sulla Pi che legge il nostro rischio e lo manda nel loro formato (zona SX/DIETRO/DX → L/C/R), oppure usare il nostro casco.
3. **Due sketch del casco incompatibili:** pin della strip (A0 contro D6), funzioni del Bridge diverse (`set_state` contro `risk`), il loro senza buzzer, pulsante e "testa girata", colori diversi. Va scelto uno solo.
4. **Tre algoritmi di caduta:** quello di Gianluca (già nel loro sketch), il nostro (urto + casco fermo, 30 s per "sto bene", SOS su Telegram) e quello previsto da Casco Sentinella. Anche l'SOS ha tre strade: il nostro Telegram, il loro "112 simulato", il Bluetooth del commento di Gianluca.
5. **Porta 8000** usata sia dalla nostra Pi sia dal loro server sul portatile: nessun conflitto, perché girano su macchine diverse.

### Decisioni da prendere con i compagni domattina
1. **Cosa presentiamo:** un progetto solo che unisce tutto ("ADAS retrofit che manda alla città i quasi-incidenti e le cadute") o due progetti separati? Il mio consiglio è uno solo: la nostra percezione, il loro server come mappa per il Comune. È la storia più forte per City Signals.
2. **Quale casco:** sketch unico, con pin, colori, buzzer e "testa girata".
3. **Protocollo Pi → casco:** HTTP `/risk` (il nostro) o TCP 5005 (il loro).
4. **Algoritmo di caduta e canale SOS.**
5. **Prima della demo:** spegnere `DEBUG_RED` nel ricevitore; aggiornare o segnare come superati `MVP-BICI-CASCO.md` e `SCOPE.md`.

---

## 8. Da fare domenica, in ordine
1. **Chiedere agli organizzatori se il Devpost serve davvero.** Per il manuale è obbligatorio.
2. Copiare sulla Pi l'ultima versione di `bike_adas.py` e i file nuovi, provare la macchinina su `/test` e sulla dashboard.
3. Decidere con i compagni come si uniscono i pezzi: progetto unico o separati, quale casco, quale protocollo (sezione 7).
4. Scegliere al massimo una o due idee della sezione 6. Alle 12:30 non si aggiungono più funzioni.
5. Ricalcolare i numeri con il modello finale (sorpassi riconosciuti, "27 contro 9", fps).
6. Girare il video. Una sceneggiatura è in [video_2min.md](video_2min.md), uno schema di slide in [slide_pitch.md](slide_pitch.md).
7. README del repo con la challenge scelta, cosa funziona e cosa no, schema, componenti e licenza.
8. Consegnare **entro le 15:30**, controllare i link in una finestra in incognito e tenere il prototipo acceso per la valutazione delle 16:00.
