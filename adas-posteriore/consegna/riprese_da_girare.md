# Riprese da girare (lista per Matteo)

*Domenica 11/10 mattina. Sostituisce la lista riprese in `video_2min.md`. Il nome del prodotto è ancora `[NOME]`: in scena non deve comparire scritto da nessuna parte, così va bene qualunque nome sceglierete.*

## Prima di iniziare (valido per tutte le riprese)

- **Telefono in orizzontale**, sempre. Fotocamera 1x (non 0,5x, deforma i bordi). Formato 4K 30 fps se c'è spazio, altrimenti 1080p 30 fps. Niente modalità Cinema, niente Live Photo.
- **Blocca esposizione e messa a fuoco:** tieni premuto il dito sull'oggetto finché compare "Blocco AE/AF". Senza, la luce cambia quando i LED diventano rossi.
- **Luce:** vicino a una finestra, con la finestra di lato o alle tue spalle, mai dentro l'inquadratura. Spegni le luci al neon sopra il tavolo se sfarfallano.
- **Tavolo sgombro:** tovaglia o foglio grande di un colore unico (grigio scuro o bianco). Via cavi in più, bottiglie, zaini.
- **Ogni presa:** parti 2 secondi prima dell'azione e chiudi 2 secondi dopo. Gira **3 prese** di ogni ripresa indispensabile.
- **Supporto:** telefono fermo (cavalletto, pila di libri, un compagno con i gomiti appoggiati). Per i movimenti lenti usa due mani e cammina piano.
- **Audio:** non serve, ci mettiamo la voce. Se però il buzzer suona, tieni l'audio originale: lo usiamo.
- **Pi pronta:** servizio avviato con il modello `gs26n` e `--giocattolo 7.5` (procedura in memoria). Prima di girare, apri `/test` e controlla che la macchinina venga vista.
- **Dove metterle:** crea sul Mac la cartella `~/Downloads/video_devpost/` e copiaci tutto con AirDrop, senza rinominare. Io le trovo lì e le monto.

---

## Indispensabili (senza queste il video non regge)

### R1 · La demo: la macchinina arriva da dietro (la più importante)
- **Inquadratura:** larga, telefono a 40–50 cm d'altezza, di tre quarti. In campo devono esserci insieme: la scatola con webcam e HC-SR04 (di spalle o di lato, si capisca che guarda verso la macchinina), il display 7" della Pi con lo schermo leggibile, e il tratto di tavolo da 70 cm a 0 dalla camera.
- **Cosa succede:**
  1. Macchinina ferma a ~70 cm, muso verso la camera e **dritta** (non di tre quarti). Schermo verde. 2 s.
  2. Spingila piano e in linea retta verso la camera, in ~4 s, con un dito dietro (la mano resta fuori dal campo della webcam il più possibile).
  3. Passa da verde ad ambra (~30 cm) e a rosso (~15 cm). Fermati a ~10 cm e tieni 2 s sul rosso.
  4. Riportala indietro: lo schermo torna verde.
- **Durata:** 12–15 s a presa. 3 prese.
- **Da dove:** telefono sul cavalletto.

### R2 · Lo stesso momento sulla vista 3D dell'iPhone
- **Cosa:** registrazione schermo dell'iPhone su `http://172.20.10.2:8000/vista` (Centro di Controllo → Registrazione schermo, microfono spento) mentre un compagno rifà la R1 identica.
- **Serve un secondo telefono** per la R1, perché l'iPhone sta registrando lo schermo. Se non c'è, gira R1 e R2 in due momenti separati, va bene lo stesso.
- **Prima** togli le notifiche (Full immersion "Non disturbare") e chiudi le altre schede. Batteria e ora in alto si vedono: va bene.
- **Durata:** 15–20 s. 2 prese.

