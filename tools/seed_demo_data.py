"""Popola il server con ~300 eventi STORICI SIMULATI negli ultimi 90 giorni (SPEC §9).

I luoghi sono reali (data/hotspots.json), la distribuzione di tipi, orari e quantità è INVENTATA.
Ogni evento ha simulated=true → il server lo marca source="demo_seed" e la UI lo mostra come SIMULATO.
Gli event_id sono deterministici (--seed): rilanciare lo script non crea doppioni.

Uso (server avviato):
    .\\.venv\\Scripts\\python.exe tools\\seed_demo_data.py
    .\\.venv\\Scripts\\python.exe tools\\seed_demo_data.py --count 300 --days 90 --server http://127.0.0.1:8000
"""

import argparse
import random
import sys
from datetime import datetime, timedelta

from fake_events import TYPES, alarm_for, build_event, jitter, load_points, post_json

TYPE_WEIGHTS = [55, 20, 15, 10]            # BUCA, DISSESTO, SENZA_CAUSA, VIOLENTO (inventati)
HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 4, 9, 12, 8, 5, 5, 6, 6, 5, 6, 8, 12, 11, 7, 4, 3, 2, 1]  # picchi pendolari


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--server", default="http://127.0.0.1:8000")
    ap.add_argument("--count", type=int, default=300)
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--sigma-m", type=float, default=60, help="dispersione attorno all'hotspot (m)")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    points = load_points()
    hotspot_weights = [rng.uniform(0.5, 1.5) for _ in points]   # alcuni hotspot "più caldi" (inventato)
    now = datetime.now()
    created = dup = failed = 0

    for _ in range(args.count):
        p = rng.choices(points, weights=hotspot_weights)[0]
        lat, lon = jitter(p["lat"], p["lon"], args.sigma_m, rng)
        etype = rng.choices(TYPES, weights=TYPE_WEIGHTS)[0]
        when = (now - timedelta(days=rng.randint(0, args.days - 1))).replace(
            hour=rng.choices(range(24), weights=HOUR_WEIGHTS)[0], minute=rng.randint(0, 59), second=rng.randint(0, 59))
        if when > now:
            when -= timedelta(days=1)
        ev = build_event(event_type=etype, lat=lat, lon=lon, age_ms=(now - when).total_seconds() * 1000,
                         device_id=f"seed-casco-{rng.randint(1, 40):02d}", alarm=alarm_for(etype, False, rng),
                         rng=rng, simulated=True, classifier="demo_seed", position_source="demo_seed")
        try:
            status, body = post_json(f"{args.server}/api/events", ev)
        except OSError as exc:
            sys.exit(f"Server non raggiungibile su {args.server}: {exc}\nAvvialo prima (vedi README).")
        if status == 201:
            created += 1
        elif status == 200:
            dup += 1
        else:
            failed += 1
            print(f"Rifiutato ({status}): {body}")

    print(f"Seed completato: {created} nuovi, {dup} già presenti, {failed} rifiutati (dati SIMULATI, seed={args.seed}).")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
