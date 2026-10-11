#!/usr/bin/env python3
"""Fake detector: sends one JSON line {"seq","L","C","R"} over TCP at 10 Hz, looping through test cases.

usage: sender.py <uno-q-host-or-ip> [port]      e.g.  sender.py Aaaaaa.local
Reconnects by itself if the UNO Q app restarts. Ctrl-C stops it; the silence
step at the end of each loop shows the link-lost state.
"""
import json, socket, sys, time

target = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 5005

# (zones red, seconds); None = send nothing, to test link lost (blinking amber after ~1.5 s)
STEPS = [("", 3), ("L", 3), ("C", 3), ("R", 3), ("LCR", 3), ("LR", 3), (None, 4)]


def connect():
    while True:
        try:
            s = socket.create_connection((target, port), timeout=3)
            s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)  # no batching: latency
            print("connected to", s.getpeername())
            return s
        except OSError as e:  # app not started yet, wrong host, hotspot down...
            print("connect error:", e)
            time.sleep(1)


print("target", target, "port", port)
sock = connect()
seq = 0
last_log = 0.0
while True:
    for red, secs in STEPS:
        print("silence" if red is None else "red: " + (red or "none"))
        end = time.monotonic() + secs
        while time.monotonic() < end:
            if red is not None:
                msg = {"seq": seq, **{z: int(z in red) for z in "LCR"}}
                try:
                    sock.sendall((json.dumps(msg) + "\n").encode())
                    seq += 1
                    if time.monotonic() - last_log > 1:  # 1 line/s, not 10
                        last_log = time.monotonic()
                        print("sent", seq, "messages ->", target, port)
                except OSError as e:
                    print("send error:", e)
                    sock.close()
                    sock = connect()
            time.sleep(0.1)
