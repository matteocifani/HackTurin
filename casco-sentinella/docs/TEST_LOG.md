# TEST_LOG — risultati verificati

Regola: qui si scrive solo ciò che è stato **provato davvero**, con data/ora, chi, cosa e risultato osservato. Un test non scritto qui non è considerato fatto.

| Data/ora | Chi | Test | Risultato osservato | OK/KO | Note |
|---|---|---|---|---|---|
| 09/10/2026 | Nicolò | Compilazione sketch Blink per UNO Q (Arduino IDE 2) | Compilato: 75.096 byte programma (9%), 30.556 byte RAM (11%) | OK | Upload e funzionamento sulla scheda NON ancora verificati |
| 10/10/2026 | Nicolò | Fase 1 — controllo visivo web (server + seed + simulatore sul laptop) | Mappa pubblica, /comune (tabella, cambio stato, top 10 hotspot, export CSV) e /emergenza funzionano | OK | Verifica a vista; test automatici API 15/15 verdi (commit 9c8ac6d). Nessun hardware coinvolto |
| 11/10/2026 13:05 | Nicolò (con Claude) | Nuova webapp (kit IAMAimpresa, Next statico in `webapp/`): `pnpm build` export statico; pytest; FastAPI serve le pagine nuove | Build ok (pagine `/`, `/comune`, `/emergenza` esportate); 19/19 test API verdi con `app.py` modificato; con il server avviato `curl` dà 200 su `/`, `/comune`, `/emergenza`, `/comune.txt`, `/_next/static/...`, `/legacy/*`, `/api/events`, `/api/devices`, `/api/stats` (DB con 302 eventi) | OK | Verifica a riga di comando, non visiva: resa delle pagine nel browser ancora da controllare |
| 11/10/2026 13:54 | Nicolò (con Claude) | UI nuova: resa delle tre pagine in Edge headless 1920×1080 (screenshot) con server FastAPI e DB demo (302 eventi) | `/`: shell con sidebar, filtri per tipo con contatori, heatmap + marker; `/comune`: KPI, mappa con casco "C", top 10 hotspot, grafico eventi/giorno, fasce orarie, tabella con badge; `/emergenza`: tema scuro, coda, scheda con minimappa e dati sensore | OK | Trovato e corretto `L.heatLayer is not a function` (plugin heat agganciato a `window.L`). Non ancora provato con clic reali: pannello dettaglio, cambio stato, toast, navigazione fra pagine |
