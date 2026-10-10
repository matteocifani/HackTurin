# Guardaspalle: ADAS per bici

*Prototipo per hackTurin 2026. "Guardaspalle" è un nome di lavoro.*

Guardaspalle guarda la strada dietro al ciclista con un'AI che gira tutta a bordo. Capisce **cosa** arriva, **tra quanti secondi** e **quanto vicino passerà**, e avvisa solo quando conta:
- **al ciclista** con LED in visione periferica sul casco e un suono, senza bisogno di guardare uno schermo;
- **all'automobilista** con la luce posteriore del casco, che lampeggia solo quando un'auto arriva troppo veloce o troppo stretta.

Quando il ciclista gira la testa per guardare indietro, il casco risponde: verde se è libero, rosso se sta arrivando qualcosa. Se cade, chiede aiuto da solo e racconta cosa è successo nei secondi prima.

```
 BICI: Raspberry Pi 4                                       CASCO: Arduino UNO Q
 webcam posteriore → YOLO11n + ByteTrack                    STM32: LED tempie + luce dietro, buzzer,
 HC-SR04 laterale  → tempo all'impatto, traiettoria,  ◄───  IMU (testa girata, caduta), pulsante,
                     distanza di sorpasso prevista    /risk  watchdog (1 s senza dati → ambra)
                     e misurata, rischio per zona     ───►   Linux: ponte HTTP, SOS Telegram
 pagina web per il telefono, registro eventi, clip   /event
```

## Contenuto
| Percorso | Cosa fa |
|---|---|
| `perception/bike_adas.py` | Il cuore, sul Pi: webcam, YOLO, tracking, tempo all'impatto, rischio, ultrasuono, server web, registro eventi |
| `perception/dashboard.html` | Vista dall'alto "stile Tesla" per il telefono sul manubrio |
| `helmet_unoq/sketch/sketch.ino` | STM32 del casco: LED, buzzer, testa girata, caduta, pulsante, modalità degradata |
| `helmet_unoq/python/main.py` | Linux del casco (App Lab): legge il rischio dal Pi, manda gli eventi, SOS su Telegram |
| `ARCHITETTURA.md` | Scelte di progetto, piano, demo, pitch |

## Prova in 1 minuto, senza hardware
Funziona su qualsiasi PC con Python 3.9 o più recente. OpenCV serve solo per i video.
```bash
python3 perception/bike_adas.py --fake
# apri http://localhost:8000 (dal telefono: http://<ip-del-pc>:8000)
```
`--fake` genera traffico simulato e un ultrasuono simulato. Serve a lavorare su casco e pagina mentre la percezione è ancora in sviluppo.

## Raspberry Pi 4 (bici)
Serve una microSD o una chiavetta da **almeno 16 GB**: Pi OS, PyTorch, OpenCV e YOLO non stanno in 2 GB. Sul portatile lo stesso codice gira con `pip install ultralytics` e `--source 0`, senza l'ultrasuono.

1. **Installazione** (Raspberry Pi OS 64 bit):
   ```bash
   sudo apt install -y python3-venv v4l-utils python3-lgpio
   python3 -m venv --system-site-packages ~/gs && source ~/gs/bin/activate
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu   # torch solo CPU: senza, su ARM pip scarica GB di pacchetti CUDA
   pip install ultralytics pyserial
   yolo export model=yolo11n.pt format=ncnn imgsz=320   # oppure lo fa da solo al primo avvio
   ```
   Provate anche `yolo26n` (`--model yolo26n_ncnn_model`): è più recente e secondo Ultralytics è più veloce su CPU. Tenete quello che fa più fps a parità di riconoscimento.
2. **Webcam:**
   - `lsusb` e `v4l2-ctl -d /dev/video0 --list-formats-ext` devono mostrarla;
   - il codice chiede 1280×720 in MJPG;
   - spegnete l'autofocus: `v4l2-ctl -c focus_automatic_continuous=0` (il nome del controllo cambia da modello a modello).
