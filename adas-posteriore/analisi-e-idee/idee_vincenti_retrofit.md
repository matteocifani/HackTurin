# Cosa manca per vincere (dopo il consiglio del mentor)

Scritto sabato 10/10 sera, pensato per quello che si può fare entro domenica 16:00.
Niente hardware nuovo: tutto si fa con quello che c'è.

## 1. L'aggancio normativo: il retrofit è già obbligatorio in parte d'Europa (1 ora, solo pitch)

È l'argomento più forte per la versione "qualsiasi mezzo", e oggi non è nel pitch.

- Dal luglio 2024 il regolamento UE General Safety Regulation (2019/2144) impone sui camion e bus **nuovi**
  il Blind Spot Information System (UNECE R151) e il Moving Off Information System (R159).
  Tutta la flotta già circolante ne è priva: in Italia l'età media dei veicoli pesanti è alta (oltre 14 anni, dato da verificare).
- Londra (Direct Vision Standard) da ottobre 2024 obbliga i camion sopra 12 t senza visibilità sufficiente
  a montare **in retrofit** sensori e telecamere per l'angolo cieco per entrare in città.
  Quindi il mercato del retrofit esiste già, ed è imposto da una città.
- Frase per il pitch: "L'Europa ha reso obbligatorio questo sensore sui mezzi nuovi. Noi lo portiamo, a basso costo,
  su tutti quelli che circolano già, a partire dai bus e dai camion che girano per Torino."

Proprietario: thread "ADAS per qualsiasi mezzo" (ARCHITETTURA.md, sezione Posizionamento e Q&A).

## 2. Il caso d'uso che vince sui mezzi pesanti è l'angolo cieco laterale, non il retro (2-3 ore)

Sui camion e bus il morto tipico è il ciclista o il pedone schiacciato in **svolta a destra**, non il tamponamento.
Stessa scatola, stesso codice: cambia solo dove la monti.

- Aggiungere una modalità di montaggio `--vista retro|lato-destro` (o dentro i profili mezzo):
  in vista laterale contano solo bici e pedoni, l'allarme si arma quando il mezzo svolta
  (in demo: un tasto o la freccia simulata sulla pagina web), e la zona "in linea" diventa "accanto al mezzo".
- In demo: si gira la scatola di lato alla macchinina/camioncino e si passa una bici giocattolo o una persona.
- Questo è anche il punto dove il nostro "avvisa solo quando conta" pesa di più: i sensori laterali
  commerciali suonano per ogni palo e ogni auto parcheggiata, YOLO distingue la bici.

Proprietario del codice: thread "Migliorare YOLO e misure" (bike_adas.py). La proposta va scritta in un file nuovo e passata dal coordinatore.

## 3. City Signals: la flotta diventa una rete di sensori della città (2 ore)

È il motivo per cui il progetto è "per Torino" e non un gadget. La mappa c'è nel piano ma non nella demo.

- Ogni evento rosso diventa un punto anonimo: posizione, ora, tipo di mezzo che sorpassa, distanza, velocità.
  Nessuna immagine esce dal mezzo.
- Pitch: "Se i 1000 bus GTT montano Guardaspalle, ogni giorno il Comune sa quali incroci producono
  quasi-incidenti, prima che ci scappi il morto." I quasi-incidenti sono centinaia di volte più frequenti degli incidenti,
  quindi i dati arrivano in settimane, non in anni.
- Cosa fare: una pagina `/mappa` con Leaflet e i punti degli eventi su Torino. La posizione può venire dal GPS
  del telefono (la pagina la chiede al browser) oppure, per il video, da un CSV di esempio dichiarato come simulato.
- Formato aperto compatibile OpenBikeSensor, già citato in roadmap: basta dirlo.

## 4. "Si installa in 5 minuti": far vedere che è davvero retrofit (1 ora, quasi solo video)

Il valore del retrofit sta nella semplicità di montaggio, e oggi non lo mostriamo.

