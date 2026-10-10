import uuid
from datetime import datetime, timedelta

LAT, LON = 45.07123, 7.68456   # dentro il riquadro di Torino


def make_event(**over):
    ev = {
        "event_id": str(uuid.uuid4()),
        "device_id": "casco-01",
        "age_ms": 0,
        "device_ts": "2026-10-11T10:15:30+02:00",
        "lat": LAT, "lon": LON,
        "position_source": "simulated_route",
        "type": "BUCA",
        "confidence": 0.6,
        "emergency": False,
        "alarm_state": "NONE",
        "features": {"shock_peak_g": 2.1},
        "classifier": "rules-v1",
        "simulated": False,
        "fw": "0.1.0",
    }
    ev.update(over)
    return ev


def fall_sent(**over):
    fields = dict(type="IMPATTO_VIOLENTO", confidence=0.5, emergency=True, alarm_state="SENT",
                  features={"impact_peak_g": 7.0, "shock_to_impact_ms": -1})
    fields.update(over)
    return make_event(**fields)


# ---------- inserimento ----------
def test_insert_event_and_enrichment(client):
    r = client.post("/api/events", json=make_event())
    assert r.status_code == 201
    e = r.json()["event"]
    assert e["status"] == "NUOVO"
    assert e["severity"] == 1                 # BUCA con shock_peak_g < 3
    assert e["source"] == "helmet"
    assert e["time_slot"] in {"notte", "mattina", "pomeriggio", "sera"}
    assert e["cell_id"] and isinstance(e["id"], int)


def test_severity_by_type(client):
    assert client.post("/api/events", json=make_event(features={"shock_peak_g": 3.5})).json()["event"]["severity"] == 2
    assert client.post("/api/events", json=fall_sent()).json()["event"]["severity"] == 5


def test_ts_is_received_minus_age(client):
    e = client.post("/api/events", json=make_event(age_ms=60_000)).json()["event"]
    delta = datetime.fromisoformat(e["received_at"]) - datetime.fromisoformat(e["ts"])
    assert abs(delta.total_seconds() - 60) <= 1


# ---------- idempotenza ----------
def test_idempotent_on_event_id(client):
    ev = make_event()
    r1 = client.post("/api/events", json=ev)
    r2 = client.post("/api/events", json=ev)      # reinvio dalla coda del casco
    assert r1.status_code == 201 and r2.status_code == 200
    assert r2.json()["created"] is False
    assert r1.json()["event"]["id"] == r2.json()["event"]["id"]
    assert len(client.get("/api/events").json()) == 1
    assert client.get("/health").json()["events"] == 1


# ---------- filtri ----------
def test_filters_type_status_after_id(client):
    a = client.post("/api/events", json=make_event()).json()["event"]
    b = client.post("/api/events", json=fall_sent()).json()["event"]
    assert [e["id"] for e in client.get("/api/events?type=BUCA").json()] == [a["id"]]
    assert len(client.get("/api/events?type=BUCA,IMPATTO_VIOLENTO").json()) == 2
    assert [e["id"] for e in client.get(f"/api/events?after_id={a['id']}").json()] == [b["id"]]
    client.patch(f"/api/events/{a['event_id']}", json={"status": "RISOLTO"})
    assert [e["id"] for e in client.get("/api/events?status=RISOLTO").json()] == [a["id"]]
    assert client.get("/api/events?limit=1").json()[0]["id"] == a["id"]


def test_filter_period_uses_ts(client):
    old = client.post("/api/events", json=make_event(age_ms=40 * 24 * 3600 * 1000)).json()["event"]
    new = client.post("/api/events", json=make_event()).json()["event"]
    since = (datetime.now() - timedelta(days=30)).isoformat(timespec="seconds")
    assert [e["id"] for e in client.get("/api/events", params={"from": since}).json()] == [new["id"]]
    assert [e["id"] for e in client.get("/api/events", params={"to": since}).json()] == [old["id"]]


def test_emergencies(client):
    client.post("/api/events", json=make_event())
    s = client.post("/api/events", json=fall_sent()).json()["event"]
    em = client.get("/api/emergencies").json()
    assert [e["id"] for e in em] == [s["id"]]
    assert client.get(f"/api/emergencies?after_id={s['id']}").json() == []


# ---------- vista pubblica ----------
def test_public_hides_device_and_rounds_coordinates(client):
    client.post("/api/events", json=make_event())
    e = client.get("/api/events?public=1").json()[0]
    assert "device_id" not in e and "device_ts" not in e
    assert e["lat"] == 45.071 and e["lon"] == 7.685
    full = client.get("/api/events").json()[0]
    assert full["device_id"] == "casco-01" and full["lat"] == LAT


def test_public_csv_has_no_device_id(client):
    client.post("/api/events", json=make_event())
    assert "casco-01" in client.get("/api/export.csv").text
    pub = client.get("/api/export.csv?public=1").text
    assert "device_id" not in pub and "casco-01" not in pub


# ---------- validazione ----------
def test_coordinates_outside_torino_rejected(client):
    assert client.post("/api/events", json=make_event(lat=45.4642, lon=9.19)).status_code == 422   # Milano
    assert client.post("/api/events", json=make_event(lat=0, lon=0)).status_code == 422
    assert client.get("/api/events").json() == []


def test_contract_violations_rejected(client):
    assert client.post("/api/events", json=make_event(type="FRENATA")).status_code == 422
    assert client.post("/api/events", json=make_event(emergency=True)).status_code == 422          # BUCA non SENT
    assert client.post("/api/events", json=fall_sent(emergency=False)).status_code == 422
    assert client.post("/api/events", json=make_event(age_ms=-5)).status_code == 422


def test_patch_status(client):
    e = client.post("/api/events", json=make_event()).json()["event"]
    assert client.patch(f"/api/events/{e['event_id']}", json={"status": "VERIFICATO"}).json()["status"] == "VERIFICATO"
    assert client.patch(f"/api/events/{e['event_id']}", json={"status": "BOH"}).status_code == 422
    assert client.patch("/api/events/non-esiste", json={"status": "RISOLTO"}).status_code == 404


# ---------- heartbeat / statistiche ----------
def test_heartbeat_and_devices(client):
    hb = {"device_id": "casco-01", "lat": LAT, "lon": LON, "queue_len": 2, "mcu_ok": True,
          "mcu_state": "MONITORING", "mcu_dropped": 0, "imu_hz": 98.7, "fw": "0.1.0"}
    assert client.post("/api/heartbeat", json=hb).status_code == 200
    d = client.get("/api/devices").json()
    assert len(d) == 1 and d[0]["online"] is True and d[0]["mcu_state"] == "MONITORING"


def test_stats_excludes_false_positives(client):
    client.post("/api/events", json=make_event())
    f = client.post("/api/events", json=fall_sent()).json()["event"]
    client.patch(f"/api/events/{f['event_id']}", json={"status": "FALSO_POSITIVO"})
    s = client.get("/api/stats").json()
    assert s["by_type"] == {"BUCA": 1}
    assert s["top_hotspots"][0]["score"] == 1


def test_pages_served(client):
    for path in ("/", "/comune", "/emergenza", "/static/vendor/leaflet/leaflet.js"):
        assert client.get(path).status_code == 200, path
