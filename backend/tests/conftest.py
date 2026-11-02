import pytest

pytest_plugins = ["test_identity_postgres"]


@pytest.fixture(autouse=True)
def auth_test_config(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "test-only-signing-key-at-least-32-bytes-never-deploy")
