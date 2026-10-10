# Guardaspalle: piano per la PoC di hackTurin

*"Guardaspalle" è solo un nome di lavoro. Aggiornato sab 10 ottobre, ore 13, con la divisione decisa dal team: Raspberry sulla bici come cuore, Arduino UNO Q sul casco.*

*Aggiornato sab 10 ottobre, ore 22: su consiglio di un mentor la PoC è pensata come ADAS aggiungibile a qualsiasi mezzo, non solo alle bici. Vedi "Posizionamento".*

## In una frase
Un ADAS posteriore che si aggiunge a qualsiasi mezzo che non ce l'ha: guarda dietro, capisce cosa arriva e come ti passerà, e avvisa solo quando conta. La PoC è su una bici: il ciclista viene avvisato con luci ai lati degli occhi e un suono, l'automobilista con la luce sul casco, e quando ti giri a guardare il casco ti risponde.

## Posizionamento: un ADAS retrofit, la bici è il primo mezzo
- **Il problema è più grande della bici.** In Italia circolano milioni di auto, furgoni, camion e autobus immatricolati prima che gli ADAS diventassero obbligatori (in UE dal luglio 2022 sui modelli nuovi, dal 2024 su tutte le nuove immatricolazioni): niente angolo cieco, niente avviso di tamponamento, niente sensori evoluti in retromarcia. Bici e monopattini non li hanno mai avuti.
- **La stessa scatola su tutti:** camera + ultrasuono + computer economico, montati dietro. Il software non cambia: si sceglie il mezzo con `--mezzo` (`perception/profili_mezzo.py`) e cambiano solo quattro cose:
  1. **quanto sei largo**: decide quando un veicolo è "in linea" con te;
  2. **la distanza di sorpasso sicura**: 1,5 m per la bici, di più per i mezzi larghi;
  3. **la finestra di urgenza**: un camion ha bisogno di più preavviso;
  4. **chi pesa di più nel rischio**: sulla bici fa paura il camion, sul camion fa paura la bici nell'angolo cieco.
- **Perché funziona su tutti senza ricalibrare:** il tempo all'impatto si ricava dalla crescita del riquadro e la distanza laterale in "larghezze d'auto". Nessuna delle due dipende dal mezzo o dall'ottica.
- **Cosa cambia nell'avviso:** bici e monopattino hanno il casco. Gli altri mezzi hanno un'unità in cabina: la stessa UNO Q, con la strip divisa in LED sugli specchietti (sinistra e destra) e sul cruscotto (dietro), buzzer e la stessa pagina web su un tablet.
- **Perché partiamo dalla bici:** è il caso più difficile (spazio, batteria, vibrazioni, nessuno schermo) e quello con il dato più forte (morti in bici +23%). Se sta su una bici, sta su un furgone.
- **Cosa diciamo con onestà:** sui mezzi a motore è provato in simulazione e in scala; per un camion vero servono più camere, a partire dal fianco destro.

## Come raccontarlo (non solo il metro e mezzo)
Tre livelli, come l'ADAS di un'auto:
1. **Percepire:** cosa arriva da dietro, tra quanti secondi e su che traiettoria.
2. **Decidere:** avvisare solo quando conta. Il radar suona per ogni auto, noi solo per quelle pericolose.
3. **Agire e ricordare:** avvisare il ciclista e l'automobilista, chiedere aiuto se cadi, salvare gli eventi.

Il metro e mezzo diventa una delle misure: la distanza di sorpasso, prevista dalla camera e verificata dall'ultrasuono.

---

## 1. Architettura

