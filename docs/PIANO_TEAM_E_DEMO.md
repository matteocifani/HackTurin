# Piano team, test e demo — Casco Sentinella

Documento per le persone del team (non per Claude Code). Tempo disponibile: sabato fino alle 21:00 (la sede chiude di notte), domenica 10:00–16:00. Consegna Devpost **entro le 16:00**: puntiamo alle 15:45.

## 1. Ruoli (nomi da assegnare)

| Ruolo | Responsabile | Output verificabile | Dipende da |
|---|---|---|---|
| **P1 — Firmware MCU** (chi sa Arduino/C++) | ___ | Fase 0 (IMU letta), Fase 2 (SHOCK, caduta, allarme, pulsante) | Scheda + Modulino |
| **P2 — Linux UNO Q + integrazione** | ___ | Fase 0 (Bridge + POST HTTP), Python casco, Fase 3 end-to-end | P1 per `get_event`, P3 per l'API |
| **P3 — Server e mappa** (con Claude Code) | ___ | Fase 1: mappa, dashboard Comune, pannello 112, seed, simulatore | Nessuna: parte subito |
| **P4 — Meccanica, prove, demo, pitch** (Nicolò) | Nicolò | Supporto casco stampato, cablaggio pulsante/buzzer, protocollo prove, `TEST_LOG.md`, video, Devpost, coordinamento | P1 per le prove |

Interfacce: P1↔P2 = JSON di `get_event` (SPEC §3.1). P2↔P3 = `POST /api/events` (SPEC §3.2). Nessuno cambia questi formati da solo.

## 2. Tabella di marcia

**Sabato**
- 18:00–18:20 — Tutti: lettura SPEC, repo GitHub creato (pubblico), cartella `casco-sentinella` come repo, Claude Code avviato.
- 18:20–19:45 — P1: Fase 0 lato MCU. P2: Fase 0 Bridge + POST verso il laptop. P3: Fase 1 completa con il simulatore. P4: CAD supporto e **avvio stampa** (verificare con lo staff se una stampa può restare in macchina; altrimenti stamparla domenica alle 10:00), cablaggio pulsante e buzzer.
- 19:45 — Checkpoint 10 minuti: cosa funziona, cosa è bloccato.
- **Obiettivo fine sabato**: mappa che riceve eventi dal simulatore; MCU che legge l'IMU; Python sulla UNO Q che riesce a fare una POST al laptop.

**Domenica**
- 10:00–11:30 — P1: Fase 2. P2: classificatore, coda, percorso simulato. P3: rifinitura dashboard e pannello 112. P4: montaggio sul casco, prove negative (falsi allarmi).
- 11:30–12:30 — **Fase 3: primo end-to-end** → tag `demo-ok-1`.
- 12:30 — Se l'end-to-end non c'è, si passa al **Piano B** (§5). Nessuna nuova funzione finché non c'è.
- 12:30–13:30 — Fase 4: calibrazione rapida con le prove registrate; pranzo a turni.
- **13:30 — Feature freeze.**
- 13:30–14:30 — Prova demo 3 volte di fila; registrazione video (max 2 minuti).
- 14:30–15:30 — Devpost: descrizione, foto, schema, README; controllo che il link GitHub si apra senza login.
- 15:45 — Consegna.

## 3. Protocollo prove (sicurezza prima di tutto)

- **Nessuna persona cade davvero.** Si usa il casco riempito con un asciugamano arrotolato (simula la massa della testa), su un materassino o un cuscino.
- Abbiamo **una sola UNO Q**: altezza massima di caduta 50 cm su superficie morbida, elettronica imbottita nel supporto. Se si stacca un cavo durante una prova, si ferma tutto e si ricontrolla il cablaggio.
- Ogni prova va annotata: n°, classe attesa, cosa ha rilevato il sistema, OK/KO.

