# ADAS per biciclette: analisi a fondo

Ricerca del 10/10/2026, fatta con due agenti in parallelo: prodotti esistenti e dati sul problema. Le fonti sono in fondo a ogni sezione.

## 1. Verdetto
**Così com'è, l'idea non è abbastanza forte: esiste già, quasi identica.** Camera posteriore con AI che classifica i veicoli, vista dall'alto sul telefono e luce che reagisce sono esattamente il **Velo AI Copilot**, in vendita negli USA dal 2024. Dal febbraio 2026 il **Garmin RearVue 820** classifica camion, auto e bici con un radar da 175 m. Una giuria tecnica vi chiederà: "Perché non compro un radar da 129 €?"

**Con un angolo preciso diventa forte e quasi unico: la regola del metro e mezzo.** Dal 14 dicembre 2024 in Italia è obbligatorio sorpassare un ciclista ad almeno 1,5 m. Nessuno però può misurarlo, né prevenirlo: i radar non misurano la distanza laterale, e chi la misura (OpenBikeSensor) non riconosce il veicolo e non avvisa nessuno. Il vostro ADAS può:
1. **prevedere** dalla camera che il veicolo in arrivo passerà troppo vicino, *prima* del sorpasso;
2. **avvisare** il ciclista (tieni la linea) e l'automobilista (luce verso di lui) quando c'è ancora tempo;
3. **misurare** con il sensore laterale la distanza reale di ogni sorpasso e usarla per correggere da solo la stima della camera;
4. **registrare** ogni sorpasso con tipo di veicolo e distanza, senza salvare video né targhe, e produrre il primo dataset italiano sui sorpassi.

Prevedere la distanza prima del sorpasso, misurarla durante e conoscere il tipo di veicolo è la combinazione che, secondo la ricerca, **nessun prodotto offre**.

## 2. Esiste già? Sì, i pezzi esistono quasi tutti
| Prodotto | Cosa fa | Cosa NON fa | Prezzo |
|---|---|---|---|
| **Garmin Varia RTL515 / RearVue 820** (radar) | Veicoli da dietro fino a 140–175 m; il RearVue 820 (2026) classifica bici, auto, camion e il lato | Non misura la distanza laterale; non prevede il sorpasso stretto; avvisi su ciclocomputer o telefono | 199–299 € |
| **Radar economici** (Magene L508, iGPSPORT SR30, Bryton R300L) | Come sopra, 140–190 m | Falsi positivi, nessuna classificazione | 130–160 € |
| **Velo AI Copilot** (USA, 2024) | Camera AI posteriore: tipo di veicolo, velocità, "si avvicina / sorpassa", vista dall'alto sul telefono, luce reattiva, video | Solo USA; 399 $; nessuna misura reale della distanza laterale | 399 $ |
| **Survue, Luna Oculus, Beam RS 1000, Hawkeye** | Camere AI; Luna salva i passaggi sotto 1,5 m (stimati dalla camera) | Quasi tutti non ancora in vendita o con stato incerto | 199–390 € |
| **OpenBikeSensor** (DE, open source) | Misura con ultrasuoni la distanza di sorpasso, con mappe | Non riconosce il veicolo, non avvisa, non prevede | fai da te |
| **C3FT** (USA, polizia) | Ultrasuoni + camera per operazioni anti-sorpasso | Strumento per la polizia, ~1.400 $ | — |
| **Tesi Leiden 2023** (prototipo) | **Stesso vostro design**: webcam + Jetson + YOLO, avviso con vibrazione | **Precisione 0,19** (8 avvisi su 10 falsi, soprattutto auto parcheggiate); i ciclisti non si sentivano più sicuri | — |
| **Moto: Bosch ARAS, Ride Vision** | ADAS radar o camera per moto | Non per bici | 659 $+ |

**Cosa insegna:** "camera + AI + avvisi" da sola è già fatta, e il prototipo accademico più simile è fallito sui falsi allarmi. Il vuoto è nella distanza laterale, prevista e misurata, e nell'uso come prova del rispetto della legge.