- La scatola stampata in 3D + alimentazione dalla presa USB/accendisigari a 12-24 V (risolve anche il problema
  dell'alimentatore del Pi in demo, spiegandolo come scelta di prodotto).
- L'auto-calibrazione camera-ultrasuono già fatta dal thread YOLO è l'argomento perfetto: "la monti, guidi un minuto, si tara da sola".
- Nel video: 10 secondi di montaggio a tempo, poi `--mezzo` scelto dalla pagina web.

## 5. Numeri e confronto che la giuria chiederà (30 minuti)

Una slide, tre righe:

| | Retrofit commerciali (Mobileye 8 Connect, kit BSIS per camion) | Radar per bici (Varia) | Guardaspalle |
|---|---|---|---|
| Costo | centinaia o migliaia di euro installato (stima, da verificare) | circa 200 euro | circa 100-150 euro di componenti |
| Capisce cosa arriva | in parte | no, suona per tutto | sì: classe, distanza, tempo all'impatto |
| Dati per la città | no o proprietari | no | sì, aperti e anonimi |

Più il dato già misurato sul video notturno in autostrada: **27 allarmi stile radar contro 9 dei nostri**.

## 6. Domande nuove della giuria da preparare (30 minuti)

- "È certificato?" No: è un aiuto alla guida, non sostituisce gli specchi né i sistemi omologati. Il passo successivo è la R151.
- "Perché non lo fanno già i produttori?" Lo fanno, ma solo sul nuovo. Il problema sono i mezzi che circoleranno altri 15 anni.
- "Chi paga?" Aziende di trasporto e logistica (assicurazioni, flotte), il Comune per i bus e per i dati, i ciclisti per la versione bici.
- "Funziona di notte / con la pioggia?" Di notte sì (test in autostrada); l'ultrasuono copre il vicino; la pioggia è un limite dichiarato.

## Cosa NON fare entro domani

- Niente CAN bus, niente frenata automatica, niente telecamera anteriore: tre parole di roadmap bastano.
- Niente Bluetooth o hardware nuovo.
- Non allargare la demo a più mezzi veri: una macchinina più un camioncino giocattolo bastano a far capire "qualsiasi mezzo".

## Ordine consigliato

1. Aggancio normativo e tabella di confronto nel pitch (punti 1 e 5): costano poco e cambiano la percezione.
2. Modalità angolo cieco laterale (punto 2): l'unica aggiunta tecnica che apre davvero camion e bus.
3. Pagina mappa (punto 3): chiude la storia City Signals.
4. Montaggio a tempo nel video (punto 4).

---

# Aggiunte "wow" con l'IA, solo con l'hardware del BOM

Già in uso: Pi 4, webcam Deltaco, HC-SR04, UNO Q sul casco. La vista dall'alto e il conteggio "radar contro noi" ci sono già nella dashboard.
In ordine di effetto sulla giuria diviso per il rischio.

## A. Kit "GSR2 retrofit": secondo occhio sul guidatore (UNO Q + IMX219 + Media Carrier) — effetto altissimo, rischio medio

Il regolamento UE che obbliga il sensore d'angolo cieco sui mezzi nuovi obbliga anche l'avviso di **sonnolenza e distrazione del guidatore** (DDAW).
Sui mezzi vecchi non c'è nessuno dei due. Quindi la frase diventa: "Guardaspalle porta sui mezzi vecchi i due sistemi che l'Europa impone su quelli nuovi".

- Nella versione per auto, camion e bus, la UNO Q non sta nel casco ma è l'unità in cabina. La camera IMX219 sul Media Carrier guarda il guidatore.
- L'IA locale rileva il volto e misura quanto restano chiusi gli occhi (PERCLOS) e se guarda il telefono o in basso per più di 2 secondi. Usa i landmark del volto: MediaPipe Face Mesh o il blocco di rilevamento volto di App Lab.
- **La fusione è il punto forte**: se il guidatore è distratto **e** da dietro arriva qualcosa, l'avviso sale subito al rosso. Nessun prodotto economico mette insieme le due cose.
- Rischio: non abbiamo verificato quanto va veloce sul processore della UNO Q. Come piano B si fa girare sul Pi con la Deltaco girata verso il guidatore solo per la demo. Datevi 2 ore al massimo: se a mezzanotte non va, si lascia stare.

## B. Avvisi a voce in cabina (nessun pezzo in più) — effetto alto, rischio basso, 30 minuti

"Bici a destra, aspetta" oppure "Camion in arrivo, 2 secondi", detti dalla pagina web con la sintesi vocale del browser.
Funziona sul telefono o sullo schermo collegato al Pi senza installare niente. Sui mezzi a motore è il canale giusto, perché nessuno guarda uno schermo mentre guida.
Va solo sugli eventi rossi, così resta coerente con "avvisa solo quando conta".

## C. Luce anti-tamponamento per chi sta dietro (WS2813 + UNO Q, o la striscia del casco) — effetto alto, rischio basso, 1 ora

Se il mezzo dietro arriva troppo veloce (tempo all'impatto sotto 2 secondi), la striscia sul retro lampeggia come uno stop di emergenza **verso chi sta guidando dietro**.
Così l'ADAS protegge anche dagli altri, ed è la cosa più visibile in un video.
Sul casco esiste già. Sul mezzo basta una seconda modalità dello stesso sketch.

## D. Privacy automatica: targhe e volti sfocati a bordo (nessun pezzo in più) — effetto medio-alto, rischio basso, 1 ora

Prima di salvare una clip si sfocano la parte bassa centrale del riquadro di ogni veicolo (dove sta la targa) e i volti delle persone.
Serve per rispondere alla domanda su GDPR e dati per il Comune con una dimostrazione invece che con una promessa.

## E. Distanza laterale precisa con Modulino Distance (ToF) — effetto medio, rischio basso, 1 ora

Il sensore ToF misura fino a circa 1,3 m, con una precisione al centimetro e un cono stretto.
Montato **di lato**, misura il sorpasso ravvicinato o il ciclista accanto al camion nella modalità angolo cieco laterale.
L'HC-SR04 resta sul retro, mentre il ToF va sulla UNO Q in cabina o sul casco.
Così la "fusione di sensori" passa da due sensori a tre.

## F. Unità in cabina con OLED 0,96" + buzzer (UNO Q) — effetto medio, rischio basso, 1 ora

Un mini display mostra una freccia (sinistra, dietro, destra) e i secondi all'impatto, mentre il buzzer dà il tono di avviso.
Rende concreta la frase "si installa su qualsiasi mezzo": il casco per chi va in bici, questa scatolina per chi guida.
Entrambi si stampano con la P1S.

## Da non fare stanotte

- **Profondità monoculare con IA (Depth Anything)**: fa effetto, ma sul Pi 4 impiega secondi per ogni frame. Si può usare solo offline per una scena del video.
- **LLM o VLM a bordo** per descrivere gli eventi: sul Pi 4 sono lenti e la giuria lo nota. Si può citare in roadmap.
- **Seconda camera sul Pi**: dimezza gli fps del rilevamento posteriore.

## Ordine consigliato per stanotte

B e C prima, perché costano poco e si vedono subito nel video. Poi A, con un limite di 2 ore, perché è il vero salto di livello per il pitch sui mezzi a motore.
D se resta tempo. E ed F domattina, insieme alla scatola stampata.

Il codice di bike_adas.py è del thread "Migliorare YOLO e misure": le modifiche vanno scritte come file nuovi e passate dal coordinatore.
