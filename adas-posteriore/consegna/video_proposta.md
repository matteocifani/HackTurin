# Proposta per il video Devpost

*Domenica 11/10, 13:15. Da approvare prima che inizi a produrre. Sostituisce `video_3d_piano.md`. Regola del manuale: massimo 2 minuti. Io punto a 1:55.*

## L'idea in una riga
Un video che racconta il prodotto come un lancio vero: **3D curato per spiegare, riprese vere per dimostrare**. Ogni volta che il 3D promette qualcosa, subito dopo una ripresa vera lo prova. È la regola che tiene insieme tutto il video: un giudice non deve mai chiedersi "ma questo funziona davvero?".

## Il racconto (7 atti, 1:55)

| # | Tempo | Cosa si vede | Fonte | Cosa dice la voce (sintesi) |
|---|---|---|---|---|
| 1 · Il pericolo | 0:00–0:14 | 3D, notte, camera bassa dietro un ciclista. Fari che crescono alle sue spalle, l'auto lo sfiora. Stacco al nero. | 3D | Il pericolo arriva da dietro, dove non guardi. |
| 2 · Chi resta senza | 0:14–0:28 | 3D, una fila di mezzi su sfondo scuro: bici, monopattino, auto vecchia, furgone, camion, bus. Solo il camion nuovo ha l'alone dei sensori. Gli altri restano spenti. | 3D (+ F3) | L'UE impone i sensori solo sul nuovo. Milioni di mezzi non li avranno mai. |
| 3 · Il prodotto | 0:28–0:46 | Il **vostro case dal file STL** in 3D, luce da studio, che ruota. Esploso, con la disposizione vera: l'HC-SR04 capovolto (pin in alto) appoggiato **sopra** la webcam Deltaco, entrambi rivolti all'indietro, e la Raspberry Pi di fianco. Si richiude e si aggancia dietro una bici, un'auto, un camion, un bus. Stacco sul case di cartone vero (riprese 3a e 3b). | 3D + riprese 3 | [NOME]: un ADAS posteriore che si aggiunge a qualsiasi mezzo, AI tutta a bordo. |
| 4 · Come vede | 0:46–1:04 | 3D: dietro la bici si apre il cono della camera. Un'auto entra: riquadro, secondi all'impatto che scendono, traiettoria. Di fianco il cono dell'ultrasuono con i centimetri. Poi un **montaggio veloce di video reali annotati**: notte, camion, moto, bici. In sovrimpressione: "5.100 immagini · modello addestrato da noi · di notte 9 sorpassi su 10". | 3D + clip validate | Cosa arriva, tra quanti secondi, quanto vicino. Il modello l'abbiamo addestrato noi. |
| 5 · La prova | 1:04–1:22 | **La scena chiave** (ripresa 1): la macchinina arriva, il telefono in scena passa da verde a rosso. Schermo diviso con la registrazione nitida di /vista (ripresa 2). Poi i sorpassi a sinistra e a destra (ripresa 4) e il display della Pi (ripresa 6). | Riprese vere | Ecco la demo, in tempo reale: ambra solo luce, rosso luce e suono. |
| 6 · Il casco | 1:22–1:44 | **Atto dedicato al caschetto, 22 s.** 3D: un **casco da bici** aerodinamico con la striscia LED integrata lungo il bordo e l'elettronica in un guscio sul retro gira lentamente. La striscia si divide in tre zone: sinistra, dietro, destra. Un'auto arriva da sinistra e si accende solo la zona sinistra, al limite della vista. Poi il casco cade: conto alla rovescia, allarme. Poi le riprese vere, presentate come "il prototipo dell'hackathon": il casco da cantiere indossato che si accende dal lato giusto mentre la macchinina passa, il primo piano della scheda, la caduta sul cuscino. Chiusura in 3D: su auto e camion lo stesso avviso va in cabina, sugli specchietti. | 3D + riprese 5 e 7a | In bici l'avviso arriva nel casco: la luce si accende ai bordi della vista, dal lato da cui arriva il pericolo, e chi guida dietro vede la luce posteriore. Se perde il segnale non resta spento: lampeggia ambra. E se cadi e non ti rialzi, chiama aiuto. |
| 7 · La città | 1:44–1:55 | La caduta sul cuscino (7a), il punto che compare sulla mappa di Torino di `casco-sentinella` (7b). Poi in 3D Torino dall'alto con i punti luminosi. Chiusura: nome, frase finale, link al repo. | Riprese 7 + 3D | Ogni quasi incidente diventa un dato anonimo per Torino. |

