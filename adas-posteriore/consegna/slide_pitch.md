# Pitch: schema di 6 slide

*Bozza di sabato 10/10 notte. Una slide = un messaggio. Poco testo sulle slide, il resto lo dite voi. Le parti tra `[[ ... ]]` sono da aggiornare o verificare.*

---

### Slide 1 — Il problema
- **Titolo:** Il pericolo arriva da dietro.
- **Sulla slide:** una foto grande di un sorpasso stretto ripreso da dietro. Un solo numero: `[[ verify: morti in bici in Italia nel 2025, +23% (ISTAT) ]]`.
- **Da dire:** "I morti in strada calano, quelli in bici crescono. E il pericolo arriva da dietro, dove non guardi. Ma non è solo un problema delle bici."

### Slide 2 — Chi resta senza ADAS
- **Titolo:** L'Europa lo impone sul nuovo. E tutto il resto?
- **Sulla slide:** a sinistra "Dal 2024: angolo cieco obbligatorio su camion e bus nuovi (GSR 2019/2144, UNECE R151)". A destra le icone dei mezzi che non lo avranno mai: bici, monopattino, auto vecchia, furgone, camion, bus. In basso: "Londra obbliga già i camion al retrofit (Direct Vision Standard)".
- **Da dire:** "I mezzi che circolano oggi resteranno per strada altri 15 anni senza nessun aiuto. E i radar per bici suonano per ogni auto, finché smetti di ascoltarli."

### Slide 3 — La soluzione
- **Titolo:** Guardaspalle: un ADAS posteriore per qualsiasi mezzo.
- **Sulla slide:** foto della scatola (camera + HC-SR04) e del casco/unità con i LED. Tre parole grandi: **Cosa · Tra quanti secondi · Quanto vicino**. Sotto: "AI tutta a bordo · ~150 € di componenti · si monta in minuti".
- **Da dire:** "Una scatola con camera, ultrasuono e un Raspberry Pi. Capisce cosa arriva, tra quanti secondi e su che traiettoria, e avvisa solo quando conta: sulla bici nel casco, sugli altri mezzi in cabina."
- **A questo punto: demo dal vivo con la macchinina** (vedi sotto).

### Slide 4 — Come funziona
- **Titolo:** Percepire, decidere, avvisare.
- **Sulla slide:** lo schema a blocchi: webcam + HC-SR04 → YOLO26n NCNN + ByteTrack sul Pi 4 (~8 fps `[[ aggiornare ]]`) → rischio = peso × urgenza × traiettoria → UNO Q (LED, buzzer) + pagina web. Due etichette in evidenza: "tempo all'impatto senza calibrazione" e "fail-safe: se l'AI si blocca, ambra in 1 s".
- **Da dire:** "Il tempo all'impatto si ricava da come cresce il riquadro, quindi non serve calibrare. L'ultrasuono misura gli ultimi metri e tara la camera da solo. E la parte che avvisa gira su un microcontrollore: se il Pi si blocca, non resta muto."

### Slide 5 — Avvisa solo quando conta, su qualsiasi mezzo
- **Titolo:** Meno allarmi, quelli giusti.
- **Sulla slide:** un numero enorme: **Radar 27 → Guardaspalle 9** (stesso video notturno) `[[ ricontrollare col modello finale ]]`. Sotto, la tabella dei profili in piccolo: bici · monopattino · auto · furgone · camion · bus, "stesso codice, un parametro". Se c'è spazio, la tabella dei costi (Mobileye/kit camion `[[ verify ]]`, Garmin Varia `[[ verify ]]`, noi ~150 €).
- **Da dire:** "Sullo stesso video un radar avrebbe suonato 27 volte, noi 9. E lo stesso software va su una bici o su un camion: sulla bici fa paura il camion, sul camion fa paura la bici nell'angolo cieco."
- `[[ se è pronto: numero sui sorpassi notturni riconosciuti, X su 10 ]]`

### Slide 6 — Torino e prossimi passi
- **Titolo:** Ogni quasi-incidente diventa un dato per la città.
- **Sulla slide:** mappa di Torino con punti di eventi (dichiarati simulati se lo sono). Tre righe di roadmap: angolo cieco laterale per camion e bus; monitoraggio del guidatore (l'altro sistema che l'UE impone solo sul nuovo); radar per notte e pioggia. In basso: link al repo e QR code.
- **Da dire:** "Se i bus di Torino montassero Guardaspalle, il Comune saprebbe quali incroci producono quasi-incidenti prima che ci scappi il morto. Dati aperti e anonimi: nessuna immagine esce dal mezzo. Guardaspalle: l'ADAS per chi non ce l'ha."

---

## Demo dal vivo (dopo la slide 3, circa 60 s)
1. La macchinina si avvicina alla scatola: la dashboard passa ad ambra, poi a rosso con il bip.
2. La pagina `/test`: camera, ultrasuono e distanza fusa affiancati.
3. `[[ se funziona ]]` Un giudice indossa il casco e gira la testa: verde se libero, rosso se arriva la macchinina.
4. Si stacca la webcam: le luci vanno in ambra lento. "La sicurezza non dipende dall'AI."

## Domande probabili (risposte brevi)
- **"Esiste già il Garmin Varia."** Suona per tutto e non sa cosa arriva. Noi sappiamo la classe, il tempo all'impatto e la traiettoria, e avvisiamo solo per i pericoli veri.
- **"È certificato?"** No: è un aiuto alla guida, non sostituisce gli specchi. Il passo successivo è la R151.
- **"Di notte?"** Funziona sui fari ma perde alcuni sorpassi: `[[ numero aggiornato ]]`. La roadmap è la fusione con un radar.
- **"Su un camion vero?"** Provato su video reali e in scala. Su un camion vero servono più camere, a partire dal fianco destro.
- **"Privacy?"** Nessuna registrazione continua: solo clip brevi degli eventi rossi, salvate a bordo.
- **"Chi paga?"** Flotte e logistica (assicurazioni), il Comune per bus e dati, i ciclisti per la versione bici.