Fonti: [DC Rainmaker RearVue 820](https://www.dcrainmaker.com/2026/02/garmi-varia-rearvue-radar-820-in-depth-review.html), [Raspberry Pi / Velo AI](https://www.raspberrypi.com/news/velo-ai-smart-bike-light/), [road.cc Velo](https://road.cc/content/tech-news/ai-light-vs-bad-drivers-rest-weeks-top-tech-307289), [New Atlas Luna](https://newatlas.com/bicycles/luna-oculus-bike-camera-ai/), [New Atlas Survue](https://newatlas.com/bicycles/survue-cycling-ai-vehicle-warning/), [OpenBikeSensor](https://www.openbikesensor.org/), [Tesi Leiden](https://theses.liacs.nl/pdf/2023-2024-BreukelWytze.pdf), [BikeRadar radar](https://www.bikeradar.com/advice/buyers-guides/bike-rearview-radars).

## 3. Il problema: numeri per il pitch
- **Italia 2025:** i morti sulle strade calano del 5%, ma i **ciclisti morti salgono a 228 (+23%)**, di cui 30 in e-bike (+50%). [ISTAT](https://www.istat.it/infografiche/infografica-sugli-incidenti-stradali-anno-2025/)
- **Circa metà dei ciclisti morti ha più di 65 anni** e circa metà muore su strade extraurbane. [Geopop/CRAFT PoliMi](https://www.geopop.it/quasi-un-morto-al-giorno-per-incidenti-in-bici-in-italia-piu-della-meta-sono-over-65/), [UE](https://road-safety.transport.ec.europa.eu/system/files/2023-02/ff_cyclists_20230213.pdf)
- **Investimenti da dietro** (auto e bici nella stessa direzione): sono pochi come numero di incidenti ma tra i più mortali. Rappresentano il 10–49% degli incidenti mortali auto-bici in Europa; negli USA sono il 9% degli incidenti e il 45% dei morti; in FR/DE/SE il 75–85% avviene su strade extraurbane dritte a 70–90 km/h. [Kovaceva et al. 2022](https://research.chalmers.se/publication/527926/file/527926_Fulltext.pdf)
- **Sorpassi stretti:**
  - Berlino, 16.700 sorpassi: **56% sotto 1,5 m** e 18% sotto 1 m. [Radmesser](https://www.radfahren.de/story/aktion-radmesser-autofahrer-ueberholen-radfahrer-eng/)
  - Studio RADBEST su oltre 7.000 sorpassi in DE/AT/CH: **distanza mediana 1,0–1,3 m**. [Salzburg Research](https://salzburgresearch.at/en/?p=53005)
  - Camion e bus passano 19–23 cm più vicino delle auto. [Walker 2007](https://cordis.europa.eu/article/id/26335-cyclists-wearing-helmets-at-greater-risk)
- **La legge c'è ma non si applica:**
  - Italia: art. 148 c.9-bis (L. 177/2024), 1,5 m "ove le condizioni della strada lo consentano", multa 167–665 €. Nessuno strumento per provarlo. [Brocardi](https://www.brocardi.it/codice-della-strada/titolo-v/art148.html)
  - Regno Unito: 286 segnalazioni di sorpasso stretto hanno portato a **1 sola condanna**. [road.cc](https://road.cc/content/news/286-close-pass-submissions-resulted-one-prosecution-300561)
  - In Italia non esiste nessuna misurazione pubblicata delle distanze di sorpasso.
- **Anziani:** tra i 60 e i 65 anni solo il 69% riesce a guardarsi dietro senza errori (100% nei giovani). Un assistente posteriore ha aiutato gli over 64 a decidere meglio quando svoltare (in simulatore). [bioRxiv](https://www.biorxiv.org/content/10.1101/2022.03.01.481993.full.pdf), [Engbers 2016](https://cris.uni-muenster.de/portal/publication/54135715)
- **Le allerte funzionano sul comportamento:** una revisione di 78 studi mostra frenate prima, reazioni più rapide e più distanza; i ciclisti preferiscono gli avvisi sonori. Non ci sono ancora dati sulla riduzione degli incidenti. [Griffith 2025](https://research-repository.griffith.edu.au/items/686b466d-c8bf-4744-83a0-5e4e0c0bbb90)
- **Torino:** gli incidenti in bici sono raddoppiati tra il 2022 e il 2023 (gen–set, da 116 a 232). A settembre 2026 un bambino di 7 anni è morto mentre andava a scuola in bici su una ciclabile solo dipinta; la città ne sta discutendo. Se lo citate, fatelo con molto rispetto, come contesto e non come slogan. [moto.it](https://www.moto.it/news/torino-raddoppiati-gli-incidenti-in-bicicletta-e-triplicate-le-sanzioni-per-malasosta-dei-monopattini.html), [Il Post](https://www.ilpost.it/2026/09/30/torino-ciclabile-incidente-nicolo-di-cio/)

## 4. Punti deboli e come gestirli

### Tecnici
1. **Portata della camera.** Calcolo per una webcam da circa 70° di campo visivo: un'auto (1,8 m di larghezza) a 30 m occupa circa 27 px a 640 px e circa 14 px a 320 px. Il riconoscimento affidabile arriva quindi a circa 15–30 m, contro i 140–175 m del radar. Con un'auto a 90 km/h e la bici a 25 km/h, 30 m sono circa **1,7 secondi** di preavviso.
   - *Cosa fare:*
     - **Rilevamento "foveale":** oltre all'immagine intera a bassa risoluzione, analizzate un ritaglio centrale ad alta risoluzione, dove compaiono i veicoli lontani. La portata arriva a circa 50–60 m (stima).
     - Siate onesti: la camera non serve al preavviso lontano, serve a capire *cosa* arriva e *quanto stretto passerà*.
     - Nella roadmap: radar + camera + ultrasuoni, come negli ADAS delle auto.
2. **Potenza di calcolo.** Velo AI usa un acceleratore Hailo, Leiden un Jetson. Pi 4 e UNO Q hanno solo la CPU.
   - *Cosa fare:* modello nano a 320 px, YOLO ogni N fotogrammi e tracker in mezzo. Misurate gli fps nella prima ora.
3. **Falsi allarmi** (la tesi di Leiden ha avuto precisione 0,19).
   - *Cosa fare:* avvisate solo per veicoli **tracciati che si avvicinano** (riquadro che cresce) **e** con distanza laterale prevista sotto 1,5 m. Con la camera posteriore le auto parcheggiate si allontanano e non scattano. Usate isteresi e soglie diverse per tipo di veicolo.
4. **Stima della distanza laterale con una sola camera** (errore indicativo ±15% sulla distanza, ±0,3–0,5 m di lato a 10 m).
   - *Cosa fare:* **autocalibrazione** (vedi §5). Usate l'IMU per correggere il beccheggio della bici sulla geometria del piano stradale.
5. **Ultrasuoni all'aperto:** le carrozzerie curve riflettono l'onda di lato, e vento e velocità danno solo 4–10 letture per sorpasso. OpenBikeSensor dimostra però che funziona.
   - *Cosa fare:* sensore perpendicolare al senso di marcia, a circa 80–100 cm da terra, filtro mediano, lettura a circa 20–40 Hz. Testate con un'auto vera.
6. **Notte, pioggia, controluce.** La camera è debole al buio, ma secondo i dati UE i ciclisti muoiono soprattutto di giorno, quindi è meno critico.
   - *Cosa fare (bonus):* di notte riconoscete la coppia di fari, che è facile e precisa. La pioggia va dichiarata come limite.

### Di prodotto
7. **"Cosa ci fa il ciclista con l'avviso?"** È la domanda più pericolosa. Progettate gli avvisi intorno a **decisioni concrete**:
   - "non spostarti a sinistra adesso";
   - "un camion sta per passarti stretto: tieni la linea o stringi a destra";
   - **avvisate chi può davvero evitare l'incidente, l'automobilista:** luce verso di lui solo quando il sorpasso previsto è troppo stretto.
8. **Distrazione:** lo schermo in stile Tesla esiste già (Velo) e invita a guardare in basso. **Il display a 3 LED + buzzer senza telefono è invece un vuoto di mercato** ed è più adatto agli anziani. Usate la vista dall'alto solo come schermata di debug e demo per la giuria.
9. **Privacy:** filmare targhe e persone pone problemi di GDPR.
   - *Cosa fare:* tutto in locale; salvate solo eventi anonimi (tipo di veicolo, distanza, ora, luogo). Questo è il motivo per cui l'AI gira a bordo.
10. **Tempo:** circa 12 ore di lavoro effettivo rimaste. Taglio netto delle priorità (§7).

### Di pitch
11. **Non dite "è la prima volta"** né "nessuno lo fa" in generale: i giudici conoscono Garmin. Dite *esattamente* cosa c'è di nuovo: distanza laterale prevista e misurata, tipo di veicolo, legge italiana, dati anonimi.

## 5. Come migliorarla: le 5 mosse
1. **Riformulate il progetto intorno al metro e mezzo:** "L'ADAS che fa rispettare il metro e mezzo".
2. **Prevedere, poi misurare, poi imparare.** La camera stima la distanza laterale *prevista* del veicolo in arrivo. Durante il sorpasso l'ultrasuono misura quella *reale*. Ogni sorpasso diventa un esempio per correggere la stima della camera, quindi il sistema si autocalibra e migliora a ogni giro. È la parte tecnica più forte e si dimostra con un grafico "previsto contro misurato".
3. **Una luce che chiede spazio.** Una barra LED rivolta a sinistra si accende rossa *solo* quando la camera prevede un sorpasso sotto 1,5 m, mentre l'automobilista può ancora correggere. È diversa dalle luci "sempre lampeggianti" dei radar.
4. **Rischio diverso per tipo di veicolo:** camion e bus passano più vicino e sono più letali, quindi avviso anticipato e più forte.
5. **Dati per Torino:** ogni sorpasso salvato in formato compatibile con OpenBikeSensor, per creare il primo dataset italiano sui sorpassi stretti, utile al Comune per decidere dove servono ciclabili protette. Per City Signals è perfetto.

**Utente principale da raccontare:** il ciclista adulto o anziano, spesso in e-bike, su strade veloci intorno a Torino e sulle ciclabili dipinte in città. Il display a 3 LED senza telefono è pensato per lui.

## 6. Validazione con numeri (dove "la tecnica supera il brief")
Sabato tra le 17 e le 20, in un parcheggio o su una strada tranquilla, con un'auto amica:
- **Segnate a terra** linee a 1,0 / 1,5 / 2,0 m dalla bici ferma e fate 15–20 sorpassi a velocità diverse.
- **Misurate:**
  - precisione dell'ultrasuono rispetto al metro a nastro;
  - errore della distanza prevista dalla camera;
  - **preavviso** in secondi;
  - distanza massima di primo rilevamento;
  - fps;
  - falsi allarmi in 10 minuti di giro urbano.
- **Mostrate una tabella** del tipo "previsto contro reale: errore medio X cm; preavviso medio Y s; precisione degli avvisi Z (Leiden: 0,19)".

Pochi team porteranno numeri veri: questo vi distingue.

## 7. Priorità nel tempo rimasto
- **P0 (entro sabato 17):**
  - camera + YOLO + tracking, solo veicoli che si avvicinano;
  - ultrasuono sinistro che misura il sorpasso;
  - LED sinistra / dietro / destra + buzzer;
  - registro CSV degli eventi.
- **P1 (sabato sera):** distanza laterale prevista, test con l'auto vera, autocalibrazione.
- **P2 (domenica mattina):** luce "chiedi spazio", rischio per tipo di veicolo, rilevamento foveale, schermata di debug per la demo.
- **P3 (se avanza tempo):** vista in stile Tesla sul telefono, modalità notte, altri sensori.

## 8. Demo
1. **Macchinina o video** che si avvicina alla camera spostata verso il centro: "sorpasso previsto 1,1 m". Si accendono il LED sinistro rosso, la luce "chiedi spazio" e il buzzer.
2. **Mano o cartone** che passa davanti all'ultrasuono a 1,2 m: compare l'evento "auto, 1,2 m, violazione" nel registro.
3. **Grafico "previsto contro misurato"** dai test reali, con la tabella dei numeri.
4. **Video del giro in strada** con i riquadri sovrapposti.

## 9. Pitch (30 secondi)
> In Italia, dal dicembre 2024, sorpassare un ciclista a meno di un metro e mezzo è vietato. Ma nessuno può misurarlo: a Berlino più di metà dei sorpassi viola questa regola, e nel Regno Unito 286 segnalazioni hanno portato a una sola condanna. Intanto nel 2025 i ciclisti morti in Italia sono aumentati del 23%. Il nostro ADAS per bici prevede con l'AI a bordo se il veicolo dietro di te passerà troppo vicino. Avvisa te e chiede spazio all'automobilista mentre c'è ancora tempo, e misura la distanza reale di ogni sorpasso. Nessun video lascia la bici. I dati diventano la prima mappa italiana dei sorpassi pericolosi.
