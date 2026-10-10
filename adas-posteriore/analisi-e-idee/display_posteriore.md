# Display "stile Tesla" per bici: cosa arriva da dietro

## Aggiornamento 11:25: UNO Q al posto del Raspberry
- **Si può fare.** Il lato Linux della UNO Q fa girare l'AI. La camera è la IMX219 + Uno Media Carrier (unica MIPI supportata, App Lab ≥0.8), oppure la webcam USB con un hub USB-C alimentato.
- **Blocchi App Lab utili:** Video Object Detection e WebUI (pagina per il telefono, porta 7000).
- **Probabilmente più lenta del Pi 4** (Cortex-A53 contro A72).
- **Decisione entro le 13:30, misurando gli fps:** UNO Q + IMX219 contro Pi 4 + Deltaco. Se la UNO Q basta, scheda unica. Altrimenti il Pi fa l'AI e la UNO Q gestisce sensori, LED e buzzer.

## Aggiornamento 11:20: la scheda è un Raspberry Pi 4 Model B, non un Pi 5
- **YOLO:** usate input 320–416 px, NCNN e solo le classi veicolo; aspettatevi circa 6–10 fps a 320. Nel display interpolate le icone tra un rilevamento e l'altro.
- **Calore:** mettete un dissipatore o una ventola, perché il Pi 4 rallenta oltre gli 80 °C.
- **Alimentazione:** bastano 5 V / 3 A da un power bank.
- **Sensore laterale:** l'HC-SR04 del team (2–400 cm) sostituisce la Modulino Distance (max 1,2 m), così coprite la soglia di legge di 1,5 m.
  - Funziona a 5 V e il pin Echo esce a 5 V: sul Pi serve un partitore 1 kΩ/2 kΩ; sulla UNO Q no (pin digitali tolleranti a 5 V, tranne D3).
  - All'aperto le letture sono rumorose: filtratele.

## Verdetto
**È fattibile in versione semplificata.** Una vista dall'alto della strada dietro di te, con le icone dei veicoli nella posizione giusta, colorate per pericolo e aggiornate in tempo reale. Non è fattibile la grafica 3D completa di Tesla, che usa 8 camere, un chip dedicato e anni di sviluppo. Ma una vista "2,5D" con icone in prospettiva rende lo stesso effetto e si fa in un giorno e mezzo.

## Architettura consigliata
```
[RETRO BICI]                                   [MANUBRIO]
Webcam Deltaco ──USB──► Raspberry Pi 5 ──Wi-Fi──► Telefono (o schermo vostro)
                          │  YOLO + tracking         pagina web a tutto schermo
UNO Q ──Wi-Fi (UDP)──────►│  distanza + TTC
 ├ Modulino Distance (lato sinistro: sorpasso stretto < 1,2 m)
 ├ Modulino Movement (frenata → luce stop, scarta frame sulle buche)
 └ LED strip posteriore + buzzer
```
- **Il Pi sta dietro, vicino alla webcam:** niente cavi lunghi lungo il telaio.
- **Il display è il telefono** su un supporto da manubrio. Il Pi serve una pagina web via hotspot. Il telefono è luminoso al sole, impermeabile, ha già il supporto e non dovete procurarvi uno schermo. Se avete uno schermo per Pi potete usarlo, ma il telefono è il piano A.
- **La UNO Q fa da modulo sensori posteriore.** I Modulino hanno connettore Qwiic, che si collega direttamente alla UNO Q e non al Pi senza un cavo apposito.

## Pipeline sul Pi
1. **Rilevamento:** YOLOv8n/YOLO11n (Ultralytics) esportato in **NCNN**. Classi utili: car, bus, truck, motorcycle, bicycle, person. Input 416–640 px: più alto vede più lontano, ma fa meno fps. **Misurate gli fps nella prima ora.**
2. **Tracking:** ByteTrack, già integrato in Ultralytics (`model.track`). Dà un ID stabile per ogni veicolo.
3. **Distanza monoculare:** `distanza ≈ f × larghezza_reale / larghezza_px` con larghezze tipiche (auto 1,8 m, bus/camion 2,5 m, moto/bici 0,7 m). Calibrate `f` una volta, con un'auto a distanza nota nel parcheggio.
4. **Posizione laterale:** dalla posizione orizzontale del riquadro, `x ≈ (cx − centro) × distanza / f`.
5. **Velocità e TTC:** dalla variazione della distanza nel tempo, filtrata con media mobile o Kalman. TTC = distanza / velocità di avvicinamento.
6. **Rischio:** verde, giallo o rosso in base a TTC, tipo di veicolo e distanza laterale prevista al sorpasso.
7. **Invio** al telefono via WebSocket, circa 10 volte al secondo: `[{id, tipo, x, y, ttc, rischio}]`.

