"""Server laptop Casco Sentinella (SPEC §7): API REST + pagine statiche.

Avvio (dalla cartella casco-sentinella):
    .\\.venv\\Scripts\\python.exe -m uvicorn app:app --app-dir server --host 0.0.0.0 --port 8000
"""

import csv
import io
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import enrich
from db import Database
from models import EventIn, HeartbeatIn, StatusPatch

SERVER_DIR = Path(__file__).resolve().parent
STATIC_DIR = SERVER_DIR / "static"
DEFAULT_DB = SERVER_DIR / "data" / "events.db"

PUBLIC_HIDDEN_FIELDS = ("device_id", "device_ts", "fw")   # mai nella mappa pubblica (SPEC §13.6)
CSV_COLUMNS = (
    "id", "event_id", "ts", "received_at", "type", "severity", "status", "confidence",
    "emergency", "alarm_state", "lat", "lon", "position_source", "time_slot", "cell_id",
    "source", "simulated", "device_id", "classifier", "fw", "age_ms", "age_uncertain", "features",
)


def public_view(e: dict) -> dict:
    e = {k: v for k, v in e.items() if k not in PUBLIC_HIDDEN_FIELDS}
    e["lat"] = round(e["lat"], 3)    # ≈ 100 m
    e["lon"] = round(e["lon"], 3)
    return e


def to_ms_local(dt: datetime) -> int:
    """Data dai parametri di query: se senza fuso orario, è ora locale del laptop."""
    return enrich.to_ms(dt.astimezone() if dt.tzinfo is None else dt)


