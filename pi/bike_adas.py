#!/usr/bin/env python3
"""
Guardaspalle - il "cuore" sulla bici (Raspberry Pi 4).

Webcam posteriore -> YOLO26n addestrato su video da camera posteriore (gs26n, NCNN 192x480)
  + coppie di fari di notte (fari.py) + ByteTrack -> per ogni veicolo:
  tempo all'impatto (TTC) dalla crescita del riquadro, posizione laterale,
  distanza di sorpasso prevista -> rischio per zona (SX / DIETRO / DX).
HC-SR04 a sinistra -> distanza reale di sorpasso (verifica la previsione).
HC-SR04 dietro (--us-side B) -> distanza esatta da vicino, fusa con la camera; quando i due vedono
  lo stesso oggetto l'ultrasuono calibra da solo la distanza della camera (logs/calibrazione.json).

Uscite:
  TCP :5005      casco (UNO Q, bike-led-receiver): una riga JSON per giro {"seq","L","C","R"}, 1 = zona rossa.
                 IP da --casco o da casco_ip.txt; con la camera morta non si invia nulla (il casco lampeggia ambra)
  GET  /risk     riga per il casco (UNO Q):  R,L,B,R,cls,ttc_ds,seq,age_ms,cam_ok
  POST /event    eventi dal casco: guardata indietro, caduta, battito
  GET  /context  ultimi eventi in testo (per l'SOS del casco)
  GET  /         pagina stile Tesla per il telefono (dashboard.html), /state in JSON
  logs/          eventi in CSV, clip di 5 s degli avvisi rossi, riassunto finale

Esempi:
  python3 bike_adas.py --fake                                # traffico simulato, senza camera né YOLO
  python3 bike_adas.py --fake --casco 172.20.10.5            # idem, e accende i LED del casco
  python3 bike_adas.py --source traffico.mp4 --realtime --loop --stream
  python3 bike_adas.py --source 0 --us-trig 23 --us-echo 24 --save giro.mp4 --clips
  python3 bike_adas.py --model yolo26n_256x640_ncnn_model ...   # più preciso da lontano, ~40% più lento
"""

import argparse
import collections
import csv
import json
import math
import os
import random
import shutil
import signal
import socket
import sys
import threading
import time
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import profili_mezzo  # stesso ADAS su bici, monopattino, auto, furgone, camion, bus

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
# altezza tipica (m): quando il veicolo esce di lato dall'immagine la larghezza è tagliata, l'altezza no
HEIGHTS = {0: 1.7, 1: 1.7, 2: 1.5, 3: 1.4, 5: 3.0, 7: 3.2}
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
    g.add_argument("--model", default="gs26n_192x480_ncnn_model",
                   help="cartella NCNN <modello>_<alto>x<largo>_ncnn_model (se manca la crea da <modello>.pt) o .pt")
    g.add_argument("--imgsz", default=None, help="es. 320 o 192,480; se omesso lo legge dal modello NCNN")
    g.add_argument("--conf", type=float, default=0.25, help="confidenza per agganciare un riquadro (ByteTrack)")
    g.add_argument("--tracker", default="bytetrack", help="bytetrack o botsort")
    g.add_argument("--night", default="auto", choices=["auto", "on", "off"],
                   help="schiarisce le ombre prima di YOLO (gamma) quando l'immagine è scura")
    g.add_argument("--gamma", type=float, default=1.0, help="0.5 schiarisce le ombre di notte (aiuta yolo11n, non yolo26n)")
    g.add_argument("--dark", type=float, default=60.0, help="luminosità media sotto cui è 'notte' (0-255)")
    g.add_argument("--no-fari", dest="fari", action="store_false",
                   help="di notte non cercare le coppie di fari (veicoli di cui YOLO vede solo le luci)")
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
    g.add_argument("--us-hz", type=float, default=20.0, help="impulsi al secondo dell'HC-SR04 (GPIO)")
    g.add_argument("--us-max", type=float, default=300.0, help="cm: oltre, la lettura vale 'niente' (a 3,3 V è instabile)")
    g.add_argument("--temp", type=float, default=20.0, help="temperatura dell'aria (°C) per la velocità del suono")
    g.add_argument("--no-autocal", dest="autocal", action="store_false",
                   help="non calibrare la distanza della camera con l'ultrasuono")
    g = p.add_argument_group("uscite")
    g.add_argument("--port", type=int, default=8000)
    g.add_argument("--casco", default=None,
                   help="IP della UNO Q sul casco (LED); se omesso si legge da casco_ip.txt accanto allo script")
    g.add_argument("--soglia-led", type=int, default=2, choices=[1, 2],
                   help="livello di zona da cui il LED del casco si accende rosso: 1 = ambra in su, 2 = solo rosso")
    g.add_argument("--log-dir", default=os.path.join(HERE, "logs"))
    g.add_argument("--save", default=None, help="salva il video annotato (mp4)")
    g.add_argument("--clips", action="store_true", help="salva 5 s di video per ogni avviso rosso")
    g.add_argument("--stream", action="store_true", help="video annotato su /video.mjpg")
    g.add_argument("--show", action="store_true", help="finestra OpenCV (solo con desktop)")
    g.add_argument("--log-tracks", action="store_true", help="CSV con tutte le tracce, fotogramma per fotogramma")
    g.add_argument("--giocattolo", type=float, default=None, metavar="CM",
                   help="demo da tavolo: larghezza vera (cm) del veicolo giocattolo visto da dietro. Le distanze "
                        "restano in cm veri; ogni veicolo è trattato come largo così, e le persone (chi presenta) "
                        "vengono ignorate")
    profili_mezzo.aggiungi(p)
    a = profili_mezzo.parse(p)
    if a.giocattolo:
        # un giocattolo può essere scambiato per auto, camion o bus: per tutti vale la sua larghezza misurata
        a.scale = a.giocattolo / 100.0 / CLASSES[2][1]
        for c in (1, 3, 5, 7):
            n, _, _, wgt, code = CLASSES[c]
            CLASSES[c] = (n, CLASSES[2][1], CLASSES[2][2], wgt, code)
            HEIGHTS[c] = HEIGHTS[2]
    return a