```
 BICI: Raspberry Pi 4 (il cuore)                         CASCO: Arduino UNO Q
 ┌─────────────────────────────────────┐                 ┌──────────────────────────────────────┐
 │ Webcam Deltaco, rivolta indietro    │                 │ STM32 (tempo reale, sempre acceso)   │
 │   1280x720 MJPG ──USB──┐            │   Wi-Fi         │  ├ strip 1 m attorno al casco:       │
 │ HC-SR04 a sinistra     │            │  (hotspot del   │  │   tempia SX | luce dietro | tempia DX
 │   GPIO + partitore ────┤            │   telefono)     │  ├ Modulino Movement: caduta,        │
 │                        ▼            │                 │  │   testa che si gira               │
 │  YOLO11n (NCNN) + ByteTrack         │  GET /risk      │  ├ buzzer vicino all'orecchio        │
 │  tempo all'impatto, traiettoria     │◄────────────────┤  ├ pulsante "sto bene"               │
 │  fusione con l'ultrasuono           │   20 volte/s    │  └ watchdog: niente dati da 1 s      │
 │  rischio per zona SX / DIETRO / DX  │                 │      → LED ambra lenti               │
 │  registro eventi + clip di 5 s      │  POST /event    │ Linux: ponte HTTP ↔ STM32 (App Lab)  │
 │  pagina web stile Tesla             │◄────────────────┤   + SOS su Telegram                  │
 └──────────────┬──────────────────────┘ guardata, caduta└──────────────────────────────────────┘
                │ http://<ip-del-pi>:8000
                ▼
        Telefono sul manubrio (facoltativo): vista dall'alto, hotspot, GPS
```

### Perché questa è la struttura migliore
1. **L'AI sta dove c'è potenza, la sicurezza dove c'è determinismo.** Il Pi fa la visione. Lo STM32 del casco gestisce LED, suono, caduta e pulsante, e funziona anche se il Pi, la webcam o il Wi-Fi si bloccano. È il principio "fail-safe" degli ADAS delle auto. Ditelo alla giuria e mostratelo dal vivo.
2. **Ogni guasto ha un comportamento definito:**
   - **Webcam guasta:** il Pi continua con l'ultrasuono e segnala al casco che la camera non va. Le zone che il sistema non vede diventano ambra lente.
   - **Pi o Wi-Fi giù:** dopo 1 secondo senza dati, il casco mette le tempie in ambra lento. Caduta e SOS continuano a funzionare.
   - **Casco scollegato:** la pagina sul telefono mostra "casco scollegato".
3. **Non serve calibrare per le misure che contano:**
   - Il **tempo all'impatto** si ricava da quanto velocemente cresce il riquadro del veicolo (pendenza di ln(larghezza) nel tempo), senza conoscere la distanza.
   - La **distanza laterale** si misura in "larghezze d'auto": è un rapporto tra pixel, che non dipende dall'ottica della webcam.
   - La distanza in metri, che dipende dall'ottica, serve solo per il disegno e per ignorare i veicoli oltre 35 m.
4. **Prevedi e verifica.** La camera prevede a che distanza passerà l'auto 2–4 secondi prima. L'ultrasuono la misura quando l'auto è di fianco. Il sistema confronta le due misure e si corregge da solo. È una fusione di sensori con uno scopo, e vi dà i numeri per la giuria.
5. **Il casco decide in locale le cose che devono essere istantanee:** la risposta quando giri la testa e la caduta. Non aspettano la rete.
6. **La UNO Q interroga il Pi via HTTP, e non il contrario.** Le app di App Lab girano in un container: una connessione in uscita funziona sempre, una in entrata dipende dalla configurazione. In più la UNO Q deve conoscere solo l'IP del Pi.