3. **HC-SR04** (lato sinistro, a 80–90 cm da terra, perpendicolare alla bici):
   | HC-SR04 | Raspberry |
   |---|---|
   | VCC | pin 2 (5 V) |
   | GND | pin 6 |
   | TRIG | GPIO23 (pin 16) |
   | ECHO | **partitore**: ECHO → 1 kΩ → GPIO24 (pin 18) → 2 kΩ → GND. Il GPIO del Pi regge solo 3,3 V |

   Va bene qualsiasi coppia circa 1:2 (1 kΩ + 2,2 kΩ, 4,7 kΩ + 10 kΩ, oppure 3 resistenze uguali: una sopra, due in serie sotto). Senza resistenze: o si usa la Arduino UNO via USB (`--us-serial`), o si prova a dare al sensore 3,3 V (pin 1) invece di 5 V, così anche l'ECHO esce a 3,3 V; molti HC-SR04 però a 3,3 V non misurano (gli HC-SR04P sì).
   Avvio con l'ultrasuono sui GPIO: `--us-trig 23 --us-echo 24` al posto di `--us-serial /dev/ttyACM0`.
4. **Avvio:**
   ```bash
   # su un video di traffico, a velocità reale, con video annotato su /video.mjpg
   python3 perception/bike_adas.py --source traffico.mp4 --realtime --loop --stream
   # sulla bici
   python3 perception/bike_adas.py --source 0 --us-trig 23 --us-echo 24 --clips --save giro.mp4
   ```
   All'uscita (Ctrl+C) stampa e salva in `logs/` un riassunto con fps, avvisi rossi contro avvisi "da radar", sorpassi misurati ed errore medio tra distanza prevista e misurata.

### Calibrazione (10 minuti in parcheggio)
- **`--center-x`:** con una persona ferma 10 m esattamente dietro la bici, guardate `/video.mjpg`. La linea azzurra deve passarle in mezzo: correggete la frazione finché non succede.
- **`--hfov` o `--f-px`:** con un'auto ferma a distanza nota `d`, misurate la larghezza del suo riquadro in pixel `w` (`--log-tracks` la salva). Poi `f_px = w × d / 1,8`. Serve solo per la distanza in metri; tempo all'impatto e distanza laterale non ne dipendono.
- **`--crop`:** limitate l'analisi alla fascia della strada, così i veicoli lontani hanno più pixel. Il default è `0,0.2,1,0.9`.

### Parametri principali del rischio
| Parametro | Default | Significato |
|---|---|---|
| `--t-warn` / `--t-crit` | 6 / 1,5 s | L'urgenza parte da 0 a 6 s dall'impatto e arriva al massimo a 1,5 s |
| `--pass-safe` | 1,5 m | Distanza di sorpasso considerata sicura, misurata dall'asse della bici |
| `--hold` | 0,7 s | Per quanto un livello resta acceso, per evitare lo sfarfallio |
| `--near-red` / `--near-amber` | 150 / 250 cm | Soglie dell'ultrasuono per un veicolo di fianco |

## Setup senza portatile: tutto sulla UNO Q in bici
Il cervello è la UNO Q sulla bici; il casco esce dalla PoC.
- **Linux della UNO Q (in SSH, fuori da App Lab):** `python3 -m venv ~/gs && source ~/gs/bin/activate && pip install ultralytics`, poi `python3 perception/bike_adas.py --source 0 --us-remote --window 1.5`. Camera: Deltaco con un hub USB-C alimentato, oppure IMX219 con Media Carrier.
- **App Lab:** `bike_unoq/sketch/sketch.ino` + `bike_unoq/python/main.py`, con `PI_HOST` uguale all'IP della UNO Q stessa.
- **STM32:** HC-SR04 (TRIG D7, ECHO D8, VCC 5V), strip WS2813 su D6 lungo il tubo orizzontale (primi 3 LED sul manubrio: sinistra, dietro, destra; ultimi 10 come luce posteriore), buzzer D5, pulsante D2, Modulino Movement sul telaio.
- **Prime prove:** fps di YOLO sulla UNO Q; inclinate la bici di lato per 3 s per la caduta; sterzate a sinistra con un'auto simulata in arrivo (`--fake`) per il rosso immediato. Se reagisce al contrario cambiate `LEFT_SIGN`, se non reagisce `YAW_AXIS`.

