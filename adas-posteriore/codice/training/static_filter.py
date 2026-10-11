"""Toglie i riquadri 'fermi' (parti del proprio mezzo inquadrate, es. il supporto della camera)."""
import glob, os, collections, sys
L = sys.argv[1]
by = collections.defaultdict(list)
for p in glob.glob(L + "/*.txt"):
    by[os.path.basename(p).rsplit("_", 1)[0]].append(p)
def iou(a, b):
    ax1, ay1, ax2, ay2 = a[0]-a[2]/2, a[1]-a[3]/2, a[0]+a[2]/2, a[1]+a[3]/2
    bx1, by1, bx2, by2 = b[0]-b[2]/2, b[1]-b[3]/2, b[0]+b[2]/2, b[1]+b[3]/2
    iw, ih = max(0, min(ax2, bx2)-max(ax1, bx1)), max(0, min(ay2, by2)-max(ay1, by1))
    i = iw*ih; return i / (a[2]*a[3] + b[2]*b[3] - i + 1e-9)
removed = 0
for vid, files in by.items():
    boxes = {p: [list(map(float, l.split())) for l in open(p).read().split("\n") if l.strip()] for p in files}
    allb = [b[1:] for bs in boxes.values() for b in bs]
    for p, bs in boxes.items():
        keep = []
        for b in bs:
            same = sum(1 for o in allb if iou(b[1:], o) > 0.7)
            if same > 0.15 * len(files) and b[3] * b[4] > 0.02:
                removed += 1; continue
            keep.append(b)
        open(p, "w").write("\n".join(f"{int(b[0])} {b[1]:.5f} {b[2]:.5f} {b[3]:.5f} {b[4]:.5f}" for b in keep))
print("rimossi", removed)