### La regola del rischio (spiegabile in una slide)
```
punteggio = peso del veicolo × urgenza × traiettoria
  urgenza:     0 con impatto ≥ 6 s  →  1 con impatto ≤ 1,5 s
  traiettoria: 2,0 in linea con te (rotta di collisione)
               1,5 passerà a meno di 1,5 m
               1,0 tra 1,5 e 2 m
               0,6 passerà largo
  peso:        persona 0,3 · bici 0,4 · moto 0,9 · auto 1,0 · bus/camion 1,4
  ROSSO (luce + suono) se ≥ 1  ·  AMBRA (solo luce) se ≥ 0,35  ·  il livello resta acceso 0,7 s
```
- **Contano solo i veicoli che si avvicinano.** Auto ferme e parcheggiate non fanno scattare niente: è il problema che ha fatto fallire il prototipo di Leiden (8 avvisi su 10 falsi).
- **Esempi:**
  - auto che passerà stretta, impatto tra 3 s: rosso;
  - auto che passerà larga, tra 2 s: ambra, senza suono;
  - camion stretto tra 3,8 s: rosso, perché i mezzi pesanti fanno scattare prima l'avviso;
  - bici tra 2 s: ambra;
  - auto in linea con te tra 3 s: rosso, e la luce dietro lampeggia verso l'automobilista.

### Cosa mostra il casco
| Situazione | Tempia SX | Tempia DX | Dietro | Suono |
|---|---|---|---|---|
| Niente di pericoloso | verde appena visibile | verde appena visibile | rosso fisso tenue | no |
| Veicolo in arrivo a sinistra (ambra) | ambra | — | rosso fisso | no |
| Pericolo a sinistra (rosso) | rosso lampeggiante | — | lampeggia | bip acuti |
| Pericolo in linea dietro | rosso | rosso | lampeggia forte | bip veloci |
| **Giri la testa a sinistra con la strada libera** | **lampo verde** | — | — | no |
| **Giri la testa a sinistra e arriva qualcosa** | **rosso fisso** | — | lampeggia | **bip continuo** |
| Pi o camera assenti | ambra lento | ambra lento | rosso fisso | no |
| Caduta | tutto lampeggia | | | allarme, 30 s per premere "sto bene" |

---

## 2. Cosa aggiungere per vincere, in ordine

**Da fare per forza:**
1. **Lo specchietto che risponde.** Quando giri la testa per guardare indietro, il casco ti dà un lampo verde se è libero, rosso e bip se sta arrivando qualcosa. Nessun radar sa dove stai guardando.
   - Ha anche una base scientifica: tra i 60 e i 65 anni solo il 69% dei ciclisti riesce a guardarsi dietro senza errori.
   - In demo lo prova un giudice con il casco in testa.
2. **"Meno allarmi, quelli giusti", con un numero.**
   - Sugli stessi video, il codice conta quanti avvisi darebbe un radar (uno per ogni veicolo che si avvicina) e quanti ne date voi.
   - La slide: "Radar: 41 avvisi. Noi: 4, ed erano i 4 sorpassi stretti". I numeri devono venire dai vostri video.
3. **Prevedi e verifica.** Il numero da mostrare è l'errore medio tra la distanza di sorpasso prevista e quella misurata.
4. **Fail-safe dal vivo.** Staccate la webcam davanti alla giuria: le tempie vanno in ambra lento, mentre ultrasuono e caduta continuano a funzionare.

**Differenze forti (fatene almeno due):**

5. **Parla all'automobilista.** La luce sul casco è all'altezza degli occhi di chi guida, più in alto di un fanalino. Lampeggia solo quando un'auto arriva veloce in linea con te o sta per passare troppo stretta.
6. **Caduta con contesto.** L'SOS su Telegram dice anche cosa è successo prima, per esempio: "Caduta alle 18:42. 3 secondi prima: camion passato a 0,9 m". Il casco sa cosa c'era dietro di te.
7. **Scatola nera e mappa per Torino** (challenge City Signals):
   - ogni evento rosso salva una clip di 5 secondi a bassa risoluzione, più tipo di veicolo, tempo all'impatto, distanza prevista e misurata, e la posizione dal telefono;
   - niente registrazione continua, quindi privacy già nel progetto;
   - ne nasce la mappa dei sorpassi pericolosi.

**Effetto "wow", solo se sabato sera siete avanti:**

