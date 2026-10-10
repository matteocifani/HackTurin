# Sistema "cosa arriva da dietro": come renderlo vincente

## L'architettura scelta dal team
- **Bici (reggisella):** Raspberry Pi del team + webcam USB Deltaco rivolta all'indietro + power bank. Il Pi fa girare l'AI.
- **Casco:** Arduino UNO Q con IMU (Modulino Movement), due buzzer sinistro/destro, LED ring posteriore e un pulsante. Power bank in tasca.
- **Collegamento:** Wi-Fi tramite l'hotspot del telefono (UDP o MQTT, latenza di decine di millisecondi).

## Il problema da battere: "esiste già il Garmin Varia"
Il Varia è un radar che ti dice *che* qualcosa arriva e a che velocità. Bipa per ogni veicolo, quindi in città suona di continuo e alla fine lo ignori. Per vincere dovete dimostrare che il vostro sistema **capisce la situazione** e **avvisa solo quando conta**. Queste sono le 4 cose che il radar non può fare.

### 1. Sa COSA arriva (AI sulla webcam)
YOLO nano pre-allenato (classi COCO) distingue auto, bus, camion, moto e bici, senza bisogno di training. Un camion a 2 secondi non è come uno scooter a 2 secondi: il rischio pesa anche il tipo di veicolo.

### 2. Sa QUANTO è vicino il pericolo, senza radar
Tempo all'impatto calcolato da quanto si ingrandisce il riquadro del veicolo: `TTC ≈ w / (dw/dt)`. Non serve calibrare né conoscere la distanza. Dalla posizione laterale del riquadro nel tempo stimate anche **se il veicolo vi passerà largo o stretto**.

### 3. Sa cosa stai per fare TU (il casco) ⭐ il punto più forte
- L'IMU del casco riconosce quando **giri la testa per guardare indietro**, cioè stai per spostarti o svoltare a sinistra.
- Se in quel momento sta arrivando un veicolo veloce che vi passerà stretto, scatta l'**avviso urgente: "FERMO"**. Se la strada dietro è libera, il casco resta in silenzio.
- È un sistema che **incrocia l'intenzione del ciclista con il traffico dietro**. Il radar non sa dove guardi; voi sì.

### 4. Ti dice DA DOVE arriva (suono direzionale)
Due buzzer, uno vicino a ciascun orecchio: il suono viene dal lato da cui passerà il veicolo. Il ritmo accelera con il calare del TTC. È intuitivo e non serve guardare nessuno schermo.

**Bonus all'automobilista:** il LED ring dietro al casco resta tenue e **lampeggia forte solo quando un veicolo arriva pericolosamente**. Fa da luce di stop quando l'IMU sente una frenata.

**Bonus città (City Signals):** ogni "quasi incidente" (TTC basso + passaggio stretto) viene salvato con orario e tipo di veicolo, poi abbinato alla traccia Strava. Ne esce la mappa dei punti in cui i ciclisti di Torino vengono sorpassati male.

## Il punteggio di rischio (la regola esplicita da mostrare)
```
rischio = peso_veicolo (bici 0.3, auto 1, bus/camion 1.5)
        × urgenza (TTC < 4 s → sale fino a 1 a TTC 1 s)
        × traiettoria (passaggio stretto → ×1.5)
        × intenzione (testa girata a sinistra → ×2)
rischio > 1 → bip lato giusto; rischio > 2 → "FERMO" + LED flash
```
Una formula semplice e spiegabile vale più di una scatola nera davanti alla giuria.

## Hardware

**Bici (vostro):** Raspberry Pi, webcam Deltaco, power bank USB, supporto per il reggisella (stampa 3D).

