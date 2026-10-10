# Dispositivo posteriore per bici — valutazione di fattibilità

> Documento dell'architettura precedente. Il nuovo riferimento è `MVP-BICI-CASCO.md`, con Raspberry Pi sulla bici e UNO Q sul casco.

Data: 10 ottobre 2026.
Stato: nuova direzione richiesta dal team; requisito confermato di presenza/non presenza, senza stima dell'avvicinamento. Dettagli dell'MVP ancora da concordare. Valutazione documentale, senza prove sull'hardware; materiale in attesa di consegna dagli organizzatori.

## Nuova proposta del team

- Scheda e sensori montati sul retro del sellino/bici.
- Sensori di prossimità per rilevare la presenza di oggetti nella zona monitorata, inclusi oggetti fermi.
- Tre settori: sinistra, centro, destra rispetto al ciclista.
- Webcam per riconoscere la categoria dell'oggetto.
- Indicazione della coppia categoria/settore tramite schermo o tre indicatori colorati.

## Esito preliminare

Fattibile come demo indoor controllata con Arduino UNO Q 4 GB, webcam compatibile e copertura di prossimità adeguata ai tre settori. Il supporto software per object detection su webcam USB esiste già in Arduino App Lab. Non sono ancora dimostrati latenza, accuratezza, compatibilità della webcam concreta o funzionamento su strada.

Aggiornamento del team: un Modulino Distance e un HC-SR04 confermati come disponibilità prevista; un secondo Modulino possibile e tre Modulino complessivi potenzialmente recuperabili. Webcam indicata come Deltaco 2K QHD. Tutto il materiale è in attesa di consegna: la versione completa a tre settori dipende dal numero di sensori effettivamente ricevuti.

## Architettura candidata

- Retro bici: webcam e tre sensori di distanza solidali, UNO Q, alimentazione.
- Microcontrollore della UNO Q: acquisizione delle distanze, validità, soglie e comando indicatori.
- Processore Linux della UNO Q: acquisizione video, object detection, associazione con i settori e comunicazione interna tramite Bridge.
- Manubrio: indicatori o schermo visibili al ciclista. Preferenza iniziale per collegamento cablato; protocollo, livelli elettrici e lunghezza da verificare in base all'indicatore scelto.
- Webcam e modello già inizializzati; evitare l'avvio completo dell'inferenza al primo allarme. Il sensore abilita l'avviso e si associa a risultati visivi recenti.

## Vincoli principali

### Copertura

Un Modulino Distance fornisce una misura in un settore stretto: non misura tre settori simultaneamente. Per questa soluzione servono tre sensori orientati separatamente: tre Modulino oppure due Modulino e un HC-SR04. Con un Modulino e un HC-SR04 si possono misurare due settori, non tre. Tre sensori stretti producono tre zone osservate, non un semicerchio pieno: orientamento, intervalli non coperti e sovrapposizioni vanno verificati.

Il VL53L4CD documentato ha portata circa 1,2 m e FoV diagonale di 18°. Il comune HC-SR04 a 5 V ha portata nominale 2 cm–4 m; la variante concreta e le prestazioni vanno verificate. La demo resta a distanza ravvicinata. La webcam può vedere più lontano, ma se l'avviso richiede il trigger di prossimità resta limitato dalla portata del sensore del relativo settore.

Nella configurazione mista si propone HC-SR04 centrale e Modulino laterali, per mantenere simmetrici i due lati. Per la prima demo usare la stessa soglia, indicativamente 80 cm da validare, senza sfruttare la portata maggiore dell'ultrasuono. Una soglia uguale non rende identiche le coperture e le risposte dei sensori: calibrazione separata.

L'HC-SR04 usa Trig/Echo su GPIO, non il bus I2C. Per la variante classica a 5 V prevedere adattamento del segnale Echo al dominio 3,3 V con partitore o traslatore; verificare anche il livello di comando Trig e il pin scelto sulla UNO Q. Esistono varianti HC-SR04 a 3,3 V: non assumere quale verrà consegnata. Riservare due resistenze per il possibile partitore, con valori da definire prima del cablaggio.

I sensori condividono l'indirizzo I2C iniziale 0x29: prevedere inizializzazione separata tramite XSHUT e assegnazione degli indirizzi, oppure un multiplexer compatibile. Il multiplexer non è confermato nell'inventario. Non basta collegare tre unità in cascata.

### Associazione distanza/oggetto

Occorre calibrare nell'immagine le regioni osservate dai tre sensori, con webcam e sensori fissati insieme. La prossimità di un settore e una detection nella stessa regione non garantiscono che si tratti dello stesso oggetto: un ostacolo vicino può coesistere con un veicolo lontano.

Per la prima demo si propone un solo bersaglio alla volta, a bassa velocità, con sfondo semplice e bici ferma. Se il sensore rileva presenza ma l'associazione visiva è assente, ambigua o scaduta, mostrare "oggetto non identificato". Non scegliere automaticamente il riquadro più grande o la classe con confidenza maggiore come oggetto più vicino.

La corrispondenza tra sinistra/destra nell'immagine posteriore e sinistra/destra del ciclista va verificata fisicamente, includendo eventuali immagini specchiate.

### Presenza/non presenza — requisito confermato

Il team richiede esclusivamente presenza/non presenza entro soglia per ciascun settore. Un oggetto fermo deve continuare a risultare presente. Velocità relativa, direzione del movimento, tracking finalizzato all'avvicinamento e tempo alla collisione sono fuori scope.

