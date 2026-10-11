import json

ZONES = ("L", "C", "R")  # rider's left, behind, right


def parse(data):
    """One JSON line from the Pi -> (L, C, R) with 1 = zone red, or None if invalid."""
    try:
        msg = json.loads(data)
        return tuple(1 if msg[z] else 0 for z in ZONES)
    except (ValueError, KeyError, TypeError):
        return None


if __name__ == "__main__":
    assert parse(b'{"seq":1,"L":1,"C":0,"R":0}') == (1, 0, 0)
    assert parse(b'{"seq":2,"L":1,"C":1,"R":1}') == (1, 1, 1)
    assert parse(b'{"L":0,"C":0,"R":2}') == (0, 0, 1)
    for bad in (b"x", b"[]", b'"s"', b'{"L":1,"C":0}', b'{"cls":"car","side":"R"}', b"\xff"):
        assert parse(bad) is None, bad
    print("ok")
