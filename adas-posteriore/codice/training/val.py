import sys, yaml
from ultralytics import YOLO
D = "/home/claude/ds"
names = YOLO(D + "/../exp/yolo26n.pt").names
for split, lst in [("notte", "val_notte/images"), ("tutto", None)]:
    if lst:
        yaml.safe_dump({"path": D, "train": D + "/train.txt", "val": D + "/" + lst, "names": names}, open(D + "/v.yaml", "w"))
    else:
        yaml.safe_dump({"path": D, "train": D + "/train.txt", "val": D + "/val.txt", "names": names}, open(D + "/v.yaml", "w"))
    for w in [D + "/../exp/yolo26n.pt", D + "/runs/n26/weights/best.pt"]:
        r = YOLO(w).val(data=D + "/v.yaml", imgsz=480, batch=16, device="cpu", classes=[0,1,2,3,5,7], plots=False, verbose=False)
        print("RIS", split, w.split("/")[-1] if "best" in w else "base", "P %.3f R %.3f mAP50 %.3f mAP50-95 %.3f" % (r.box.mp, r.box.mr, r.box.map50, r.box.map))
