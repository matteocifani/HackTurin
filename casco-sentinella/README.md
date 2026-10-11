# Casco Sentinella — HackTurin 2026 (Track 3 "City Signals"): istruzioni di avvio della demo da completare in Fase 5.

## Interfaccia web (kit IAMAimpresa)

Le tre pagine (`/` mappa pubblica, `/comune` dashboard, `/emergenza` centrale 112 simulata) sono costruite con il
design system del kit IAMAimpresa e compilate in statico dentro `server/static/ui/`: **si avvia solo il server
FastAPI**, come prima, e nessun Node è richiesto per la demo. Le pagine precedenti restano raggiungibili sotto
`/legacy`, `/legacy/comune`, `/legacy/emergenza`. Per modificare la UI e ricompilarla vedi `webapp/README.md`.