Nell'atto 7 racconto il lavoro di Daniele, Gianluca e Nicolò per quello che fa oggi: il casco rileva cadute e buche e le manda alla mappa. I sorpassi stretti sulla mappa li presento come prossimo passo, perché oggi `casco-sentinella` non ha ancora quel tipo di evento.

## Il caschetto (lavoro di Daniele e Gianluca, dal repo)
Cosa racconto, preso dal codice in `bike-led-receiver/`:
- **Striscia LED intorno alla falda divisa in tre zone** (sinistra, dietro, destra): si accende solo la zona da cui arriva il veicolo, con un colore per tipo di mezzo. Si vede con la coda dell'occhio senza girare la testa.
- **Fail-safe:** se per 3 secondi non arrivano dati dalla Pi, la striscia lampeggia ambra. Il messaggio è "non so", mai un falso "via libera".
- **Caduta:** il sensore di movimento in alto riconosce l'urto e l'inclinazione oltre 47°. Se il casco resta fermo per 10 secondi, l'evento parte verso la mappa e il pannello di emergenza di `casco-sentinella`.
- **Buca:** un urto senza caduta diventa un punto "buca" sulla mappa di Torino.
- **Nel 3D il casco è da bici** (il prodotto finale), con la striscia LED lungo il bordo e l'elettronica sul retro. Il casco da cantiere giallo compare solo nelle riprese vere, con la scritta "prototipo hackathon": è onesto e fa vedere il salto dal prototipo al prodotto.

## Le clip validate che uso (video reali, modello gs26n)
Ho analizzato fotogramma per fotogramma i quattro video annotati per trovare i momenti in cui l'avviso si accende davvero:
- **Notte** (`notte.mp4`): 3,5–4 s e 41–43 s, auto che arriva da dietro a destra, riquadro rosso con "STRETTO 185 cm". È la clip più forte: di notte, al buio, la vede e misura il sorpasso.
- **Camion** (`camion.mp4`): 12–17 s, auto in avvicinamento con ambra e poi rosso.
- **Moto** (`moto.mp4`): 28–31 s, auto da dietro a sinistra in rosso.
- **Bici** (`bici.mp4`): 0–5 s, traffico urbano con più auto riconosciute insieme.

Due avvertenze. Questi video hanno sovrimpressioni di debug (righe azzurre, fps): le ripulisco nel montaggio con un ritaglio e un'etichetta pulita. I video originali vengono da YouTube e due hanno il logo dell'autore (CYCLIQ, Belfast Biker): li uso per pochi secondi e li cito nei titoli di coda.

Matteo chiedeva anche **riprese da davanti**. Nel Mac c'è "Highway driving at night 4K (Free Footage)", che è una ripresa da davanti e libera da diritti. Se mi dai il via, la faccio passare dal modello e ne tiro fuori 4–5 secondi: mostra che lo stesso sistema funziona anche montato davanti.

## Come lo faccio: strumenti

**3D: three.js, renderizzato fotogramma per fotogramma.**
- Scrivo le scene in three.js. È la stessa tecnologia della vista sull'iPhone, quindi il 3D del video e il prodotto si somigliano.
- Il case lo carico direttamente dal vostro `Body2.stl`.
- Uso luci da studio con riflessi, bagliore sui fari e sui LED, profondità di campo e testi animati in Inter.
- Ogni fotogramma lo cattura Chromium headless a 1920×1080 e 30 fps. Così il movimento è perfettamente fluido anche se il calcolo è lento.
- **Scartato Blender:** qui non c'è una GPU e renderizzare un minuto di 3D richiederebbe ore.
- **Scartati i video generati con l'AI (Veo, Kling):** tre stili diversi nello stesso video sembrano meno professionali. In più vanno dichiarati come non reali, e in un video di hackathon distraggono dalla prova.

**Voce: ElevenLabs v3 su Replicate.**
- Replicate ha il modello ufficiale `elevenlabs/v3`, quindi OpenRouter non serve.
- La v3 accetta indicazioni di tono come `[calm]` e pause naturali. È la voce più espressiva disponibile.
- **Un limite pratico:** da qui non riesco a raggiungere Replicate, la rete di questo ambiente lo blocca. Quindi la chiave **non mandarla in chat**. Ho messo uno script pronto sul tuo Mac: lo lanci tu dal Terminale, la chiave resta lì, e i file audio finiscono in `~/Downloads/video_devpost/voce/`, dove li leggo io.
- Per la voce finale farò lo stesso: ti preparo lo script con tutto il copione diviso per atti. Così posso sistemare il tempo di ogni atto senza rigenerare tutto.