## Ultrasuono con la Arduino UNO (bici, collegata al portatile)
- HC-SR04: VCC → 5V, GND → GND, TRIG → D7, ECHO → D8 (la UNO è a 5 V, niente partitore).
- Caricate `bike_arduino_uno/us_serial/us_serial.ino` con l'IDE Arduino.
- Sul portatile: `pip install pyserial`, poi `python3 perception/bike_adas.py --source 0 --us-serial <porta>`. La porta è `COM3` o simile su Windows, `/dev/cu.usbmodem…` su Mac, `/dev/ttyACM0` su Linux: la trovate nell'IDE Arduino.

## Casco (Arduino UNO Q)
**Collegamenti:**
| Componente | Collegamento |
|---|---|
| Strip WS2813 da 1 m attorno al casco | dati a D6; 5 V e GND dalla UNO Q. Parte dalla tempia sinistra, passa dietro e finisce alla tempia destra |
| Buzzer passivo Grove | D5 |
| Pulsante "sto bene" | tra D2 e GND |
| Modulino Movement | connettore Qwiic |

**App Lab:**
1. Create una nuova app e copiate `sketch/sketch.ino` e `python/main.py`.
2. Aggiungete le librerie **Adafruit NeoPixel ≥ 1.15.5** e **Modulino**.
3. Impostate `PI_HOST` con l'IP del Pi (`hostname -I`). Il token Telegram va in una variabile d'ambiente, mai nel repo.

**Rete:** Pi, UNO Q e telefono sull'**hotspot del telefono**. Il Wi-Fi ospiti blocca App Lab.

**Verifiche al primo avvio:**
1. All'accensione la strip fa un giro verde. Tenete fermo il casco: in quel momento il giroscopio si calibra.
2. Con il Pi in `--fake`, le tempie cambiano colore con il traffico simulato.
3. Girate il casco di 45° a sinistra: deve rispondere verde o rosso. Se reagisce dal lato sbagliato, cambiate `LOOK_LEFT_SIGN`; se non reagisce, cambiate `YAW_AXIS`.
4. Lasciate cadere il casco su un cuscino: parte il conto alla rovescia di 30 s. Il pulsante lo annulla; tenerlo premuto 3 s manda l'SOS manuale.
5. Fermate `bike_adas.py`: dopo 1 s le tempie diventano ambra lente.

**Da verificare subito, perché le API della UNO Q sono recenti:**
- nome della libreria Bridge e `Bridge.provide_safe`;
- `tone()` sul core Zephyr (altrimenti `USE_TONE 0`);
- assi della Modulino;
- che l'app possa aprire connessioni HTTP verso il Pi.

## Telefono
Aprite `http://<ip-del-pi>:8000` e toccate lo schermo: si attivano il suono e lo schermo sempre acceso.
- Con `?auto` nell'indirizzo la schermata iniziale non compare: utile per un monitor in demo.
- **GPS:** i browser lo danno solo su HTTPS. Su Chrome per Android aprite `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, aggiungete `http://<ip-del-pi>:8000` e riavviate Chrome. In alternativa, abbinate gli eventi alla traccia Strava tramite l'orario.

## Risultati
*Da compilare con le misure vere.*

| Misura | Risultato |
|---|---|
| fps e latenza sul Pi 4 | |
| Errore della distanza dalla camera (5, 10, 15, 20 m) | |
| Distanza di sorpasso prevista contro misurata (errore medio) | |
| Avvisi rossi contro avvisi "da radar" sugli stessi video | |
| Preavviso medio | |
| Precisione degli avvisi rossi | |

## Limiti
- Di giorno: notte e pioggia non sono state provate.
- La camera vede circa 20–30 m: il preavviso è di qualche secondo, non quello di un radar.
- La distanza da una sola camera ha un errore di circa il 15%: le decisioni usano tempo all'impatto e distanza laterale, che non ne dipendono.
- Un solo sensore laterale: il codice gestisce già 3 zone.

## Privacy
Nessuna registrazione continua. Con `--clips` vengono salvati solo 5 s a bassa risoluzione per ogni avviso rosso, e restano a bordo.

## Licenza
MIT
