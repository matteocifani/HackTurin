import select
import socket
import time

from arduino.app_utils import *
from protocol import parse

PORT = 5005  # TCP: the app container only publishes TCP ports (ports: in app.yaml)
LINK_TIMEOUT = 1.5  # s without a valid message -> link lost
REFRESH = 1.0       # resend the state so the sketch watchdog stays fed
LOST = 255
DEBUG = 254
DEBUG_RED = True  # troubleshooting: ANY message -> whole strip red (amber = nothing received)

srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("", PORT))
srv.listen(1)

conn = None  # the Pi's connection; a new one replaces it (Pi rebooted, half-open socket)
buf = b""
state = (LOST, 0)
last_rx = float("-inf")  # nothing received yet == link lost
sent = None
last_sent = 0.0
rx = bad = 0
last_addr = None
last_log = 0.0
print("listening on TCP", PORT, "DEBUG_RED", DEBUG_RED)


def receive():
    """Wait up to 0.1 s, return the complete lines (one JSON message each) received."""
    global conn, buf, last_addr
    readable = select.select([srv] + ([conn] if conn else []), [], [], 0.1)[0]
    for s in readable:
        if s is srv:
            if conn:
                conn.close()
            conn, last_addr = srv.accept()
            buf = b""
            print("connected", last_addr)
        elif s is conn:
            try:
                data = conn.recv(4096)
            except OSError as e:
                data = b""
                print("recv error", e)
            if not data:
                print("connection closed")
                conn.close()
                conn = None
            else:
                buf += data
    *lines, buf = buf.split(b"\n")
    if len(buf) > 4096:  # garbage without newline: do not grow forever
        buf = b""
    return [ln for ln in lines if ln.strip()]


def loop():
    global state, last_rx, sent, last_sent, rx, bad, last_log
    for data in receive():
        parsed = parse(data)
        if parsed:
            rx += 1
        else:
            bad += 1
            print("bad message", data[:60])
        if DEBUG_RED:
            state, last_rx = (DEBUG, 0), time.monotonic()
        elif parsed:
            state, last_rx = parsed, time.monotonic()
    now = time.monotonic()
    cur = state if now - last_rx < LINK_TIMEOUT else (LOST, 0)
    if now - last_log > 5:  # heartbeat: shows whether messages arrive at all
        last_log = now
        print("heartbeat rx", rx, "bad", bad, "last_from", last_addr, "state", cur)
    if cur != sent or now - last_sent > REFRESH:
        try:
            # short timeout: the default 10 s would freeze reception on every failure
            Bridge.call("set_state", *cur, timeout=2)
            if cur != sent:
                print("state", cur)
            sent, last_sent = cur, now
        except Exception as e:  # MCU not answering: retry on the next loop
            print("bridge error", type(e).__name__, e)
            time.sleep(1)  # do not hammer the router while the MCU is down


App.run(user_loop=loop)
