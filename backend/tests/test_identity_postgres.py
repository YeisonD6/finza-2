"""Real PostgreSQL tests own a disposable database; never truncate user data."""

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.database import get_engine
from app.main import create_app
from app.modules.identity.models import Account
from app.modules.users.models import UserProfile


@pytest.fixture
def pg_identity(monkeypatch):
    admin_url = os.getenv("FINZA_PG_ADMIN_URL")
    if not admin_url:
        pytest.skip("Requires FINZA_PG_ADMIN_URL with CREATE DATABASE permission")
    name = "finza_test_" + uuid4().hex
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"CREATE DATABASE {name}"))  # UUID-generated identifier only
    url = make_url(admin_url).set(database=name).render_as_string(hide_password=False)
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    engine = create_engine(url)
    try:
        command.upgrade(config, "head")
        yield config, engine
    finally:
        engine.dispose()
        get_engine(url).dispose()
        get_engine.cache_clear()
        with admin.connect() as conn:
            conn.execute(text(f"DROP DATABASE {name} WITH (FORCE)"))
        admin.dispose()


def test_postgres_migrations_registration_and_readiness(pg_identity):
    config, engine = pg_identity
    assert {"accounts", "user_profiles", "refresh_sessions"} <= set(inspect(engine).get_table_names())
    columns = {column["name"]: column for column in inspect(engine).get_columns("refresh_sessions")}
    assert columns["expires_at"]["type"].timezone is True
    with TestClient(create_app()) as client:
        assert client.get("/health/ready").status_code == 200
        payload = {"email": "Laura@example.com", "password": "correct horse battery"}
        response = client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 201
        assert client.post("/api/v1/auth/register", json=payload).status_code == 409
        assert (
            client.post("/api/v1/auth/register", json={**payload, "owner_id": str(uuid4())}).status_code
            == 422
        )
    with Session(engine) as session:
        account = session.scalar(select(Account))
        assert account.email == "laura@example.com"
        assert PasswordHasher().verify(account.password_hash, payload["password"])
        assert session.get(UserProfile, account.id).base_currency == "COP"
    command.check(config)  # Model definitions and migration must agree.
    command.downgrade(config, "base")
    assert "accounts" not in inspect(engine).get_table_names()
    command.upgrade(config, "head")
    assert "accounts" in inspect(engine).get_table_names()


def test_concurrent_duplicate_registration_is_atomic(pg_identity):
    _, engine = pg_identity

    def register_once(_):
        with TestClient(create_app()) as client:
            return client.post(
                "/api/v1/auth/register",
                json={
                    "email": "concurrent@example.com",
                    "password": "correct horse battery",
                },
            ).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        assert sorted(executor.map(register_once, range(2))) == [201, 409]
    with Session(engine) as session:
        assert len(session.scalars(select(Account)).all()) == 1
        assert len(session.scalars(select(UserProfile)).all()) == 1