# ---------------------------------------------------------------- casco
CASCO_PORT = 5005  # deve coincidere con PORT in bike-led-receiver/python/main.py


class Casco:
    """Spinge lo stato delle zone alla UNO Q sul casco: una riga JSON per giro, {"seq","L","C","R"}.
    Non blocca mai il ciclo per più di 0,2 s: se la UNO Q non c'è riprova la connessione ogni 2 s."""

    def __init__(self, host):
        self.addr = (host, CASCO_PORT)
        self.sock = None
        self.retry = 0.0
        self.seq = 0

    def send(self, zones, soglia):
        now = time.monotonic()
        if self.sock is None:
            if now < self.retry:
                return
            self.retry = now + 2.0
            try:
                # ponytail: connessione nel ciclo principale (fino a 0,2 s ogni 2 s se il casco manca);
                # un thread dedicato se questo pesa sugli fps
                self.sock = socket.create_connection(self.addr, timeout=0.2)
                self.sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                self.sock.setblocking(False)
                print(f"[casco] connesso a {self.addr[0]}:{self.addr[1]}")
            except OSError as e:
                print(f"[casco] {self.addr[0]}:{self.addr[1]} non raggiungibile: {e}")
                return
        self.seq = (self.seq + 1) % 100000
        line = json.dumps({"seq": self.seq, "L": int(zones["L"] >= soglia),
                           "C": int(zones["B"] >= soglia), "R": int(zones["R"] >= soglia)}) + "\n"
        try:
            # riga parziale = buffer pieno, la UNO Q non legge: meglio riconnettersi che spedire mezze righe
            if self.sock.send(line.encode()) < len(line):
                raise OSError("buffer pieno")
        except OSError as e:
            print(f"[casco] connessione persa: {e}")
            self.sock.close()
            self.sock = None


def casco_host(a):
    if a.casco:
        return a.casco
    try:
        with open(os.path.join(HERE, "casco_ip.txt")) as f:
            return f.read().strip() or None
    except OSError:
        return None


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


def parse_imgsz(v):
    """'320' -> 320, '192,480' o '192x480' -> [192, 480] (alto, largo, multipli di 32)."""
    if v is None or v == "":
        return None
    p = [int(x) for x in str(v).replace("x", ",").split(",") if x.strip()]
    return p[0] if len(p) == 1 else p[:2]


def fmt_d(m):
    """Distanza leggibile: cm sotto i 2 m (demo in scala), metri sopra."""
    if m is None or not math.isfinite(m):
        return "-"
    return f"{m * 100:.0f}cm" if m < 2 else f"{m:.1f}m" if m < 10 else f"{m:.0f}m"


