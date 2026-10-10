#!/usr/bin/env python3
"""Fake detector: sends one JSON line per message over TCP at 10 Hz, looping through test cases.

usage: sender.py <uno-q-host-or-ip> [port]      e.g.  sender.py Aaaaaa.local
Reconnects by itself if the UNO Q app restarts. Ctrl-C stops it; the silence
step at the end of each loop shows the link-lost state.
"""
import json, socket, sys, time

target = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 5005

# (cls, side, seconds); cls None = send nothing, to test link lost
STEPS = [("none", "C", 3), ("car", "R", 3), ("car", "C", 3), ("car", "L", 3),
         ("person", "L", 3), ("bicycle", "C", 3), ("truck", "R", 3), (None, None, 4)]


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
    for cls, side, secs in STEPS:
        print(cls or "silence", side or "")
        end = time.monotonic() + secs
        while time.monotonic() < end:
            if cls:
                msg = {"seq": seq, "cls": cls, "side": side}
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
