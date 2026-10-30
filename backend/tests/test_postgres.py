import os

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="Requires real PostgreSQL")
def test_readiness_with_real_postgres():
    with TestClient(create_app()) as client:
        response = client.get("/health/ready")
        assert response.status_code == 200
        assert response.json() == {"status": "ready"}
