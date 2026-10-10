"""Generazione di eventi finti coerenti con il contratto SPEC §3.1/§3.2 e la tassonomia §4.

Usato da seed_demo_data.py e simulate_helmet.py. Solo libreria standard.
I valori delle feature sono plausibili ma INVENTATI: servono a provare server e mappa.
"""

import json
import math
import random
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOTSPOTS = ROOT / "data" / "hotspots.json"
ROUTE = ROOT / "data" / "demo_route.json"

TYPES = ["BUCA", "CADUTA_DA_DISSESTO", "CADUTA_SENZA_CAUSA_RILEVATA", "IMPATTO_VIOLENTO"]
CONFIDENCE = {"BUCA": 0.6, "CADUTA_DA_DISSESTO": 0.7, "IMPATTO_VIOLENTO": 0.5, "CADUTA_SENZA_CAUSA_RILEVATA": 0.5}
T_VIOLENT_G = 6.0   # stessa soglia di SPEC §5.4 / config.py


def load_points(prefer_route: bool = False) -> list[dict]:
    """Punti con coordinate da demo_route.json (se richiesto ed esiste) o da hotspots.json."""
    if prefer_route and ROUTE.exists():
        data = json.loads(ROUTE.read_text(encoding="utf-8"))
        pts = data["points"] if isinstance(data, dict) else data
    elif HOTSPOTS.exists():
        pts = json.loads(HOTSPOTS.read_text(encoding="utf-8"))["points"]
    else:
        raise SystemExit("Manca data/hotspots.json: esegui prima tools/geocode_hotspots.py")
    pts = [p for p in pts if p.get("lat") is not None]
    if not pts:
        raise SystemExit("Nessun punto con coordinate in data/hotspots.json")
    unverified = [p["name"] for p in pts if p.get("verified") is False]
    if unverified:
        print(f"ATTENZIONE: {len(unverified)} punti non ancora verificati da un umano: {', '.join(unverified)}")
    return pts


def jitter(lat: float, lon: float, sigma_m: float, rng: random.Random) -> tuple[float, float]:
    dlat = rng.gauss(0, sigma_m) / 111_320
    dlon = rng.gauss(0, sigma_m) / (111_320 * math.cos(math.radians(lat)))
    return round(lat + dlat, 6), round(lon + dlon, 6)


def features_for(event_type: str, rng: random.Random) -> dict:
    """Feature MCU (SPEC §3.1) coerenti con il tipo, così il classificatore darebbe lo stesso risultato."""
    if event_type == "BUCA":
        return {"shock_peak_g": round(rng.uniform(1.6, 4.5), 2), "shock_to_impact_ms": -1, "impact_peak_g": 0,
                "gyro_peak_dps": round(rng.uniform(40, 200)), "freefall_ms": 0,
                "rotation_deg": round(rng.uniform(0, 15)), "still_s": 0}
    f = {"gyro_peak_dps": round(rng.uniform(200, 900)), "freefall_ms": rng.choice([0, 0, 40, 90, 140]),
         "rotation_deg": round(rng.uniform(55, 120)), "still_s": 0}
    if event_type == "CADUTA_DA_DISSESTO":
        f.update(shock_peak_g=round(rng.uniform(1.8, 5.0), 2), shock_to_impact_ms=rng.randint(250, 1400),
                 impact_peak_g=round(rng.uniform(3.2, 7.5), 2))
    elif event_type == "IMPATTO_VIOLENTO":
        f.update(shock_peak_g=0, shock_to_impact_ms=-1, impact_peak_g=round(rng.uniform(T_VIOLENT_G, 15.5), 2))
    else:
        f.update(shock_peak_g=0, shock_to_impact_ms=-1, impact_peak_g=round(rng.uniform(3.1, T_VIOLENT_G - 0.1), 2))
    return f


def alarm_for(event_type: str, force_emergency: bool, rng: random.Random) -> str:
    if event_type == "BUCA":
        return "NONE"
    if force_emergency:
        return "SENT"
    return rng.choices(["SENT", "CANCELED", "MOVEMENT_RESUMED"], weights=[25, 35, 40])[0]


def build_event(*, event_type: str, lat: float, lon: float, age_ms: int, device_id: str, alarm: str,
                rng: random.Random, simulated: bool, classifier: str, position_source: str) -> dict:
    f = features_for(event_type, rng)
    if alarm in ("SENT", "CANCELED"):
        f["still_s"] = round(rng.uniform(8, 12), 1)
    elif alarm == "MOVEMENT_RESUMED":
        f["still_s"] = round(rng.uniform(0, 6), 1)
    return {
        "event_id": str(uuid.UUID(int=rng.getrandbits(128), version=4)),
        "device_id": device_id,
        "age_ms": max(0, int(age_ms)),
        "lat": lat, "lon": lon,
        "position_source": position_source,
        "type": event_type,
        "confidence": CONFIDENCE[event_type],
        "emergency": alarm == "SENT",
        "alarm_state": alarm,
        "features": f,
        "classifier": classifier,
        "simulated": simulated,
        "fw": "sim",
    }


def post_json(url: str, payload: dict, timeout: float = 3.0) -> tuple[int, dict | str]:
    """POST JSON con urllib. Ritorna (status HTTP, risposta). Solleva OSError se il server non risponde."""
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:     # 4xx/5xx: il server ha risposto, ma ha rifiutato
        return e.code, e.read().decode("utf-8", "replace")
