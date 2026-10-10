#!/usr/bin/env python3
"""
Guardaspalle - il "cuore" sulla bici (Raspberry Pi 4).

Webcam posteriore -> YOLO (NCNN) + ByteTrack -> per ogni veicolo:
  tempo all'impatto (TTC) dalla crescita del riquadro, posizione laterale,
  distanza di sorpasso prevista -> rischio per zona (SX / DIETRO / DX).
HC-SR04 a sinistra -> distanza reale di sorpasso (verifica la previsione).

Uscite:
  GET  /risk     riga per il casco (UNO Q):  R,L,B,R,cls,ttc_ds,seq,age_ms,cam_ok
  POST /event    eventi dal casco: guardata indietro, caduta, battito
  GET  /context  ultimi eventi in testo (per l'SOS del casco)
  GET  /         pagina stile Tesla per il telefono (dashboard.html), /state in JSON
  logs/          eventi in CSV, clip di 5 s degli avvisi rossi, riassunto finale

Esempi:
  python3 bike_adas.py --fake                                # traffico simulato, senza camera né YOLO
  python3 bike_adas.py --source traffico.mp4 --realtime --loop --stream
  python3 bike_adas.py --source 0 --us-trig 23 --us-echo 24 --save giro.mp4 --clips
"""

import argparse
import collections
import csv
import json
import math
import os
import random
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import cv2
except ImportError:  # in --fake senza video basta la libreria standard
    cv2 = None

HERE = os.path.dirname(os.path.abspath(__file__))

# id COCO -> nome, larghezza reale (m), lunghezza (m), peso nel rischio, codice per il casco
CLASSES = {
    0: ("persona", 0.5, 0.5, 0.3, 6),
    1: ("bici", 0.6, 1.8, 0.4, 5),
    2: ("auto", 1.8, 4.5, 1.0, 1),
    3: ("moto", 0.8, 2.1, 0.9, 4),
    5: ("bus", 2.55, 12.0, 1.4, 2),
    7: ("camion", 2.5, 8.0, 1.4, 3),
}
MOTOR = {2, 3, 5, 7}  # i veicoli per cui un radar suonerebbe
INF = math.inf


def parse_args():
    p = argparse.ArgumentParser(description="Guardaspalle: percezione posteriore per bici")
    g = p.add_argument_group("sorgente")
    g.add_argument("--source", default="0", help="indice webcam (0) o file video")
    g.add_argument("--fake", action="store_true", help="traffico simulato, senza camera né YOLO")
    g.add_argument("--seed", type=int, default=None, help="seme del traffico simulato")
    g.add_argument("--width", type=int, default=1280)
    g.add_argument("--height", type=int, default=720)
    g.add_argument("--realtime", action="store_true", help="file video alla velocità reale (salta fotogrammi)")
    g.add_argument("--loop", action="store_true", help="ripeti il file video")
    g = p.add_argument_group("modello")
    g.add_argument("--model", default="yolo11n_ncnn_model", help="modello NCNN (creato da yolo11n.pt se manca) o .pt")
    g.add_argument("--imgsz", type=int, default=320, help="stessa dimensione usata nell'export NCNN")
    g.add_argument("--conf", type=float, default=0.3)
    g.add_argument("--tracker", default="bytetrack.yaml")
    g.add_argument("--crop", default="0,0.2,1,0.9", help="zona analizzata, frazioni x0,y0,x1,y1")
    g = p.add_argument_group("camera")
    g.add_argument("--hfov", type=float, default=80.0, help="campo visivo orizzontale (gradi)")
    g.add_argument("--f-px", type=float, default=None, help="focale in pixel (sostituisce --hfov)")
    g.add_argument("--center-x", type=float, default=0.5, help="frazione orizzontale che corrisponde a 'dritto dietro'")
    g.add_argument("--mirror", action="store_true", help="immagine specchiata dalla webcam")
    g = p.add_argument_group("rischio")
    g.add_argument("--t-warn", type=float, default=6.0, help="TTC (s) da cui inizia l'urgenza")
    g.add_argument("--t-crit", type=float, default=1.5, help="TTC (s) di urgenza massima")
    g.add_argument("--pass-safe", type=float, default=1.5, help="distanza di sorpasso sicura (m, dall'asse bici)")
    g.add_argument("--rider-half", type=float, default=0.35, help="mezza larghezza bici + ciclista (m)")
    g.add_argument("--max-range", type=float, default=35.0)
    g.add_argument("--tailgate", type=float, default=5.0, help="veicolo fermo dietro sotto questa distanza = ambra")
    g.add_argument("--hold", type=float, default=0.7, help="tempo (s) per cui un livello resta acceso")
    g.add_argument("--window", type=float, default=1.0, help="finestra (s) per le stime")
    g.add_argument("--ttc-max", type=float, default=20.0)
    g.add_argument("--expire", type=float, default=1.0, help="dopo quanti s un veicolo non visto viene dimenticato")
    g.add_argument("--stale", type=float, default=0.4)
    g.add_argument("--edge-px", type=int, default=3)
    g = p.add_argument_group("ultrasuono HC-SR04 (GPIO BCM, Echo con partitore 1k/2k)")
    g.add_argument("--us-trig", type=int, default=None, help="es. 23 (pin 16)")
    g.add_argument("--us-echo", type=int, default=None, help="es. 24 (pin 18)")
    g.add_argument("--us-serial", default=None,
                   help="porta della Arduino UNO con l'HC-SR04 (es. /dev/ttyACM0, COM3, /dev/cu.usbmodem1101)")
    g.add_argument("--us-remote", action="store_true",
                   help="HC-SR04 collegato alla UNO Q (demo al tavolo, percezione sul portatile)")
    g.add_argument("--us-side", default="L", choices=["L", "R", "B"])
    g.add_argument("--near-red", type=float, default=150.0, help="cm: rosso se un veicolo è di fianco più vicino")
    g.add_argument("--near-amber", type=float, default=250.0)
    g.add_argument("--pass-start", type=float, default=300.0, help="cm: sotto questa soglia inizia un sorpasso")
    g.add_argument("--us-trust", type=float, default=40.0,
                   help="cm: con --us-side B, sotto questa distanza vale l'ultrasuono, sopra la camera")
    g.add_argument("--us-blend", type=float, default=20.0, help="cm di passaggio graduale tra ultrasuono e camera")
    g.add_argument("--scale", type=float, default=1.0,
                   help="scala dei veicoli per la demo in miniatura (es. 0.05 = macchinina 1:20)")
    g = p.add_argument_group("uscite")
    g.add_argument("--port", type=int, default=8000)
    g.add_argument("--log-dir", default=os.path.join(HERE, "logs"))
    g.add_argument("--save", default=None, help="salva il video annotato (mp4)")
    g.add_argument("--clips", action="store_true", help="salva 5 s di video per ogni avviso rosso")
    g.add_argument("--stream", action="store_true", help="video annotato su /video.mjpg")
    g.add_argument("--show", action="store_true", help="finestra OpenCV (solo con desktop)")
    g.add_argument("--log-tracks", action="store_true", help="CSV con tutte le tracce, fotogramma per fotogramma")
    return p.parse_args()