### R3 · Sorpasso a sinistra e a destra
- **Inquadratura:** dall'alto, telefono a 60–70 cm sopra il tavolo, guardando in giù. In campo la scatola e la corsia dietro.
- **Cosa succede:** la macchinina arriva da dietro un po' spostata a **sinistra** della camera e passa di fianco alla scatola (dove la vede l'ultrasuono). Poi la stessa cosa a **destra**. Fai due prese separate per lato.
- **Durata:** 8–10 s a presa.
- **In più:** se il casco o la striscia LED reagiscono dal lato giusto, falli entrare nell'inquadratura. È l'inquadratura migliore per mostrare "sa da che parte arriva".

### R4 · Registrazione dello schermo di /test sul Mac
- **Cosa:** sul Mac apri `http://172.20.10.2:8000/test`, schermo intero, e registra con QuickTime (File → Nuova registrazione schermo, solo la finestra del browser) mentre rifai la R1 e la R3.
- **Perché:** si vedono i riquadri, la distanza in cm e il tempo all'impatto. È la prova che l'AI gira davvero.
- **Durata:** 30 s totali, una presa sola.

### R5 · L'hardware da vicino
Quattro inquadrature brevi, ferme o con un movimento lentissimo (avvicinarsi di 10 cm in 4 s):
1. Webcam + HC-SR04 di fronte, come li vede chi arriva da dietro. Il sensore ad ultrasuoni deve sembrare "due occhi".
2. La Raspberry Pi 4 con i cavi, di tre quarti.
3. Il display 7" acceso sulla dashboard.
4. L'Arduino UNO Q del casco (o la striscia LED accesa).
- **Durata:** 4–5 s ciascuna. Una presa basta, due se tremano.

### R6 · Il casco che avvisa (solo bici)
- **Se il casco funziona:** qualcuno lo indossa, inquadratura di profilo stretta su testa e spalle. La macchinina (o la demo simulata) fa scattare l'avviso: i LED sulla tempia si accendono dal lato giusto, poi il bip sul rosso. Se c'è la funzione "specchietto": gira la testa e si accende verde o rosso.
- **Se non funziona:** salta la ripresa, la sostituisco con il casco in 3D. Dimmelo e basta.
- **Durata:** 8–10 s, 3 prese.

---

## Facoltative (migliorano il video, ma si può fare senza)

### F1 · La scatola montata su una bici
Bici ferma sul cavalletto, scatola fissata dietro sotto la sella o sul portapacchi. Inquadratura che gira lentamente attorno alla bici (giro di 90° in 6 s), poi dettaglio sulla scatola. Se c'è il case stampato in 3D, usalo. 2 prese.

### F2 · Mezzi veri per strada a Torino
Dal marciapiede, telefono fermo, 4 s ciascuna: un bus GTT, un furgone, un'auto vecchia, un monopattino, una bici nel traffico. Riprendi da dietro o di tre quarti, **niente targhe leggibili e niente volti in primo piano**. Bastano 4–5 clip. Servono per la scena "chi resta senza ADAS".

### F3 · Il montaggio in time-lapse
Telefono fermo dall'alto, app Fotocamera in modalità Time-lapse: dalla scatola sul tavolo a scatola fissata alla bici (o a un'auto). 30–60 s reali.

### F4 · Al buio
Stessa R1 con la stanza in penombra e una torcia del telefono accesa sulla macchinina a fare da faro. Serve solo se la Pi riconosce ancora la macchinina: controlla `/test` prima di girare.

### F5 · La squadra al lavoro
Due o tre clip da 3 s: mani sulla tastiera, saldatura, qualcuno che guarda lo schermo. Di spalle o di lato va benissimo.

---

## Foto per Devpost (servono anche queste, 5 foto)
1. La scatola con webcam e HC-SR04, di fronte, su sfondo pulito.
2. Tutto il sistema sul tavolo: scatola, Pi, display acceso, macchinina.
3. Lo schermo dell'iPhone con la vista 3D (screenshot, non foto).
4. Il casco con i LED accesi (se funziona).
5. La squadra, anche informale.

---

## Già pronto, non devi girarlo
- `prova_mezzo/annotati_gs26n/notte.mp4`, `camion.mp4`, `moto.mp4`, `bici.mp4`: video veri annotati dal modello addestrato da noi.
- La vista 3D in modalità simulata (`/vista?demo`): la registro io.