La classificazione visiva arricchisce lo stato di presenza: se il sensore rileva un ostacolo e la webcam non lo identifica, lo stato resta "presente, non identificato". Gestire separatamente guasti e dati non validi/scaduti: non equivalgono a "non presente". Usare isteresi e un breve filtro temporale per stabilizzare lo stato, senza richiedere movimento.

### Classi e indicazione

Classi candidate: persona, bicicletta, auto; fallback "non identificato". Verificare le etichette del modello installato e il riconoscimento nelle inquadrature reali. Una persona rilevata non implica automaticamente un pedone: un ciclista può generare detection separate di persona e bici.

Tre punti che cambiano colore richiedono LED RGB/indicatori multicolore, non tre LED monocromatici. Nell'inventario sono presenti ring/striscia RGB e display OLED: selezione e compatibilità elettrica da verificare. Un display consente di esplicitare classe, settore e stati incerti.

Con più oggetti nello stesso settore un solo indicatore non può rappresentare tutte le classi: la prima demo evita il caso; estensioni richiedono una regola esplicita o uno schermo. Distinguere stato operativo, dato scaduto e guasto da assenza di rilevamento.

## Alternative

1. Tre Modulino più webcam su UNO Q: opzione preferita per uniformità, subordinata alla consegna di tre sensori e alla prova di associazione.
2. Due Modulino laterali e HC-SR04 centrale: opzione concreta a tre settori, con cablaggio misto e calibrazione distinta.
3. Un Modulino e un HC-SR04: demo limitata a due settori misurati. Un eventuale terzo settore soltanto visivo va dichiarato tale, senza attribuirgli una misura di prossimità.
4. Webcam su computer e sensori su UNO Q: fallback per dimostrare la logica se l'inferenza locale non soddisfa i tempi; non è un prototipo autonomo.

## Webcam comunicata dal team

Deltaco 2K QHD. La descrizione corrisponde a un prodotto Deltaco W-200, ma il codice sull'unità deve confermare l'identificazione. La scheda Deltaco per W-200 dichiara FoV diagonale 78° e fuoco fisso da 30 cm. Non assumere compatibilità Linux/UVC verificata: controllare enumerazione USB e acquisizione video sulla UNO Q alla consegna.

Per il primo test partire da una modalità video più leggera tra quelle effettivamente esposte dalla webcam, per esempio 640×480 o 1280×720 se disponibili, adattando poi l'immagine all'ingresso del modello. Non confondere i frame al secondo della webcam con quelli dell'inferenza. Ricontrollare l'inquadratura dopo eventuali cambi di modalità o ritagli.

## Materiale da confermare

- Codice esatto della Deltaco 2K QHD, funzionamento USB/Linux e modalità video effettivamente disponibili.
- Numero effettivo di Modulino Distance consegnati e variante dell'HC-SR04.
- Hub USB-C con porte USB e ingresso di alimentazione compatibile: richiesto dall'esempio ufficiale per UNO Q con webcam USB.
- Alimentazione 5 V / 3 A indicata dall'esempio Arduino, considerando anche consumo delle periferiche; power bank e autonomia non verificati.
- Cavi Qwiic, accesso ai pin XSHUT, jumper e resistenze/traslatore per HC-SR04, supporti rigidi, cablaggio verso il manubrio e indicatore scelto.
- Tempo residuo dell'hackathon e competenze disponibili.

## Prove proposte prima di impegnarsi sull'MVP completo

1. Avviare l'esempio ufficiale sulla UNO Q con la webcam effettiva; verificare etichette, riquadri e latenza nelle scene previste.
2. Collegare un sensore e dimostrare la coppia presenza/classe con un solo bersaglio. Provare anche oggetto non riconosciuto e oggetto vicino con altro oggetto lontano nello sfondo.
3. Verificare i Modulino sul bus I2C e l'eventuale HC-SR04 sui GPIO, quindi calibrare la mappa dei settori nell'immagine.
4. Misurare il tempo dall'ingresso nella zona al primo avviso e alla successiva classe; provare permanenza dell'oggetto fermo, entrata, uscita, cambio settore e scollegamento della webcam/sensore.
5. Verificare riconoscimento da distanza ravvicinata: una persona o un veicolo possono occupare gran parte dell'immagine. Non assumere che una miniatura o foto validi il comportamento con oggetti reali.

## Fonti

- Inventario fornito dal team: https://docs.google.com/spreadsheets/d/1PvS6k1NpJ_NDBajdZHSybFE0vQDN1Z_sUnZF2HBoCL8/edit?gid=1584658223
- UNO Q: https://docs.arduino.cc/tutorials/uno-q/user-manual/
- Esempio ufficiale webcam: https://github.com/arduino/app-bricks-examples/blob/main/inspirational/common/video-generic-object-detection/README.md
- Output del detector: https://github.com/arduino/app-bricks-py/blob/main/src/arduino/app_bricks/video_objectdetection/README.md
- Modello per UNO Q: https://github.com/arduino/app-bricks-py/blob/main/src/arduino/app_bricks/video_objectdetection/brick_config.yaml
- Indirizzi e XSHUT: https://docs.arduino.cc/resources/datasheets/ABX00102-datasheet.pdf
- Portata e FoV: https://www.st.com/en/imaging-and-photonics-solutions/vl53l4cd.html
- HC-SR04 classico: https://www.sparkfun.com/ultrasonic-distance-sensor-hc-sr04.html
- Deltaco W-200 (identificazione da confermare): https://www.deltaco.lv/lven/webcam-deltaco-2k-qhd-webcam-with-360-rotation-up-down-tilt-2mp-black-w-200-1902913.html