**Musica:** una traccia "cinematic tech" lenta, sotto la voce. Da qui non posso scaricarla: scegline una su Pixabay Music (gratuita, senza obbligo di citazione) e mettila nella stessa cartella. Se non c'è, il video esce con la sola voce e i suoni dei LED.

**Montaggio:** ffmpeg, qui. Sottotitoli in inglese incisi nel video, titoli in Inter, colori uniformati tra le riprese. Esce un mp4 1080p da caricare su YouTube come "Non in elenco".

## Tempi (ora italiana)

| Quando | Io | Voi |
|---|---|---|
| Ora → 13:30 | Aspetto il tuo ok su questa proposta. | Lanci il test della voce (1 minuto). |
| 13:30–14:45 | Scene 3D (atti 1, 2, 3, 4, 6, 7) e scelta delle clip validate. Ti mando un'anteprima del case in 3D appena è pronta. | Riprese col cartone (lista in `riprese_da_girare.md`). |
| entro 14:00 | | **Il nome scelto**: mi serve per la voce e per i titoli. |
| 14:00–14:15 | Copione finale e script della voce. | Lanci lo script della voce. |
| 14:40 | | Riprese nella cartella del Mac. |
| 14:45–15:20 | Montaggio, sottotitoli e musica. | |
| **15:20** | **Prima versione completa da guardare.** | Mi dici cosa cambiare. |
| 15:35 | Versione finale. | Caricamento su YouTube e Devpost entro le 15:50. |

In totale sono circa 2 ore di lavoro mio, quasi tutte in parallelo con voi. Il rischio vero è il tempo delle riprese: se alle 14:40 ne manca qualcuna, la sostituisco col 3D e il video esce comunque.

## Copione (italiano, circa 230 parole)
Le indicazioni tra parentesi quadre sono per la voce v3 e non vengono lette.

**1.** [calm] Sulla strada, il pericolo arriva quasi sempre da dietro… proprio dove non puoi guardare.

**2.** L'Europa ha reso obbligatori i sensori d'angolo cieco sui camion e sui bus nuovi. Ma per strada ci sono milioni di mezzi che non li avranno mai: bici, monopattini, auto vecchie, furgoni, camion che gireranno per altri quindici anni.

**3.** Per loro abbiamo costruito [NOME]. Un ADAS posteriore che si aggiunge a qualsiasi mezzo: una camera, un sensore a ultrasuoni e un Raspberry Pi. L'intelligenza artificiale gira tutta a bordo: nessuna immagine lascia il veicolo.

**4.** Per ogni veicolo dietro di te capisce cos'è, tra quanti secondi ti raggiunge e quanto vicino passerà. Quando ti è di fianco, l'ultrasuono misura la distanza vera. [serious] Il modello lo abbiamo addestrato noi, su più di cinquemila immagini riprese da dietro: di notte riconosce nove sorpassi su dieci.

**5.** Ecco la demo, in tempo reale. La macchinina si avvicina: ambra, solo luce. Troppo vicina, troppo veloce: rosso, luce e suono.

**6.** In bici l'avviso arriva nel casco. La luce si accende ai bordi della vista, dal lato da cui arriva il pericolo, senza distrarti. Se il collegamento cade, il casco non resta spento: lampeggia ambra. E se cadi e non ti rialzi, dopo dieci secondi parte la richiesta di aiuto. Su un'auto o su un camion, lo stesso avviso arriva in cabina.

**7.** E ogni caduta, ogni buca, ogni quasi incidente diventa un dato anonimo sulla mappa di Torino. [warm] [NOME]. Gli occhi che non hai dietro la testa.

## Domande per te (una parola ciascuna)
1. **Nome:** Nuca, Guardaspalle o Sesto? *(Consiglio Nuca: suona bene anche in inglese e lega casco e ADAS.)*
2. **Lingua della voce:** italiano con sottotitoli in inglese, oppure inglese? *(Consiglio italiano: la giuria è a Torino e la voce italiana suona più nostra.)*
3. **Casco:** le zone si accendono con gli avvisi veri della Pi o con il simulatore `sender.py`? Nel repo il casco riceve dal simulatore, e non vedo il collegamento dalla Pi. *(Mi serve per non dire nel video una cosa falsa: se è il simulatore, lo racconto come prossimo collegamento.)*
4. **Ripresa da davanti:** faccio passare dal modello il video "Highway at night"? *(Consiglio sì: dimostra che funziona anche montato davanti.)*