8. **Freccia dell'auto dietro.** Se l'auto dietro ha la freccia destra accesa (luce ambra che lampeggia a 1–2 Hz in un angolo del riquadro), sta per svoltare tagliandovi la strada: è il classico "gancio a destra". Si fa con OpenCV sul ritaglio del riquadro, senza addestrare niente.

**Da NON fare:**
- addestrare modelli vostri: YOLO pre-addestrato su COCO basta;
- SAM in tempo reale;
- la notte;
- montare 3 sensori: mostrate il terzo nel progetto, perché il codice gestisce già 3 zone;
- la grafica 3D vera alla Tesla.

---

## 3. Cosa migliorare rispetto al piano di stamattina

| Problema | Soluzione | Dove |
|---|---|---|
| Portata della camera di 15–30 m | Catturare a 1280×720, ritagliare la fascia della strada (`--crop`) e usare imgsz 416: un'auto lontana ha più pixel | `bike_adas.py` |
| Pochi fps sul Pi 4 | NCNN, imgsz 320–416, solo 6 classi; un thread prende sempre l'ultimo fotogramma e scarta i vecchi; dissipatore | `bike_adas.py` |
| Falsi allarmi | Solo veicoli in avvicinamento, livello tenuto 0,7 s, pesi per classe, classe decisa a maggioranza | `bike_adas.py` |
| Camera montata storta | `--center-x`: con una persona 10 m esattamente dietro, il suo centro è il "dritto" | `bike_adas.py` |
| Distanza da una camera sola (±15%) | Usata solo per disegno e portata; le decisioni usano tempo all'impatto e distanza laterale, che non dipendono dalla calibrazione | `bike_adas.py` |
| Vibrazioni | Supporto rigido e corto stampato in 3D; stime calcolate su 1 secondo di dati, non sul singolo fotogramma | meccanica |
| Ultrasuono all'aperto | Mediana di 3 letture; sensore a 80–90 cm da terra, perpendicolare alla bici; eventi più lunghi di 3 s scartati (auto in coda accanto a te) | `bike_adas.py` |
| Distrazione | Niente schermo necessario: tempie e suono. Il telefono è facoltativo e in "modalità calma" si spegne quasi del tutto | casco + `dashboard.html` |
| Privacy | Niente registrazione continua, solo clip brevi degli eventi rossi, salvate a bordo | `bike_adas.py` |
| Wi-Fi | Hotspot del telefono; se cade, il casco passa da solo in ambra | `sketch.ino` |
| Falsi "testa girata" su curve e buche | Angolo della testa sopra 35° per più di 150 ms, calcolato dal giroscopio con ritorno lento a zero | `sketch.ino` |

---

## 4. Divisione del team
Per 4 persone; se siete in 3, unite i ruoli 3 e 4.
1. **Percezione (Pi):** `bike_adas.py`, fps, ultrasuono, calibrazione, prove sui video.
2. **Casco (UNO Q):** sketch, ponte App Lab, IMU (testa girata e caduta), Telegram.
3. **Meccanica e interfaccia:** stampa 3D (partite **subito**: supporto webcam, scatola Pi, supporto sensore, braccetti per le tempie), strip sul casco, `dashboard.html`.
4. **Dati, video e pitch:**
   - **subito:** girate 10–15 minuti di traffico da dietro con un telefono sul reggisella a 80–90 cm d'altezza. Il tempo all'impatto e la distanza laterale non dipendono dall'ottica, quindi i video del telefono vanno bene come dataset;
   - poi: numeri, slide, Devpost.

## 5. Piano con le scadenze
- **Memoria del Pi:** una chiavetta da 2 GB non basta per Pi OS, OpenCV e YOLO. Serve una microSD o una chiavetta da almeno 16 GB. Finché non c'è, sviluppate la percezione sul portatile con la webcam: è lo stesso codice (`--source 0`), senza ultrasuono perché manca il GPIO. Se il Pi non è pronto domenica, la demo della percezione si fa dal portatile.
- **Sab 13:00–14:30, cancello 1:**
  - `bike_adas.py` gira sul Pi (o sul portatile, finché il Pi non ha memoria) con un video di traffico e gli fps sono misurati;
  - `--fake` funziona e la pagina si vede sul telefono;
  - lo sketch accende strip e buzzer;
  - la UNO Q legge `/risk` dal Pi;
  - le stampe 3D sono partite.
