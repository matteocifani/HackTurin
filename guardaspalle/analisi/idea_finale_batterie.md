# FireGuard (nome provvisorio): il guardiano della ricarica di e-bike e monopattini

## Il problema, con i numeri
- **Londra:** 206 incendi di e-bike e monopattini nel 2025, record assoluto (erano 5 nel 2018). Uno ogni due giorni. [London Fire Brigade](https://www.london-fire.gov.uk/news/2026-news/january/record-number-of-e-bike-and-e-scooter-fires-across-london-in-2025-as-brigade-calls-for-regulation-to-be-introduced)
- **Regno Unito, dati governativi 2024:** il **39% degli incendi avviene durante la ricarica** (49% per le bici "convertite" con kit) e il 66% in casa. [OPSS](https://internationalfireandsafetyjournal.com/nearly-half-of-e-bike-fires-in-2024-linked-to-post-market-conversions/)
- **New York:** 268 incendi e 18 morti nel 2023. [FDNY](https://www.nyc.gov/site/fdny/news/03-25/fdny-commissioner-robert-s-tucker-significant-progress-the-battle-against-lithium-ion-battery-fires)
- **Italia:** non ci sono statistiche nazionali, ed è già un dato. I casi però ci sono: Bolzano 2024, appartamento distrutto da una e-bike in carica ([l'Adige](https://www.ladige.it/territori/alto-adige-sudtirol/mette-in-carica-la-batteria-della-bici-esplosione-e-incendio-appartamento-distrutto-twq5fa9q)); Pioltello dicembre 2025, persone salvate con l'autoscala ([Il Giorno](https://www.ilgiorno.it/milano/cronaca/pioltello-incendio-jgc3x2sb)). Alcune istituzioni hanno vietato la ricarica al chiuso, per esempio l'Università di Genova nel 2024.
- **Chi rischia di più:** rider delle consegne (fat-bike modificate, batterie economiche comprate online, ricarica notturna in casa), condomini con cantine e garage. A Londra **nessuno dei 5 morti era il proprietario della bici**: è un rischio per i vicini.

## Perché le soluzioni di oggi non bastano
- **Il rilevatore di fumo** suona solo quando la fuga termica è già partita. Nei test UL una camera da letto chiusa va in flashover in **circa 30 secondi** dalla comparsa dei gas visibili. [FSRI](https://fsri.org/research-update/journal-article-quantifies-fire-hazards-lithium-ion-battery-fires-caused-thermal)
- **Le borse e gli armadi ignifughi** sono passivi e costano molto: un armadio da 7 posti costa circa 6.500 £ e ha solo un rilevatore di fumo.
- **I rilevatori di gas professionali** (Li-ion Tamer) sono per i grandi impianti di accumulo e costano su preventivo. **I chip dentro la batteria** (BatteryIQ, Honeywell BES) funzionano solo sulle batterie nuove progettate apposta.
- **Il buco:** non esiste un dispositivo economico, che funzioni con **qualsiasi caricatore e qualsiasi bici già in circolazione**, che senta i primi segnali, **stacchi la ricarica** e avvisi il palazzo.

## La scienza: c'è un preavviso, e il vostro sensore lo vede
- Prima di prendere fuoco una cella **sfiata**: rilascia vapori di elettrolita, idrogeno e CO2. Nel caso più comune in ricarica, il sovraccarico, lo sfiato anticipa la fuga termica di **da 45 secondi a diversi minuti**. [Essl et al. 2021](https://www.mdpi.com/2313-0105/7/2/25)
- In un pacco batterie in sovraccarico l'idrogeno è stato rilevato **7–10 minuti prima del fumo**, quando la superficie era ancora a 35 °C. [Jin et al., Joule 2020](https://web.stanford.edu/group/cui_group/papers/Yang_Cui_JOULE_2020.pdf)
- Nei test di Sandia, staccare la ricarica al primo allarme ha **evitato la fuga termica**. [Sandia](https://www.sandia.gov/ess-ssl/wp-content/uploads/2021/ESSRF/18_Frank_Nick_S6.pdf)
- **Il dato chiave:** lo studio di Essl et al. ha testato **proprio il Sensirion SGP30, quello dell'inventario**. I segnali grezzi H2 ed etanolo hanno reagito allo sfiato reale della cella **entro 10 secondi**.
- **Limite da dichiarare:** se la batteria va in corto interno, per esempio dopo un urto, sfiato e incendio sono quasi contemporanei. Lì il dispositivo guadagna solo secondi: abbastanza per l'allarme, non per prevenire.

## Il dispositivo
Una scatola da appoggiare o fissare sopra la bici o la batteria in carica, con il caricatore collegato attraverso di essa.

**Tre sensi**
1. **Naso (SGP30):** segnali grezzi H2/etanolo letti ogni secondo, compensati con l'umidità dell'AHT20. Allarme su un salto rispetto alla linea di base.
2. **Occhio termico (MLX90621, 16×4 pixel):** temperatura della batteria e del caricatore, e soprattutto **velocità di riscaldamento** (°C/min). Su custodie in alluminio va messo un pezzo di nastro nero.
3. **Polso elettrico (ACS70331):** la curva di ricarica. A batteria piena la corrente deve calare. Se non cala, o se entra più energia di quella che la batteria può contenere, vuol dire caricatore sbagliato, BMS guasto o sovraccarico.

**Il cervello (UNO Q)**
- **STM32:** legge i sensori e **comanda il relè di sicurezza**. La sicurezza non dipende da Linux.
- **Linux:** un modello di **anomalia** impara come è fatta una ricarica *normale* per quella bici (corrente, temperatura, gas) e segnala quando la ricarica se ne discosta. Nessun dato di guasti reali serve per allenarlo. In più: dashboard web, avviso vocale e notifica sul telefono (Telegram).
- **Escalation a tre livelli:** sospetto → avviso sul telefono; anomalia confermata → **stacco della ricarica** + allarme vocale; sfiato → sirena + LED rossi + notifica a tutto il condominio.

## Demo sicura per la giuria (niente batterie vere)
- **Batteria finta** stampata in PETG (il PLA si ammorbidisce a circa 60 °C), con dentro una fonte di calore controllata (borsa dell'acqua calda, scaldamani o resistenza su MOSFET) e un tamponcino di alcol isopropilico che simula lo sfiato.
- **Ricarica simulata a 5 V:** alimentatore USB come "caricatore" e LED o resistenze come carico. La corrente scende normalmente e poi, nello scenario guasto, "non finisce mai".
- **Tre scenari dal vivo:** 1) sovraccarico, 2) "sfiato", cioè avvicinare l'alcol, 3) punto caldo. Ognuno termina con **clic del relè, voce "Ricarica interrotta: possibile guasto della batteria", notifica sul telefono**.
- **Schermo con la timeline:** "FireGuard ha staccato qui" e, molti minuti dopo, "qui avrebbe suonato il rilevatore di fumo".
- **Onestà:** l'alcol attiva lo stesso sensore come farebbe l'elettrolita, ma non è la stessa sostanza. Ditelo: è un punto di forza davanti a giudici tecnici.

## BOM
Kit: UNO Q, pulsanti, LED, jumper. Le Modulino servono poco qui.

Dall'inventario:
- Grove - VOC and eCO2 Gas Sensor - SGP30 – 1
- Grove - Thermal Imaging Camera 60° FOV – 1
- Grove - AHT20 I2C Industrial Grade Temperature and Humidity Sensor – 1
- Grove - 2.5A DC Current Sensor(ACS70331) – 1
- Grove - Relay High current 5V/10A – 1
- Grove - MOSFET – 1
- Grove - Passive Buzzer – 1
- Grove - MP3 Module V4.0, UART Interface – 1 (opzionale: va bene anche la voce dal lato Linux)
- Grove - OLED Display 0.96" – 1
- Grove - RGB LED Ring (16-WS2813 Mini) – 1 (o la WS2813 strip)
- Grove shield v2 – 1 (interruttore su 3.3V)
- Grove - Universal 4 Pin Buckled 20cm Cable – 6
- Resistenze – qualche valore di potenza per il carico finto
- Bambulab P1S – 1 slot (scatola + batteria finta in PETG)

Da portare: hub USB-C alimentato con alimentatore da almeno 15 W, telefono come hotspot (il Wi-Fi ospiti rompe App Lab), alcol isopropilico, scaldamani o borsa dell'acqua calda.
Non servono più: camera IMX219 e Media Carrier, e così sparisce il rischio tecnico più grosso.

## Piano
- **Sab entro le 13:** tutti i sensori letti dallo STM32 (fate subito uno scanner I2C, e se una libreria non compila scrivete il codice Wire a mano). Dati inviati a Linux col Bridge (massimo 256 byte per messaggio). Relè che scatta su una soglia.
- **Sab 13–18:** batteria finta + carico; registrazione di ricariche "normali"; regole a soglia per tutti e tre i sensi; prima dashboard.
- **Sab 18–21:** modello di anomalia sulla ricarica normale; voce + Telegram.
- **Dom 10–13:** taratura, scatola stampata, prove ripetute dei tre scenari (misurate i secondi di reazione: sono i vostri "numeri").
- **Dom 13–15:30:** video di 2 minuti, README con schema e fonti, repo pubblico, Devpost.

## Pitch (30 secondi)
> Ogni notte in Italia milioni di batterie di e-bike e monopattini si ricaricano in case, cantine e garage. A Londra ne prende fuoco una ogni due giorni, e chi muore spesso non è il proprietario: è il vicino. Il rilevatore di fumo suona quando è già troppo tardi. Una batteria che sta per incendiarsi però avvisa: rilascia vapori minuti prima della fiamma. FireGuard li annusa, guarda il calore e ascolta la corrente di ricarica. Con un'AI che gira tutta a bordo capisce quando la ricarica non è normale e **stacca la corrente prima che sia troppo tardi**. Costa quanto un caricatore e funziona con qualsiasi bici.

## Challenge
City Signals (Torino: condomini, cantine, rider). Il fatto che "la tecnica supera il brief" vi copre comunque.

## Alternativa se volete la camera: guardia dei binari del tram
Torino ha la rete tranviaria più vecchia d'Italia: circa 88 km di linee e 167–220 km di binari. In uno studio su Toronto e Vancouver, a Toronto il 32% dei ciclisti feriti era caduto per colpa dei binari, soprattutto con la ruota incastrata. Non esiste nessun dispositivo lato bici. La camera riconosce i binari (OpenCV) e avvisa se li state attraversando con un angolo troppo stretto. È originale e molto "torinese", ma il rischio tecnico è più alto (camera, pioggia, notte) e non è provato che un avviso eviti le cadute.