class AlphaBeta:
    """Filtro alfa-beta (un Kalman a guadagno fisso): segue valore e velocità, quindi leviga il
    tremolio senza restare indietro quando l'oggetto si avvicina. I salti oltre 'gate' sono tagliati."""

    def __init__(self, alpha, beta, gate, reset_after=0.7):
        self.alpha, self.beta, self.gate, self.reset_after = alpha, beta, gate, reset_after
        self.x, self.v, self.t = None, 0.0, 0.0

    def update(self, z, t):
        if self.x is None or t - self.t > self.reset_after:
            self.x, self.v, self.t = z, 0.0, t
            return self.x
        dt = max(1e-3, t - self.t)
        pred = self.x + self.v * dt
        r = clamp(z - pred, -self.gate, self.gate)
        self.x = pred + self.alpha * r
        self.v += self.beta * r / dt
        self.t = t
        return self.x


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
        self.d_raw = INF  # prima della calibrazione con l'ultrasuono
        self.lw = AlphaBeta(0.5, 0.1, 0.3)  # log della larghezza del riquadro, levigato
        self.lh = AlphaBeta(0.5, 0.1, 0.3)  # idem per l'altezza (serve quando il riquadro è tagliato di lato)
        self.hist_h = collections.deque(maxlen=60)  # (t, altezza px) per il TTC di chi è al bordo
        self.hist_d = collections.deque(maxlen=30)  # (t, distanza m) per controllare che si avvicini davvero
        self.alongside = False  # di fianco: uscito di lato dall'immagine, vicino
        self.passed = False
        # chi ci raggiunge da dietro si ingrandisce; chi superiamo noi entra dal bordo e si rimpicciolisce
        self.approach_s = 0.0  # secondi passati ad avvicinarsi
        self.from_behind = False
        self.receding = False
        self.zone_raw, self.zone_n = "B", 0
        self.n_seen = 0
        self.disp = None  # riquadro levigato da disegnare
        self.conf = None
        self.min_d = INF
        self.lat = 0.0
        self.vlat = 0.0
        self.lat_pass = 0.0
        self.rate = None
        self.rate_h = None
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
    def __init__(self, a, frame_w, x_lo, x_hi, log, y_lo=0, y_hi=10 ** 6):
        self.a = a
        self.f = a.f_px or (frame_w / 2) / math.tan(math.radians(a.hfov) / 2)
        self.c0 = a.center_x * frame_w
        self.x_lo, self.x_hi = x_lo, x_hi
        self.y_lo, self.y_hi = y_lo, y_hi
        self.log = log
        self.tracks = {}
        self.gone = collections.deque(maxlen=20)
        self.counts = {"rossi": 0, "ambra": 0, "radar": 0, "sorpassi": 0, "sorpassi_stretti": 0}
        self.k, self.k_n = 1.0, 0  # misurato / previsto (mediana, robusta ai sorpassi strani)
        self.ratios, self.errors = [], []  # per la calibrazione e per il numero da mostrare
        self.last_pass = None
        self.on_red = None
        self.fused = None
        # calibrazione automatica camera <- ultrasuono: distanza camera x cam_k
        self.cam_k, self.cal_n = 1.0, 0
        self.cal = collections.deque(maxlen=40)
        self.cal_t = None
        self.cal_path = os.path.join(a.log_dir, "calibrazione.json")
        if a.autocal and a.us_side == "B":
            try:
                with open(self.cal_path) as f:
                    c = json.load(f)
                if abs(c.get("scale", 1.0) - a.scale) < 1e-9 and c.get("model") == os.path.basename(a.model):
                    self.cam_k, self.cal_n = clamp(float(c["k"]), 0.3, 3.0), int(c.get("n", 0))
                    print(f"[calibrazione] camera x{self.cam_k:.2f} (da {self.cal_n} misure precedenti)")
            except (OSError, ValueError, KeyError, TypeError):
                pass

    def update(self, dets, t):
        a = self.a
        for det in dets:
            tid, cls, x1, y1, x2, y2 = det[:6]
            if cls not in CLASSES or x2 - x1 < 3:
                continue
            if cls == 0 and a.giocattolo:
                continue  # al tavolo le persone sono chi fa la demo, non un pericolo
            tr = self.tracks.get(tid)
            if tr is None:
                tr = self.tracks[tid] = Track(tid, cls, t)
                self._handover(tr, (x1, y1, x2, y2), t)
            tr.vote(cls)
            tr.conf = det[6] if len(det) > 6 else None
            tr.bbox = (x1, y1, x2, y2)
            tr.n_seen += 1
            tr.disp = tr.bbox if tr.disp is None else tuple(0.5 * o + 0.5 * n for o, n in zip(tr.disp, tr.bbox))
            tr.last_t = t
            # un riquadro tagliato dal bordo non ha la larghezza vera: il veicolo ci sta passando di fianco
            tr.edge = x1 <= self.x_lo + a.edge_px or x2 >= self.x_hi - a.edge_px
            ycut = y1 <= self.y_lo + a.edge_px or y2 >= self.y_hi - a.edge_px
            tr.ycut = ycut
            hm = HEIGHTS.get(tr.cls, 1.5) * a.scale
            if not ycut:
                hf = math.exp(tr.lh.update(math.log(max(2.0, y2 - y1)), t))
                tr.hist_h.append((t, y2 - y1))
            if tr.edge:
                # tagliato di lato: la distanza viene dall'altezza, e conta il fianco del veicolo più vicino
                # all'asse (quello ancora dentro l'immagine), non il centro del riquadro
                if not ycut:
                    tr.d_raw = self.f * hm / hf
                    tr.d = tr.d_raw * self.cam_k
                    tr.min_d = min(tr.min_d, tr.d)
                if math.isfinite(tr.d):
                    sign = -1.0 if a.mirror else 1.0
                    left = x1 <= self.x_lo + a.edge_px
                    near_x = x2 if left else x1
                    # il veicolo si estende verso il bordo: se il suo fianco supera il centro, è in linea con te
                    overlap = (near_x > self.c0) if left else (near_x < self.c0)
                    tr.lat_near = 0.0 if overlap else sign * (near_x - self.c0) * tr.d / self.f
                if tr.edge_t is None and tr.min_d < 10 * a.scale:
                    tr.edge_t = t
            if not tr.edge:
                w = x2 - x1
                cx = (x1 + x2) / 2
                # larghezza levigata: il bordo del riquadro trema di qualche pixel a ogni fotogramma
                wf = math.exp(tr.lw.update(math.log(w), t))
                sign = -1.0 if a.mirror else 1.0
                # camera rivolta indietro: la destra dell'immagine è la SINISTRA del ciclista (positivo)
                # laterale in "larghezze di veicolo": non dipende dalla focale
                wm = tr.width_m * a.scale
                tr.lat = sign * (cx - self.c0) * wm / wf
                tr.d_raw = self.f * wm / wf
                tr.d = tr.d_raw * self.cam_k
                tr.min_d = min(tr.min_d, tr.d)
                tr.hist.append((t, w, tr.lat))
            if math.isfinite(tr.d) and tr.d > 0:
                tr.hist_d.append((t, tr.d))
            self._estimate(tr, t)
            self._risk(tr, t)
        for tid in list(self.tracks):
            if t - self.tracks[tid].last_t > a.expire:
                self.gone.append(self.tracks.pop(tid))

    def _handover(self, tr, box, t):
        """Lo stesso veicolo cambia spesso numero (YOLO lo perde un attimo, oppure di notte passa dai fari
        a YOLO): se una traccia appena persa era lì, il nuovo numero eredita la sua storia di avvicinamento."""
        bw, bh = box[2] - box[0], box[3] - box[1]
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        best = None
        for old in list(self.tracks.values()) + list(self.gone):
            if old is tr or old.last_t >= t or t - old.last_t > 1.2:
                continue
            ob = old.bbox
            ow, oh = ob[2] - ob[0], ob[3] - ob[1]
            dist = math.hypot(cx - (ob[0] + ob[2]) / 2, cy - (ob[1] + ob[3]) / 2)
            # confronto sull'altezza: la larghezza cambia quando il veicolo esce di lato dall'immagine;
            # chi si stava avvicinando può essere cresciuto parecchio nel frattempo
            hi = 2.2 if old.approach_s > 0 else 1.7
            if dist < 0.8 * max(bw, ow) and 0.6 < bh / max(1, oh) < hi and (best is None or dist < best[0]):
                best = (dist, old)
        if best:
            old = best[1]
            tr.approach_s, tr.from_behind, tr.min_d = old.approach_s, old.from_behind, old.min_d
            tr.hist.extend(old.hist)
            tr.hist_h.extend(old.hist_h)
            tr.rate, tr.n_seen, tr.zone_ok = old.rate, old.n_seen, getattr(old, "zone_ok", old.zone)
            tr.disp = old.disp
            old.last_t = -1e9  # non va ereditata due volte

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
            dt = t - getattr(tr, "est_t", t)
            # anche l'altezza deve crescere: un veicolo che superiamo entra di lato, il riquadro si allarga
            # mentre entra nell'immagine ma in realtà si rimpicciolisce (altezza che cala)
            r_eff = tr.rate
            ph = [p for p in tr.hist_h if t - p[0] <= a.window]
            if len(ph) >= 4 and ph[-1][0] - ph[0][0] >= 0.3:
                rh, _ = linfit([p[0] for p in ph], [math.log(p[1]) for p in ph])
                tr.rate_h = rh if getattr(tr, "rate_h", None) is None else 0.5 * tr.rate_h + 0.5 * rh
                r_eff = min(r_eff, tr.rate_h)
                if tr.rate_h < -0.05:
                    tr.ttc = INF
            # e la distanza stimata non deve crescere (terzo controllo indipendente)
            pd = [(p[0], p[1]) for p in tr.hist_d if t - p[0] <= 0.6]
            if len(pd) >= 3 and pd[-1][0] - pd[0][0] >= 0.2:
                sd, _ = linfit([p[0] for p in pd], [math.log(max(1e-3, p[1])) for p in pd])
                r_eff = min(r_eff, -sd)
            if r_eff > 1.0 / a.ttc_max:
                tr.approach_s += dt
            elif r_eff < -0.05:
                tr.approach_s = max(0.0, tr.approach_s - 2 * dt)
            tr.receding = r_eff < -0.05
            # arriva da dietro: si è avvicinato per almeno mezzo secondo mentre era tutto nell'immagine
            tr.from_behind = tr.from_behind or tr.approach_s >= 0.3
            recent = [p for p in pts if t - p[0] <= 0.5] or pts[-2:]
            if len(recent) >= 2:
                tr.vlat, _ = linfit([p[0] for p in recent], [p[2] for p in recent])
        tr.est_t = t
        if tr.edge:
            ph = [p for p in tr.hist_h if t - p[0] <= a.window]
            if len(ph) >= 3 and ph[-1][0] - ph[0][0] >= 0.2:
                rate, _ = linfit([p[0] for p in ph], [math.log(p[1]) for p in ph])
                tmid = sum(p[0] for p in ph) / len(ph)
                tr.ttc = max(0.0, 1.0 / rate - (t - tmid)) if rate > 1.0 / a.ttc_max else INF
                # al bordo: se cresce ci sta superando (arriva da dietro), se si rimpicciolisce lo stiamo superando noi
                dt = t - getattr(tr, "edge_est_t", t)
                tr.edge_est_t = t
                if rate > 1.0 / a.ttc_max:
                    tr.approach_s += dt
                elif rate < -0.05:
                    tr.approach_s = max(0.0, tr.approach_s - dt)
                tr.receding = rate < -0.05
                tr.from_behind = tr.from_behind or tr.approach_s >= 0.3
            ln = getattr(tr, "lat_near", None)
            if ln is not None and math.isfinite(tr.d):
                # il fianco vicino è già nell'immagine: la distanza laterale si legge direttamente
                tr.clear = abs(ln)
                tr.zone = "L" if ln > 0 else "R"
                if tr.clear < a.rider_half:
                    tr.zone = "B"
                tr.alongside = tr.d < 8.0 * a.scale
                if tr.d < 12 * a.scale:
                    tr.clear_pred = tr.clear
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
            if tr.d < 12 * a.scale:
                tr.clear_pred = tr.clear
        # il lato cambia solo se il nuovo lato si conferma per 3 fotogrammi (niente avvisi che saltano SX/DX)
        raw = tr.zone
        if raw == tr.zone_raw:
            tr.zone_n += 1
        else:
            tr.zone_raw, tr.zone_n = raw, 1
        if tr.zone_n < 3 and tr.n_seen > 3 and hasattr(tr, "zone_ok"):
            tr.zone = tr.zone_ok
        tr.zone_ok = tr.zone

    def _risk(self, tr, t):
        a = self.a
        s = 0.0
        # solo chi ci raggiunge da dietro può dare un avviso: chi superiamo noi (si allontana, o compare
        # già di fianco e poi si rimpicciolisce) non è un pericolo
        threat = tr.from_behind and not tr.receding
        if threat and (tr.d <= a.max_range or tr.edge):
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
            elif tr.zone == "B" and tr.d < a.tailgate * a.scale:
                s = 0.4 * tr.weight  # incollato dietro di te
        elif (not tr.receding and tr.zone == "B" and not tr.edge and tr.d < a.tailgate * a.scale and tr.n_seen > 12
              and (tr.rate_h is None or tr.rate_h > -0.05)):
            s = 0.4 * tr.weight  # fermo e incollato dietro di te, anche se non l'hai visto arrivare
        if threat:
            if tr.ttc < a.t_warn and tr.clear < a.pass_safe + 2.0 and tr.d <= a.max_range * max(a.scale, 0.05):
                # sorpasso in arrivo anche se largo: almeno ambra, così sai sempre chi ti sta per affiancare
                s = max(s, 0.4)
            if tr.edge and tr.alongside:
                # ti sta affiancando adesso: pericoloso se il fianco passa entro la distanza di sicurezza
                if tr.clear < a.pass_safe:
                    s = max(s, 1.1 * max(tr.weight, 0.95))
                elif tr.clear < a.pass_safe + 1.0:
                    s = max(s, 0.5)
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
        if tr.alongside and not tr.passed and tr.from_behind and (tr.cls in MOTOR or tr.cls == 1) and tr.min_ttc < a.t_warn * 2:
            # sorpasso visto dalla camera: il veicolo arrivava da dietro ed è uscito di lato vicino a te
            tr.passed = True
            self.counts["sorpassi_camera"] = self.counts.get("sorpassi_camera", 0) + 1
            if a.us_side == "B":  # senza ultrasuono laterale la misura del sorpasso è quella della camera
                self.counts["sorpassi"] += 1
                if tr.clear < a.pass_safe:
                    self.counts["sorpassi_stretti"] += 1
                self.last_pass = {"t": time.time(), "cm": round(tr.clear * 100 / a.scale), "pred": fin(tr.clear_pred, 2),
                                  "veicolo": tr.name, "durata": 0, "fonte": "camera"}
                self.log.add("sorpasso", veicolo=tr.name, id=tr.id, livello=tr.level,
                             sorpasso_misurato_m=round(tr.clear / a.scale, 2), distanza_m=fin(tr.d, 1),
                             note="visto dalla camera")

    def calibrate(self, tr, us_ref, t):
        """L'ultrasuono è preciso da vicino: quando vede lo stesso oggetto della camera, nello stesso
        istante, il rapporto tra le due misure corregge la camera (focale e larghezza vera dell'oggetto)."""
        a = self.a
        # niente calibrazione da riquadri tagliati (oggetto troppo vicino, la larghezza non è quella vera)
        # né da persone in scala: una persona vera davanti alla camera non è "in scala 1:20"
        if (not a.autocal or tr is None or tr.edge or getattr(tr, "ycut", False)
                or (tr.cls == 0 and a.scale < 1.0)
                or (tr.bbox[2] - tr.bbox[0]) > 0.6 * (self.x_hi - self.x_lo) or tr.last_t != t or t == self.cal_t
                or us_ref is None or not 3 <= us_ref <= a.us_trust + a.us_blend or not math.isfinite(tr.d_raw)):
            return
        self.cal_t = t
        r = us_ref / (tr.d_raw * 100)
        if not 0.33 < r < 3.0:  # troppo diversi: probabilmente non è lo stesso oggetto
            return
        self.cal.append(r)
        self.cal_n += 1
        if len(self.cal) >= 8:
            self.cam_k = sorted(self.cal)[len(self.cal) // 2]
            if self.cal_n % 20 == 0:
                try:
                    with open(self.cal_path, "w") as f:
                        json.dump({"k": round(self.cam_k, 4), "n": self.cal_n, "scale": self.a.scale,
                                   "model": os.path.basename(self.a.model)}, f)
                except OSError:
                    pass

    def zones(self, t, us_cm, cam_ok, us_v=None, us_ref=None, lag=0.0):
        """us_cm: ultima lettura; us_ref: lettura all'istante del fotogramma; lag: età del fotogramma (s)."""
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
            near_tr = min((tr for tr in self.tracks.values()
                           if cam_ok and tr.zone == "B" and t - tr.last_t <= a.stale
                           and math.isfinite(tr.d)  # riquadro tagliato su due lati: distanza ignota (INF -> NaN)
                           and not (tr.cls == 0 and a.scale < 1.0)),  # in scala una persona vera falsa la misura
                          key=lambda tr: tr.d, default=None)
            self.calibrate(near_tr, us_ref, t)
            cam_cm = near_tr.d * 100 if near_tr else None
            # camera: v = d / TTC = d * d(ln larghezza)/dt
            cam_v = near_tr.d * 100 * near_tr.rate if near_tr and near_tr.rate is not None else None
            if cam_cm is not None and cam_v is not None and lag > 0:
                # il fotogramma ha già 'lag' secondi: portiamo la camera all'istante dell'ultrasuono
                cam_cm = max(1.0, cam_cm - cam_v * min(lag, 0.5))
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
                # velocità con lo stesso peso della distanza; se ne manca una vale l'altra
                if us_v is not None and cam_v is not None:
                    v = w_us * us_v + (1 - w_us) * cam_v
                else:
                    v = us_v if us_v is not None and us_cm is not None else cam_v
                ttc = cm / v if v is not None and v > 1.0 else None
                self.fused = {"cm": round(cm), "w_us": round(w_us, 2),
                              "cam_cm": fin(cam_cm, 0), "us_cm": fin(us_cm, 0),
                              "v_cms": fin(v, 1), "v_us": fin(us_v, 1), "v_cam": fin(cam_v, 1),
                              "kmh_real": fin(v * 0.036 / a.scale, 1) if v is not None else None,
                              "ttc": fin(ttc, 1), "cam_k": round(self.cam_k, 3),
                              "cam_raw_cm": fin(near_tr.d_raw * 100, 0) if near_tr else None}
                near = 2 if cm < a.near_red else 1 if cm < a.near_amber else 0
        elif us_cm is not None:
            near = 2 if us_cm < a.near_red else 1 if us_cm < a.near_amber else 0
        z[a.us_side] = max(z[a.us_side], near)
        return z, top, near

    def relevant(self, tr):
        """Va disegnato e mostrato: visto da almeno 3 fotogrammi, non si allontana, e ci sta raggiungendo
        (o è già un avviso, o è fermo incollato dietro). I veicoli che superiamo noi non compaiono."""
        if tr.n_seen < 3 or tr.receding:
            return tr.level > 0
        return tr.from_behind or tr.level > 0 or (tr.zone == "B" and tr.d < self.a.tailgate * self.a.scale)

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
        self.hist = collections.deque(maxlen=60)  # (t, cm) per la velocità

    def speed(self, window=0.6):
        """Velocità di avvicinamento in cm/s (positiva = si avvicina), dalla pendenza delle ultime letture."""
        with self.lock:
            pts = [p for p in self.hist if p[1] is not None and self.t - p[0] <= window]
        if len(pts) < 5 or pts[-1][0] - pts[0][0] < 0.3:
            return None
        slope, _ = linfit([p[0] for p in pts], [p[1] for p in pts])
        return -slope

    def at(self, t):
        """Lettura più vicina all'istante t (per confrontarla con un fotogramma della camera)."""
        with self.lock:
            pts = list(self.hist)
        best = min(pts, key=lambda p: abs(p[0] - t), default=None)
        return best[1] if best and abs(best[0] - t) <= 0.12 else None

    def feed(self, cm, t):
        """cm=None: niente entro la portata."""
        self.buf.append(cm if cm is not None and cm < min(395.0, self.a.us_max) else 9999.0)
        val = sorted(self.buf)[len(self.buf) // 2]
        with self.lock:
            self.cm = None if val >= 9999 else val
            self.t = t
            self.hist.append((t, self.cm))
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
            self.sensor.speed_of_sound = 331.3 + 0.606 * a.temp  # m/s, dipende dalla temperatura
        except Exception as e:
            print(f"[ultrasuono] GPIO non disponibili ({e}): continuo senza")
            return
        # gpiozero fa partire gli impulsi da un suo thread e noi rileggeremmo spesso lo stesso valore:
        # lo fermiamo e lanciamo noi un impulso alla volta, ognuno con l'ora esatta in cui parte
        self.direct = False
        try:
            self.sensor._queue.stop()
            self.direct = True
        except Exception as e:
            print(f"[ultrasuono] lettura diretta non disponibile ({e}): uso gpiozero normale")
        print(f"[ultrasuono] GPIO TRIG={a.us_trig} ECHO={a.us_echo}, {a.us_hz:.0f} Hz, "
              f"suono {self.sensor.speed_of_sound:.0f} m/s, {'diretta' if self.direct else 'gpiozero'}")
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        period = 1.0 / max(1.0, min(25.0, self.a.us_hz))  # sotto ~40 ms gli echi si sovrappongono
        maxd = self.sensor.max_distance
        while True:
            t0 = time.time()
            try:
                v = self.sensor._read() if self.direct else self.sensor.distance / maxd
            except Exception:
                v = None
            if v is not None:  # None = eco persa: si salta, non vuol dire "strada libera"
                d = v * maxd
                self.feed(None if d >= maxd - 0.05 else d * 100.0, t0)
            time.sleep(max(0.005, period - (time.time() - t0)))


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

def model_imgsz(path):
    """Dimensione d'ingresso scritta da Ultralytics nel metadata.yaml del modello esportato."""
    try:
        import yaml
        with open(os.path.join(path, "metadata.yaml")) as f:
            v = yaml.safe_load(f).get("imgsz")
        return v if isinstance(v, int) else list(v) if v and len(v) == 2 and v[0] != v[1] else (v[0] if v else None)
    except (OSError, AttributeError, TypeError, ImportError):
        return None


def dedupe(dets, iou_max=0.5, inside_max=0.8):
    """Un veicolo, un riquadro: se due riquadri si coprono (anche di classi diverse, es. auto/camion,
    o uno dentro l'altro) resta quello più sicuro. Costa pochi microsecondi con una decina di riquadri."""
    keep = []
    for d in sorted(dets, key=lambda d: -d[6]):
        area = (d[4] - d[2]) * (d[5] - d[3])
        dup = False
        for k in keep:
            iw = min(d[4], k[4]) - max(d[2], k[2])
            ih = min(d[5], k[5]) - max(d[3], k[3])
            if iw <= 0 or ih <= 0:
                continue
            inter = iw * ih
            ka = (k[4] - k[2]) * (k[5] - k[3])
            if inter / (area + ka - inter) > iou_max or inter / max(1e-6, min(area, ka)) > inside_max:
                dup = True
                break
        if not dup:
            keep.append(d)
    return keep


class Detector:
    def __init__(self, a):
        from ultralytics import YOLO
        self.a = a
        path = a.model
        if not os.path.isabs(path) and not os.path.exists(path) and os.path.exists(os.path.join(HERE, path)):
            path = os.path.join(HERE, path)
        if not os.path.exists(path) and os.path.basename(path).startswith("gs26n_"):
            # il nostro modello addestrato non si scarica da internet: se manca si usa YOLO26n originale
            print(f"[modello] {path} non c'è: uso yolo26n_192x480_ncnn_model")
            path = os.path.join(HERE, "yolo26n_192x480_ncnn_model")
        if not os.path.exists(path) and path.endswith("_ncnn_model"):
            # yolo26n_192x480_ncnn_model -> esporta yolo26n.pt con ingresso 192x480 (alto x largo)
            stem = os.path.basename(path)[: -len("_ncnn_model")]
            base, _, size = stem.partition("_")
            imgsz = parse_imgsz(size) if size else (parse_imgsz(a.imgsz) or 320)
            print(f"[modello] {path} non c'è: lo creo da {base}.pt a {imgsz} (serve internet la prima volta)")
            out = YOLO(base + ".pt").export(format="ncnn", imgsz=imgsz)
            if os.path.abspath(out) != os.path.abspath(path):
                shutil.move(out, path)
        self.imgsz = parse_imgsz(a.imgsz) or model_imgsz(path) or 320
        self.name = os.path.basename(path.rstrip("/"))
        self.model = YOLO(path, task="detect")
        # ByteTrack ha bisogno anche dei riquadri poco sicuri (0.1-0.25) per non perdere la traccia
        # quando il veicolo è sfocato o coperto: --conf decide solo quando un riquadro "conta"
        kind = "botsort" if "botsort" in a.tracker else "bytetrack"
        self.tracker = os.path.join(a.log_dir, "tracker.yaml")
        with open(self.tracker, "w") as f:
            f.write(f"tracker_type: {kind}\ntrack_high_thresh: {a.conf}\ntrack_low_thresh: 0.1\n"
                    f"new_track_thresh: {a.conf + 0.05}\ntrack_buffer: 30\nmatch_thresh: 0.8\nfuse_score: True\n")
            if kind == "botsort":
                f.write("gmc_method: sparseOptFlow\nproximity_thresh: 0.5\nappearance_thresh: 0.8\n"
                        "with_reid: False\nmodel: auto\n")
        import numpy as np
        self.lut = np.array([255 * (i / 255) ** a.gamma for i in range(256)], np.uint8)
        self.bright, self.night = None, a.night == "on"
        self.fari = None
        if a.fari:
            from fari import Headlights
            self.fari = Headlights()
        print(f"[modello] {self.name}, ingresso {self.imgsz}, tracker {kind}, notte {a.night}")

    def detect(self, frame, roi):
        x0, y0, x1, y1 = roi
        img = raw = frame[y0:y1, x0:x1]
        if self.a.night == "auto":
            # luminosità media su un'immagine piccola (costa pochissimo), con isteresi per non sfarfallare
            b = float(cv2.resize(img, (64, 24), interpolation=cv2.INTER_AREA).mean())
            self.bright = b if self.bright is None else 0.9 * self.bright + 0.1 * b
            self.night = self.bright < (self.a.dark + 5 if self.night else self.a.dark - 5)
        if self.night:
            # di notte YOLO vede soprattutto i fari: schiarire le ombre fa riapparire la carrozzeria
            img = cv2.LUT(img, self.lut)
        r = self.model.track(img, persist=True, tracker=self.tracker, imgsz=self.imgsz,
                             conf=0.1, classes=list(CLASSES), verbose=False)[0]
        b = r.boxes
        if b is None:
            return []
        dets = [(tid, c, bx1 + x0, by1 + y0, bx2 + x0, by2 + y0, round(p, 2))
                for (bx1, by1, bx2, by2), tid, c, p in zip(b.xyxy.tolist(), b.id.int().tolist(),
                                                           b.cls.int().tolist(), b.conf.tolist())] if b.id is not None else []
        if self.night and self.fari:
            # di notte molti veicoli sono solo due fari: YOLO non li vede, la coppia di luci sì
            yb = [(d[2] - x0, d[3] - y0, d[4] - x0, d[5] - y0) for d in dets]
            dets += [(tid, 2, bx1 + x0, by1 + y0, bx2 + x0, by2 + y0, 0.3)
                     for tid, bx1, by1, bx2, by2 in self.fari.detect(raw, yb)]
        return dedupe(dets)


# ---------------------------------------------------------------- video annotato e clip

LEVEL_BGR = {0: (190, 190, 190), 1: (0, 170, 255), 2: (0, 0, 255)}


def draw(frame, est, roi, zones, fps, t):
    img = frame.copy()
    H, W = img.shape[:2]
    cv2.rectangle(img, (roi[0], roi[1]), (roi[2] - 1, roi[3] - 1), (90, 90, 90), 1)
    cv2.line(img, (int(est.c0), 0), (int(est.c0), H), (255, 255, 0), 1)
    for tr in est.tracks.values():
        if t - tr.last_t > 0.2 or not est.relevant(tr):
            continue
        x1, y1, x2, y2 = (int(v) for v in tr.disp)
        c = LEVEL_BGR[tr.level]
        cv2.rectangle(img, (x1, y1), (x2, y2), c, 3 if tr.level else 1)
        lab = f"{tr.name} {fmt_d(tr.d)}"
        if tr.ttc < INF:
            lab += f"  {tr.ttc:.1f}s"
        if tr.level and tr.zone != "B" and tr.clear < est.a.pass_safe:
            lab += f"  STRETTO {fmt_d(tr.clear)}"
        elif tr.level and tr.zone == "B":
            lab += "  IN LINEA"
        (tw, th), _ = cv2.getTextSize(lab, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        ty = max(th + 8, y1 - 6)
        cv2.rectangle(img, (x1, ty - th - 6), (x1 + tw + 6, ty + 4), (0, 0, 0), -1)
        cv2.putText(img, lab, (x1 + 3, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.55, c, 2)
    # vista camera: la sinistra del ciclista è a DESTRA nell'immagine
    names = [("DX", zones["R"]), ("DIETRO", zones["B"]), ("SX", zones["L"])]
    for i, (n, lvl) in enumerate(names):
        x = 10 + i * 130
        cv2.rectangle(img, (x, 10), (x + 120, 40), LEVEL_BGR[lvl] if lvl else (60, 60, 60), -1)
        cv2.putText(img, n, (x + 8, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(img, f"{fps:.1f} fps", (W - 120, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    F = est.fused
    if F:  # riga in basso: le tre distanze, per il video della demo
        cm = lambda v: "-" if v is None else f"{v:.0f} cm"
        txt = (f"ultrasuono {cm(F['us_cm'])}   camera {cm(F['cam_cm'])}   FUSIONE {cm(F['cm'])}"
               f"   (camera x{F['cam_k']:.2f})")
        cv2.rectangle(img, (0, H - 34), (W, H), (0, 0, 0), -1)
        cv2.putText(img, txt, (10, H - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
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
        elif path == "/vista":
            try:
                with open(os.path.join(HERE, "vista.html"), "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except OSError:
                self._send(404, "vista.html mancante")
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
    # systemctl stop manda SIGTERM: usciamo dal ciclo come con Ctrl-C, così il riassunto viene scritto
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    profili_mezzo.pesa_classi(CLASSES, a.mezzo)
    host = casco_host(a)
    casco = Casco(host) if host else None
    print(f"[casco] {host}:{CASCO_PORT}, LED rosso da livello {a.soglia_led}" if casco
          else "[casco] nessun IP (--casco o casco_ip.txt): LED del casco non usati")
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
    est = Estimator(a, W, roi[0], roi[2], log, roi[1], roi[3])
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
    live = mode != "video"  # orologio dei fotogrammi = orologio dell'ultrasuono

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
            for cm, dur, t_pass in (us.pop_passes() if us else []):
                if a.us_side != "B":  # puntato indietro non vede i sorpassi, solo chi ti segue
                    est.on_pass(t_scene, cm, dur, t_pass if mode != "video" else None)

            us_ref = (us.at(t_scene) if live else us_cm) if us else None
            lag = clamp(now - t_scene, 0.0, 0.5) if live else 0.0
            zones, top, near = est.zones(t_scene, us_cm, cam_ok, us.speed() if us else None, us_ref, lag)
            seq = (seq + 1) % 100000
            ttc_ds = int(clamp(top.ttc * 10, 0, 998)) if top and top.ttc < INF else 999
            tracks = [{
                "id": tr.id, "cls": tr.name, "d": fin(tr.d, 3), "d_raw": fin(tr.d_raw, 3), "conf": tr.conf,
                "lat": fin(tr.lat), "lat_pass": fin(tr.lat_pass),
                "ttc": fin(tr.ttc, 1), "clear": fin(tr.clear), "level": tr.level, "zone": tr.zone,
                "edge": tr.edge, "w": tr.width_m, "len": tr.length_m,
            } for tr in est.tracks.values() if t_scene - tr.last_t <= a.stale and est.relevant(tr)]
            with S.lock:
                helmet = dict(S.helmet)
                gps_ok = S.gps is not None and now - S.gps[3] < 10
            state = {
                "t": now, "mode": mode, "fps": round(fps, 1), "lat_ms": round(lat_ms), "cam_ok": cam_ok,
                "zones": zones, "near": near, "us_cm": fin(us_cm, 0), "us_side": a.us_side, "has_us": us is not None,
                "model": det.name if det else None, "imgsz": det.imgsz if det else None,
                "night": bool(det.night) if det else False,
                "cal": {"k": round(est.cam_k, 3), "n": est.cal_n, "on": a.autocal and a.us_side == "B"},
                "fused": est.fused, "us_trust": a.us_trust, "us_blend": a.us_blend, "scale": a.scale,
                "near_red": a.near_red, "near_amber": a.near_amber,
                "us_age": fin(now - us.t, 2) if us and us.t else None, "us_src": type(us).__name__ if us else None,
                "top": {"cls": top.name, "ttc": fin(top.ttc, 1), "zone": top.zone, "level": top.level} if top else None,
                "tracks": tracks, "counts": dict(est.counts), "last_pass": est.last_pass,
                "calib": {"k": round(est.k, 2), "n": est.k_n, "mae_cm": est.mae_cm()}, "pass_safe": a.pass_safe,
                "mezzo": profili_mezzo.info(a.mezzo), "rider_half": a.rider_half,
                "helmet": {"ok": now - helmet["t"] < 3, "look": helmet["look"], "fall": helmet["fall"],
                           "info": helmet["info"]},
                "gps": gps_ok,
                "events": log.last(6),
            }
            with S.lock:
                S.state = state
                S.risk = (zones["L"], zones["B"], zones["R"], top.code if top else 0, ttc_ds, seq, int(cam_ok))
                S.risk_t = now
            if casco and cam_ok:  # camera morta: silenzio, il casco mostra "niente dati" invece di "via libera"
                casco.send(zones, a.soglia_led)

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
