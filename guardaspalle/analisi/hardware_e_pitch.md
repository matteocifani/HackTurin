# Bici sensorizzata – hardware da chiedere e pitch

## Casco o bici?

**Consiglio: montare l'elettronica sulla bici**, non sul casco.

- Il kit dell'hackathon è basato su **Arduino UNO Q** (scheda formato Uno, con Linux + microcontrollore): è grande e consuma parecchio, va alimentata a 5 V USB-C con un power bank. Sul casco sarebbe pesante e scomodo; sul telaio/reggisella sta benissimo.
- Il PDF usava una scheda minuscola (SparkFun nRF52840) che **non è nella lista**: replicarlo identico sul casco non è realistico con questo materiale.
- Sulla bici il sensore di distanza punta stabilmente verso il lato del sorpasso (sul casco cambia direzione ogni volta che giri la testa) e la luce posteriore è dove la vedono le auto.
- Si perde solo la funzione "distrazione del ciclista" (inclinazione della testa). Se volete tenerla, è l'unica cosa da mettere sul casco in una fase 2.

## Hardware da chiedere (dalla lista dell'evento)

| Componente | Qtà | A cosa serve |
|---|---|---|
| Arduino UNO Q 4 GB | 1 (già nel kit) | Cervello: lato MCU legge i sensori, lato Linux fa girare l'AI locale e parla col telefono via Bluetooth/Wi-Fi |
| Modulino Movement (IMU 6 assi) | 1 (già nel kit) | Rilevamento caduta/urto e frenate brusche (come l'IMU del PDF) |
| Modulino Distance (ToF) | 1 nel kit, **chiedetene 2** se possibile | Distanza laterale dell'auto che sorpassa. Portata ~1,2 m: qualunque rilevamento è già sotto il limite di legge di 1,5 m |
| Modulo fotocamera 8MP Sony IMX219 | 1 | Telecamera posteriore: riconoscimento veicoli in avvicinamento con AI locale (punto forte per la giuria) |
| Arduino Uno Media Carrier | 1 | Dà i connettori camera MIPI-CSI alla UNO Q |
| Grove – WS2813 RGB LED Strip 1 m | 1 | Luce posteriore intelligente: lampeggia quando arriva un'auto, rossa in frenata |
| Grove – Passive Buzzer | 1 | Avviso sonoro al ciclista (auto troppo vicina, conferma allarme) |
| Tact Switch | 2 | "Sto bene" per annullare l'allarme caduta, e SOS manuale |
| Grove Shield v2 | 1 | Collegare buzzer, LED e pulsanti senza saldare |
| Grove – Universal 4 Pin 20 cm Cable | 4 | Cablaggio Grove |
| Breadboard Jumper Wire M-F / M-M | 10 + 10 | Prototipazione |
| Grove – OLED 0.96" (opzionale) | 1 | Mini display sul manubrio per debug/demo |
| Zip ties, biadesivo, nastro isolante | q.b. | Fissaggio su telaio |
| Stampante 3D (Bambu P1S) | slot | Scatola per UNO Q e supporto camera sul reggisella |

## Da procurare voi / non in lista

- **Power bank USB-C (5 V, almeno 3 A)**: la UNO Q non si alimenta bene dalla LiPo 1000 mAh della lista (servirebbe uno step-up, che non c'è). Il manuale chiede comunque a ogni team un alimentatore USB-C.
- **Una bici** (o almeno una ruota/telaio per la demo) e, se fate la fase 2, un casco.
- **GPS**: non c'è un modulo GPS in lista. Usate il GPS dello smartphone, come nel PDF, via Bluetooth o tramite un'app/web app.
- **Compatibilità camera**: verificate subito con lo staff che la IMX219 (venduta per Raspberry Pi 5) funzioni con UNO Q + Media Carrier. Piano B: una webcam USB vostra con hub USB-C.

## Pitch (prima scelta)

**Challenge consigliata: City Signals** ("hardware e AI locale per migliorare la vita a Torino"), perché il progetto trasforma ciò che succede in strada in dati e azioni utili per la città.

> **[Nome, es. "Occhio Ciclista"] – la bici che vede le auto e segnala le strade pericolose di Torino.**
>
> La distrazione è la prima causa di incidenti in bici e il momento più pericoloso è il sorpasso: dal 2024 la legge impone 1,5 m, ma nessuno lo misura. Il nostro dispositivo si monta su qualsiasi bici. Una telecamera posteriore con AI che gira interamente a bordo riconosce i veicoli in arrivo, un sensore laterale misura quanto vicino passano e una luce posteriore intelligente si accende per farsi vedere proprio quando serve. Se il ciclista cade, l'IMU rileva l'urto e, se lui non preme "sto bene", il telefono invia la posizione ai contatti di emergenza.
>
> Ogni sorpasso troppo stretto, frenata brusca o caduta viene registrato con la posizione: messi insieme, questi eventi diventano una mappa dei punti pericolosi di Torino da dare al Comune per decidere dove servono piste ciclabili e controlli.
