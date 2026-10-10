# Guardaspalle - bici senza portatile (Arduino UNO Q, lato Linux, app di App Lab).
# bike_adas.py gira sulla stessa UNO Q (fuori da App Lab, in SSH) con --us-remote;
# questa app fa da ponte tra bike_adas.py e lo STM32.
#
# 20 volte al secondo chiede a bike_adas.py il rischio (GET /risk) e lo passa allo STM32.
# Gli rimanda lo spostamento a sinistra, la caduta, l'ultrasuono e il battito (POST /event).
# Se lo STM32 segnala l'SOS, manda un messaggio Telegram con cosa è successo prima.
#
# Il casco fa la richiesta e il Raspberry risponde: una connessione in uscita
# dal container di App Lab funziona sempre, e serve solo l'IP del Raspberry.
#
# DA VERIFICARE in App Lab: from arduino.app_utils import App, Bridge;
# Bridge.provide / Bridge.call; App.run(user_loop=...).

import os
import queue
import time
import urllib.parse
import urllib.request

from arduino.app_utils import App, Bridge

PI_HOST = os.environ.get("PI_HOST", "192.168.43.20")  # IP della UNO Q stessa (hostname -I): il container non vede localhost
PI_PORT = int(os.environ.get("PI_PORT", "8000"))
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")    # da @BotFather, NON metterlo nel repo
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
MAX_AGE_MS = 700  # dati del Raspberry più vecchi di così non vengono passati: il casco va in ambra
PERIOD = 0.05

BASE = f"http://{PI_HOST}:{PI_PORT}"
outbox = queue.Queue()  # eventi da mandare al Raspberry, fuori dai callback del Bridge
last_seq = None
last_us = None  # ultimo valore dell'HC-SR04, se è collegato alla UNO Q (USE_US 1)


def http(path, body=None, timeout=0.3):
    data = body.encode() if body is not None else None
    with urllib.request.urlopen(BASE + path, data=data, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def telegram(text):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("[sos] Telegram non configurato:\n" + text)
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = urllib.parse.urlencode({"chat_id": TELEGRAM_CHAT_ID, "text": text}).encode()
    try:
        urllib.request.urlopen(url, data=data, timeout=5).read()
        print("[sos] messaggio inviato")
    except Exception as e:  # senza rete il casco continua a suonare e lampeggiare
        print(f"[sos] invio fallito: {e}")


# ---------------------------------------------------------------- dallo STM32
def on_look(direction, answer):
    outbox.put(f"LOOK,{'L' if direction > 0 else 'R'},{answer}")


def on_fall(stage):
    outbox.put(f"FALL,{stage}")
    if stage == 2:
        outbox.put("SOS")


def on_hb(link_ok, fall_state, yaw):
    outbox.put(f"H,link={link_ok},caduta={fall_state},testa={yaw}")


Bridge.provide("look", on_look)
Bridge.provide("fall", on_fall)
def on_us(cm):
    global last_us
    last_us = cm


Bridge.provide("hb", on_hb)
Bridge.provide("us", on_us)


def send_sos():
    try:
        context = http("/context", timeout=1.0)
    except Exception:
        context = "Raspberry non raggiungibile: nessun dato sul traffico."
    telegram(f"🚨 Guardaspalle: possibile caduta del ciclista alle {time.strftime('%H:%M')}.\n{context}")


# ---------------------------------------------------------------- ciclo
def loop():
    global last_seq, last_us
    t0 = time.time()
    try:
        p = http("/risk").strip().split(",")
        # R,L,B,R,cls,ttc_ds,seq,age_ms,cam_ok
        if p[0] == "R" and len(p) >= 9:
            l, b, r, cls, ttc, seq, age, cam = (int(x) for x in p[1:9])
            if age <= MAX_AGE_MS and seq != last_seq:
                last_seq = seq
                Bridge.call("risk", l, b, r, cls, ttc, cam)
    except Exception:
        pass  # niente dati: dopo 1 s lo STM32 passa da solo in modalità degradata

    if last_us is not None:
        outbox.put(f"U,{last_us}")
        last_us = None

    while not outbox.empty():
        msg = outbox.get_nowait()
        if msg == "SOS":
            send_sos()
            continue
        try:
            http("/event", msg)
        except Exception:
            pass

    time.sleep(max(0.0, PERIOD - (time.time() - t0)))


App.run(user_loop=loop)
