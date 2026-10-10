# Guardaspalle

ADAS posteriore per bici: Raspberry Pi 4 sulla bici (webcam + HC-SR04 rivolti indietro, YOLO11n, rischio, pagina web) e Arduino UNO Q sul casco (LED alle tempie, "specchietto che risponde", caduta/SOS).

| Cartella | Contenuto |
|---|---|
| [`poc/`](poc/) | Codice della PoC. Partire da [`poc/README.md`](poc/README.md) e [`poc/ARCHITETTURA.md`](poc/ARCHITETTURA.md). |
| [`poc/perception/`](poc/perception/) | Codice che gira sul Raspberry: `bike_adas.py`, dashboard, pagina `/test`, servizio systemd. |
| [`poc/helmet_unoq/`](poc/helmet_unoq/) | Casco con Arduino UNO Q (sketch STM32 + Python lato Linux). |
| [`poc/bike_arduino_uno/`](poc/bike_arduino_uno/) | Fallback: HC-SR04 letto da un Arduino UNO via seriale USB. |
| [`poc/bike_unoq/`](poc/bike_unoq/) | Piano B: tutto sulla UNO Q montata sulla bici. |
| [`analisi/`](analisi/) | Analisi, idee scartate e ragionamenti che hanno portato al progetto. |

## Configurazione attuale sul Raspberry

- Utente `utente`, codice in `~/poc`, venv `~/gs` con `include-system-site-packages = true` in `~/gs/pyvenv.cfg` (serve per `gpiozero`/`lgpio` di sistema).
- Servizio `guardaspalle.service`: `bike_adas.py --source 0 --us-trig 23 --us-echo 24 --us-side B --clips --stream`.
- HC-SR04 collegato direttamente ai GPIO del Pi a 3,3 V: VCC pin 1, GND pin 6, TRIG pin 16 (GPIO23), ECHO pin 18 (GPIO24).
- Dashboard su `http://<ip-pi>:8000`, pagina di test fusione camera/ultrasuono su `/test`.

Il token Telegram va in variabile d'ambiente (`TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`), mai nel repository.
