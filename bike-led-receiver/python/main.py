import socket
import time

from arduino.app_utils import *
from protocol import parse

PORT = 5005
LINK_TIMEOUT = 1.5  # s without a valid packet -> link lost
REFRESH = 1.0       # resend the state so the sketch watchdog stays fed
LOST = 255
DEBUG = 254
DEBUG_RED = True  # troubleshooting: ANY udp packet -> whole strip red (amber = nothing received)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("", PORT))
sock.settimeout(0.1)

state = (LOST, 0)
last_rx = float("-inf")  # nothing received yet == link lost
sent = None
last_sent = 0.0
rx = bad = 0
last_addr = None
last_log = 0.0
print("listening on UDP", PORT, "DEBUG_RED", DEBUG_RED)


def loop():
    global state, last_rx, sent, last_sent, rx, bad, last_log, last_addr
    try:
        data, addr = sock.recvfrom(1024)
        if last_addr is None:
            print("first packet from", addr, data[:60])
        last_addr = addr
        parsed = parse(data)
        if parsed:
            rx += 1
        else:
            bad += 1
            print("bad packet from", addr, data[:60])
        if DEBUG_RED:
            state, last_rx = (DEBUG, 0), time.monotonic()
        elif parsed:
            state, last_rx = parsed, time.monotonic()
    except socket.timeout:
        pass
    now = time.monotonic()
    cur = state if now - last_rx < LINK_TIMEOUT else (LOST, 0)
    if now - last_log > 5:  # heartbeat: shows whether packets arrive at all
        last_log = now
        print("heartbeat rx", rx, "bad", bad, "last_from", last_addr, "state", cur)
    if cur != sent or now - last_sent > REFRESH:
        try:
            Bridge.call("set_state", *cur)
            if cur != sent:
                print("state", cur)
            sent, last_sent = cur, now
        except Exception as e:  # MCU not ready yet: retry on the next loop
            print("bridge error", e)


App.run(user_loop=loop)
