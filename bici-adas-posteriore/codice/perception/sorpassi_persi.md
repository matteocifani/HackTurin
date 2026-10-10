# Sorpassi persi sul video notturno: elenco e cause

*Scritto dal thread "ADAS per qualsiasi mezzo", sab 10 ottobre alle 23. È materiale per il thread "Migliorare YOLO e misure": qui non si modifica `bike_adas.py`.*

## Video e prova
- **Video:** `/mnt/project-files/hackturin/prova_mezzo/video_notte_autostrada_720.mp4`. Dura 146 s, è a 1280×720 e 25 fps, di notte. È la camera posteriore di un'auto sul Queensferry Crossing (UK, si guida a sinistra: chi sorpassa passa sulla sinistra dell'immagine, cioè sul lato R del mezzo).
- **Comando:**
  ```bash
  python3 bike_adas.py --source video_notte_autostrada_720.mp4 --mezzo auto --model yolo26n.pt --imgsz 192,480 --log-tracks --save annot.mp4
  ```
  Ho usato `bike_adas.py` alle 22:06, cioè il modello e l'ingresso di default del Pi, ma in formato `.pt` invece che NCNN.
- **Risultato:** 3 rossi, 8 ambra e 19 avvisi "da radar". Una versione precedente, con yolo11n a 640, dava 9 rossi.

## Sorpassi e avvicinamenti veri, controllati a occhio, e cosa ha fatto il sistema
| Tempo nel video | Cosa succede | Traccia | Livello massimo | Causa probabile |
|---|---|---|---|---|
| 10–14 s | auto sorpassa stretta | id 17 | **rosso** ✓ | – |
| 20–24 s | auto sorpassa | id 45, appare a 23,2 s | ambra | rilevata tardi, già quasi al bordo; distanza laterale stimata 4,8 m (probabilmente troppo: con il riquadro dei soli fari stretto la stima laterale cresce), quindi traiettoria "larga" |
| 39–43 s | auto sorpassa | id 55, appare a 42 s | **nessuno** | rilevata solo nell'ultimo secondo e già al bordo: TTC sopra soglia, poi la traccia finisce |
| 55–59 s | auto sorpassa, fari ben visibili | nessuna | **nessuno** | **riquadro mancato**: YOLO non vede l'auto (solo fari nel buio) |
| 70–74 s | auto sorpassa vicina | id 60, 0,7 s | **nessuno** | vista solo al bordo, troppo poco per una TTC; nessun avviso |
| 81–85 s | auto sorpassa | nessuna | **nessuno** | **riquadro mancato** |
| 89–93 s | auto sorpassa | nessuna | **nessuno** | **riquadro mancato** |
| 97–100 s | furgone bianco sorpassa | id 83 | **rosso** ✓ | – |
| 103–106 s | auto sorpassa | nessuna | **nessuno** | **riquadro mancato** (la traccia 91 è un'altra auto, in coda) |
| 123–126 s | auto a destra dell'immagine (lato L) | id 149/152 | nessuno | probabilmente giusto: corsia lontana |
| 130–146 s | auto che arriva vicina dietro e si affianca | id 187 | **rosso** ✓ | – |
| 0–60 s | auto in coda dietro, in linea | quasi mai | nessuno | riquadro mancato quando di lei si vedono solo i fari; con la bici vera lo coprirebbe l'ultrasuono sotto i 3–4 m |

**Totale:** 3 sorpassi su 10 hanno dato il rosso. 4 sono persi perché YOLO non vede l'auto, 3 perché la vede tardi e solo al bordo.

## Causa 1: di notte YOLO non vede le auto, ed è la più importante
Stesso video, una inferenza ogni 3 fotogrammi, `conf` 0,25, stesso ritaglio `--crop`. Il numero è la quota di fotogrammi con un veicolo largo più di 60 px dentro ciascuna finestra di sorpasso, mediata sulle 11 finestre:

| Modello e ingresso | Media sulle finestre | Fotogrammi con un veicolo |
|---|---|---|
| yolo26n 192×480 (**default attuale del Pi**) | 0,45 | 35% |
| yolo26n 192×480 + gamma 0,5 | 0,46 | 34% |
| yolo26n 320 | 0,32 | 22% |
| yolo26n 640 | 0,45 | 35% |
| yolo11n 320 | 0,25 | 16% |
| **yolo11n 192×480** | **0,53** | 36% |
| **yolo11n 192×480 + gamma 0,5** | **0,60** | 41% |
| yolo11n 640 | 0,61 | 46% |

- **Di notte yolo11n vede più di yolo26n,** a parità di ingresso.
- **Schiarire le ombre** con una LUT gamma 0,5 prima di YOLO (`cv2.LUT`, costa quasi niente) porta yolo11n a 192×480 allo stesso livello di yolo11n a 640, che sul Pi costerebbe circa 4 volte di più.
- **Proposta:** usare yolo11n 192×480 con la gamma quando l'immagine è scura (luminosità media sotto ~60) e lasciare l'immagine normale di giorno. Da verificare anche su un video diurno che la gamma non peggiori.
- **Le finestre 55–59 s e 81–85 s restano quasi cieche con tutti i modelli:** si vedono solo due fari. Per quelle servirebbe un rilevatore di coppie di fari (due macchie chiare alla stessa altezza che si allargano), oppure accettare il limite e dichiararlo.

## Causa 2: auto viste tardi e solo al bordo non danno avviso
- La TTC parte solo con almeno 4 punti su 0,3 s di riquadri interi. Un'auto rilevata per la prima volta già grande o già tagliata dal bordo (42 s, 73 s) non arriva mai a una TTC e resta a livello 0.
- **Proposta:** se una traccia nuova nasce già vicina (d < ~8 m, oppure riquadro largo più del 25% dell'immagine) o già al bordo laterale, dare subito almeno ambra su quel lato per `--hold`. Un veicolo che è già di fianco a te è un'informazione utile anche senza TTC.

## Causa 3: stima laterale gonfiata di notte
- Al secondo 23 la distanza laterale stimata è 4,8 m, ma l'auto è nella corsia accanto (circa 3–3,5 m dal centro). Così la traiettoria risulta "larga" e l'avviso resta ambra.
- **Ipotesi da verificare:** di notte il riquadro abbraccia solo i fari ed è più stretto dell'auto vera, quindi la stima in "larghezze d'auto" cresce. Si potrebbe limitare la distanza laterale che si fida della larghezza quando il riquadro è al bordo, oppure usare la parte bassa del riquadro e il piano della strada.

## Cosa riprovare dopo le modifiche
Lo stesso comando sullo stesso video. Obiettivo: almeno 7 sorpassi su 10 con il rosso o l'ambra sul lato giusto, senza aumentare gli avvisi nella corsia lontana (123–126 s).