- **Sab 14:30–17:00, cancello 2:** tutto collegato sul tavolo.
  - Un video sul monitor davanti alla webcam fa diventare rossa la tempia giusta.
  - Una mano davanti all'ultrasuono genera un evento "sorpasso".
  - Girando il casco di 45° si ha la risposta verde o rossa.
  - La caduta su un cuscino fa partire il conto alla rovescia.
- **Sab 17:00–19:00:**
  - montaggio sulla bici e sul casco;
  - calibrazione in parcheggio: auto ferma a 5, 10, 15 e 20 m misurati col metro, poi `--center-x`.
- **Sab 19:00–21:00: prova all'aperto in sicurezza.**
  - Usate un parcheggio o una strada chiusa, con l'auto di un amico a bassa velocità: sorpassi larghi, stretti e in linea.
  - Registrate tutto (`--save`, log, un secondo telefono che filma).
  - La sede chiude di notte: entro le 21 deve essere tutto girato.
- **Dom 10:00–12:30:** taratura delle soglie sui video, tabella dei numeri, rifiniture. **Alle 12:30 non si aggiungono più funzioni.**
- **Dom 12:30–14:30:** video di 2 minuti, foto, README con i numeri.
- **Dom 14:30–15:30:** repo pubblico e invio su Devpost. Non aspettate le 15:59.

## 6. I numeri da mostrare (tabella da riempire domenica)
| Misura | Come | Risultato |
|---|---|---|
| fps e latenza | riassunto che `bike_adas.py` stampa all'uscita | |
| Errore della distanza dalla camera | auto ferma a 5, 10, 15, 20 m | |
| Distanza di sorpasso prevista contro misurata | sorpassi con l'amico: camera contro ultrasuono contro metro | |
| Precisione dell'ultrasuono | cartone a 0,5 / 1 / 1,5 / 2 / 3 m | |
| Avvisi rossi contro radar | stessi video, conteggio automatico | |
| Preavviso medio | secondi tra il rosso e il passaggio | |
| Precisione degli avvisi (Leiden: 0,19) | rossi giusti diviso rossi totali, contati a mano sui video | |
| Riconoscimento della testa girata | 20 guardate e 20 movimenti normali | |

## 7. Demo per la giuria (3 minuti)
1. **Bici sul cavalletto con tutto montato.** Dietro, un monitor riproduce il vostro video di traffico: per la webcam è la strada. Le tempie del casco si accendono al momento giusto e il telefono mostra la vista dall'alto.
2. **Un giudice indossa il casco** e gira la testa:
   - con la strada libera vede un lampo verde;
   - mentre nel video arriva un'auto stretta, vede rosso e sente il bip.
   È il momento che ricorderanno.
3. **Un cartone passa accanto al sensore:** "sorpasso 1,12 m, previsto 1,05 m".
4. **Staccate la webcam:** ambra lento. "La sicurezza non dipende dall'AI."
5. **Il casco cade su un cuscino:** allarme, 30 secondi, poi arriva il messaggio Telegram sul telefono del giudice, con il contesto.
6. **Slide finale:** radar contro noi e la tabella dei numeri.