def create_app(db_path: Optional[Path] = None) -> FastAPI:
    db = Database(db_path or Path(os.environ.get("CASCO_DB", DEFAULT_DB)))
    app = FastAPI(title="Casco Sentinella")

    # ---------------- eventi ----------------
    @app.post("/api/events")
    def post_event(ev: EventIn, response: Response):
        received = enrich.now_utc()
        ts = enrich.event_time(received, ev.age_ms)
        row = ev.model_dump(exclude={"origin"})
        row.update(
            received_at=enrich.iso_local(received),
            ts=enrich.iso_local(ts),
            ts_ms=enrich.to_ms(ts),
            status="NUOVO",
            severity=enrich.severity(ev.type, ev.features),
            time_slot=enrich.time_slot(ts),
            cell_id=enrich.cell_id(ev.lat, ev.lon),
            source=ev.origin,
        )
        saved, created = db.insert_event(row)
        response.status_code = 201 if created else 200   # 200 = reinvio già ricevuto, nessun doppione
        return {"created": created, "event": saved}

    @app.get("/api/events")
    def get_events(
        type: Optional[str] = Query(None, description="uno o più tipi separati da virgola"),
        from_: Optional[datetime] = Query(None, alias="from"),
        to: Optional[datetime] = None,
        after_id: int = 0,
        status: Optional[str] = None,
        limit: int = Query(5000, ge=1, le=20000),
        public: int = 0,
    ):
        where, params = ["id > ?"], [after_id]
        if type:
            types = [t.strip() for t in type.split(",") if t.strip()]
            where.append(f"type IN ({','.join('?' * len(types))})")
            params += types
        if from_:
            where.append("ts_ms >= ?")
            params.append(to_ms_local(from_))
        if to:
            where.append("ts_ms <= ?")
            params.append(to_ms_local(to))
        if status:
            where.append("status = ?")
            params.append(status)
        events = db.query_events(where, params, limit)
        return [public_view(e) for e in events] if public else events

    @app.patch("/api/events/{event_id}")
    def patch_event(event_id: str, body: StatusPatch):
        if not db.set_status(event_id, body.status):
            raise HTTPException(404, "evento non trovato")
        return db.get_event(event_id)

    @app.get("/api/emergencies")
    def get_emergencies(after_id: int = 0, limit: int = Query(200, ge=1, le=5000)):
        return db.query_events(["id > ?", "emergency = 1"], [after_id], limit)

    # ---------------- caschi ----------------
    @app.post("/api/heartbeat")
    def post_heartbeat(hb: HeartbeatIn):
        now = enrich.now_utc()
        db.upsert_device(hb.device_id, enrich.iso_local(now), enrich.to_ms(now), hb.model_dump())
        return {"ok": True}

    @app.get("/api/devices")
    def get_devices():
        now_ms = enrich.to_ms(enrich.now_utc())
        out = []
        for d in db.list_devices():
            age_s = (now_ms - d["last_seen_ms"]) / 1000
            out.append({
                **d["payload"],
                "last_seen": d["last_seen"],
                "seconds_ago": round(age_s, 1),
                "online": age_s < enrich.DEVICE_ONLINE_S,
            })
        return out

    # ---------------- statistiche / export ----------------
    @app.get("/api/stats")
    def get_stats(from_: Optional[datetime] = Query(None, alias="from"), to: Optional[datetime] = None):
        where, params = ["status != 'FALSO_POSITIVO'"], []
        if from_:
            where.append("ts_ms >= ?")
            params.append(to_ms_local(from_))
        if to:
            where.append("ts_ms <= ?")
            params.append(to_ms_local(to))
        sql_where = " WHERE " + " AND ".join(where)
        with db.connect() as conn:
            by_type = {r[0]: r[1] for r in conn.execute(
                f"SELECT type, COUNT(*) FROM events{sql_where} GROUP BY type", params)}
            cells = conn.execute(
                f"SELECT cell_id, SUM(severity) AS score, COUNT(*) AS n FROM events{sql_where} "
                "GROUP BY cell_id ORDER BY score DESC, n DESC LIMIT 10", params).fetchall()
        hotspots = []
        for c in cells:
            lat, lon = enrich.cell_center(c["cell_id"])
            hotspots.append({"cell_id": c["cell_id"], "score": c["score"], "count": c["n"], "lat": lat, "lon": lon})
        return {"by_type": by_type, "total": sum(by_type.values()), "top_hotspots": hotspots}

    @app.get("/api/export.csv")
    def export_csv(public: int = 0):
        events = db.query_events([], [], 1_000_000)
        if public:
            events = [public_view(e) for e in events]
        cols = [c for c in CSV_COLUMNS if not public or c not in PUBLIC_HIDDEN_FIELDS]
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        for e in events:
            writer.writerow(dict(e, features=json.dumps(e["features"])))
        return Response(
            content=buf.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="casco_sentinella_eventi.csv"'},
        )

    @app.get("/health")
    def health():
        return {"status": "ok", "events": db.count_events()}

    # ---------------- pagine ----------------
    # UI nuova: export statico di Next (kit IAMAimpresa) in static/ui/, vedi webapp/README.md.
    # Se la build manca si usano le pagine precedenti, che restano comunque raggiungibili sotto /legacy.
    UI_DIR = STATIC_DIR / "ui"

    def _pagina(nome: str) -> FileResponse:
        nuova = UI_DIR / f"{nome}.html"
        return FileResponse(nuova if nuova.exists() else STATIC_DIR / f"{nome}.html")

    @app.get("/", include_in_schema=False)
    def page_public():
        return _pagina("index")

    @app.get("/comune", include_in_schema=False)
    def page_comune():
        return _pagina("comune")

    @app.get("/emergenza", include_in_schema=False)
    def page_emergenza():
        return _pagina("emergenza")

    @app.get("/legacy", include_in_schema=False)
    def legacy_public():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/legacy/comune", include_in_schema=False)
    def legacy_comune():
        return FileResponse(STATIC_DIR / "comune.html")

    @app.get("/legacy/emergenza", include_in_schema=False)
    def legacy_emergenza():
        return FileResponse(STATIC_DIR / "emergenza.html")

    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    if UI_DIR.exists():
        # asset della UI nuova: /_next/..., /icon.svg e i payload .txt della navigazione client
        app.mount("/", StaticFiles(directory=UI_DIR), name="ui")
    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