**Casco (kit + inventario):**
- Arduino Uno Q 4gb – 1 (kit)
- Arduino - Modulino movement – 1 (kit)
- Tact Switch – 1 (kit)
- Grove - Passive Buzzer – **2** (sinistro/destro)
- Grove - RGB LED Ring (16-WS2813 Mini) – 1 (o WS2813 strip)
- Grove - Light Sensor (P) v1.1 – 1 (modalità notte: LED più forti, soglie più prudenti)
- Grove shield v2 – 1 (interruttore su 3.3V)
- Grove - Universal 4 Pin Buckled 20cm Cable – 4
- Zip ties, Biadesivo, Elastici
- Bambulab P1S – 1 slot (scatola casco + supporto webcam)

Non servono più: la camera IMX219 e il Media Carrier, perché la webcam va sul Pi. Fanno ormai parte della BOM anche voi: casco, 2 power bank, telefono hotspot.

Note tecniche verificate sulla UNO Q:
- Per il LED ring usate Adafruit_NeoPixel ≥ 1.15.5 (FastLED non compila).
- Il Wi-Fi ospiti blocca App Lab: usate l'hotspot del telefono.
- Il Bridge tra Linux e STM32 accetta al massimo 256 byte per messaggio: mandate solo "rischio, lato, tipo veicolo".

## Velocità dell'AI sul Raspberry
Dipende dal modello di Pi:
- **Pi 5:** YOLOv8n/YOLO11n a 320 px esportato in NCNN fa circa 10–20 fps, ampiamente sufficiente.
- **Pi 4:** circa 3–6 fps. Basta comunque, ma tenete 256–320 px e solo le classi veicolo.

Misurate i fps nella prima ora.

## Piano
- **Sab entro le 13:**
  - Pi + webcam + YOLO che riconosce auto da un video.
  - UNO Q che legge l'IMU e suona i buzzer.
  - Pi e UNO Q che si parlano via hotspot.
- **Sab 13–17:**
  - Tracker + TTC + traiettoria laterale.
  - Riconoscimento "testa girata" dall'IMU.
  - Formula di rischio.
- **Sab 17–20:** supporti 3D, montaggio, **riprese reali in strada** con un'auto amica che sorpassa (larga, stretta, veloce).
- **Dom 10–13:** taratura delle soglie sui video veri, LED ring, modalità notte, log dei quasi incidenti.
- **Dom 13–15:30:** video di 2 minuti, README, repo pubblico, Devpost.

## Demo per la giuria
1. **Monitor dietro al casco con un video di traffico vero:** la webcam lo "vede" come se fosse la strada. Una bici che passa: silenzio. Un camion che arriva veloce: bip a destra sempre più rapido.
2. **Il momento clou:** il compagno col casco gira la testa per svoltare proprio mentre arriva l'auto: "FERMO" e il LED lampeggia. Rifà lo stesso movimento con la strada libera: silenzio.
3. **Slide finale** con il confronto: "il Varia avrebbe suonato 40 volte in questo video, noi 3: quelle giuste". Contate davvero sui vostri video.

## Pitch (30 secondi)
> Ogni ciclista conosce quel momento: devi spostarti a sinistra, giri la testa e non sai se quella macchina ti ha visto. I radar per bici suonano per ogni auto, e dopo dieci minuti nessuno li ascolta più. Il nostro sistema guarda la strada dietro di te con un'AI che gira tutta a bordo: capisce se arriva un camion o una bici, tra quanti secondi e quanto vicino passerà. Il casco sa quando stai per girarti, e solo allora, se c'è pericolo, ti dice "fermo", con un suono che arriva dal lato giusto. Meno allarmi, quelli giusti.

## Rischi
- **Fps bassi sul Pi:** risoluzione più bassa, solo classi veicolo, modello int8.
- **Wi-Fi tra bici e casco:** in demo usate lo stesso hotspot. Come piano B, cavo USB-seriale.
- **Falsi "testa girata" su buche e curve:** usate la velocità angolare di imbardata sopra una soglia per almeno 300 ms.
- **Notte e pioggia:** dichiaratele come limiti; in demo usate i video di giorno.
