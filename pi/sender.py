#!/usr/bin/env python3
"""Fake detector: sends the UDP protocol at 10 Hz and loops through test cases.

usage: sender.py <broadcast-or-unicast-ip> [port]
Stop it (Ctrl-C) or watch the "silence" step to see the link-lost state.
"""
import json, socket, sys, time

target = sys.argv[1]
port = int(sys.argv[2]) if len(sys.argv) > 2 else 5005

# (cls, side, seconds); cls None = send nothing, to test link lost
STEPS = [("none", "C", 3), ("car", "R", 3), ("car", "C", 3), ("car", "L", 3),
         ("person", "L", 3), ("bicycle", "C", 3), ("truck", "R", 3), (None, None, 4)]

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
print("target", target, "port", port)
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
                    n = sock.sendto(json.dumps(msg).encode(), (target, port))
                    seq += 1
                    if time.monotonic() - last_log > 1:  # 1 line/s, not 10
                        last_log = time.monotonic()
                        print("sent", seq, "packets, last", n, "bytes ->", target, port)
                except OSError as e:  # e.g. "Network is unreachable": wrong target for this network
                    print("send error:", e)
            time.sleep(0.1)
