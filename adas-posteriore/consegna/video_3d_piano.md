# Video Devpost: piano e copione (3D + voce + riprese vere)

*Domenica 11/10 mattina. Sostituisce `video_2min.md`. Regola del manuale: massimo 2 minuti. Obiettivo 1:50, così restano 10 s di margine. Il nome è ancora `[NOME]`: va scelto prima di registrare la voce. Le sigle R1…R6 e F1…F5 rimandano a `riprese_da_girare.md`. I numeri tra `[[ ]]` vanno ricontrollati sull'ultima versione prima di montare.*

## Come lo facciamo (default scelto)

**3D: scene in three.js, nello stesso stile della vista sul telefono.** Stessi materiali in vetro, stesse luci e stessa strada di `vista.html`, così il 3D del video e il prodotto vero si somigliano: chi guarda il video poi riconosce la vista sull'iPhone. Le scene le scrivo io e le registro qui fotogramma per fotogramma con Chromium, a 1920×1080 e 30 fps. Escono fluide anche se il computer è lento. Niente Blender: per sei scene brevi serve troppo tempo.

**Voce: ElevenLabs, in italiano, con sottotitoli in inglese.** È la voce sintetica più naturale oggi, legge bene l'italiano e regge le pause. Il piano gratuito basta (il copione è circa 1.600 caratteri). Serve un account: lo apri tu, incolli il copione qui sotto, scegli una voce calma (modello "Multilingual v2", stabilità circa 50%) e mi mandi l'mp3. **Alternativa più autentica:** lo leggi tu con il microfono dell'iPhone in una stanza silenziosa, a 15 cm dalla bocca. Ai giudici spesso piace di più sentire la squadra.

**Montaggio: lo faccio io con ffmpeg**, appena ho le riprese in `~/Downloads/video_devpost/` e la voce. Sottotitoli inglesi bruciati nel video, musica bassa sotto la voce solo se libera da diritti. Esce un mp4 1080p da caricare su YouTube come "Non in elenco".

## Struttura in 7 scene (1:50)

| # | Tempo | Cosa si vede | Tipo |
|---|---|---|---|
| 1 | 0:00–0:10 | Strada di notte vista dall'alto. Un ciclista. Da dietro arriva un'auto veloce e lo sfiora. La camera si gira a guardare indietro. | 3D |
| 2 | 0:10–0:25 | Una fila di mezzi grigi: bici, monopattino, auto vecchia, furgone, camion, bus. Solo il camion nuovo in fondo ha un alone azzurro di sensori. Gli altri restano spenti. In mezzo 2–3 clip di Torino (F2), se ci sono. | 3D + F2 |
| 3 | 0:25–0:40 | La scatola si apre in esploso: webcam, ultrasuono, Raspberry Pi. Si richiude e si aggancia dietro una bici, poi un'auto, poi un camion. Stacchi brevi sull'hardware vero (R5). | 3D + R5 |
| 4 | 0:40–1:00 | Come ragiona. Dietro la bici si apre un cono di visione. Un'auto entra: compare il riquadro, che si ingrandisce, e accanto i secondi all'impatto che scendono. Di fianco si accende il cono dell'ultrasuono con i centimetri. Poi a schermo diviso il video notturno vero annotato (`annotati_gs26n/notte.mp4`). | 3D + video annotato |
| 5 | 1:00–1:25 | La demo vera. La macchinina arriva (R1) e lo schermo passa da verde ad ambra a rosso. A destra la stessa scena sulla vista 3D dell'iPhone (R2). Poi il sorpasso a sinistra e a destra (R3), e un attimo di `/test` con i riquadri (R4). | Riprese vere |
| 6 | 1:25–1:37 | Sulla bici l'avviso arriva nel casco: LED sulla tempia dal lato giusto, bip sul rosso (R6). Sugli altri mezzi arriva in cabina: stesso modulo, LED sugli specchietti (3D). | R6 + 3D |
| 7 | 1:37–1:50 | Mappa di Torino in 3D dall'alto: i sorpassi pericolosi diventano punti luminosi anonimi. Chiusura con il nome, la frase finale e il link al repo. | 3D |

Se il casco non funziona, la scena 6 diventa tutta 3D (casco virtuale che si accende) e accorcio la 5 di qualche secondo.

