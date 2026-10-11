import sys, os, glob, random, yaml
from ultralytics import YOLO
base, epochs, name = sys.argv[1], int(sys.argv[2]), sys.argv[3]
D = "/home/claude/ds"
imgs = sorted(glob.glob(D + "/data/images/*.jpg"))
random.seed(0)
# validazione: il video notturno tenuto fuori (etichettato a parte) + 5% dei fotogrammi diurni
val_day = [p for p in imgs if random.random() < 0.05]
train = [p for p in imgs if p not in set(val_day)]
night = sorted(glob.glob(D + "/val_notte/images/*.jpg"))
open(D + "/train.txt", "w").write("\n".join(train))
open(D + "/val.txt", "w").write("\n".join(night + val_day))
names = YOLO(D + "/../exp/yolo26n.pt").names
yaml.safe_dump({"path": D, "train": D + "/train.txt", "val": D + "/val.txt", "names": names}, open(D + "/gs.yaml", "w"))
m = YOLO(base)
m.train(data=D + "/gs.yaml", imgsz=480, epochs=epochs, batch=32, workers=3, device="cpu", project=D + "/runs", name=name,
        exist_ok=True, lr0=0.002, lrf=0.1, warmup_epochs=1, optimizer="AdamW", cos_lr=True, close_mosaic=2,
        hsv_v=0.6, degrees=0, mixup=0.0, cache="ram", plots=False, patience=100, amp=False, verbose=True)
