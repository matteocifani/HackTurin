# ADAS posteriore (nome di lavoro: Guardaspalle)

Sistema che guarda la strada **dietro al ciclista** e lo avvisa quando arriva un veicolo pericoloso.

- **Sulla bici:** Raspberry Pi 4 con webcam e sensore a ultrasuoni HC-SR04 rivolti all'indietro. Riconosce i veicoli con YOLO11n, stima distanza e tempo all'impatto, mostra una pagina web.
- **Sul casco:** Arduino UNO Q con LED alle tempie, luce posteriore, "specchietto che risponde" quando giri la testa, rilevamento caduta e SOS.

## Dove trovare le cose

| Cartella | Cosa c'è |
|---|---|
| [`codice/`](codice/) | Tutto il codice della demo. Si parte da [`codice/README.md`](codice/README.md) (come installare e avviare) e [`codice/ARCHITETTURA.md`](codice/ARCHITETTURA.md) (come funziona, piano demo e pitch). |
| [`codice/perception/`](codice/perception/) | **Raspberry Pi sulla bici**: `bike_adas.py` (camera + ultrasuoni + YOLO + rischio), dashboard web, pagina `/test`, servizio di avvio automatico. |
| [`codice/helmet_unoq/`](codice/helmet_unoq/) | **Casco** con Arduino UNO Q: sketch per il microcontrollore e script Python lato Linux. |
| [`codice/bike_arduino_uno/`](codice/bike_arduino_uno/) | Riserva: HC-SR04 letto da un Arduino UNO collegato in USB al Pi. |
| [`codice/bike_unoq/`](codice/bike_unoq/) | Piano B: tutto sulla UNO Q montata sulla bici, senza Raspberry. |
| [`codice/docs/`](codice/docs/) | Immagini per la documentazione. |
| [`analisi-e-idee/`](analisi-e-idee/) | Ricerche, idee valutate e scartate, ragionamenti che hanno portato a questo progetto. |

## Configurazione attuale sul Raspberry

- Il contenuto di `codice/` va copiato sul Pi in `~/poc` (utente `utente`, hostname `guardaspalle`).
- Ambiente Python in `~/gs`, con `include-system-site-packages = true` in `~/gs/pyvenv.cfg` (serve per `gpiozero`/`lgpio` di sistema).
- Servizio `guardaspalle.service`: `bike_adas.py --source 0 --us-trig 23 --us-echo 24 --us-side B --clips --stream`.
- HC-SR04 collegato direttamente ai GPIO del Pi a 3,3 V: VCC pin 1, GND pin 6, TRIG pin 16 (GPIO23), ECHO pin 18 (GPIO24).
- I modelli YOLO esportati (`yolo26n_192x480_ncnn_model/`, `yolo26n_256x640_ncnn_model/`, ~9 MB l'uno) non sono nel repository. Si rigenerano da soli al primo avvio di `bike_adas.py` (scarica `yolo26n.pt` ed esporta in NCNN con la dimensione indicata nel nome), oppure a mano: `yolo export model=yolo26n.pt format=ncnn imgsz=192,480`.
- Dashboard su `http://<ip-pi>:8000`, confronto camera/ultrasuono su `/test`.

Il token Telegram va in una variabile d'ambiente (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`), mai nel repository.
