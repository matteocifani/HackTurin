"""Arricchimento degli eventi lato server (SPEC §3.4, §4): funzioni pure, senza I/O."""

import math
from datetime import datetime, timedelta, timezone

# --- Configurazione (valori della SPEC, da tarare) ---
BUCA_SEVERITY_SPLIT_G = 3.0          # BUCA: severità 1 se shock_peak_g < soglia, altrimenti 2
SEVERITY_BY_TYPE = {
    "CADUTA_DA_DISSESTO": 4,
    "IMPATTO_VIOLENTO": 5,
    "CADUTA_SENZA_CAUSA_RILEVATA": 3,
}
CELL_LAT_DEG = 0.0009                # ~100 m in latitudine
CELL_LON_DEG = 0.0013                # ~100 m in longitudine a 45° N
DEVICE_ONLINE_S = 15                 # casco online se heartbeat più recente di così (SPEC §7)


def severity(event_type: str, features: dict) -> int:
    if event_type == "BUCA":
        peak = features.get("shock_peak_g") or 0
        return 1 if peak < BUCA_SEVERITY_SPLIT_G else 2
    return SEVERITY_BY_TYPE[event_type]


def event_time(received_at: datetime, age_ms: int) -> datetime:
    """ts = received_at − age_ms (SPEC §3.2): l'unico orologio di riferimento è il laptop."""
    return received_at - timedelta(milliseconds=age_ms)


def time_slot(ts: datetime) -> str:
    """Fascia oraria nell'ora locale del laptop (Torino)."""
    hour = ts.astimezone().hour
    if hour < 6:
        return "notte"
    if hour < 12:
        return "mattina"
    if hour < 18:
        return "pomeriggio"
    return "sera"


def cell_id(lat: float, lon: float) -> str:
    return f"{math.floor(lat / CELL_LAT_DEG)}_{math.floor(lon / CELL_LON_DEG)}"


def cell_center(cid: str) -> tuple[float, float]:
    i, j = (int(x) for x in cid.split("_"))
    return round((i + 0.5) * CELL_LAT_DEG, 5), round((j + 0.5) * CELL_LON_DEG, 5)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def to_ms(dt: datetime) -> int:
    return int(dt.timestamp() * 1000)


def iso_local(dt: datetime) -> str:
    """ISO 8601 con offset locale, al secondo (es. 2026-10-11T10:15:30+02:00)."""
    return dt.astimezone().isoformat(timespec="seconds")