# ---------------------------------------------------------------- utilità

def clamp(x, lo, hi):
    return lo if x < lo else hi if x > hi else x


def linfit(xs, ys):
    """Pendenza e intercetta ai minimi quadrati."""
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx < 1e-9:
        return 0.0, my
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return b, my - b * mx


def fin(x, nd=2):
    """Numero per JSON (Infinity non è JSON valido)."""
    if x is None or not math.isfinite(x):
        return None
    return round(x, nd)


# ---------------------------------------------------------------- stato condiviso con il server web

class Shared:
    def __init__(self):
        self.lock = threading.Lock()
        self.state = {"mode": "avvio"}
        self.risk = (0, 0, 0, 0, 999, 0, 0)  # L, B, R, cls, ttc_ds, seq, cam_ok
        self.risk_t = 0.0
        self.jpeg = None
        self.gps = None  # (lat, lon, accuratezza, time)
        self.helmet = {"t": 0.0, "look": None, "fall": None, "info": ""}
        self.context = "Nessun evento recente."
        self.log = None
        self.remote_us = None  # ultrasuono letto dalla UNO Q (--us-remote)


S = Shared()


class EventLog:
    FIELDS = ["ora", "tipo", "veicolo", "id", "livello", "ttc_s", "distanza_m",
              "sorpasso_previsto_m", "sorpasso_misurato_m", "lat", "lon", "note"]

    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        self.recent = collections.deque(maxlen=40)
        with open(path, "w", newline="") as f:
            csv.writer(f).writerow(self.FIELDS)

    def add(self, tipo, **kw):
        gps = S.gps if S.gps and time.time() - S.gps[3] < 30 else None
        row = {"ora": datetime.now().strftime("%H:%M:%S"), "tipo": tipo,
               "lat": gps[0] if gps else "", "lon": gps[1] if gps else ""}
        row.update({k: v for k, v in kw.items() if v is not None})
        with self.lock:
            with open(self.path, "a", newline="") as f:
                csv.DictWriter(f, self.FIELDS, extrasaction="ignore").writerow(row)
            self.recent.append((time.time(), row))
        print(f"[evento] {tipo}: " + ", ".join(f"{k}={v}" for k, v in kw.items() if v not in (None, "")))

    def last(self, n):
        with self.lock:
            return [r for _, r in list(self.recent)[-n:]]

    def context_text(self, seconds=20):
        now = time.time()
        lines = []
        with self.lock:
            items = list(self.recent)
        for t, r in items:
            if now - t > seconds or r["tipo"] not in ("rosso", "sorpasso"):
                continue
            ago = int(now - t)
            if r["tipo"] == "rosso":
                lines.append(f"{ago} s prima: {r.get('veicolo', 'veicolo')} in arrivo, impatto previsto tra "
                             f"{r.get('ttc_s', '?')} s, sorpasso previsto a {r.get('sorpasso_previsto_m', '?')} m")
            else:
                lines.append(f"{ago} s prima: {r.get('veicolo') or 'veicolo'}, sorpasso misurato a "
                             f"{r.get('sorpasso_misurato_m', '?')} m")
        text = "\n".join(lines) if lines else "Nessun pericolo registrato nei 20 secondi prima."
        gps = S.gps
        if gps and now - gps[3] < 120:
            text += f"\nPosizione: https://maps.google.com/?q={gps[0]:.6f},{gps[1]:.6f}"
        return text


# ---------------------------------------------------------------- stima per veicolo

class Track:
    def __init__(self, tid, cls, t):
        self.id = tid
        self.votes = collections.Counter()
        self.set_class(cls)
        self.hist = collections.deque(maxlen=60)  # (t, larghezza px, laterale m), solo riquadri interi
        self.first_t = self.last_t = t
        self.bbox = (0, 0, 0, 0)
        self.edge = False
        self.d = INF
        self.min_d = INF
        self.lat = 0.0
        self.vlat = 0.0
        self.lat_pass = 0.0
        self.rate = None
        self.ttc = INF
        self.min_ttc = INF
        self.clear = INF
        self.clear_pred = None  # ultima previsione affidabile (veicolo intero e vicino)
        self.zone = "B"
        self.score = 0.0
        self.level = 0
        self.level_t = t
        self.max_level = 0
        self.radar = False
        self.matched = False
        self.edge_t = None  # quando è arrivato al bordo dell'immagine, cioè quando ci sta affiancando

    def set_class(self, cls):
        self.cls = cls
        self.name, self.width_m, self.length_m, self.weight, self.code = CLASSES[cls]

    def vote(self, cls):
        self.votes[cls] += 1
        best = self.votes.most_common(1)[0][0]
        if best != self.cls:
            self.set_class(best)