## 8. Video di 2 minuti
- **0:00–0:15:** ripresa reale di un sorpasso stretto. "Nel 2025 in Italia i morti in strada sono calati, quelli in bici sono saliti del 23%: 228" (ISTAT).
- **0:15–0:35:** il pericolo arriva da dietro, dove non vedi. Il radar suona per tutti e smetti di ascoltarlo; il prototipo accademico più simile al nostro dava 8 allarmi falsi su 10.
- **0:35–1:15:** schermo diviso con la strada, la vista dall'alto e il casco. Lo specchietto che risponde e la luce verso l'automobilista.
- **1:15–1:35:** schema dell'architettura, fail-safe, tempo all'impatto senza calibrazione, previsione verificata.
- **1:35–1:50:** i numeri.
- **1:50–2:00:** mappa dei sorpassi a Torino e prossimi passi.

## 9. Pitch (30 secondi)
*Variante da usare se la giuria apprezza il retrofit:* chiudete con "La bici è il primo mezzo. La stessa scatola, con un parametro diverso, va su un furgone, su un camion o sull'auto di dieci anni fa che l'ADAS non ce l'ha."

> Nel 2025 in Italia i morti in strada sono diminuiti, ma quelli in bici sono aumentati del 23%. Il pericolo arriva da dietro, dove il ciclista non vede. I radar per bici esistono, ma suonano per ogni auto, e dopo dieci minuti non li ascolti più. Guardaspalle guarda dietro di te con un'intelligenza artificiale che gira tutta a bordo. Capisce se arriva un camion o una bici, tra quanti secondi, e quanto vicino ti passerà, e avvisa solo quando conta: con due luci ai lati degli occhi, senza schermi. Quando ti giri a guardare, il casco ti risponde: verde, puoi andare; rosso, aspetta. Avvisa anche chi guida. E ogni sorpasso pericoloso diventa un dato per rendere più sicure le strade di Torino.

## 10. Domande probabili della giuria
- **"Esiste già il Garmin Varia, o Velo AI."**
  - Il radar sa che arriva qualcosa, ma suona per tutti e non sa dove guardi.
  - Velo costa 399 $, si vende solo negli USA e usa lo schermo del telefono.
  - Noi: avvisi selettivi, distanza di sorpasso prevista e verificata, interfaccia senza schermo, risposta alla guardata, luce verso l'automobilista, codice aperto.
- **"Di notte?"** Oggi no, ed è dichiarato. Nella roadmap: radar o camera termica in fusione con la camera.
- **"Quanto vede lontano?"** Rispondete con il numero misurato, circa 20–30 m. A 30 km/h di differenza di velocità sono circa 3 secondi di preavviso, abbastanza per non spostarsi.
- **"Non distrae?"** Lo schermo non serve. Le tempie stanno nella visione periferica e il suono c'è solo per il rosso.
- **"Privacy?"** Nessuna registrazione continua: solo clip brevi degli eventi rossi, a bassa risoluzione, che restano a bordo.
- **"Perché solo le bici?"** Non solo: è un ADAS retrofit. La percezione è la stessa, cambia il profilo del mezzo (`--mezzo auto`, `camion`, `bus`). Mostrate `--fake --mezzo camion` sulla pagina: il camion disegnato, i pesi invertiti (la bici nell'angolo cieco diventa il pericolo).
- **"Quanto costa?"** Sono circa 150 € di componenti da hobbista. Un prodotto userebbe una scheda sola.

## 11. Consegna
- **Repo pubblico:** codice, README con schema, foto e numeri, licenza MIT. Niente token Telegram nel repo.
- **Devpost:** descrizione, foto, link al video di massimo 2 minuti (YouTube o Vimeo), link al repo.
- **Privacy nei materiali:** sfocate targhe e volti nei video pubblicati.

## 12. Roadmap
- retrofit su mezzi a motore: unità in cabina, più camere (angolo cieco destro dei camion), taratura dei profili su strada, flotte (bus urbani, furgoni delle consegne);
- tre sensori (sinistra, dietro, destra): il codice ha già tre zone;
- radar mmWave per la notte e per vedere più lontano;
- scheda unica con acceleratore AI;
- suono direzionale nel casco;
- dati aperti nel formato OpenBikeSensor per il Comune.
