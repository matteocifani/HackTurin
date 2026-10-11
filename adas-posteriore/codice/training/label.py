"""Estrae fotogrammi dai video posteriori ed etichetta i veicoli con un modello grande (yolo26l a 960)."""
import cv2, glob, os, sys, json, numpy as np
from ultralytics import YOLO
SRC = sys.argv[1]; OUT = os.environ.get("OUT", "/home/claude/ds/data"); PER_VIDEO = int(sys.argv[2]) if len(sys.argv) > 2 else 150
KEEP = {0, 1, 2, 3, 5, 7}
lut = np.array([255 * (i / 255) ** 0.5 for i in range(256)], np.uint8)
m = YOLO("/home/claude/exp/yolo26l.pt")
done = set(json.load(open(OUT + "/done.json"))) if os.path.exists(OUT + "/done.json") else set()
for sub in ("images", "labels"):
    os.makedirs(f"{OUT}/{sub}", exist_ok=True)
for v in sorted(glob.glob(SRC + "/*.mp4")):
    name = os.path.basename(v)[:-4]
    if name in done:
        continue
    cap = cv2.VideoCapture(v); n = int(cap.get(7))
    if n <= 0:
        continue
    step = max(1, n // PER_VIDEO); kept = 0
    for fi in range(step // 2, n, step):
        cap.set(1, fi); ok, f = cap.read()
        if not ok:
            continue
        H, W = f.shape[:2]
        f = cv2.resize(f, (1280, int(H * 1280 / W)))
        H = f.shape[0]
        c = f[int(0.2 * H):int(0.9 * H)]
        dark = c.mean() < 60
        r = m.predict(cv2.LUT(c, lut) if dark else c, imgsz=960, conf=0.4, verbose=False)[0]
        lines = []
        for k, xy in zip(r.boxes.cls.int().tolist(), r.boxes.xywhn.tolist()):
            if k in KEEP:
                lines.append(f"{k} {xy[0]:.5f} {xy[1]:.5f} {xy[2]:.5f} {xy[3]:.5f}")
        fn = f"{name}_{fi:06d}"
        cv2.imwrite(f"{OUT}/images/{fn}.jpg", c, [cv2.IMWRITE_JPEG_QUALITY, 90])
        open(f"{OUT}/labels/{fn}.txt", "w").write("\n".join(lines))
        kept += 1
    done.add(name); json.dump(sorted(done), open(OUT + "/done.json", "w"))
    print(name, kept, flush=True)
print("FINE", flush=True)
