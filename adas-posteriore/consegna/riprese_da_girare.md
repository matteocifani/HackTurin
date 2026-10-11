# Riprese da girare (versione col case di cartone)

*Domenica 11/10, 13:15. Sostituisce la versione delle 12:00. Scritta per il case di cartone: la stampa 3D non sarà pronta per il video (vedi in fondo), quindi nel video il case "vero" lo mostro io in 3D, dal vostro file STL. Le riprese dal vivo servono a dimostrare che **funziona davvero**.*

**Consegna dei file:** AirDrop sul Mac, nella cartella `~/Downloads/video_devpost/` (c'è già). Non rinominate niente. **Entro le 14:40**, così ho il tempo di montare.

## Regole per tutte le riprese
- **Telefono in orizzontale**, obiettivo 1x, 4K 30 fps (o 1080p 30 fps). Niente modalità Cinema.
- **Blocca esposizione e fuoco:** dito premuto sul soggetto finché compare "Blocco AE/AF". Senza, quando i LED diventano rossi l'immagine cambia luce.
- **Luce:** finestra di lato, mai inquadrata. Sfondo pulito: un foglio grande o un telo scuro sul tavolo, via bottiglie, zaini e cavi in più. Niente fogli con SSID e password del Wi-Fi in campo (nelle foto del casco si leggono).
- **Telefono fermo:** cavalletto, pila di libri, o gomiti appoggiati. I movimenti sono lenti e uno solo per ripresa.
- **2 secondi prima e 2 dopo** ogni azione. **3 prese** per le indispensabili.
- **Audio:** lasciatelo acceso. Se si sente il bip del rosso, lo uso.
- **Pi:** modello `gs26n`, `--giocattolo 7.5`. Prima di girare, controllate su `/test` che la macchinina venga vista.

---

## Indispensabili (in ordine di importanza)

### 1 · La scena chiave: macchinina, case e telefono nella stessa inquadratura
È la ripresa che fa capire tutto in un secondo: il mondo vero e quello che vede il sistema, insieme.
- **Inquadratura:** dal lato, telefono a 30–40 cm d'altezza. A sinistra il case di cartone con la camera rivolta verso destra. A destra il "corridoio" di tavolo da 70 cm dove arriva la macchinina. **In primo piano, appoggiato e inclinato verso l'obiettivo, l'iPhone con `/vista` aperta** (luminosità al massimo, Non disturbare attivo).
- **Azione:** la macchinina parte da ~70 cm, dritta verso la camera, e si avvicina in ~4 s. Sull'iPhone la vista 3D passa da verde ad ambra a rosso. Si ferma a ~10 cm, 2 s di rosso, poi torna indietro e torna verde.
- **Durata:** 12–15 s. **3 prese.**
- **Serve un secondo telefono** per girare (l'iPhone è in scena).

### 2 · Registrazione dello schermo di /vista, nello stesso momento della 1
- **Cosa:** registrazione schermo dell'iPhone su `http://172.20.10.2:8000/vista` mentre si rifà la 1. Centro di Controllo → Registrazione schermo. **Non disturbare attivo.**
- **Perché:** in montaggio la metto a tutto schermo, nitida, accanto alla ripresa 1.
- **Durata:** 20 s. 2 prese. Se non riuscite in contemporanea con la 1, fatela subito dopo con la stessa azione.

### 3 · Il case di cartone da vicino: camera e sensori
- **3a:** di fronte, come lo vede chi arriva da dietro: i due "occhi" dell'HC-SR04 sopra l'obiettivo della webcam. Avvicinamento lentissimo (10 cm in 5 s). Prima sistemate lo scotch di carta e i cavi che escono dal sensore, e controllate che il copriobiettivo della webcam sia aperto.
- **3b:** di tre quarti, con il cavo e la Pi dietro, un po' sfocati.
- **3c:** dall'alto, il case aperto: Pi, cavi, sensore dentro. Ferma.
- **Durata:** 5 s ciascuna. 2 prese.

### 4 · Sorpasso a sinistra e a destra, dall'alto
- **Inquadratura:** telefono a 60–70 cm sopra il tavolo, verso il basso. In campo il case e il corridoio dietro. Se potete, l'iPhone con `/vista` appoggiato nell'angolo dell'inquadratura.
- **Azione:** la macchinina arriva da dietro spostata a **sinistra**, passa di fianco al case (lì la misura l'ultrasuono). Poi la stessa cosa a **destra**. Una presa per lato, 2 volte.
- **Durata:** 8–10 s a presa.

### 5 · Il caschetto (va raccontato bene: ha un atto tutto suo)
- **5a · LED a sinistra:** casco indossato, inquadratura di tre quarti da dietro, stretta su testa e spalle. La macchinina passa a sinistra e si accende **solo la zona sinistra** della striscia. 8 s, 3 prese.
- **5b · LED a destra:** uguale, dal lato destro. 8 s, 3 prese.
- **5c · Luce posteriore vista da chi arriva:** telefono basso, dietro il casco, come se fosse il guidatore che segue. Si accende la zona di dietro. 5 s, 2 prese.
- **5d · Primo piano della scheda:** UNO Q con il Grove shield sul retro del casco, LED verde acceso. Avvicinamento lento di 10 cm in 5 s. Poi il modulo sensore in alto. Prima togliete o sistemate lo scotch che riflette.
- **5e · Il fail-safe:** spegnete la Pi o staccate il collegamento e riprendete la striscia che lampeggia ambra. 6 s. (Facoltativa, ma dimostra una scelta di progetto forte.)
- **5f · Casco in mano che ruota lentamente**, striscia accesa, sfondo scuro. 6 s. Mi serve anche per far combaciare il 3D con il casco vero.
- **Importante:** ditemi se le zone le accende la Pi vera o il simulatore `sender.py`. Nel video lo racconto in modo diverso.

### 6 · Display 7" della Pi
- Lo schermo acceso con la dashboard mentre la macchinina si avvicina. Inquadratura stretta, di tre quarti, per evitare i riflessi. 6–8 s. 2 prese.

### 7 · La parte di Daniele, Gianluca e Nicolò: caduta e mappa di Torino
- **7a:** il casco cade di lato su un cuscino e resta fermo (come nel vostro protocollo prove). 5 s.
- **7b:** registrazione schermo del Mac sulla mappa di `casco-sentinella` (QuickTime, solo la finestra del browser) quando arriva l'evento: il punto che compare sulla mappa, e la pagina `/emergenza`. 15 s.
- **7c:** se c'è, la dashboard del Comune (`/comune`) con la heatmap. 5 s.

---

## Facoltative
- **F1 · Il case montato su una bici:** bici sul cavalletto, case fissato dietro la sella. Giro lento di 90° attorno alla bici in 6 s. Con il cartone va benissimo.
- **F2 · Il case stampato in 3D:** solo se esce in tempo. Le stesse 3a e 3b, con il case stampato.
- **F3 · Mezzi veri per strada:** dal marciapiede, 4 s ciascuno: un bus GTT, un furgone, un'auto vecchia, un monopattino. Niente targhe leggibili, niente volti in primo piano.
- **F4 · La squadra al lavoro:** mani sulla tastiera, il casco sul tavolo, qualcuno che guarda lo schermo. 3 s ciascuna.
- **F5 · La squadra davanti alla demo** (per il finale): 3 s, tutti in campo, guardate pure in camera.

## Foto per Devpost (5)
1. Il case di cartone di fronte, sfondo pulito.
2. Tutto il sistema sul tavolo: case, Pi, display, iPhone con /vista, macchinina.
3. Screenshot dell'iPhone su /vista (screenshot, non foto).
4. Il casco con i LED accesi, una foto di lato e una del retro con la scheda.
5. La squadra.

## Già pronto, non serve girarlo
- Video reali annotati dal nostro modello: `prova_mezzo/annotati_gs26n/` (notte, camion, moto, bici). Scelgo io i momenti migliori.
- La vista 3D in simulazione e tutte le scene 3D, compreso il case dal file STL.

## Sulla stampa 3D
Il case del file `Body2.stl` misura 16 × 9 × 12,7 cm e ha circa 98 cm³ di plastica (circa 120 g di PLA). Su una P1S, a qualità normale, sono probabilmente 2–3 ore: partendo alle 14:30 non è pronto per il video e forse nemmeno per le 16:00. Se volete averlo per la demo davanti ai giudici, stampatelo in bozza (strato 0,28 mm, riempimento 10%, pareti 2).
