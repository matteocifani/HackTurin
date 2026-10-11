# ADAS posteriore (nome di lavoro: Guardaspalle)

Sistema che guarda la strada **dietro al ciclista** e lo avvisa quando arriva un veicolo pericoloso.

- **Sulla bici:** Raspberry Pi 4 con webcam e sensore a ultrasuoni HC-SR04 rivolti all'indietro. Riconosce i veicoli con YOLO11n, stima distanza e tempo all'impatto, mostra una pagina web.
- **Sul casco:** Arduino UNO Q con LED alle tempie, luce posteriore, "specchietto che risponde" quando giri la testa, rilevamento caduta e SOS.

## Dove trovare le cose

| Cartella | Cosa c'è |
|---|---|
| [`codice/`](codice/) | Tutto il codice della demo. Si parte da [`codice/README.md`](codice/README.md) (come installare e avviare) e [`codice/ARCHITETTURA.md`](codice/ARCHITETTURA.md) (come funziona, piano demo e pitch). |
| [`codice/perception/`](codice/perception/) | **Raspberry Pi sulla bici**: `bike_adas.py` (camera + ultrasuoni + YOLO + rischio), dashboard web, pagine `/test` e `/vista`, servizio di avvio automatico. |
| [`codice/helmet_unoq/`](codice/helmet_unoq/) | **Casco** con Arduino UNO Q: sketch per il microcontrollore e script Python lato Linux. |
| [`codice/bike_arduino_uno/`](codice/bike_arduino_uno/) | Riserva: HC-SR04 letto da un Arduino UNO collegato in USB al Pi. |
| [`codice/bike_unoq/`](codice/bike_unoq/) | Piano B: tutto sulla UNO Q montata sulla bici, senza Raspberry. |
| [`codice/training/`](codice/training/) | Addestramento del modello `gs26n` sui video da camera posteriore. |
| [`codice/docs/`](codice/docs/) | Immagini per la documentazione. |
| [`analisi-e-idee/`](analisi-e-idee/) | Ricerche, idee valutate e scartate, ragionamenti che hanno portato a questo progetto. |

## Configurazione attuale sul Raspberry

- Il contenuto di `codice/` va copiato sul Pi in `~/poc` (utente `utente`, hostname `guardaspalle`).
- Ambiente Python in `~/gs`, con `include-system-site-packages = true` in `~/gs/pyvenv.cfg` (serve per `gpiozero`/`lgpio` di sistema).
- Servizio `guardaspalle.service`: `bike_adas.py --source 0 --us-trig 23 --us-echo 24 --us-side B --clips --stream`.
- HC-SR04 collegato direttamente ai GPIO del Pi a 3,3 V: VCC pin 1, GND pin 6, TRIG pin 16 (GPIO23), ECHO pin 18 (GPIO24).
- Il modello predefinito è `gs26n`, YOLO26n addestrato da noi su video da camera posteriore. I pesi sono in [`codice/training/gs26n.pt`](codice/training/gs26n.pt) (5 MB). La versione NCNN usata sul Pi (`perception/gs26n_192x480_ncnn_model/`) non è nel repository: si rigenera con
  `cd codice && python -c "from ultralytics import YOLO; YOLO('training/gs26n.pt').export(format='ncnn', imgsz=(192, 480))" && mv training/gs26n_ncnn_model perception/gs26n_192x480_ncnn_model`.
  Se manca, `bike_adas.py` usa da solo YOLO26n originale (`yolo26n_192x480_ncnn_model`, scaricato ed esportato al primo avvio).
- [`codice/training/`](codice/training/) contiene gli script di addestramento (`label.py` etichetta i video con un modello grande, `static_filter.py` toglie i fotogrammi fermi, `train.py` addestra, `val.py` valuta). I percorsi del dataset sono quelli della macchina dove è stato addestrato: vanno adattati.
- Dashboard su `http://<ip-pi>:8000`, confronto camera/ultrasuono su `/test`, vista per telefono in stile Tesla su `http://<ip-pi>:8000/vista` (`/vista?demo` mostra traffico simulato, senza camera).

Il token Telegram va in una variabile d'ambiente (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`), mai nel repository.