| Classe attesa | Come riprodurla | Ripetizioni |
|---|---|---|
| `BUCA` | Casco tenuto dritto, colpo secco dal basso / piccolo rimbalzo sul tavolo (5 cm), resta dritto | 10 |
| `CADUTA_DA_DISSESTO` | Colpo secco, poi entro 1 s il casco cade di lato sul materassino e resta fermo | 10 |
| `CADUTA_SENZA_CAUSA_RILEVATA` | Casco fatto rotolare/scivolare di lato sul materassino senza colpo precedente, resta fermo | 10 |
| `IMPATTO_VIOLENTO` | Casco spinto con forza contro il materassino (a mano, controllato) e lasciato fermo | 10 |
| **Negativi** (non deve partire l'allarme) | Casco appoggiato normalmente sul tavolo; camminata con il casco in testa; annuire/girare la testa; casco messo in uno zaino | 10 totali |

Le prove negative sono importanti quanto le positive: un sistema che chiama i soccorsi per sbaglio non è credibile.

## 4. Script della demo (video ≤ 2 minuti)

1. **0:00–0:20 Problema** — Una slide con 3 numeri di Torino (vedi §7) e la frase: "nessuno sa dove e perché chi va in bici o in monopattino cade".
2. **0:20–0:45 Il casco in viaggio** — Casco acceso, sulla dashboard il marker del casco si muove lungo il percorso [SIMULATO]. Colpo secco → compare un punto `BUCA` sulla mappa pubblica.
3. **0:45–1:25 Caduta** — Il casco cade sul materassino e resta fermo → buzzer di pre-allarme con conto alla rovescia → nessuno annulla → su `/emergenza` compare la scheda "112 SIMULATO" con coordinate e tipo `CADUTA_DA_DISSESTO`; il punto appare anche sulla mappa.
4. **1:25–1:45 Il Comune** — Dashboard: heatmap, top hotspot (corso Regina Margherita, piazza Rivoli…), cambio stato "IN_LAVORAZIONE", export CSV come dato aperto.
5. **1:45–2:00 Onestà** — Cosa è reale (rilevamento e classificazione sulla scheda, invio, mappa) e cosa è simulato (posizione, 112, dati storici). Prossimi passi.

## 5. Piano B (decidere alle 12:30)

| Problema | Piano B |
|---|---|
| Wi-Fi della sede non fa parlare UNO Q e laptop | Hotspot del telefono per entrambi; aggiornare `SERVER_URL` |
| Bridge MCU↔Linux non funziona | L'MCU funziona da solo (buzzer, LED, pulsante); gli eventi verso la mappa li invia il simulatore lanciato a mano. **Da dichiarare nel video.** |
| Rilevamento caduta poco affidabile | Profilo DEMO con soglie più permissive + mostrare anche le prove negative riuscite |
| Tile della mappa non caricano | Hotspot del telefono; in alternativa screenshot preparati prima |

## 6. Domande probabili dei giudici

- **Perché sul casco e non sul manubrio?** Per il monopattino il casco è obbligatorio dal 14/12/2024 e segue la persona (anche in sharing); la testa è il punto giusto per capire se la persona è a terra. Per le buche un sensore sul manubrio sarebbe più sensibile: possibile evoluzione.
- **Falsi allarmi?** Servono caduta + rotazione + immobilità + conto alla rovescia annullabile; mostriamo le prove negative.
- **Privacy?** Mappa pubblica senza identificativi e con coordinate arrotondate; dettagli solo al Comune e all'emergenza.
- **Chiamate davvero il 112?** No, in demo è simulato. Un prodotto reale passerebbe da smartphone o centrale operativa, con un pacchetto dati sul modello eCall delle auto.
- **Chi lo paga?** Ipotesi da discutere, non verificate: Comune (dati per la manutenzione), operatori di sharing (obbligo casco), assicurazioni (l'RC per i monopattini è obbligatoria dal 16/07/2026).
- **Dov'è l'AI?** Classificazione locale sulla scheda: regole calibrate sulle nostre prove (eventualmente un albero decisionale addestrato sui dati registrati). Non dire di più di quanto fatto.

## 7. Numeri e fonti per pitch e Devpost

- Torino 2025: 601 incidenti con bici e monopattini (Istat, via [TorinoCronaca](https://www.torinocronaca.it/news/torino/706085/biciclette-a-torino-600-incidenti-lanno-e-in-italia-vittime-in-aumento-del-20.html)).
- Monopattini a Torino dal 14/12/2024 a giugno 2026: 577 incidenti, 552 feriti, 4 morti (assessore Porcedda in Consiglio comunale, via [La Mescolanza](https://www.lamescolanza.com/2026/07/06/torino-nuove-regole-portano-a-quasi-mille-multe-ai-monopattini-in-un-mese-e-mezzo-e-59-incidenti-con-52-feriti/)).
- Buche: 353 incidenti e 336 feriti nel 2024 (database Polizia Municipale, via [Mole24](https://mole24.it/2025/04/02/quanti-incidenti-causano-le-buche-a-torino-i-dati-aggiornati/)); 831 richieste di risarcimento nel 2024 per 446.000 € ([Mole24](https://mole24.it/2025/06/27/buche-stradali-torino-2025/)).
- Italia 2025: ciclisti morti +20% (198), utenti e-bike +50% (30), monopattini 25, mentre i morti totali calano del 5,3% ([Istat](https://www.istat.it/wp-content/uploads/2026/07/REPORT_INCIDENTI_STRADALI_2025.pdf)).
- Casco obbligatorio per i monopattini dal 14/12/2024; 2.859 multe per casco mancante a Torino nel 2025 ([Clean Cities](https://italy.cleancitiescampaign.org/pums-updates/multe-triplicate-per-monopattini-e-bici-a-torino-oltre-12-mila-sanzioni-in-un-anno/)).
- Il Consiglio comunale ha approvato a maggio 2026 una mozione che chiede il monitoraggio dello stato delle piste ciclabili ([Eco dalle Città](https://www.ecodallecitta.it/torino-nella-citta-dellauto-oltre-4mila-incidenti-lanno-l85-coinvolge-ciclisti/)).
- Hotspot citati: corso Regina Margherita (strada con più incidenti nel 2024 secondo la Polizia Locale, dato provvisorio — [Clean Cities](https://italy.cleancitiescampaign.org/pums-updates/torino-29-5-2024-insicurezza-stradale-5-pedoni-morti-da-inizio-anno/)); piazza Rivoli ([Giornale La Voce](https://www.giornalelavoce.it/news/cronaca/740893/piazza-rivoli-ancora-una-ciclista-investita-e-il-secondo-incidente-in-due-giorni.html)).
- Precedenti: sensori su bici con dati ai comuni di Belfast e Dublino ([See.Sense](https://seesense.cc/blogs/case-studies/smart-belfast-and-see-sense-collaborate-in-pioneering-data-collection-project)); mappatura dei quasi incidenti a Berlino ([SimRa](https://arxiv.org/html/2006.08481v2)); eCall delle auto, Reg. UE 2015/758 ([EUR-Lex](https://eur-lex.europa.eu/IT/legal-content/summary/ecall-in-vehicle-system-type-approval.html)).
