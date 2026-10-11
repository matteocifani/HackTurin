# Video da 2 minuti: sceneggiatura e riprese

*Bozza di sabato 10/10 notte. Durata totale 1:55, così restano 5 secondi di margine. La voce fuori campo è di circa 250 parole: letta con calma sta nei tempi. Le parti tra `[[ ... ]]` sono numeri da aggiornare domattina.*

**Regole:** niente musica sopra la voce (al massimo sotto, bassa). Sottotitoli in inglese se il video va su Devpost per una giuria internazionale. Sfocate targhe e volti nelle riprese di strada. Esportate in 1080p, caricate su YouTube come "non in elenco" e controllate che il link si apra da un browser in incognito.

---

## Scena per scena

### 1. Il pericolo arriva da dietro (0:00–0:12, 12 s)
- **Immagine:** ripresa dalla camera posteriore di un sorpasso stretto. Va bene il video notturno in autostrada (`prova_mezzo/video_notte_autostrada_720.mp4`, intorno al secondo 10) oppure una ripresa vostra da dietro una bici.
- **Testo a schermo:** "Il pericolo arriva da dietro."
- **Voce:** "Il pericolo, sulla strada, arriva quasi sempre da dietro. Proprio dove non puoi guardare."

### 2. Il problema: chi non ha l'ADAS (0:12–0:30, 18 s)
- **Immagine:** carrellata veloce di foto o clip: bici, monopattino, auto vecchia, furgone, camion, bus GTT. Poi un'icona di radar per bici che suona di continuo.
- **Testo a schermo:** "Dal 2024 l'UE impone l'angolo cieco sui camion e bus nuovi. E tutti gli altri?"
- **Voce:** "L'Europa ha reso obbligatori i sensori d'angolo cieco sui camion e sui bus nuovi. Ma per strada ci sono milioni di mezzi che non li avranno mai: bici, monopattini, auto vecchie, furgoni, camion. E i radar per bici suonano per ogni auto, finché smetti di ascoltarli."

### 3. La soluzione: una scatola, qualsiasi mezzo (0:30–0:45, 15 s)
- **Immagine:** la scatola stampata in 3D in mano, poi montata dietro la bici in un'unica ripresa veloce (time-lapse del montaggio, 5–8 s). Inquadratura stretta su camera + HC-SR04.
- **Testo a schermo:** "Guardaspalle: camera + ultrasuono + AI a bordo. ~150 €."
- **Voce:** "Guardaspalle è un ADAS posteriore da aggiungere a qualsiasi mezzo. Una camera, un sensore a ultrasuoni e un Raspberry Pi con un'intelligenza artificiale che gira tutta a bordo."

### 4. Come vede: cosa, quando, dove (0:45–1:05, 20 s)
- **Immagine:** schermo diviso. A sinistra il video annotato (`annotato_auto.mp4` o la pagina `/test` del Pi), con i riquadri, i secondi all'impatto e la distanza. A destra la vista dall'alto della dashboard che diventa ambra e poi rossa.
- **Testo a schermo:** tre parole che appaiono una dopo l'altra: "Cosa · Tra quanti secondi · Quanto vicino".
- **Voce:** "Per ogni veicolo dietro di te capisce cos'è, tra quanti secondi ti raggiunge e quanto vicino passerà. Il tempo all'impatto si ricava da come cresce il riquadro, senza calibrare la camera. Quando il veicolo è di fianco, l'ultrasuono misura la distanza vera."

### 5. Demo dal vivo con la macchinina (1:05–1:25, 20 s)
- **Immagine:** ripresa sul tavolo. La macchinina in scala si avvicina alla scatola; sulla dashboard il mezzo passa da verde ad ambra a rosso, e il casco (o la strip LED) si accende dal lato giusto con il bip. Inquadrate insieme macchinina, scatola e schermo, oppure montate due riprese affiancate.
- **Testo a schermo:** "Demo in scala 1:20, tutto in tempo reale sul Pi."
- **Voce:** "Ecco la demo in scala. La macchinina si avvicina: ambra, solo luce. Arriva troppo vicina e troppo veloce: rosso, luce e suono. E chi guida dietro vede lampeggiare la luce posteriore."
- `[[ se il casco funziona: 3 s di "specchietto che risponde": giri la testa, lampo verde o rosso ]]`

### 6. Qualsiasi mezzo + avvisa solo quando conta (1:25–1:42, 17 s)
- **Immagine:** la dashboard che cambia mezzo: bici → auto → camion (con `--fake --mezzo camion`), il disegno del mezzo cambia. Poi una schermata grande con il confronto.
- **Testo a schermo:** "Radar: 27 allarmi. Guardaspalle: 9." `[[ ricontrollare col modello finale ]]`
- **Voce:** "Lo stesso software va su una bici, un'auto o un camion: cambia solo un parametro. E avvisa solo quando conta: sullo stesso video notturno un radar avrebbe dato 27 allarmi, noi 9."

### 7. Torino e chiusura (1:42–1:55, 13 s)
- **Immagine:** mappa di Torino con punti di eventi (se la pagina mappa esiste; altrimenti una mappa statica con punti dichiarati come simulati). Poi il logo/nome e il link al repo.
- **Testo a schermo:** "Ogni quasi-incidente diventa un dato aperto per la città." Poi: "github.com/matteocifani/HackTurin"
- **Voce:** "E ogni sorpasso pericoloso diventa un dato anonimo: con i bus della città a bordo, Torino saprebbe dove stanno i rischi prima dell'incidente. Guardaspalle: l'ADAS per chi non ce l'ha."

---

## Riprese da fare domattina (in ordine di priorità)
1. **Demo con la macchinina (scena 5):** la più importante. Telefono sul cavalletto, luce buona, 5–6 prese. Registrate anche lo schermo della dashboard (registrazione schermo del Mac o del telefono collegato a `:8000`), così in montaggio si possono affiancare.
2. **Registrazione schermo di `/test` e della dashboard** con un video di traffico che gira sul Pi (`--source <video> --realtime --stream`), per la scena 4.
3. **Montaggio della scatola in time-lapse** (scena 3): dalla scatola in mano alla scatola fissata, 30–60 s reali da accelerare.
4. **Cambio mezzo sulla dashboard** (scena 6): `--fake --mezzo bici`, poi `auto`, poi `camion`, 5 s ciascuno.
5. **Primo piano dell'hardware:** Pi, camera + HC-SR04 nella scatola, UNO Q, strip LED accesa. 3–4 inquadrature da 3 s, servono come riempitivo.
6. **Casco** `[[ solo se funziona ]]`: qualcuno lo indossa e gira la testa.
7. **Scene di strada** (scena 2): se non avete clip vostre, usate foto libere da diritti o vostre di bus GTT e furgoni a Torino.

## Materiale già pronto
- `prova_mezzo/annotato_auto.mp4`: video notturno annotato, utile per le scene 1 e 4.
- `prova_mezzo/video_notte_autostrada_720.mp4`: originale.
- `poc/docs/dashboard_simulazione.png`: dashboard in simulazione.
- `prova_mezzo/screenshot_bici.png`, `screenshot_camion.png`: dashboard con due mezzi diversi.

*Il video notturno viene da YouTube: prima di pubblicarlo controllate la licenza, oppure usatene pochi secondi citando la fonte.*
