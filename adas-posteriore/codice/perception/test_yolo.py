# Prova veloce di YOLO sulla webcam: stampa cosa vede e a quanti fotogrammi al secondo,
# e mostra il video con i riquadri nel browser su http://<ip-del-raspberry>:8001
# Sopra ogni riquadro scrive anche la distanza stimata (modello pinhole: misura reale nota / misura in pixel).
# Uso: ~/gs/bin/python test_yolo.py [--hfov 80] [--cam 0]      (Ctrl+C per fermare)
# Taratura: mettiti a 3 m misurati; se legge più di 3 m abbassa --hfov, se legge meno alzalo.
# La prima volta scarica yolo11n.pt e lo converte in NCNN (serve internet, qualche minuto).

import argparse
import math
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
from ultralytics import YOLO

HERE = os.path.dirname(os.path.abspath(__file__))
NCNN = os.path.join(HERE, "yolo11n_ncnn_model")
IMGSZ = 320
PORT = 8001

# misura reale nota per classe COCO: (metri, "w" = larghezza del riquadro, "h" = altezza)
REAL = {0: (1.70, "h"), 1: (0.60, "w"), 2: (1.80, "w"), 3: (0.80, "w"), 5: (2.55, "w"), 7: (2.50, "w")}

ap = argparse.ArgumentParser()
ap.add_argument("--cam", type=int, default=0)
ap.add_argument("--hfov", type=float, default=80.0, help="campo visivo orizzontale della webcam (gradi)")
args = ap.parse_args()


def distance(cls, x1, y1, x2, y2, f_px):
    if cls not in REAL:
        return None
    m, side = REAL[cls]
    px = (x2 - x1) if side == "w" else (y2 - y1)
    return f_px * m / px if px > 0 else None

latest = {"jpg": None}
cond = threading.Condition()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path != "/video.mjpg":
            body = b'<html><body style="margin:0;background:#000"><img src="/video.mjpg" style="width:100%"></body></html>'
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(200)
        self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        try:
            while True:
                with cond:
                    cond.wait(timeout=2)
                    jpg = latest["jpg"]
                if jpg is None:
                    continue
                self.wfile.write(b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: "
                                 + str(len(jpg)).encode() + b"\r\n\r\n" + jpg + b"\r\n")
        except (BrokenPipeError, ConnectionResetError):
            pass


if not os.path.exists(NCNN):
    print("[modello] creo yolo11n_ncnn_model, solo la prima volta...")
    os.chdir(HERE)
    YOLO("yolo11n.pt").export(format="ncnn", imgsz=IMGSZ)
model = YOLO(NCNN, task="detect")

cap = cv2.VideoCapture(args.cam, cv2.CAP_V4L2)
cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
if not cap.isOpened():
    sys.exit("webcam non trovata: controlla ls /dev/video*")

threading.Thread(target=ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever, daemon=True).start()
print(f"[video] apri nel browser http://<ip-del-raspberry>:{PORT}  (es. http://172.20.10.2:{PORT})")

n, t0 = 0, time.time()
while True:
    ok, frame = cap.read()
    if not ok:
        print("nessun fotogramma dalla webcam")
        time.sleep(0.5)
        continue
    r = model(frame, imgsz=IMGSZ, conf=0.4, verbose=False)[0]
    f_px = (frame.shape[1] / 2) / math.tan(math.radians(args.hfov) / 2)
    ann = r.plot()
    seen = []
    for (x1, y1, x2, y2), c, p in zip(r.boxes.xyxy.tolist(), r.boxes.cls.int().tolist(), r.boxes.conf.tolist()):
        d = distance(c, x1, y1, x2, y2, f_px)
        seen.append(f"{r.names[c]} {p:.0%}" + (f" {d:.1f} m" if d else ""))
        if d:
            cv2.putText(ann, f"{d:.1f} m", (int(x1) + 4, int(y2) - 10), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 0), 6)
            cv2.putText(ann, f"{d:.1f} m", (int(x1) + 4, int(y2) - 10), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 255, 255), 3)
    n += 1
    fps = n / (time.time() - t0)
    cv2.putText(ann, f"{fps:.1f} fps", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    ok, jpg = cv2.imencode(".jpg", cv2.resize(ann, (640, 360)), [cv2.IMWRITE_JPEG_QUALITY, 70])
    if ok:
        with cond:
            latest["jpg"] = jpg.tobytes()
            cond.notify_all()
    if n % 5 == 0:
        print(f"{fps:4.1f} fps | " + (", ".join(seen) if seen else "niente"))
    if n == 1 or n % 30 == 0:
        cv2.imwrite(os.path.join(HERE, "test_yolo.jpg"), ann)