## Il display
- **Pagina web** con HTML canvas: la bici in basso al centro, la corsia e i veicoli come icone in prospettiva (più piccole quando sono lontane), con colore per rischio e TTC accanto all'icona.
- **Effetto "Tesla":** sfondo scuro, linee di corsia, icone che scivolano in modo fluido. Usate l'interpolazione tra un aggiornamento e l'altro, così l'animazione resta a 60 fps anche se YOLO va a 10.
- **Pericolo grave:** bordo rosso lampeggiante sul telefono + **buzzer**.

## Il punto critico da gestire: la distrazione
Il vostro problema di partenza è la distrazione del ciclista: uno schermo che invita a guardare in basso può peggiorarla. **La giuria ve lo chiederà.** La risposta deve essere nel design:
- **Lo schermo si legge con uno sguardo:** solo colori e posizioni, niente testo da leggere.
- **I pericoli veri arrivano col suono**, non con lo schermo: non serve guardare per essere avvisati.
- **Modalità calma:** se dietro non c'è niente di pericoloso, lo schermo resta quasi spento.

## Limiti onesti
- **Portata:** con una webcam a 640 px un'auto a 25–30 m occupa poche decine di pixel. Il riconoscimento affidabile arriva a circa 20–30 m, cioè 2–4 secondi di preavviso a velocità urbane. Basta per avvisare, va dichiarato.
- **Distanza monoculare:** errore del 10–20%. Va bene per le "zone", non per i centimetri.
- **Vibrazioni:** fissate bene la webcam e scartate i frame sulle buche usando l'IMU.
- **Alimentazione del Pi 5:** con un power bank a 3 A il Pi limita la corrente USB. Con webcam e Wi-Fi dovrebbe bastare, ma testatelo presto.

## Hardware
**Vostro:** Raspberry Pi 5, webcam Deltaco, telefono con supporto da manubrio, power bank USB-C PD (meglio due: uno per il Pi, uno per la UNO Q).

**Kit:** Arduino Uno Q 4gb, Arduino - Modulino distance, Arduino - Modulino movement.

**Inventario:**
- Grove - WS2813 RGB LED Strip Waterproof - 30 LED/m - 1m – 1 (luce posteriore e stop)
- Grove - Passive Buzzer – 1
- Grove shield v2 – 1 (interruttore su 3.3V)
- Grove - Universal 4 Pin Buckled 20cm Cable – 4
- Zip ties – 10, Biadesivo – 1
- Bambulab P1S – 1 slot (supporto webcam + scatola Pi + UNO Q)

Non servono più: camera IMX219, Media Carrier, LED ring, sensore di luce.

## Piano
- **Sab 11:30–13:30:** Pi 5 + webcam + YOLO NCNN con tracking su un video di traffico. Misurate gli fps. In parallelo: UNO Q che legge i Modulino e manda UDP al Pi.
- **Sab 13:30–16:** distanza, posizione laterale, TTC. Calibrazione di `f` con un'auto vera.
- **Sab 16–19:** pagina web stile Tesla sul telefono. LED strip e buzzer.
- **Sab 19–21:** montaggio sulla bici e **riprese reali in strada**.
- **Dom 10–13:** taratura sui video veri, rischio, modalità calma, rifiniture grafiche.
- **Dom 13–15:30:** video di 2 minuti, README, repo pubblico, Devpost.

## Demo per la giuria
- **Webcam puntata su un monitor** che riproduce un video reale di traffico ripreso da dietro la bici. Sul telefono le auto "compaiono" e si muovono nella vista dall'alto, diventano rosse e il buzzer suona.
- **Dal vivo:** una persona che cammina verso la webcam diventa l'icona "persona", e la mano vicino al sensore laterale dà l'avviso "sorpasso stretto".
- **Video girato in strada**, con la vista del telefono affiancata alla ripresa reale.
