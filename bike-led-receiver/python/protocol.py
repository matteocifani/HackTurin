import json

CLASSES = {"none": 0, "person": 1, "bicycle": 2, "car": 3}
OTHER = 4  # any other detector class (truck, bus, motorcycle...) still shows up
SIDES = {"L": 0, "C": 1, "R": 2}


def parse(data):
    """UDP payload -> (class_idx, side_idx), or None if invalid."""
    try:
        msg = json.loads(data)
        cls = CLASSES.get(msg["cls"], OTHER)
        return cls, (SIDES[msg["side"]] if cls else 0)
    except (ValueError, KeyError, TypeError):
        return None


if __name__ == "__main__":
    assert parse(b'{"seq":1,"cls":"car","side":"R"}') == (3, 2)
    assert parse(b'{"seq":1,"cls":"none"}') == (0, 0)
    assert parse(b'{"cls":"truck","side":"L"}') == (OTHER, 0)
    for bad in (b"x", b"[]", b'"s"', b'{"cls":"car"}', b'{"cls":"car","side":"X"}', b"\xff"):
        assert parse(bad) is None, bad
    print("ok")
