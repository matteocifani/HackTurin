"""Geocodifica gli hotspot di data/hotspots_input.json → data/hotspots.json (SPEC §9).

Solo libreria standard. Fonti: OpenStreetMap
  - incroci: Overpass API, geometria delle strade con quei nomi attorno a Torino;
    il punto è dove le due strade si avvicinano di più (funziona anche con rotonde e piazze);
  - luoghi/quartieri: Nominatim (max 1 richiesta/s, User-Agent esplicito).
Un incrocio non trovato resta senza coordinate: va sistemato a mano, non con un punto a caso.

Tutti i punti escono con "verified": false. Un umano li controlla sulla mappa e
mette "verified": true a mano prima di usarli nella demo.

Uso (dalla cartella casco-sentinella):
    .\\.venv\\Scripts\\python.exe tools\\geocode_hotspots.py
"""

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "hotspots_input.json"
OUTPUT = ROOT / "data" / "hotspots.json"

USER_AGENT = "CascoSentinella-HackTurin2026/0.1 (hackathon prototype; github.com/Grinta-V/casco-sentinella)"
NOMINATIM = "https://nominatim.openstreetmap.org/search"
# Overpass è spesso sovraccarico (errori 500/504): provo più server, con pause crescenti
OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
TORINO_BBOX = "44.99,7.57,45.15,7.78"   # sud,ovest,nord,est: riquadro attorno al Comune
PAUSE_S = 1.5             # > 1 s: rispetta la policy di Nominatim, gentile anche con Overpass
MAX_GAP_M = 40            # due strade "si incrociano" se i loro vertici più vicini distano meno di così

_street_cache: dict[str, list] = {}


def http_get_json(url: str, data: bytes | None = None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def dist_m(a, b) -> float:
    dlat = (a[0] - b[0]) * 111_320
    dlon = (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0]))
    return math.hypot(dlat, dlon)


def mean(points):
    return (sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points))


def overpass(query: str):
    data = urllib.parse.urlencode({"data": query}).encode()
    last_exc = None
    for attempt in range(3):
        for url in OVERPASS_SERVERS:
            try:
                return http_get_json(url, data)
            except Exception as exc:
                last_exc = exc
                print(f"   (Overpass {urllib.parse.urlparse(url).netloc}: {exc}, riprovo)", flush=True)
                time.sleep(PAUSE_S * (attempt + 2))
    raise RuntimeError(f"Overpass non disponibile: {last_exc}")


def street_vertices(name: str) -> list:
    """Tutti i vertici delle strade OSM con questo nome nel riquadro di Torino (con cache)."""
    if name not in _street_cache:
        q = f'[out:json][timeout:60][bbox:{TORINO_BBOX}];way["highway"]["name"="{name}"];out geom;'
        res = overpass(q)
        time.sleep(PAUSE_S)
        _street_cache[name] = [(g["lat"], g["lon"]) for w in res.get("elements", []) for g in w.get("geometry", [])]
    return _street_cache[name]


def street_crossing(street_a: str, street_b: str):
    """Punto in cui le due strade si avvicinano di più: (punto, distanza_m) oppure None."""
    va, vb = street_vertices(street_a), street_vertices(street_b)
    if not va or not vb:
        return None, f"{street_a if not va else street_b}: strada non trovata in OSM"
    best = min(((dist_m(a, b), a, b) for a in va for b in vb), key=lambda t: t[0])
    d, a, b = best
    if d > MAX_GAP_M:
        return None, f"{street_a} × {street_b}: le strade non si incrociano (minimo {d:.0f} m)"
    return mean([a, b]), f"{street_a} × {street_b}: incrocio trovato (scarto {d:.0f} m)"


def nominatim(query: str):
    params = urllib.parse.urlencode({"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "it"})
    res = http_get_json(f"{NOMINATIM}?{params}")
    time.sleep(PAUSE_S)
    if not res:
        return None
    r = res[0]
    return (float(r["lat"]), float(r["lon"])), r.get("display_name", "")


def geocode(item: dict) -> dict:
    out = {"id": item["id"], "name": item["name"], "why": item.get("why", ""), "verified": False}
    if item["kind"] == "intersection":
        centers, details = [], []
        for a, b in item["pairs"]:
            c, msg = street_crossing(a, b)
            details.append(msg)
            if c:
                centers.append(c)
        if not centers:
            # niente fallback sul centro della strada: per un corso lungo km sarebbe un punto sbagliato
            out.update(lat=None, lon=None, method="not_found", detail="; ".join(details))
            return out
        c = mean(centers)
        if len(centers) > 1:
            details.append(f"punto = media di {len(centers)} incroci distanti {dist_m(centers[0], centers[1]):.0f} m")
        out.update(lat=round(c[0], 6), lon=round(c[1], 6), method="osm_street_crossing", detail="; ".join(details))
        return out
    found = nominatim(item["query"])
    if not found:
        out.update(lat=None, lon=None, method="not_found", detail="Nominatim: nessun risultato")
        return out
    (lat, lon), display = found
    out.update(lat=round(lat, 6), lon=round(lon, 6), method="nominatim", detail=display)
    return out


def main():
    items = json.loads(INPUT.read_text(encoding="utf-8"))
    previous = {}
    if "--only-missing" in sys.argv and OUTPUT.exists():
        previous = {p["id"]: p for p in json.loads(OUTPUT.read_text(encoding="utf-8"))["points"]}
    points = []
    for item in items:
        old = previous.get(item["id"])
        if old and old.get("lat") is not None:
            points.append(old)
            print(f"= {item['name']}: già presente ({old['lat']}, {old['lon']})")
            continue
        print(f"→ {item['name']} ...", flush=True)
        try:
            p = geocode(item)
        except Exception as exc:   # rete o servizio non disponibile: lo segnalo e continuo
            p = {"id": item["id"], "name": item["name"], "lat": None, "lon": None,
                 "method": "error", "detail": str(exc), "verified": False}
        points.append(p)
        print(f"   {p['lat']}, {p['lon']}  [{p['method']}]  {p['detail']}")
    OUTPUT.write_text(json.dumps({
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": "OpenStreetMap contributors (ODbL), via Overpass API e Nominatim",
        "note": "verified=false finché un umano non ha controllato il punto sulla mappa",
        "points": points,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    missing = [p["name"] for p in points if p["lat"] is None]
    print(f"\nSalvato {OUTPUT.relative_to(ROOT)}: {len(points) - len(missing)}/{len(points)} punti trovati.")
    if missing:
        print("NON trovati:", ", ".join(missing))
    print("Controlla ogni punto su https://www.openstreetmap.org/?mlat=LAT&mlon=LON#map=18/LAT/LON e metti verified=true.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
