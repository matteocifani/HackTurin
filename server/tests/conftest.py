import os
import sys
import tempfile
from pathlib import Path

# I test non devono mai toccare server/data/events.db
os.environ["CASCO_DB"] = str(Path(tempfile.mkdtemp()) / "import.db")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient

from app import create_app


@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(tmp_path / "test.db"))
