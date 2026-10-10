# Handoff — revisione MVP bici e casco

Snapshot: 10 ottobre 2026. Prossima sessione: completare la discussione di fattibilità e poi produrre il documento di requisiti. Non è ancora richiesta l'implementazione.

## Intento e nuove indicazioni dell'utente

L'utente ha chiesto di leggere `MVP-BICI-CASCO.md` e rivedere il progetto con:

- Arduino UNO Q posizionata sulla bici.
- Modulino Movement per «altitude estimation / fall detection», riutilizzando il lavoro del PDF locale senza reinventare l'algoritmo.
- Cellulare come webcam che trasmette alla board tramite Arduino IoT.
- Object detection eseguita dalla board; categorie associate a colori.
- Striscia LED sulla visiera del casco che mostra il colore della categoria rilevata.
- Se fattibile, accensione del solo settore destro/centrale/sinistro corrispondente alla posizione dell'oggetto nell'immagine.

L'utente vuole **discutere prima la fattibilità e poi scrivere i requisiti**. Ha interrotto soltanto per il limite della finestra, chiedendo questo snapshot nella directory corrente. Questa scelta esplicita prevale sulla destinazione temporanea predefinita della skill handoff.

## Artefatti da leggere e stato

- `MVP-BICI-CASCO.md`: documento precedente, letto integralmente e **non modificato**. Contiene Raspberry Pi sulla bici, UNO Q sul casco, webcam USB e sensori di distanza: queste scelte non rappresentano la nuova richiesta. Riutilizzare solo ciò che resta coerente, senza presentare le vecchie decisioni come ancora confermate.
- `RICERCA-FATTIBILITA.md`: note create in questa sessione; raccoglie i riscontri ufficiali con link su IoT Remote, App Lab, bounding box, Movement e UNO Q. Leggerlo per evitare di ripetere la ricerca. Sono note, non requisiti approvati.
- `Casco_sensorizzato latex.pdf`: fonte del lavoro precedente, 27 pagine. Rilevanti §4.2–4.3, pp. 13–20; Figura 15 a p. 20. Testo estratto e pagine 18–20 anche ispezionate visivamente.
- `SCOPE.md`, `FATTIBILITA-BICI.md`, `VERIFICA-WEBCAM-UNO-Q.md`: documenti storici; non assumere che descrivano il nuovo MVP.

Non sono stati scritti codice, nuovi requisiti o un piano di implementazione. Nessuna prova hardware o modifica alle schede è stata eseguita.

## Esito della discussione finora

È stata presentata all'utente una valutazione positiva della fattibilità come demo, inclusa la divisione SX/centro/DX. Il supporto ufficiale al telefono tramite **Arduino IoT Remote** è stato verificato: non confonderlo con un flusso video attraverso Arduino Cloud. Fonti e dettagli tecnici sono già in `RICERCA-FATTIBILITA.md`.

Sono state avanzate le seguenti **proposte non ancora confermate**:

- Partire dall'esempio App Lab «Detect Objects on Smartphone Camera».
- Includere già i tre settori, ricavati dal centro del riquadro; verificare orientamento/specchiatura della camera e corrispondenza con i lati del ciclista.
- Usare una striscia indirizzabile o tre segmenti indipendenti; breve stabilizzazione delle indicazioni.
- Mantenere inizialmente persona/bicicletta/auto dal vecchio documento, verificando le categorie effettive del modello; demo iniziale con un bersaglio alla volta.
- Cavo UNO Q–visiera per una demo da banco/ferma; piccolo controller wireless e alimentazione sul casco per una dimostrazione indossata in movimento. Nessuna delle due opzioni è stata scelta.

La posizione nell'immagine non equivale a distanza, avvicinamento o rischio di collisione. Le prestazioni effettive restano da misurare.

## Riuso del PDF: indicazioni per chi prosegue

Consultare direttamente §4.3 e Figura 15 per macchina a stati, finestre e soglie, senza duplicare qui il documento. Il PDF propone impatto tramite delta delle accelerazioni, verifica della postura e quiete successiva. La precedente macchina a stati in `MVP-BICI-CASCO.md` non è una trascrizione fedele: non mantenere automaticamente le sue soglie arbitrarie come requisito.

Il PDF usa un'IMU ICM-20948 a nove assi sul casco e un EKF con correzione anche magnetometrica. Movement ha sei assi: occorre adattare la stima dell'assetto e la taratura, non copiare integralmente il filtro. Frequenza di campionamento, unità/soglie e alcuni dettagli temporali del PDF vanno chiariti prima dell'implementazione. Il PDF non costituisce una validazione dell'affidabilità stradale.

È stato spiegato che probabilmente «altitude» intende **attitude**, cioè assetto/inclinazione. Non è ancora arrivata conferma. Non introdurre un requisito di quota per supposizione.

## Domanda pendente: riprendere da qui

**«Il Modulino Movement lo immagini sulla bici insieme alla UNO Q oppure sul casco?»**

La domanda è stata posta tramite input asincrono e ripresa nella risposta finale; **nessuna risposta ricevuta** prima della richiesta di handoff. Le opzioni erano sulla bici, sul casco, oppure da decidere in base alla semplicità.

Con Movement sulla bici si osserva la caduta della bici, non direttamente quella del ciclista. Sul casco si preserva il punto di osservazione del PDF, ma serve definire collegamento alla UNO Q o elettronica locale. Questo nodo precede la stesura dei requisiti.

Altre decisioni da chiudere progressivamente, senza un interrogatorio tutto insieme:

1. Confermare assetto anziché quota.
2. Demo da fermo o indossata/in movimento; collegamento e alimentazione dei LED.
3. Posizione/orientamento del telefono (si è assunto il monitoraggio posteriore dal precedente documento, non riconfermato) e rete locale disponibile.
4. Modello della striscia e hardware effettivamente disponibili.
5. Categorie/colori, comportamento con più oggetti, perdita video/collegamento e indicazione di possibile caduta.
6. Confermare che distanza, Raspberry e webcam USB escano dal nuovo MVP, come suggerisce la nuova lista ma senza una decisione esplicita su ogni esclusione.

Quando le scelte essenziali sono chiare, scrivere un documento coerente con la nuova architettura, distinguendo requisiti, proposte e prestazioni da verificare. Aggiornare i rimandi storici solo se necessario; non lasciare due riferimenti correnti in contraddizione.

## Suggested skills

- **superpowers:brainstorming**: già utilizzata; siamo nella discussione architetturale, prima della stesura concordata dei requisiti. Continuare da qui senza ripartire da zero né avviare implementazione.
- **research**: già utilizzata con un agente per la ricerca ufficiale, conclusa e salvata in `RICERCA-FATTIBILITA.md`. Ulteriori ricerche solo per dubbi nuovi.
- **pdf:pdf**: per ricontrollare formule/diagrammi del documento originale; `pdftotext` e `pdftoppm` risultano disponibili.
- **ponytail:ponytail**: modalità full attiva. Preferenza per minimo progetto completo, riuso di esempi/algoritmi esistenti e comunicazione concreta. Dichiarare brevemente verifiche non svolte e limiti materiali.

## Verifiche ancora mancanti

Nessuna misura di latenza telefono→LED, stabilità streaming, compatibilità dello specifico telefono/hotspot, funzionamento a schermo bloccato, accuratezza delle categorie, alimentazione/autonomia o falsi allarmi della caduta. Non presentare queste proprietà come già dimostrate.
