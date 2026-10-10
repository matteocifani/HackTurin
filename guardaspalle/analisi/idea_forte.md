# TAU – il copilota posteriore che capisce le intenzioni delle auto

## L'idea in una frase
I dispositivi che esistono oggi (radar Garmin Varia, caschi smart) ti dicono **che** qualcosa arriva da dietro. TAU capisce **cosa** arriva, **tra quanto** ti raggiunge e **cosa sta per fare**: per esempio un camion che ti sorpassa con la freccia a destra accesa, cioè sta per tagliarti la strada.

## Perché è forte
- **Problema reale e preciso:** il "right hook", cioè il veicolo che sorpassa il ciclista e poi svolta a destra davanti a lui, è uno degli incidenti più gravi in città, soprattutto con mezzi pesanti e angolo cieco. Nessun prodotto per ciclisti oggi lo riconosce.
- **Tecnica che si vede:** visione + fisica + fusione di sensori, tutto in locale sulla UNO Q. È esattamente il tipo di progetto in cui "la tecnica supera il brief".
- **Demo spettacolare al tavolo:** una macchinina con un LED arancione che lampeggia davanti alla camera, e il sistema dice "auto – svolta a destra – 1,8 s".

## Come funziona: tre capacità
1. **COSA arriva:** YOLO nano (pre-allenato su COCO) riconosce auto, bus, camion, moto e bici nella camera posteriore. Nessun training: si usano le classi esistenti.
2. **TRA QUANTO (tau):** il tempo all'impatto si calcola **senza conoscere la distanza**, solo da quanto velocemente si ingrandisce il riquadro del veicolo:
   `TTC ≈ w / (dw/dt)`, con w = larghezza del riquadro.
   È la stessa "variabile tau" che usano uccelli e insetti per evitare le collisioni (teoria del looming di David Lee): un ottimo aggancio narrativo e nessuna calibrazione della camera.
3. **COSA STA PER FARE:** riconoscimento della **freccia accesa**. Dentro il riquadro del veicolo il sistema guarda gli angoli in basso, misura nel tempo la luminosità dei pixel arancioni e cerca un lampeggio periodico a circa 1–2 Hz, la frequenza di legge degli indicatori. Se lampeggia la freccia destra del veicolo dietro di te, cioè il lato sinistro dell'immagine perché la camera lo vede di fronte, scatta l'allerta "svolta a destra".

**Fusione con gli altri sensori:**
- **Modulino Distance (laterale):** conferma il sorpasso stretto sotto 1,5 m nel campo vicino, dove la camera non vede più il veicolo.
- **Modulino Movement (IMU):** scarta i fotogrammi mossi sulle buche, così i calcoli non vengono falsati, e registra le frenate brusche del ciclista come "reazione" all'evento.

## Uscite
- **Al ciclista:** buzzer con suoni diversi per "sorpasso stretto", "veicolo veloce" e "svolta a destra in arrivo", più l'OLED sul manubrio con icona del veicolo e tempo all'impatto.
- **All'automobilista:** striscia LED posteriore. Si accende quando il TTC scende sotto la soglia e lampeggia forte in caso di "right hook", per farsi vedere proprio nel momento critico.
- **Registro eventi** con orario, da abbinare alla traccia GPS di Strava per la mappa dei punti critici (extra, se avanza tempo).

## Architettura tecnica (UNO Q)
```
Camera IMX219 (30 fps)
   │
   ├─► YOLO nano a ~3–6 fps ──► tracker (IoU/Kalman) ──► riquadro per veicolo
   │                                                  │
   └─► analisi ROI a 30 fps (solo pixel arancioni negli angoli del riquadro)
                                                      │
              TTC da dw/dt  +  frequenza lampeggio  ──► decisione (Linux, Python)
                                                      │  Bridge RPC
STM32: Modulino Distance + Movement @100 Hz ◄─────────┘
       comanda LED strip, buzzer, OLED
```
Il trucco tecnico: **due velocità**. La rete neurale gira lenta, perché è pesante, mentre l'analisi della freccia gira veloce solo su pochi pixel. Così si rispetta Nyquist sul lampeggio anche con YOLO a pochi fps.

## Piano (prima il rischio più grande)
- **Sab 10:30–13:** camera funzionante sulla UNO Q e YOLO che riconosce auto su un video. Se la IMX219 non va, passate subito a una webcam USB. In parallelo: sketch STM32 con Distance, Movement, LED e buzzer.
- **Sab 13–17:** tracker + TTC; riconoscimento della freccia su video registrati da YouTube (dashcam) e su macchinina con LED.
- **Sab 17–20:** stampa 3D della scatola, montaggio e **riprese reali in bici**, se possibile con un'auto di un amico che sorpassa con la freccia.
- **Dom 10–13:** integrazione, taratura delle soglie, interfaccia OLED.
- **Dom 13–15:30:** video di 2 minuti, README con lo schema, repo pubblico, Devpost.

## Divisione del team (2–4 persone)
- **Visione (Python):** YOLO, tracker, TTC, freccia.
- **Firmware (STM32):** sensori, LED, buzzer, Bridge.
- **Meccanica e demo:** scatola 3D, montaggio, macchinina con LED lampeggiante (LED e pulsanti del kit).
- **Pitch e video:** storia, numeri, riprese.

## Demo per la giuria
1. Macchinina che avanza verso la camera: il TTC scende e la LED strip si accende.
2. Si accende il LED arancione lampeggiante sul lato destro della macchinina: "SVOLTA A DESTRA" sull'OLED e buzzer dedicato.
3. Mano vicino al sensore laterale: "sorpasso stretto 0,6 m".
4. Video reale in strada con il riquadro, il TTC e l'allerta sovrapposti.

## Rischi e piani B
- **Camera non compatibile:** webcam USB con hub USB-C.
- **YOLO troppo lento:** risoluzione 256–320, modello int8, oppure riconoscere solo la classe "veicolo".
- **Freccia difficile da vedere di giorno:** in demo usate un LED forte; in strada funziona meglio con poca luce. Dichiaratelo come limite.
- **Tempo che manca:** il TTC con LED e buzzer è già un prodotto completo. La freccia è il "wow" ma va fatta dopo.

## Pitch (30 secondi)
> I radar per bici ti dicono che qualcosa arriva. Ma il ciclista non muore perché un'auto arriva: muore perché un'auto **svolta**. TAU è un copilota posteriore con intelligenza artificiale tutta a bordo. Riconosce il veicolo, calcola tra quanti secondi ti raggiunge con lo stesso principio che usano gli uccelli per evitare gli ostacoli, e si accorge della freccia accesa prima che il camion ti tagli la strada. Avvisa te con un suono e avvisa lui con una luce, nel momento esatto in cui serve.
