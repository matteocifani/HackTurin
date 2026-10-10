"""Imita il casco (lato Linux UNO Q) senza hardware: eventi POST /api/events + heartbeat (SPEC §9).

Serve a sviluppare server e mappa in parallelo al firmware. Solo libreria standard.
Gli eventi hanno simulated=true e origin="simulator" (SPEC v0.3): mappa, /comune e /emergenza
li etichettano sempre "SIM", anche se usati in demo al posto del casco (Piano B).
Se il server non risponde, gli eventi restano in coda in memoria e vengono reinviati
(lo stesso event_id → il server non crea doppioni), come farà il casco vero.

Esempi (server avviato):
    .\\.venv\\Scripts\\python.exe tools\\simulate_helmet.py                         # 1 evento a caso, poi esce
    .\\.venv\\Scripts\\python.exe tools\\simulate_helmet.py --type BUCA
    .\\.venv\\Scripts\\python.exe tools\\simulate_helmet.py --type IMPATTO_VIOLENTO --emergency
    .\\.venv\\Scripts\\python.exe tools\\simulate_helmet.py --rate 6 --count 0      # 6 eventi/min, finché Ctrl+C
"""

import argparse
import math
import random
import sys
import time
from datetime import datetime

from fake_events import TYPES, alarm_for, build_event, load_points, post_json

HEARTBEAT_S = 5
RETRY_S = 5                       # reinvio della coda ogni 5 s se il server non risponde (SPEC §6)
FALL_DELAY_MS = (8 + 10) * 1000   # una FALL arriva dopo T_STILL_S + T_CANCEL_S (profilo DEMO, SPEC §5.4)


class Route:
    """Posizione SIMULATA che avanza lungo i punti a velocità costante, in loop (ROUTE_MODE="walk")."""

    def __init__(self, points, speed_kmh):
        self.pts = [(p["lat"], p["lon"]) for p in points]
        self.speed = speed_kmh / 3.6
        self.t0 = time.monotonic()
        self.seg = [self._d(self.pts[i], self.pts[(i + 1) % len(self.pts)]) for i in range(len(self.pts))]
        self.total = sum(self.seg) or 1.0

    @staticmethod
    def _d(a, b):
        return math.hypot((a[0] - b[0]) * 111_320, (a[1] - b[1]) * 111_320 * math.cos(math.radians(a[0])))

    def position(self):
        s = ((time.monotonic() - self.t0) * self.speed) % self.total
        for i, L in enumerate(self.seg):
            if s <= L or L == 0:
                a, b = self.pts[i], self.pts[(i + 1) % len(self.pts)]
                k = s / L if L else 0
                return round(a[0] + (b[0] - a[0]) * k, 6), round(a[1] + (b[1] - a[1]) * k, 6)
            s -= L
        return self.pts[0]


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8000")
    ap.add_argument("--device-id", default="casco-sim")
    ap.add_argument("--type", default="random", choices=["random", *TYPES])
    ap.add_argument("--emergency", action="store_true", help="le cadute finiscono con allarme SENT (112 SIMULATO)")
    ap.add_argument("--rate", type=float, default=6.0, help="eventi al minuto (default 6)")
    ap.add_argument("--count", type=int, default=1, help="numero di eventi; 0 = infinito (Ctrl+C per fermare)")
    ap.add_argument("--speed-kmh", type=float, default=15.0)
    ap.add_argument("--no-heartbeat", action="store_true")
    args = ap.parse_args()

    rng = random.Random()
    route = Route(load_points(prefer_route=True), args.speed_kmh)
    queue = []                       # eventi non ancora accettati dal server
    sent = 0
    next_event = time.monotonic()
    next_hb = time.monotonic()
    retry_at = 0.0
    interval = 60.0 / args.rate if args.rate > 0 else 10.0

    log(f"Simulatore casco '{args.device_id}' → {args.server}  (posizione SIMULATA, Ctrl+C per uscire)")
    try:
        while True:
            now = time.monotonic()
            lat, lon = route.position()

            if (args.count == 0 or sent < args.count) and now >= next_event:
                etype = rng.choice(TYPES) if args.type == "random" else args.type
                if args.emergency and etype == "BUCA" and args.type == "random":
                    etype = rng.choice(TYPES[1:])
                alarm = alarm_for(etype, args.emergency, rng)
                ev = build_event(event_type=etype, lat=lat, lon=lon, age_ms=0, device_id=args.device_id,
                                 alarm=alarm, rng=rng, origin="simulator", classifier="simulator",
                                 position_source="simulated_route")
                delay_ms = rng.randint(100, 800) if etype == "BUCA" else FALL_DELAY_MS
                # come su Linux: salvo età al momento del "poll" e monotonic di ricezione (SPEC §6)
                queue.append({"ev": ev, "age_at_poll_ms": delay_ms, "mono": now})
                sent += 1
                next_event = now + interval
                log(f"Evento {sent}: {etype} allarme={alarm} @ {lat:.5f},{lon:.5f}")

            for item in (list(queue) if now >= retry_at else []):
                ev = dict(item["ev"], age_ms=int(item["age_at_poll_ms"] + (time.monotonic() - item["mono"]) * 1000))
                try:
                    status, body = post_json(f"{args.server}/api/events", ev)
                except OSError as exc:
                    log(f"  invio fallito ({exc}); in coda: {len(queue)}, riprovo tra {RETRY_S} s")
                    retry_at = time.monotonic() + RETRY_S
                    break
                queue.remove(item)
                if status in (200, 201):
                    e = body["event"]
                    log(f"  inviato → id {e['id']} severità {e['severity']}" + ("  (già ricevuto)" if status == 200 else ""))
                else:
                    log(f"  RIFIUTATO dal server ({status}): {body}")

            if not args.no_heartbeat and now >= next_hb:
                hb = {"device_id": args.device_id, "lat": lat, "lon": lon, "queue_len": len(queue), "mcu_ok": True,
                      "mcu_state": "MONITORING", "mcu_dropped": 0, "imu_hz": 100.0, "fw": "sim"}
                try:
                    post_json(f"{args.server}/api/heartbeat", hb)
                except OSError:
                    pass
                next_hb = now + HEARTBEAT_S

            if args.count and sent >= args.count and not queue:
                log("Fatto.")
                return 0
            time.sleep(0.2 if queue else 0.5)
    except KeyboardInterrupt:
        log(f"Interrotto. Eventi non inviati: {len(queue)}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
