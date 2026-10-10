# Casco "Binario" (nome provvisorio): il casco che ti salva dai binari del tram

## L'idea
Un casco per ciclisti con camera e AI a bordo. La funzione principale, che **nessun casco in commercio ha**, è riconoscere i binari del tram davanti a te e avvisarti se li stai per attraversare con un angolo troppo stretto, cioè quando la ruota rischia di incastrarsi. In più il casco rileva la caduta e invia l'SOS, come nel PDF di partenza.

## Il problema, con i numeri
- **Torino ha la rete tranviaria più vecchia d'Italia:** circa 88,5 km di linee e 167–220 km di binari. [Wikipedia](https://it.wikipedia.org/wiki/Rete_tranviaria_di_Torino)
- **Toronto:** il **32% dei ciclisti feriti** era caduto per colpa dei binari, nell'80% dei casi con la ruota incastrata nella gola. Studio Teschke, BMC Public Health 2016. [UofT](https://www.utoronto.ca/news/cyclists-doors-and-streetcar-tracks)
- **Edimburgo:** 191 feriti tra il 2009 e il 2016 e un morto nel 2017. [STV](https://archive.news.stv.tv/east-central/1407254-nearly-200-cyclists-hurt-in-edinburgh-tram-line-crashes.html)
- **Dublino:** in 2 anni, in uno solo dei 6 pronto soccorso, 48 pazienti; il 60% con fratture e il 14% operati. [Ir J Med Sci](https://link.springer.com/article/10.1007/s11845-022-03254-w)
- **Bologna:** i nuovi binari stanno già causando cadute (2025–2026). [Carlino](https://www.ilrestodelcarlino.it/bologna/cronaca/incidente-bici-binari-tram-cxcea99f)
- **Italia 2025:** 198 ciclisti morti (+20%) e 25 morti in monopattino. Nel 32% dei morti in monopattino non c'è nessun altro veicolo coinvolto. [ISTAT](https://www.istat.it/wp-content/uploads/2026/07/REPORT_INCIDENTI_STRADALI_2025.pdf)
- **Le soluzioni di oggi** riguardano solo l'infrastruttura. Zurigo ha provato a riempire la gola dei binari e non ha trovato "nessuna soluzione soddisfacente". [EBP](https://www.ebp.ch/en/node/771) **Lato bici o casco non esiste nulla.**

## Come funziona
1. **Vede i binari (camera IMX219 + Python/OpenCV sulla UNO Q)**
   - L'IMU dà l'inclinazione della testa. Con questa l'immagine si trasforma in vista dall'alto ("bird's-eye").
   - Canny + Hough trovano le linee. Si tengono solo **coppie di linee parallele a circa 1,44 m** di distanza (scartamento dei binari): così una striscia pedonale o un marciapiede non fanno scattare l'allarme.
   - **Upgrade:** un piccolo modello Edge Impulse allenato sui video dei binari di Torino che girate sabato. App Lab lo supporta in modo nativo.
2. **Calcola l'angolo di attraversamento**
   - Angolo tra i binari e la direzione di marcia (l'asse della camera quando guardi avanti).
   - Il giroscopio sa quando giri la testa, e in quel momento l'avviso viene sospeso per evitare falsi allarmi.
3. **Avvisa**
   - Binari a meno di circa 3 m e angolo sotto i 30–45°: bip vicino all'orecchio con ritmo crescente.
   - **Modalità binario bagnato** (umidità alta o buio): soglia più severa, perché la ruota slitta anche sul binario bagnato, oltre a incastrarsi.
4. **Caduta + SOS**
   - Picco di accelerazione + casco fermo e inclinato: 30 secondi per premere "sto bene", poi messaggio Telegram ai contatti (App Lab ha il blocco Telegram).
   - LED ring posteriore lampeggiante per farsi vedere.
5. **Dati per la città**
   - Ogni attraversamento viene registrato con angolo e orario. Abbinato alla traccia Strava del telefono, diventa una **mappa degli incroci con i binari pericolosi** da dare al Comune o a GTT.

## Dove va l'hardware sul casco
- **Davanti:** camera IMX219 rivolta avanti e un po' in basso.
- **Dietro:** scatola stampata in 3D con UNO Q + Media Carrier, Modulino Movement fissato rigido, LED ring rivolto all'indietro, buzzer vicino all'orecchio.
- **Power bank** in tasca o in uno zainetto, con cavo USB-C da 3 A: sul casco sarebbe troppo pesante.
- È un prototipo dimostrativo. Nel video dichiarate che la versione finale va integrata nella calotta, come proponeva il PDF.

## BOM

**Kit del team:** Arduino Uno Q 4gb, Arduino - Modulino movement (IMU), Tact Switch ("sto bene"), jumper.

**Dall'inventario:**
- Modulo fotocamera 8MP Sony IMX219 Per Rasberry Pi 5 – 1
- Arduino Uno Media Carrier – 1
- Grove - Passive Buzzer – 1
- Grove - RGB LED Ring (16-WS2813 Mini) – 1 (in alternativa WS2813 strip)
- Grove - AHT20 I2C Industrial Grade Temperature and Humidity Sensor – 1 (modalità bagnato)
- Grove - Light Sensor (P) v1.1 – 1 (modalità buio)
- Grove shield v2 – 1 (interruttore su 3.3V)
- Grove - Universal 4 Pin Buckled 20cm Cable – 4
- Biadesivo – 1, Zip ties – 10, Elastici – qualcuno
- Bambulab P1S – 1 slot (supporto camera + scatola posteriore)

**Da portare / verificare:**
- **Un casco** da sacrificare.
- **Power bank USB-C PD** da almeno 15 W + cavo da 3 A. Cavi sottili causano riavvii continui.
- **Telefono come hotspot:** il Wi-Fi ospiti blocca App Lab.
- **Cavo camera:** chiedete allo staff se serve un adattatore da 22 a 15 pin per la IMX219 e prendetene uno lungo. Abilitate la camera in App Lab ≥0.8 (Settings, oppure `arduino-linux-config carrier enable media-carrier camera0=type1-2lanes` e riavvio).

## Piano
- **Sab entro le 13 (il rischio più grande prima):** camera funzionante sulla UNO Q e frame letti in Python. IMU letta dallo STM32 e inviata col Bridge. Buzzer e LED funzionanti. Se la camera non va entro le 13, piano B: webcam USB con hub alimentato.
- **Sab 13–15:** **uscite a filmare i binari di Torino** con la camera del casco o col telefono, a diversi angoli e su asfalto e pavé. Sono il dataset e il materiale per il video.
- **Sab 15–21:** riconoscimento binari (bird's-eye + Hough + filtro scartamento), calcolo angolo, logica di avviso. In parallelo: stampa supporti, caduta + Telegram.
- **Dom 10–13:** prove sui video veri, taratura soglie, modalità bagnato, log degli attraversamenti. Se avanza tempo: modello Edge Impulse.
- **Dom 13–15:30:** video di 2 minuti, README con schema e fonti, repo pubblico, Devpost.

## Divisione del team
- **Visione (Python/OpenCV):** binari e angolo.
- **Firmware (STM32):** IMU, caduta, buzzer, LED, Bridge.
- **Meccanica:** supporti 3D, cablaggio sul casco, power bank.
- **Dati e pitch:** riprese in strada, video, mappa, slide.

## Demo per la giuria
- **Binari finti sul tavolo o sul pavimento:** due strisce di nastro argentato parallele. Un compagno col casco ci "cammina sopra". Se le attraversa dritto: silenzio. Se le attraversa in diagonale: bip sempre più veloce e sullo schermo "ANGOLO 22° – PERICOLO".
- **Video reale** girato a Torino, con i binari evidenziati e l'angolo in sovrimpressione.
- **Caduta:** il casco cade a terra, il LED lampeggia e dopo 30 s arriva il messaggio Telegram sul telefono del giudice.

## Pitch (30 secondi)
> A Torino ci sono più di 80 chilometri di linee tranviarie, e per un ciclista ogni binario è una trappola: a Toronto un ciclista ferito su tre era caduto per colpa dei binari. Nessuno ha risolto il problema lato ciclista: le città hanno provato a cambiare i binari, senza successo. Noi abbiamo cambiato il casco. Binario vede i binari davanti a te, calcola con che angolo li stai per attraversare e ti avvisa prima che la ruota si incastri. Se cadi comunque, chiama aiuto da solo. E ogni attraversamento diventa un dato: la mappa degli incroci più pericolosi di Torino.

## Rischi e limiti da dichiarare
- **Pioggia, notte e pavé** rendono il riconoscimento più difficile: testate e dichiarate i limiti.
- **Nessuno ha ancora dimostrato** che un avviso eviti le cadute sui binari. Proponetelo come prossimo passo da studiare con i dati raccolti.
- **Peso e ingombro** del prototipo: va integrato nella calotta in una versione futura.