## Copione della voce (italiano, circa 240 parole)

Va letto con calma, con una pausa vera dove c'è "…". Le parentesi quadre sono indicazioni, non vanno lette.

**[Scena 1]**
Sulla strada, il pericolo arriva quasi sempre da dietro. … Proprio dove non puoi guardare.

**[Scena 2]**
Dal 2024 l'Europa obbliga i sensori d'angolo cieco sui camion e sui bus nuovi. Ma per strada ci sono milioni di mezzi che non li avranno mai: bici, monopattini, auto vecchie, furgoni, camion che gireranno ancora per quindici anni.

**[Scena 3]**
Noi abbiamo costruito [NOME]: un ADAS posteriore che si aggiunge a qualsiasi mezzo. Una camera, un sensore a ultrasuoni e un Raspberry Pi, con un'intelligenza artificiale che gira tutta a bordo. Nessuna immagine lascia il veicolo.

**[Scena 4]**
Per ogni veicolo dietro di te capisce cos'è, tra quanti secondi ti raggiunge e quanto vicino passerà. Quando ti è di fianco, l'ultrasuono misura la distanza vera. … Il modello lo abbiamo addestrato noi, su migliaia di immagini prese da dietro: di notte riconosce `[[ 9 sorpassi su 10 ]]`.

**[Scena 5]**
Ecco la demo. … La macchinina si avvicina: ambra, solo luce. Troppo vicina, troppo veloce: rosso, luce e suono. E lo stesso momento lo vedi in 3D sul telefono, in tempo reale.

**[Scena 6]**
Sulla bici l'avviso arriva nel casco, dal lato giusto. Su un'auto o su un camion arriva in cabina. Stesso hardware, cambia un solo parametro.

**[Scena 7]**
E ogni sorpasso pericoloso diventa un dato anonimo: Torino potrebbe sapere dove sono i rischi prima dell'incidente. … [NOME]. L'ADAS per chi non ce l'ha.

## Sottotitoli inglesi (da bruciare nel video)

1. On the road, danger almost always comes from behind. Exactly where you can't look.
2. Since 2024 the EU requires blind-spot sensors on new trucks and buses. But millions of vehicles will never have them: bikes, scooters, old cars, vans, trucks that will drive for fifteen more years.
3. We built [NAME]: a rear ADAS you can add to any vehicle. A camera, an ultrasonic sensor and a Raspberry Pi, with AI running fully on board. No image ever leaves the vehicle.
4. For every vehicle behind you it knows what it is, how many seconds until it reaches you, and how close it will pass. When it's beside you, the ultrasonic sensor measures the real distance. We trained the model ourselves on thousands of rear-view frames: at night it catches `[[ 9 overtakes out of 10 ]]`.
5. Here's the demo. The car approaches: amber, light only. Too close, too fast: red, light and sound. And you see the same moment in 3D on your phone, in real time.
6. On a bike the warning reaches your helmet, on the right side. On a car or a truck it goes to the cabin. Same hardware, one parameter.
7. And every dangerous overtake becomes anonymous data: Turin could know where the risks are before the crash. [NAME]. ADAS for those who don't have it.

## Numeri da ricontrollare prima del montaggio
- Notte, sorpassi in ambra o rosso: `[[ 9/10 con gs26n ]]` (dalla memoria del progetto, misura delle 03:04).
- mAP50 del modello: 0,49 → 0,64. Non lo dico a voce (è un numero da tecnici), va solo su Devpost.
- "27 allarmi del radar contro 9 nostri" era misurato col modello vecchio: lo tolgo dal video finché non è rifatto.
- Latenza 0,2–0,3 s, circa 7–8 fps sulla Pi: vanno su Devpost, non nella voce.

## Cosa mi serve da te, e quando
1. **Adesso, mentre lavorate:** niente. Le scene 3D le posso preparare io in parallelo, quando mi dici di partire.
2. **Quando il progetto è fermo:** le riprese della lista (`riprese_da_girare.md`) in `~/Downloads/video_devpost/`.
3. **Prima della voce:** il nome scelto, e se il casco funziona.
4. **Per la consegna:** il link YouTube va su Devpost entro le 16:00. Conviene avere il video finito per le 15:00.
