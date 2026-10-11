"""Uplink to the casco-sentinella server: fall events + heartbeat (stdlib only).

Bridge handlers only call on_alert() (a deque append); a worker thread does the blocking HTTP.
Server URL is re-read from server_url.txt at every request, so it can be edited without a restart.
"""
import json
import time
import uuid
from collections import deque
from pathlib import Path
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

DEVICE_ID = "casco-01"
URL_FILE = Path(__file__).with_name("server_url.txt")  # one line: http://<server-ip>:8000
LAT, LON = 45.0703, 7.6869  # no GPS: fixed point in Turin, declared as simulated (piazza Castello)
TIMEOUT = 3          # s per HTTP request
RETRY_S = 5          # s between attempts while the server is unreachable
HEARTBEAT_S = 5
MAX_AGE_S = 30       # an IMPACT older than this is not the one that caused the alert

mcu_ok = False       # set by main.py after each Bridge call
_pending = deque(maxlen=50)  # full -> the oldest event is dropped
_impact = None       # (monotonic, drms_mg) of the last IMPACT alert
_up = {}             # endpoint -> last outcome, to log only the changes


def on_alert(kind, value):
    """Called from the Bridge thread: remember IMPACT, queue FALL / NOFALL."""
    global _impact
    now = time.monotonic()
    if kind == "IMPACT":
        _impact = (now, value)
    elif kind in ("FALL", "NOFALL"):
        t0, drms = _impact if _impact and now - _impact[0] < MAX_AGE_S else (now, None)
        _pending.append({
            "event_id": str(uuid.uuid4()),  # the server ignores a resend with the same id
            "device_id": DEVICE_ID,
            "lat": LAT, "lon": LON, "position_source": "simulated_route",
            "type": "CADUTA_SENZA_CAUSA_RILEVATA",  # we cannot tell the cause
            "confidence": 0.5,  # conventional value, not a probability
            "emergency": kind == "FALL",
            "alarm_state": "SENT" if kind == "FALL" else "MOVEMENT_RESUMED",
            "features": {"tilt_deg": value, "impact_drms_mg": drms},  # drms at trigger, not the peak
            "classifier": "rules-v1", "simulated": False, "origin": "helmet",
            "_t0": t0,
        })


def _post(path, body):
    """True if the server accepted it or will never accept it (4xx): either way, stop retrying."""
    try:
        base = URL_FILE.read_text().strip()
        if not base:
            raise OSError("server_url.txt is empty")
        req = Request(base + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
        urlopen(req, timeout=TIMEOUT).close()
        outcome, done = "ok", True
    except HTTPError as e:
        outcome, done = f"HTTP {e.code}: {e.read()[:200]!r}", 400 <= e.code < 500
    except Exception as e:  # URLError, timeout, missing file...
        outcome, done = f"{type(e).__name__} {e}", False
    if _up.get(path) != outcome:
        _up[path] = outcome
        print("uplink", path, outcome)
    return done


def _run():
    retry_at = next_hb = 0.0
    while True:
        now = time.monotonic()
        if _pending and now >= retry_at:
            ev = _pending[0]
            body = {k: v for k, v in ev.items() if k != "_t0"}
            body["age_ms"] = int((now - ev["_t0"]) * 1000)  # recomputed at every attempt
            if _post("/api/events", body):
                try:
                    _pending.remove(ev)
                except ValueError:  # dropped by the deque while we were posting
                    pass
            else:
                retry_at = now + RETRY_S
        if now >= next_hb:
            next_hb = now + HEARTBEAT_S
            _post("/api/heartbeat", {"device_id": DEVICE_ID, "lat": LAT, "lon": LON,
                                     "queue_len": len(_pending), "mcu_ok": mcu_ok})
        time.sleep(0.2)


def start():
    Thread(target=_run, daemon=True).start()


if __name__ == "__main__":
    # Self-check against a throwaway local server (no real casco-sentinella needed)
    import tempfile
    from http.server import BaseHTTPRequestHandler, HTTPServer

    got, status = [], [500]

    class H(BaseHTTPRequestHandler):
        def do_POST(self):
            got.append((self.path, json.loads(self.rfile.read(int(self.headers["Content-Length"])))))
            self.send_response(status[0]); self.end_headers(); self.wfile.write(b"x")
        def log_message(self, *a): pass

    srv = HTTPServer(("127.0.0.1", 0), H)
    Thread(target=srv.serve_forever, daemon=True).start()
    tmp = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False)
    tmp.write(f"http://127.0.0.1:{srv.server_port}\n"); tmp.close()
    URL_FILE, RETRY_S, HEARTBEAT_S = Path(tmp.name), 0.3, 0.3

    on_alert("IMPACT", 812)
    time.sleep(0.5)
    on_alert("FALL", 63)
    start()
    time.sleep(0.8)                       # server answers 500: event stays queued, retried
    assert len(_pending) == 1 and sum(p == "/api/events" for p, _ in got) >= 2
    status[0] = 201
    time.sleep(0.8)
    ev = [b for p, b in got if p == "/api/events"][-1]
    assert not _pending
    assert (ev["alarm_state"], ev["emergency"]) == ("SENT", True)
    assert ev["features"] == {"tilt_deg": 63, "impact_drms_mg": 812}
    assert 500 <= ev["age_ms"] < 5000, ev["age_ms"]
    assert len({b["event_id"] for p, b in got if p == "/api/events"}) == 1  # same id on every retry
    assert any(p == "/api/heartbeat" for p, _ in got)
    status[0] = 422                       # a rejected event must not block the queue forever
    _impact = (time.monotonic() - 60, 900)  # stale IMPACT: ignored, age_ms falls back to ~0
    on_alert("NOFALL", 55)
    time.sleep(0.5)
    assert not _pending
    ev = [b for p, b in got if p == "/api/events"][-1]
    assert (ev["alarm_state"], ev["emergency"]) == ("MOVEMENT_RESUMED", False)
    assert ev["features"]["impact_drms_mg"] is None and ev["age_ms"] < 1000, ev
    print("ok")
