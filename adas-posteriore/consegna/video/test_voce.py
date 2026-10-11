#!/usr/bin/env python3
"""Test voce ElevenLabs v3 su Replicate. Solo libreria standard.

Uso (Terminale del Mac):
    export REPLICATE_API_TOKEN=r8_...      # la chiave resta solo nel Terminale
    python3 ~/Downloads/video_devpost/test_voce.py

Scrive in ~/Downloads/video_devpost/voce/: un mp3 per voce provata e schema.txt
(i parametri che il modello accetta, così scelgo le voci giuste per il copione).
"""
import json, os, sys, urllib.request
from pathlib import Path

TOKEN = os.environ.get("REPLICATE_API_TOKEN") or sys.exit("Manca REPLICATE_API_TOKEN")
OUT = Path(__file__).resolve().parent / "voce"
OUT.mkdir(exist_ok=True)
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

TESTO = ("[calm] Sulla strada, il pericolo arriva quasi sempre da dietro... "
         "proprio dove non puoi guardare. "
         "Noi abbiamo costruito un occhio che guarda alle tue spalle: "
         "una camera, un sensore a ultrasuoni e un'intelligenza artificiale che gira tutta a bordo.")

# Voci preferite, nell'ordine (si usano quelle che il modello offre davvero)
PREFERITE = ["Brian", "George", "Daniel", "Eric", "Sarah", "Alice", "Jessica", "Laura"]


def req(url, data=None, extra=None):
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data else None,
                               headers={**H, **(extra or {})})
    with urllib.request.urlopen(r, timeout=180) as f:
        return json.load(f)


m = req("https://api.replicate.com/v1/models/elevenlabs/v3")
props = m["latest_version"]["openapi_schema"]["components"]["schemas"]["Input"]["properties"]
schemas = m["latest_version"]["openapi_schema"]["components"]["schemas"]
(OUT / "schema.txt").write_text(json.dumps(schemas, indent=1, ensure_ascii=False))
campo_testo = next(k for k in ("prompt", "text", "input") if k in props)
campo_voce = next((k for k in ("voice", "voice_id", "speaker") if k in props), None)
voci = [None]
if campo_voce:
    ref = props[campo_voce].get("allOf", [{}])[0].get("$ref", "")
    enum = props[campo_voce].get("enum") or (schemas.get(ref.split("/")[-1], {}).get("enum") if ref else None) or []
    voci = [v for p in PREFERITE for v in enum if v.lower().startswith(p.lower())][:3] or enum[:3] or [None]
print("campo testo:", campo_testo, "| campo voce:", campo_voce, "| voci provate:", voci)

for v in voci:
    inp = {campo_testo: TESTO}
    if "language_code" in props: inp["language_code"] = "it"
    if v: inp[campo_voce] = v
    p = req("https://api.replicate.com/v1/models/elevenlabs/v3/predictions", {"input": inp}, {"Prefer": "wait"})
    while p["status"] not in ("succeeded", "failed", "canceled"):
        import time; time.sleep(2); p = req(p["urls"]["get"])
    if p["status"] != "succeeded":
        print("errore", v, p.get("error")); continue
    url = p["output"] if isinstance(p["output"], str) else p["output"][0]
    nome = OUT / f"test_{(v or 'default').split()[0]}.mp3"
    urllib.request.urlretrieve(url, nome)
    print("ok", nome)
print("Fatto. Ascolta i file in", OUT)
