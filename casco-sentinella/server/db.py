"""Accesso a SQLite (libreria standard). Una connessione per richiesta: semplice e sicuro con i thread di FastAPI."""

import json
import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,   -- usato dal polling web (after_id)
    event_id      TEXT NOT NULL UNIQUE,                -- idempotenza
    device_id     TEXT NOT NULL,
    received_at   TEXT NOT NULL,
    ts            TEXT NOT NULL,                       -- received_at − age_ms, ISO con offset
    ts_ms         INTEGER NOT NULL,                    -- stesso istante in ms epoch, per filtri e ordinamento
    age_ms        INTEGER NOT NULL,
    age_uncertain INTEGER NOT NULL,
    device_ts     TEXT,
    lat           REAL NOT NULL,
    lon           REAL NOT NULL,
    position_source TEXT NOT NULL,
    type          TEXT NOT NULL,
    confidence    REAL NOT NULL,
    emergency     INTEGER NOT NULL,
    alarm_state   TEXT NOT NULL,
    features      TEXT NOT NULL,                       -- JSON
    classifier    TEXT NOT NULL,
    simulated     INTEGER NOT NULL,
    fw            TEXT,
    status        TEXT NOT NULL,
    severity      INTEGER NOT NULL,
    time_slot     TEXT NOT NULL,
    cell_id       TEXT NOT NULL,
    source        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts_ms);
CREATE TABLE IF NOT EXISTS devices (
    device_id     TEXT PRIMARY KEY,
    last_seen     TEXT NOT NULL,
    last_seen_ms  INTEGER NOT NULL,
    payload       TEXT NOT NULL                        -- ultimo heartbeat (JSON)
);
"""

BOOL_COLUMNS = ("age_uncertain", "emergency", "simulated")


class Database:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")   # letture e scritture contemporanee senza blocchi
            conn.executescript(SCHEMA)

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=5)
        conn.row_factory = sqlite3.Row
        return conn

    # --- eventi ---
    def insert_event(self, row: dict) -> tuple[dict, bool]:
        """Inserisce se event_id è nuovo. Ritorna (evento salvato, creato?)."""
        row = dict(row, features=json.dumps(row["features"]))
        cols = ", ".join(row)
        marks = ", ".join(f":{k}" for k in row)
        with self.connect() as conn:
            cur = conn.execute(f"INSERT OR IGNORE INTO events ({cols}) VALUES ({marks})", row)
            created = cur.rowcount == 1
        return self.get_event(row["event_id"]), created

    def get_event(self, event_id: str) -> dict | None:
        with self.connect() as conn:
            r = conn.execute("SELECT * FROM events WHERE event_id = ?", (event_id,)).fetchone()
        return row_to_event(r) if r else None

    def query_events(self, where: list[str], params: list, limit: int) -> list[dict]:
        sql = "SELECT * FROM events"
        if where:
            sql += " WHERE " + " AND ".join(where)
        sql += " ORDER BY id LIMIT ?"
        with self.connect() as conn:
            rows = conn.execute(sql, [*params, limit]).fetchall()
        return [row_to_event(r) for r in rows]

    def set_status(self, event_id: str, status: str) -> bool:
        with self.connect() as conn:
            cur = conn.execute("UPDATE events SET status = ? WHERE event_id = ?", (status, event_id))
        return cur.rowcount == 1

    def count_events(self) -> int:
        with self.connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM events").fetchone()[0]

    # --- caschi ---
    def upsert_device(self, device_id: str, last_seen: str, last_seen_ms: int, payload: dict):
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO devices (device_id, last_seen, last_seen_ms, payload) VALUES (?, ?, ?, ?) "
                "ON CONFLICT(device_id) DO UPDATE SET last_seen=excluded.last_seen, "
                "last_seen_ms=excluded.last_seen_ms, payload=excluded.payload",
                (device_id, last_seen, last_seen_ms, json.dumps(payload)),
            )

    def list_devices(self) -> list[dict]:
        with self.connect() as conn:
            rows = conn.execute("SELECT * FROM devices ORDER BY device_id").fetchall()
        return [dict(r, payload=json.loads(r["payload"])) for r in rows]


def row_to_event(r: sqlite3.Row) -> dict:
    e = dict(r)
    e["features"] = json.loads(e["features"])
    for k in BOOL_COLUMNS:
        e[k] = bool(e[k])
    return e
