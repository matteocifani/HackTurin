"""Controllo automatico degli hotspot con reverse geocoding Nominatim (1 richiesta/s).

Per ogni punto di data/hotspots.json chiede a Nominatim "che indirizzo c'è qui?" e controlla
che la via o il quartiere restituiti siano tra quelli attesi ("expect" in hotspots_input.json).
Il risultato viene salvato nel campo "reverse_check" di ogni punto.

NON sostituisce il controllo umano sulla mappa (verified=true resta manuale): segnala solo i punti sospetti.

Uso:
    .\\.venv\\Scripts\\python.exe tools\\check_hotspots.py
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "hotspots_input.json"
HOTSPOTS = ROOT / "data" / "hotspots.json"
USER_AGENT = "CascoSentinella-HackTurin2026/0.1 (hackathon prototype; github.com/Grinta-V/casco-sentinella)"
REVERSE = "https://nominatim.openstreetmap.org/reverse"
PAUSE_S = 1.1    # policy Nominatim: massimo 1 richiesta al secondo


def reverse(lat: float, lon: float) -> dict:
    q = urllib.parse.urlencode({"lat": lat, "lon": lon, "format": "jsonv2", "zoom": 18, "addressdetails": 1})
    req = urllib.request.Request(f"{REVERSE}?{q}", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def main():
    expect = {i["id"]: i.get("expect", []) for i in json.loads(INPUT.read_text(encoding="utf-8"))}
    data = json.loads(HOTSPOTS.read_text(encoding="utf-8"))
    rows, suspicious = [], 0
    for p in data["points"]:
        if p.get("lat") is None:
            continue
        addr = reverse(p["lat"], p["lon"]).get("address", {})
        time.sleep(PAUSE_S)
        road = addr.get("road") or addr.get("pedestrian") or addr.get("square") or "—"
        zone = addr.get("quarter") or addr.get("suburb") or addr.get("neighbourhood") or "—"
        values = " | ".join(str(v) for v in addr.values()).lower()
        ok = any(name.lower() in values for name in expect.get(p["id"], []))
        suspicious += not ok
        p["reverse_check"] = {"road": road, "zone": zone, "matches_expected": ok}
        rows.append((p["id"], f"{p['lat']:.6f}, {p['lon']:.6f}", road, zone, "OK" if ok else "⚠ NON sulla via attesa"))
    HOTSPOTS.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print("| id | coordinate | via restituita | zona | esito |")
    print("|---|---|---|---|---|")
    for r in rows:
        print("| " + " | ".join(r) + " |")
    print(f"\n{len(rows) - suspicious}/{len(rows)} punti sulla via/zona attesa. Il controllo umano resta obbligatorio.")
    return 1 if suspicious else 0


if __name__ == "__main__":
    sys.exit(main())
