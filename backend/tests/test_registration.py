from uuid import uuid4

import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.core.models import Base
from app.main import create_app
from app.modules.identity.models import Account, AuthBucket, RefreshSession, SessionFamily
from app.modules.users.models import UserProfile


@pytest.fixture
def registration(tmp_path):
    engine = create_engine("sqlite:///" + str(tmp_path / "registration.db"))
    # Unit fixture owns only identity tables; financial migrations are tested on real PG.
    Base.metadata.create_all(
        engine,
        tables=[
            Account.__table__,
            UserProfile.__table__,
            SessionFamily.__table__,
            RefreshSession.__table__,
            AuthBucket.__table__,
        ],
    )
    app = create_app()

    def sessions():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = sessions
    with TestClient(app) as client:
        yield client, engine
    engine.dispose()


def test_register_persists_profile_and_argon2id(registration):
    client, engine = registration
    password = "correct horse battery"
    response = client.post("/api/v1/auth/register", json={"email": "Laura@EXAMPLE.COM", "password": password})
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "laura@example.com"
    assert body["base_currency"] == "COP"
    assert "password" not in response.text and "token" not in response.text
    with Session(engine) as session:
        account = session.scalar(select(Account))
        assert account.password_hash.startswith("$argon2id$")
        assert PasswordHasher().verify(account.password_hash, password)
        assert session.get(UserProfile, account.id).base_currency == "COP"
        assert session.scalar(select(RefreshSession)) is None


def test_duplicate_email_is_case_insensitive(registration):
    client, engine = registration
    payload = {"email": "laura@example.com", "password": "correct horse battery"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    payload["email"] = "LAURA@example.com"
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409
    with Session(engine) as session:
        assert len(session.scalars(select(Account)).all()) == 1
        assert len(session.scalars(select(UserProfile)).all()) == 1


@pytest.mark.parametrize(
    "changes",
    [
        {"email": "invalid"},
        {"password": "x" * 11},
        {"password": "x" * 129},
        {"password": 123456789012},
        {"owner_id": str(uuid4())},
        {"base_currency": "USD"},
    ],
)
def test_invalid_registration_does_not_write(registration, changes):
    client, engine = registration
    payload = {"email": "laura@example.com", "password": "correct horse battery", **changes}
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422
    assert "correct horse battery" not in response.text
    with Session(engine) as session:
        assert session.scalar(select(Account)) is None
