# Occhio Ciclista – idea raffinata (challenge City Signals)

## In una frase
Una scatola da montare sotto la sella di qualsiasi bici. Protegge il ciclista in tempo reale e, mentre pedala, raccoglie i dati che servono a Torino per capire dove andare in bici è pericoloso.

## Il problema
- In bici la distrazione è la prima causa di incidenti e il sorpasso è il momento più rischioso. Dal 2024 la legge impone 1,5 m di distanza, ma nessuno la misura.
- Il Comune non sa dove si concentrano i sorpassi stretti, le frenate brusche e le buche: oggi arrivano solo segnalazioni a mano.

## Cosa fa (3 livelli)
1. **Protegge, in tempo reale**
   - Il sensore laterale rileva un'auto a meno di 1,5 m: buzzer per il ciclista e luce posteriore che lampeggia.
   - Camera posteriore con AI locale: un veicolo si avvicina da dietro, la luce si accende in anticipo per farsi vedere.
2. **Soccorre**
   - L'IMU rileva una caduta. Se entro 30 s non viene premuto "sto bene", parte l'allarme con l'ultima posizione.
3. **Informa la città**
   - Ogni evento (sorpasso stretto con tipo di veicolo, frenata brusca, buca, caduta) viene salvato con orario e posizione.
   - Una dashboard mostra la mappa di Torino con i punti critici e gli indicatori: sorpassi stretti/km, buche/km, strade peggiori.

## Montaggio
Una scatola stampata in 3D sul reggisella:
- UNO Q e power bank dentro la scatola
- camera rivolta all'indietro
- Modulino Distance rivolto a sinistra, cioè verso il lato del sorpasso
- striscia LED sul retro
- Modulino Movement fissato rigido alla scatola (per vibrazioni e cadute)
- buzzer e pulsante "sto bene" sul manubrio

## Architettura
- **STM32 (sketch Arduino):** legge IMU e distanza a circa 50–100 Hz, riconosce gli eventi (soglie) e comanda LED e buzzer.
- **Linux (Python):** fa girare YOLO nano sulla camera, salva gli eventi in un CSV, serve la dashboard web (Flask + mappa Leaflet) via Wi-Fi.
- **Posizione:** traccia GPS registrata con Strava sul telefono; dopo il giro gli eventi si abbinano alla traccia tramite l'orario.

## Priorità (MVP prima)
| Priorità | Funzione | Hardware |
|---|---|---|
| P0 | Sorpasso stretto → buzzer + LED | Distance, buzzer, LED strip |
| P0 | Registro eventi con orario | UNO Q |
| P1 | Buche e frenate brusche dall'IMU | Movement |
| P1 | Dashboard con mappa | UNO Q (Python) |
| P2 | Riconoscimento veicoli con camera | IMX219 + Media Carrier |
| P2 | Caduta + "sto bene" + allarme | Movement, tact switch |

## Piano di lavoro
- **Sabato 10:30–14:** collegare i sensori e far funzionare le soglie sorpasso/buca/frenata con LED e buzzer (P0).
- **Sabato 14–18:** registro eventi, scatola 3D in stampa, prima dashboard.
- **Sabato 18–20:** **giro vero in città** registrando Strava e un video per la demo.
- **Domenica 10–13:** camera + AI, caduta, rifinitura della dashboard con i dati veri.
- **Domenica 13–15:** video di 2 minuti, README, repo GitHub pubblico.
- **Domenica 15–16:** consegna su Devpost (scadenza 16:00).

## Demo per la giuria
- Video del giro reale: auto che sorpassa, LED che si accende, evento che compare sulla mappa.
- Al tavolo: mano o macchinina vicino al sensore (buzzer + LED), scossone alla scatola (buca sulla mappa), "caduta" della scatola (allarme).
- Numeri finali, per esempio: "In X km a Torino: N sorpassi sotto 1,5 m, M buche, ecco le 3 strade peggiori".

## Perché vince su City Signals
Rileva qualcosa nel mondo fisico (sorpassi, buche, cadute), lo interpreta con AI locale e lo trasforma in azioni: una luce che si accende subito per il ciclista e una mappa che il Comune può usare.