class Estimator:
    def __init__(self, a, frame_w, x_lo, x_hi, log):
        self.a = a
        self.f = a.f_px or (frame_w / 2) / math.tan(math.radians(a.hfov) / 2)
        self.c0 = a.center_x * frame_w
        self.x_lo, self.x_hi = x_lo, x_hi
        self.log = log
        self.tracks = {}
        self.gone = collections.deque(maxlen=20)
        self.counts = {"rossi": 0, "ambra": 0, "radar": 0, "sorpassi": 0, "sorpassi_stretti": 0}
        self.k, self.k_n = 1.0, 0  # misurato / previsto (mediana, robusta ai sorpassi strani)
        self.ratios, self.errors = [], []  # per la calibrazione e per il numero da mostrare
        self.last_pass = None
        self.on_red = None
        self.fused = None

    def update(self, dets, t):
        a = self.a
        for tid, cls, x1, y1, x2, y2 in dets:
            if cls not in CLASSES or x2 - x1 < 3:
                continue
            tr = self.tracks.get(tid)
            if tr is None:
                tr = self.tracks[tid] = Track(tid, cls, t)
            tr.vote(cls)
            tr.bbox = (x1, y1, x2, y2)
            tr.last_t = t
            # un riquadro tagliato dal bordo non ha la larghezza vera: il veicolo ci sta passando di fianco
            tr.edge = x1 <= self.x_lo + a.edge_px or x2 >= self.x_hi - a.edge_px
            if tr.edge and tr.edge_t is None and tr.min_d < 10:
                tr.edge_t = t
            if not tr.edge:
                w = x2 - x1
                cx = (x1 + x2) / 2
                sign = -1.0 if a.mirror else 1.0
                # camera rivolta indietro: la destra dell'immagine è la SINISTRA del ciclista (positivo)
                # laterale in "larghezze di veicolo": non dipende dalla focale
                wm = tr.width_m * a.scale
                tr.lat = sign * (cx - self.c0) * wm / w
                tr.d = self.f * wm / w
                tr.min_d = min(tr.min_d, tr.d)
                tr.hist.append((t, w, tr.lat))
            self._estimate(tr, t)
            self._risk(tr, t)
        for tid in list(self.tracks):
            if t - self.tracks[tid].last_t > a.expire:
                self.gone.append(self.tracks.pop(tid))

    def _estimate(self, tr, t):
        a = self.a
        pts = [p for p in tr.hist if t - p[0] <= a.window]
        if len(pts) >= 4 and pts[-1][0] - pts[0][0] >= 0.3:
            ts = [p[0] for p in pts]
            # TTC senza calibrazione: d(ln larghezza)/dt = 1/TTC
            rate, _ = linfit(ts, [math.log(p[1]) for p in pts])
            tr.rate = rate if tr.rate is None else 0.5 * tr.rate + 0.5 * rate
            tmid = sum(ts) / len(ts)
            tr.ttc = max(0.0, 1.0 / tr.rate - (t - tmid)) if tr.rate > 1.0 / a.ttc_max else INF
            recent = [p for p in pts if t - p[0] <= 0.5] or pts[-2:]
            if len(recent) >= 2:
                tr.vlat, _ = linfit([p[0] for p in recent], [p[2] for p in recent])
        tr.min_ttc = min(tr.min_ttc, tr.ttc)
        if not tr.edge:
            # dove sarà il veicolo quando ci affianca (estrapolazione limitata, il laterale è rumoroso)
            # da vicino conta la posizione attuale: l'estrapolazione si riduce sotto i 10 m
            horizon = min(tr.ttc, 3.0) * clamp(tr.d / 10.0, 0.0, 1.0)
            shift = clamp(tr.vlat * horizon, -1.0, 1.0) if tr.ttc < INF else 0.0
            tr.lat_pass = tr.lat + shift
            gap = abs(tr.lat_pass) - tr.width_m / 2  # dal fianco del veicolo all'asse della bici
            tr.clear = max(0.0, gap)
            if gap < a.rider_half:
                tr.zone = "B"  # in linea con te: rotta di collisione
            else:
                tr.zone = "L" if tr.lat_pass > 0 else "R"
            if tr.d < 12:
                tr.clear_pred = tr.clear

    def _risk(self, tr, t):
        a = self.a
        s = 0.0
        if tr.d <= a.max_range or tr.edge:
            if tr.ttc < INF:
                urg = clamp((a.t_warn - tr.ttc) / (a.t_warn - a.t_crit), 0.0, 1.0)
                if tr.zone == "B":
                    traj = 2.0
                elif tr.clear < a.pass_safe:
                    traj = 1.5
                elif tr.clear < a.pass_safe + 0.5:
                    traj = 1.0
                else:
                    traj = 0.6
                s = tr.weight * urg * traj
            elif tr.zone == "B" and tr.d < a.tailgate:
                s = 0.4 * tr.weight  # incollato dietro di te
        tr.score = s
        new = 2 if s >= 1.0 else 1 if s >= 0.35 else 0
        if new >= tr.level:
            tr.level, tr.level_t = new, t
        elif t - tr.level_t > a.hold:
            tr.level, tr.level_t = new, t
        # conteggi: quanti avvisi darebbe un radar (ogni veicolo a motore che si avvicina) e quanti ne diamo noi
        if tr.cls in MOTOR and not tr.radar and tr.ttc < INF and tr.d <= a.max_range:
            tr.radar = True
            self.counts["radar"] += 1
        if tr.level >= 1 and tr.max_level < 1:
            self.counts["ambra"] += 1
        if tr.level >= 2 and tr.max_level < 2:
            self.counts["rossi"] += 1
            self.log.add("rosso", veicolo=tr.name, id=tr.id, livello=2, ttc_s=fin(tr.ttc, 1),
                         distanza_m=fin(tr.d, 1), sorpasso_previsto_m=fin(tr.clear, 2),
                         note="in linea" if tr.zone == "B" else f"lato {tr.zone}")
            if self.on_red:
                self.on_red(t, tr)
        tr.max_level = max(tr.max_level, tr.level)

    def zones(self, t, us_cm, cam_ok):
        a = self.a
        z = {"L": 0, "B": 0, "R": 0}
        top = None
        if cam_ok:
            for tr in self.tracks.values():
                if t - tr.last_t > a.stale:
                    continue
                z[tr.zone] = max(z[tr.zone], tr.level)
                if tr.level and (top is None or tr.score > top.score):
                    top = tr
        near = 0
        self.fused = None
        if a.us_side == "B":
            # stessa direzione: da vicino vale l'ultrasuono (preciso), da lontano la camera
            cam = min((tr.d for tr in self.tracks.values()
                       if cam_ok and tr.zone == "B" and t - tr.last_t <= a.stale), default=None)
            cam_cm = cam * 100 if cam is not None else None
            if us_cm is not None and cam_cm is not None:
                w_us = clamp((a.us_trust + a.us_blend - us_cm) / a.us_blend, 0.0, 1.0)
                cm = w_us * us_cm + (1 - w_us) * cam_cm
            elif us_cm is not None:
                w_us, cm = 1.0, us_cm
            elif cam_cm is not None:
                w_us, cm = 0.0, cam_cm
            else:
                w_us, cm = None, None
            if cm is not None:
                self.fused = {"cm": round(cm), "w_us": round(w_us, 2),
                              "cam_cm": fin(cam_cm, 0), "us_cm": fin(us_cm, 0)}
                near = 2 if cm < a.near_red else 1 if cm < a.near_amber else 0
        elif us_cm is not None:
            near = 2 if us_cm < a.near_red else 1 if us_cm < a.near_amber else 0
        z[a.us_side] = max(z[a.us_side], near)
        return z, top, near

    def mae_cm(self):
        return round(100 * sum(self.errors) / len(self.errors)) if self.errors else None

    def on_pass(self, t, cm, dur, t_start=None):
        """L'ultrasuono ha misurato un sorpasso: lo abbiniamo al veicolo che la camera aveva previsto,
        cioè quello uscito dal bordo dell'immagine più vicino all'inizio del sorpasso."""
        a = self.a
        t_start = t - dur if t_start is None else t_start
        cands = [tr for tr in list(self.tracks.values()) + list(self.gone)
                 if not tr.matched and tr.zone in (a.us_side, "B") and t - tr.last_t < 3.0
                 and tr.clear_pred is not None and (tr.edge_t is not None or tr.min_d < 8.0)]
        ref = lambda x: abs((x.edge_t if x.edge_t is not None else x.last_t) - t_start)
        tr = min(cands, key=ref) if cands else None
        if tr and ref(tr) > 2.0:
            tr = None
        pred = tr.clear_pred if tr else None
        if tr:
            tr.matched = True
        meas = cm / 100.0
        if pred is not None:
            self.errors.append(abs(meas - pred))
            if pred > 0.2:
                self.ratios.append(meas / pred)
                self.k = sorted(self.ratios)[len(self.ratios) // 2]
                self.k_n = len(self.ratios)
        self.counts["sorpassi"] += 1
        if meas < a.pass_safe:
            self.counts["sorpassi_stretti"] += 1
        self.last_pass = {"t": time.time(), "cm": round(cm), "pred": fin(pred, 2),
                          "veicolo": tr.name if tr else "veicolo", "durata": round(dur, 2)}
        self.log.add("sorpasso", veicolo=tr.name if tr else "", id=tr.id if tr else "",
                     sorpasso_misurato_m=round(meas, 2), sorpasso_previsto_m=fin(pred, 2),
                     note=f"durata {dur:.2f}s")


# ---------------------------------------------------------------- ultrasuono

class Ultrasonic:
    """Mediana di 3 letture + riconoscimento del sorpasso (sotto soglia per 30 ms - 3 s)."""

    def __init__(self, a):
        self.a = a
        self.buf = collections.deque(maxlen=3)
        self.cm = None
        self.t = 0.0
        self.passes = collections.deque()
        self.lock = threading.Lock()
        self.in_pass = False
        self.p_min = 9999.0
        self.p_start = self.p_last = 0.0

    def feed(self, cm, t):
        """cm=None: niente entro 4 m."""
        self.buf.append(cm if cm is not None and cm < 395 else 9999.0)
        val = sorted(self.buf)[len(self.buf) // 2]
        with self.lock:
            self.cm = None if val >= 9999 else val
            self.t = t
        near = self.cm is not None and self.cm < self.a.pass_start
        if near:
            if not self.in_pass:
                self.in_pass, self.p_min, self.p_start = True, self.cm, t
            self.p_min = min(self.p_min, self.cm)
            self.p_last = t
        elif self.in_pass and t - self.p_last > 0.25:
            self.in_pass = False
            dur = self.p_last - self.p_start
            if 0.03 <= dur <= 3.0:  # più lungo = auto in coda accanto a te, non un sorpasso
                with self.lock:
                    self.passes.append((self.p_min, dur, self.p_start))

    def latest(self):
        with self.lock:
            return self.cm if time.time() - self.t < 0.5 else None

    def pop_passes(self):
        with self.lock:
            out = list(self.passes)
            self.passes.clear()
        return out


class GpioUltrasonic(Ultrasonic):
    """HC-SR04 direttamente sui GPIO del Pi (gpiozero + lgpio). Se i GPIO non sono disponibili,
    la camera continua senza ultrasuono invece di far ripartire il servizio all'infinito."""

    def __init__(self, a):
        super().__init__(a)
        try:
            from gpiozero import DistanceSensor  # sudo apt install python3-gpiozero python3-lgpio
            self.sensor = DistanceSensor(echo=a.us_echo, trigger=a.us_trig, max_distance=4.0,
                                         queue_len=1, partial=True)
        except Exception as e:
            print(f"[ultrasuono] GPIO non disponibili ({e}): continuo senza")
            return
        print(f"[ultrasuono] GPIO TRIG={a.us_trig} ECHO={a.us_echo}")
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        while True:
            d = self.sensor.distance  # metri, 4.0 = niente
            self.feed(None if d >= 3.95 else d * 100.0, time.time())
            time.sleep(0.04)


class SerialUltrasonic(Ultrasonic):
    """HC-SR04 letto da una Arduino UNO via USB: righe "U,<cm>" (-1 = niente)."""

    def __init__(self, a):
        super().__init__(a)
        self.path = a.us_serial
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        import serial  # pip install pyserial
        while True:  # se la UNO non è collegata o si stacca, riprova: la camera intanto continua
            try:
                port = serial.Serial(self.path, 115200, timeout=0.5)
                print(f"[ultrasuono] collegato a {self.path}")
                while True:
                    line = port.readline().decode("ascii", "ignore").strip()
                    if line.startswith("U,"):
                        try:
                            cm = float(line[2:])
                        except ValueError:
                            continue
                        self.feed(cm if cm > 0 else None, time.time())
            except (OSError, serial.SerialException) as e:
                print(f"[ultrasuono] {self.path} non disponibile ({e}), riprovo tra 3 s")
                time.sleep(3)


# ---------------------------------------------------------------- sorgenti video

class CameraSource:
    """Webcam USB in MJPG; un thread tiene solo l'ultimo fotogramma. Se la stacchi, prova a riaprirla."""

    def __init__(self, a):
        self.a = a
        self.index = int(a.source)
        self.cond = threading.Condition()
        self.frame, self.t, self.n, self.used = None, 0.0, 0, 0
        self.finished = False
        self.cap = self._open()
        ok, f = self.cap.read()
        if not ok:
            raise SystemExit("Webcam non trovata: controlla lsusb e /dev/video*")
        self.size = (f.shape[1], f.shape[0])
        print(f"[camera] {self.size[0]}x{self.size[1]}")
        threading.Thread(target=self._run, daemon=True).start()

    def _open(self):
        # V4L2 solo su Linux (Pi); su Mac e Windows OpenCV sceglie da solo
        cap = cv2.VideoCapture(self.index, cv2.CAP_V4L2) if sys.platform.startswith("linux") else cv2.VideoCapture(self.index)
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))  # prima della risoluzione
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.a.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.a.height)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _run(self):
        while True:
            ok, f = self.cap.read()
            if not ok:
                time.sleep(1.0)
                self.cap.release()
                self.cap = self._open()
                continue
            with self.cond:
                self.frame, self.t, self.n = f, time.time(), self.n + 1
                self.cond.notify_all()

    def read(self, timeout=0.15):
        with self.cond:
            if self.n == self.used:
                self.cond.wait(timeout)
            if self.n == self.used:
                return None
            self.used = self.n
            return self.frame, self.t, self.t


