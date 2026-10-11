"""Rilevatore di coppie di fari per la notte: quando di un veicolo si vedono solo i fari, YOLO
(anche i modelli grandi) non lo riconosce. Due macchie sature alla stessa altezza, simili, a
distanza plausibile e senza altre luci in fila (lampioni, guardrail) = un veicolo che arriva.
La distanza tra i fari cresce come la larghezza del veicolo, quindi TTC e distanza funzionano uguale."""

import math

import cv2
import numpy as np

ID0 = 1_000_000  # id delle tracce dei fari, separati da quelli di ByteTrack


class Headlights:
    def __init__(self, thresh=250, min_age=3, down=2, min_dx=30):
        self.thresh, self.min_age, self.down, self.min_dx = thresh, min_age, down, min_dx
        self.tracks = []  # dict: id, box, age, miss
        self.next_id = ID0

    def blobs(self, img):
        d = self.down
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        g = cv2.resize(g, (g.shape[1] // d, g.shape[0] // d), interpolation=cv2.INTER_AREA)
        _, m = cv2.threshold(g, self.thresh, 255, cv2.THRESH_BINARY)
        n, _, st, cen = cv2.connectedComponentsWithStats(m, connectivity=8)
        out = []
        for i in range(1, n):
            x, y, w, h, area = st[i]
            if 3 <= area <= 4000 and 0.33 <= w / h <= 3.0:
                out.append((cen[i][0] * d, cen[i][1] * d, w * d, h * d, area * d * d))
        return out

    def pairs(self, bl, H):
        cand = []
        for i in range(len(bl)):
            for j in range(i + 1, len(bl)):
                a, b = (bl[i], bl[j]) if bl[i][0] < bl[j][0] else (bl[j], bl[i])
                dx = b[0] - a[0]
                mw, mh = (a[2] + b[2]) / 2, (a[3] + b[3]) / 2
                if abs(a[1] - b[1]) > 0.6 * mh + 3:
                    continue
                if not 1.6 * mw <= dx <= 6 * mw or dx < self.min_dx:
                    continue
                if max(a[4], b[4]) > 3.5 * min(a[4], b[4]):
                    continue
                # altre luci sulla stessa riga, in mezzo o in fila subito fuori: lampioni, guardrail, catarifrangenti
                # (solo luci piccole fuori dalla coppia: i fari di un'altra auto accanto non contano)
                row = [c for c in bl if c is not a and c is not b and abs(c[1] - a[1]) < 1.5 * mh + 3
                       and (a[0] < c[0] < b[0] or (a[0] - 0.8 * dx < c[0] < b[0] + 0.8 * dx and c[4] < 0.3 * min(a[4], b[4])))]
                if row:
                    continue
                score = abs(a[4] - b[4]) / max(a[4], b[4]) + abs(a[1] - b[1]) / (mh + 1)
                cand.append((score, a, b))
        cand.sort(key=lambda c: c[0])
        used, out = set(), []
        for _, a, b in cand:
            if id(a) in used or id(b) in used:
                continue
            used.update((id(a), id(b)))
            dx = b[0] - a[0]
            bw = dx * 1.25 + (a[2] + b[2]) / 2  # i fari stanno a circa l'80% della larghezza
            cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            out.append([cx - bw / 2, cy - 0.45 * bw, cx + bw / 2, cy + 0.2 * bw])
        return out

    def detect(self, img, yolo_boxes):
        """img: ritaglio; yolo_boxes: [(x1,y1,x2,y2)] nello stesso sistema. Restituisce (id, x1,y1,x2,y2)."""
        boxes = [b for b in self.pairs(self.blobs(img), img.shape[0])
                 if not any(_inside(b, y) for y in yolo_boxes)]
        for t in self.tracks:
            t["miss"] += 1
        for b in boxes:
            bw = b[2] - b[0]
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            best = None
            for t in self.tracks:
                tb = t["box"]
                tw = tb[2] - tb[0]
                dist = math.hypot(cx - (tb[0] + tb[2]) / 2, cy - (tb[1] + tb[3]) / 2)
                if dist < 0.6 * max(bw, tw) and 0.6 < bw / tw < 1.6 and t["miss"] > 0:
                    if best is None or dist < best[0]:
                        best = (dist, t)
            if best:
                t = best[1]
                t["box"], t["age"], t["miss"] = b, t["age"] + 1, 0
            else:
                self.tracks.append({"id": self.next_id, "box": b, "age": 1, "miss": 0})
                self.next_id += 1
        self.tracks = [t for t in self.tracks if t["miss"] <= 2]
        return [(t["id"], *t["box"]) for t in self.tracks if t["miss"] == 0 and t["age"] >= self.min_age]


def _inside(b, y):
    """Il riquadro dei fari coincide con (o sta dentro) un riquadro di YOLO."""
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    return y[0] <= cx <= y[2] and y[1] <= cy <= y[3]
