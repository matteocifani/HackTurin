# Server laptop — FastAPI + SQLite + mappa web (SPEC §7–§9)

Tutti i comandi in **PowerShell**, dalla cartella `casco-sentinella`. Non serve attivare il venv: si usa direttamente `.\.venv\Scripts\python.exe`.

```powershell
cd "C:\Users\39334\Documents\Hackaton\HackTurin 2026\HackTurin\casco-sentinella"

# 1. Una volta sola: ambiente Python e dipendenze
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r server\requirements.txt

# 2. Test automatici delle API
.\.venv\Scripts\python.exe -m pytest server\tests -q

# 3. Avvio del server (lasciare aperta questa finestra)
.\.venv\Scripts\python.exe -m uvicorn app:app --app-dir server --host 0.0.0.0 --port 8000

# 4. In un'altra finestra: dati storici SIMULATI (300 eventi, 90 giorni; rilanciarlo non crea doppioni)
.\.venv\Scripts\python.exe tools\seed_demo_data.py

# 5. Simulatore del casco (senza hardware)
.\.venv\Scripts\python.exe tools\simulate_helmet.py                                  # 1 evento a caso
.\.venv\Scripts\python.exe tools\simulate_helmet.py --type IMPATTO_VIOLENTO --emergency
.\.venv\Scripts\python.exe tools\simulate_helmet.py --rate 6 --count 0               # continuo, Ctrl+C per fermare
```

Pagine: http://localhost:8000/ (mappa pubblica), `/comune` (dashboard), `/emergenza` (112 SIMULATO), `/docs` (API).

- **Database**: `server\data\events.db`, non versionato. Per ripartire da zero: fermare il server ed eseguire `Remove-Item server\data\events.db*`.
- **Hotspot**: `tools\geocode_hotspots.py` (`--only-missing` per ricalcolare solo i punti mancanti) genera `data\hotspots.json`. Ogni punto va controllato a mano sulla mappa, poi si imposta `"verified": true`.
- **Dalla UNO Q**: il casco usa `http://<IP-laptop>:8000`. L'IP si legge con `ipconfig` (voce "Indirizzo IPv4" della scheda Wi-Fi). Al primo avvio Windows chiede di consentire Python nel firewall: autorizzarlo su **rete privata**.