class FileSource:
    def __init__(self, a):
        self.a = a
        self.cap = cv2.VideoCapture(a.source)
        if not self.cap.isOpened():
            raise SystemExit(f"Non riesco ad aprire {a.source}")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.size = (int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
        self.i = 0
        self.offset = 0.0
        self.t0 = time.time()
        self.finished = False

    def read(self, timeout=None):
        if self.a.realtime:
            target = int((time.time() - self.t0) * self.fps)
            while self.i < target - 1 and self.cap.grab():
                self.i += 1
            wait = (self.i + 1) / self.fps - (time.time() - self.t0)
            if wait > 0:
                time.sleep(wait)
        ok, f = self.cap.read()
        if not ok:
            if self.a.loop and self.i > 0:
                self.offset += self.i / self.fps + 2.0
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                self.i = 0
                self.t0 = time.time()
                return self.read(timeout)
            self.finished = True
            return None
        self.i += 1
        return f, self.offset + self.i / self.fps, time.time()


class FakeScene:
    """Traffico sintetico come lo vedrebbe la webcam, più l'ultrasuono simulato.
    Serve a provare casco, pagina e logica dal primo minuto, senza camera né YOLO."""

    ASPECT = {0: 2.5, 1: 1.6, 2: 0.75, 3: 1.4, 5: 1.25, 7: 1.2}

    def __init__(self, a):
        self.a = a
        W, H = a.width, a.height
        self.size = (W, H)
        self.f = (W / 2) / math.tan(math.radians(a.hfov) / 2)
        self.c0 = a.center_x * W
        self.rng = random.Random(a.seed)
        self.veh = []
        self.next_id = 1
        self.next_spawn = time.time() + 1.0
        self.last = time.time()
        self.finished = False
        self.dets = []
        self.us_cm = None

    def _spawn(self, now):
        r = self.rng
        cls = r.choice([2, 2, 2, 2, 2, 7, 5, 3, 1])
        _, wm, lm, _, _ = CLASSES[cls]
        kind = r.choices(["largo", "stretto", "in linea"], weights=[4, 4, 1])[0]
        if cls == 1:
            kind = "lento"
        clear = {"largo": r.uniform(1.7, 2.6), "stretto": r.uniform(0.6, 1.3),
                 "in linea": r.uniform(0.8, 1.3), "lento": r.uniform(0.9, 1.8)}[kind]
        self.veh.append({
            "id": self.next_id, "cls": cls, "wm": wm, "lm": lm, "d": 40.0, "kind": kind,
            "v": r.uniform(1.5, 3.0) if kind == "lento" else r.uniform(5.0, 10.0),
            "lat0": r.uniform(0.0, 0.5) if kind == "in linea" else r.uniform(0.8, 1.8),
            "lat_end": clear + wm / 2,
            "swerve": (10.0, 3.0) if kind == "in linea" else (40.0, 8.0),
        })
        self.next_id += 1
        self.next_spawn = now + r.uniform(2.5, 6.0)

    @staticmethod
    def _lat(v):
        d0, d1 = v["swerve"]
        p = clamp((d0 - v["d"]) / (d0 - d1), 0.0, 1.0)
        p = p * p * (3 - 2 * p)
        return v["lat0"] + (v["lat_end"] - v["lat0"]) * p

    def read(self, timeout=None):
        time.sleep(max(0.0, 1 / 15 - (time.time() - self.last)))
        now = time.time()
        dt, self.last = now - self.last, now
        if now >= self.next_spawn:
            self._spawn(now)
        W, H = self.size
        dets, us = [], None
        for v in self.veh:
            v["d"] -= v["v"] * dt
            lat = self._lat(v)
            if v["d"] > 0.6:
                w = self.f * v["wm"] / v["d"]
                cx = self.c0 + lat * w / v["wm"] + self.rng.uniform(-1, 1)
                y2 = H * 0.5 + self.f * 0.9 / v["d"]
                h = w * self.ASPECT[v["cls"]]
                x1, x2 = max(0.0, cx - w / 2), min(float(W), cx + w / 2)
                if x2 - x1 > 3:
                    dets.append((v["id"], v["cls"], x1, max(0.0, y2 - h), x2, min(float(H), y2)))
            elif -v["lm"] <= v["d"] <= 0.0 and lat > 0:
                gap = (lat - v["wm"] / 2) * 100 + self.rng.gauss(0, 4)
                if gap < 400:
                    us = gap if us is None else min(us, gap)
        self.veh = [v for v in self.veh if v["d"] > -v["lm"] - 1.0]
        self.dets, self.us_cm = dets, us
        frame = self._draw(dets) if cv2 is not None else None
        return frame, now, now

    def _draw(self, dets):
        import numpy as np
        W, H = self.size
        img = np.full((H, W, 3), 40, np.uint8)
        img[: H // 2] = (70, 55, 45)
        for x in (-1.0, 3.5):  # bordi della corsia in prospettiva
            cv2.line(img, (int(self.c0 + x * self.f / 40), H // 2 + 1), (int(self.c0 + x * self.f / 1.2), H), (170, 170, 170), 2)
        col = {0: (200, 200, 255), 1: (80, 200, 80), 2: (200, 160, 90), 3: (60, 160, 230), 5: (40, 200, 230), 7: (90, 90, 200)}
        for _, cls, x1, y1, x2, y2 in sorted(dets, key=lambda d: d[4] - d[2]):
            cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), col[cls], -1)
        return img


# ---------------------------------------------------------------- rilevamento

class Detector:
    def __init__(self, a):
        from ultralytics import YOLO
        self.a = a
        path = a.model
        if not os.path.exists(path) and path.endswith("_ncnn_model"):
            base = path[: -len("_ncnn_model")] + ".pt"
            print(f"[modello] {path} non c'è: lo creo da {base} (serve internet la prima volta)")
            path = YOLO(base).export(format="ncnn", imgsz=a.imgsz)
        self.model = YOLO(path, task="detect")

    def detect(self, frame, roi):
        x0, y0, x1, y1 = roi
        r = self.model.track(frame[y0:y1, x0:x1], persist=True, tracker=self.a.tracker, imgsz=self.a.imgsz,
                             conf=self.a.conf, classes=list(CLASSES), verbose=False)[0]
        b = r.boxes
        if b is None or b.id is None:
            return []
        return [(tid, c, bx1 + x0, by1 + y0, bx2 + x0, by2 + y0)
                for (bx1, by1, bx2, by2), tid, c in zip(b.xyxy.tolist(), b.id.int().tolist(), b.cls.int().tolist())]


# ---------------------------------------------------------------- video annotato e clip

LEVEL_BGR = {0: (190, 190, 190), 1: (0, 170, 255), 2: (0, 0, 255)}


def draw(frame, est, roi, zones, fps, t):
    img = frame.copy()
    H, W = img.shape[:2]
    cv2.rectangle(img, (roi[0], roi[1]), (roi[2] - 1, roi[3] - 1), (90, 90, 90), 1)
    cv2.line(img, (int(est.c0), 0), (int(est.c0), H), (255, 255, 0), 1)
    for tr in est.tracks.values():
        if t - tr.last_t > 0.2:
            continue
        x1, y1, x2, y2 = (int(v) for v in tr.bbox)
        c = LEVEL_BGR[tr.level]
        cv2.rectangle(img, (x1, y1), (x2, y2), c, 3 if tr.level else 1)
        ttc = f"{tr.ttc:.1f}s" if tr.ttc < INF else "-"
        lab = f"{tr.name} {tr.d:.0f}m TTC {ttc} sorpasso {tr.clear:.1f}m"
        cv2.putText(img, lab, (x1, max(15, y1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 2)
    # vista camera: la sinistra del ciclista è a DESTRA nell'immagine
    names = [("DX", zones["R"]), ("DIETRO", zones["B"]), ("SX", zones["L"])]
    for i, (n, lvl) in enumerate(names):
        x = 10 + i * 130
        cv2.rectangle(img, (x, 10), (x + 120, 40), LEVEL_BGR[lvl] if lvl else (60, 60, 60), -1)
        cv2.putText(img, n, (x + 8, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, f"{fps:.1f} fps", (W - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    return img


class Clips:
    """Tiene gli ultimi secondi in memoria e salva 3 s prima + 2 s dopo ogni avviso rosso."""

    def __init__(self, folder, pre=3.0, post=2.0, width=480):
        self.folder, self.pre, self.post, self.width = folder, pre, post, width
        os.makedirs(folder, exist_ok=True)
        self.buf = collections.deque()
        self.pending = []

    def trigger(self, t, tr):
        self.pending.append({"start": t - self.pre, "end": t + self.post,
                             "name": f"rosso_{datetime.now().strftime('%H%M%S')}_{tr.name}_{tr.id}.mp4"})

    def add(self, t, frame):
        h, w = frame.shape[:2]
        self.buf.append((t, cv2.resize(frame, (self.width, int(h * self.width / w)))))
        while self.buf and t - self.buf[0][0] > self.pre + self.post + 1:
            self.buf.popleft()
        for p in [p for p in self.pending if t >= p["end"]]:
            frames = [f for ft, f in self.buf if p["start"] <= ft <= p["end"]]
            if len(frames) > 1:
                fps = max(1.0, len(frames) / (self.pre + self.post))
                vw = cv2.VideoWriter(os.path.join(self.folder, p["name"]), cv2.VideoWriter_fourcc(*"mp4v"),
                                     fps, (frames[0].shape[1], frames[0].shape[0]))
                for f in frames:
                    vw.write(f)
                vw.release()
            self.pending.remove(p)


# ---------------------------------------------------------------- server web

def handle_helmet_event(body):
    now = time.time()
    for line in body.strip().splitlines():
        p = line.strip().split(",")
        if not p or not p[0]:
            continue
        with S.lock:
            S.helmet["t"] = now
        if p[0] == "U" and len(p) >= 2 and S.remote_us:
            try:
                cm = float(p[1])
            except ValueError:
                continue
            S.remote_us.feed(cm if cm > 0 else None, now)
        elif p[0] == "H":
            with S.lock:
                S.helmet["info"] = ",".join(p[1:])
        elif p[0] == "LOOK" and len(p) >= 3:
            with S.lock:
                S.helmet["look"] = {"t": now, "lato": p[1], "risposta": int(p[2])}
            if S.log:
                S.log.add("guardata", note=f"lato {p[1]}, risposta {'ROSSO' if p[2] == '2' else 'verde'}")
        elif p[0] == "FALL" and len(p) >= 2:
            with S.lock:
                S.helmet["fall"] = {"t": now, "fase": int(p[1])}
            if S.log:
                S.log.add("caduta", note={"0": "annullata", "1": "sospetta", "2": "SOS inviato"}.get(p[1], p[1]))


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"

    def log_message(self, *args):
        pass

    def _send(self, code, body, ctype="text/plain; charset=utf-8"):
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/risk":
            with S.lock:
                l, b, r, cls, ttc, seq, cam = S.risk
                age = int(min(99999, (time.time() - S.risk_t) * 1000)) if S.risk_t else 99999
            self._send(200, f"R,{l},{b},{r},{cls},{ttc},{seq},{age},{cam}\n")
        elif path == "/state":
            with S.lock:
                body = json.dumps(S.state)
            self._send(200, body, "application/json")
        elif path == "/context":
            self._send(200, S.log.context_text() if S.log else "")
        elif path == "/test":
            try:
                with open(os.path.join(HERE, "test.html"), "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(404, "test.html mancante")
        elif path in ("/", "/index.html"):
            try:
                with open(os.path.join(HERE, "dashboard.html"), "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(404, "dashboard.html mancante")
        elif path == "/events.csv" and S.log:
            with open(S.log.path, "rb") as f:
                self._send(200, f.read(), "text/csv; charset=utf-8")
        elif path == "/video.mjpg":
            self._mjpeg()
        else:
            self._send(404, "non trovato")

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n).decode("utf-8", "ignore") if n else ""
        path = self.path.split("?")[0]
        if path == "/event":
            handle_helmet_event(body)
            self._send(200, "ok\n")
        elif path == "/gps":
            try:
                g = json.loads(body)
                with S.lock:
                    S.gps = (float(g["lat"]), float(g["lon"]), float(g.get("acc", 0)), time.time())
                self._send(200, "ok\n")
            except (ValueError, KeyError):
                self._send(400, "json non valido")
        else:
            self._send(404, "non trovato")

    def _mjpeg(self):
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.end_headers()
        last = None
        try:
            while True:
                with S.lock:
                    j = S.jpeg
                if j is not None and j is not last:
                    self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n" % len(j))
                    self.wfile.write(j + b"\r\n")
                    last = j
                time.sleep(0.03)
        except (BrokenPipeError, ConnectionResetError):
            pass


def start_server(port):
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print(f"[web] http://<ip-del-pi>:{port}  (casco: /risk, telefono: /)")


# ---------------------------------------------------------------- ciclo principale

def main():
    a = parse_args()
    os.makedirs(a.log_dir, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log = EventLog(os.path.join(a.log_dir, f"eventi_{stamp}.csv"))
    S.log = log
    start_server(a.port)

    if a.fake:
        src, mode = FakeScene(a), "simulazione"
    elif a.source.isdigit():
        src, mode = CameraSource(a), "webcam"
    else:
        src, mode = FileSource(a), "video"
    W, H = src.size
    fx = [float(v) for v in a.crop.split(",")]
    roi = (int(fx[0] * W), int(fx[1] * H), int(fx[2] * W), int(fx[3] * H))
    est = Estimator(a, W, roi[0], roi[2], log)
    det = None if a.fake else Detector(a)
    if a.fake:
        us = Ultrasonic(a)
    elif a.us_serial:
        us = SerialUltrasonic(a)
    elif a.us_remote:
        us = S.remote_us = Ultrasonic(a)
    elif a.us_trig is not None and a.us_echo is not None:
        us = GpioUltrasonic(a)
    else:
        us = None
    print(f"[avvio] {mode}, {W}x{H}, focale {est.f:.0f} px, ultrasuono {'sì' if us else 'no'}")

    need_frames = cv2 is not None and (a.save or a.clips or a.stream or a.show)
    clips = Clips(os.path.join(a.log_dir, "clip")) if a.clips and cv2 is not None else None
    if clips:
        est.on_red = clips.trigger
    writer = None
    track_log = None
    if a.log_tracks:
        track_log = csv.writer(open(os.path.join(a.log_dir, f"tracce_{stamp}.csv"), "w", newline=""))
        track_log.writerow(["t", "id", "veicolo", "d", "lat", "lat_pass", "ttc", "sorpasso", "zona", "livello", "bordo"])

    seq, n_frames, fps, last_t_frame = 0, 0, 0.0, None
    lat_ms = 0.0
    t_scene = time.time()
    t_start = time.time()
    last_cam = time.time()
    try:
        while True:
            item = src.read(0.15)
            if item is None and src.finished:
                break
            now = time.time()
            if item is not None:
                frame, t_scene, t_cap = item
                dets = src.dets if a.fake else det.detect(frame, roi)
                est.update(dets, t_scene)
                last_cam = now
                n_frames += 1
                if last_t_frame is not None:
                    dt = max(1e-3, now - last_t_frame)
                    fps = 1 / dt if fps == 0 else 0.9 * fps + 0.1 / dt
                last_t_frame = now
                lat_ms = (now - t_cap) * 1000
            cam_ok = now - last_cam < 1.0

            if a.fake:
                us.feed(src.us_cm, now)
            us_cm = us.latest() if us else None
            for cm, dur, t_start in (us.pop_passes() if us else []):
                if a.us_side != "B":  # puntato indietro non vede i sorpassi, solo chi ti segue
                    est.on_pass(t_scene, cm, dur, t_start if mode != "video" else None)

            zones, top, near = est.zones(t_scene, us_cm, cam_ok)
            seq = (seq + 1) % 100000
            ttc_ds = int(clamp(top.ttc * 10, 0, 998)) if top and top.ttc < INF else 999
            tracks = [{
                "id": tr.id, "cls": tr.name, "d": fin(tr.d, 1), "lat": fin(tr.lat), "lat_pass": fin(tr.lat_pass),
                "ttc": fin(tr.ttc, 1), "clear": fin(tr.clear), "level": tr.level, "zone": tr.zone,
                "edge": tr.edge, "w": tr.width_m, "len": tr.length_m,
            } for tr in est.tracks.values() if t_scene - tr.last_t <= a.stale]
            with S.lock:
                helmet = dict(S.helmet)
                gps_ok = S.gps is not None and now - S.gps[3] < 10
            state = {
                "t": now, "mode": mode, "fps": round(fps, 1), "lat_ms": round(lat_ms), "cam_ok": cam_ok,
                "zones": zones, "near": near, "us_cm": fin(us_cm, 0), "us_side": a.us_side, "has_us": us is not None,
                "fused": est.fused, "us_trust": a.us_trust, "us_blend": a.us_blend, "scale": a.scale,
                "near_red": a.near_red, "near_amber": a.near_amber,
                "us_age": fin(now - us.t, 2) if us and us.t else None, "us_src": type(us).__name__ if us else None,
                "top": {"cls": top.name, "ttc": fin(top.ttc, 1), "zone": top.zone, "level": top.level} if top else None,
                "tracks": tracks, "counts": dict(est.counts), "last_pass": est.last_pass,
                "calib": {"k": round(est.k, 2), "n": est.k_n, "mae_cm": est.mae_cm()}, "pass_safe": a.pass_safe,
                "helmet": {"ok": now - helmet["t"] < 3, "look": helmet["look"], "fall": helmet["fall"],
                           "info": helmet["info"]},
                "gps": gps_ok,
                "events": log.last(6),
            }
            with S.lock:
                S.state = state
                S.risk = (zones["L"], zones["B"], zones["R"], top.code if top else 0, ttc_ds, seq, int(cam_ok))
                S.risk_t = now

            if track_log and item is not None:
                for tr in est.tracks.values():
                    if tr.last_t == t_scene:
                        track_log.writerow([round(t_scene, 3), tr.id, tr.name, fin(tr.d), fin(tr.lat), fin(tr.lat_pass),
                                            fin(tr.ttc), fin(tr.clear), tr.zone, tr.level, int(tr.edge)])

            if need_frames and item is not None and frame is not None:
                ann = draw(frame, est, roi, zones, fps, t_scene)
                if clips:
                    clips.add(t_scene, ann)
                if a.save:
                    if writer is None:
                        writer = cv2.VideoWriter(a.save, cv2.VideoWriter_fourcc(*"mp4v"),
                                                 getattr(src, "fps", 0) or 10.0, (W, H))
                    writer.write(ann)
                if a.stream:
                    ok, jpg = cv2.imencode(".jpg", cv2.resize(ann, (640, int(640 * H / W))),
                                           [cv2.IMWRITE_JPEG_QUALITY, 70])
                    if ok:
                        with S.lock:
                            S.jpeg = jpg.tobytes()
                if a.show:
                    cv2.imshow("Guardaspalle", ann)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
    except KeyboardInterrupt:
        pass
    finally:
        if writer:
            writer.release()
        summary = {
            "modalità": mode, "fotogrammi": n_frames, "secondi": round(time.time() - t_start, 1),
            "fps_medi": round(n_frames / max(1e-6, time.time() - t_start), 1),
            "avvisi_radar_stile": est.counts["radar"], "avvisi_ambra": est.counts["ambra"],
            "avvisi_rossi": est.counts["rossi"], "sorpassi_misurati": est.counts["sorpassi"],
            "sorpassi_sotto_soglia": est.counts["sorpassi_stretti"],
            "calibrazione_misurato_su_previsto": round(est.k, 2), "coppie_calibrazione": est.k_n,
            "errore_medio_sorpasso_cm": est.mae_cm(),
            "eventi": log.path,
        }
        with open(os.path.join(a.log_dir, f"riassunto_{stamp}.json"), "w") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
