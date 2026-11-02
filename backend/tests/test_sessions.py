from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.identity.models import Account, AuthBucket, RefreshSession, SessionFamily
from app.modules.identity.tokens import digest, signing_key, utcnow

PASSWORD = "correct horse battery"


def register(client, email="a@example.com"):
    assert (
        client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD}).status_code == 201
    )


def login(client, email="a@example.com"):
    result = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert result.status_code == 200, result.text
    return result.json()


def me(client, token):
    return client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})


def test_login_refresh_logout_and_isolation(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        register(client)
        register(client, "b@example.com")
        a, b = login(client), login(client, "b@example.com")
        assert a["expires_in"] == 900
        assert me(client, a["access_token"]).json()["email"] == "a@example.com"
        assert me(client, b["access_token"]).json()["email"] == "b@example.com"
        assert me(client, a["access_token"]).headers["cache-control"] == "no-store"
        rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": a["refresh_token"]})
        assert rotated.status_code == 200
        fresh = rotated.json()
        assert fresh["refresh_token"] != a["refresh_token"]
        with Session(engine) as session:
            records = session.scalars(select(RefreshSession)).all()
            assert all(
                record.token_hash not in [a["refresh_token"], fresh["refresh_token"]] for record in records
            )
            assert session.scalar(
                select(RefreshSession).where(RefreshSession.token_hash == digest(a["refresh_token"]))
            ).revoked_at
        assert (
            client.post("/api/v1/auth/logout", json={"refresh_token": fresh["refresh_token"]}).status_code
            == 204
        )
        assert me(client, a["access_token"]).status_code == 401
        assert me(client, fresh["access_token"]).status_code == 401
        assert me(client, b["access_token"]).status_code == 200
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": fresh["refresh_token"]}).status_code
            == 401
        )


def test_replay_revokes_whole_family(pg_identity):
    with TestClient(create_app()) as client:
        register(client)
        old = login(client)
        fresh = client.post("/api/v1/auth/refresh", json={"refresh_token": old["refresh_token"]}).json()
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": old["refresh_token"]}).status_code
            == 401
        )
        assert me(client, fresh["access_token"]).status_code == 401
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": fresh["refresh_token"]}).status_code
            == 401
        )


def test_concurrent_rotation_has_one_winner_then_revokes(pg_identity):
    with TestClient(create_app()) as client:
        register(client)
        pair = login(client)

    def refresh(_):
        with TestClient(create_app()) as client:
            return client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})

    with ThreadPoolExecutor(2) as executor:
        results = list(executor.map(refresh, range(2)))
    assert sorted(r.status_code for r in results) == [200, 401]
    winner = next(r.json() for r in results if r.status_code == 200)
    with TestClient(create_app()) as client:
        assert me(client, winner["access_token"]).status_code == 401


@pytest.mark.parametrize(
    "change",
    [
        "expired",
        "issuer",
        "audience",
        "signature",
        "algorithm",
        "type",
        "missing",
        "subject",
        "family",
        "malformed_sid",
    ],
)
def test_invalid_jwt_is_denied(pg_identity, change):
    with TestClient(create_app()) as client:
        register(client)
        pair = login(client)
        claims = jwt.decode(pair["access_token"], options={"verify_signature": False})
        key, algorithm = signing_key(), "HS256"
        if change == "expired":
            claims["exp"] = utcnow() - timedelta(minutes=1)
        if change == "issuer":
            claims["iss"] = "other"
        if change == "audience":
            claims["aud"] = "other"
        if change == "signature":
            key = "wrong-key-with-more-than-thirty-two-bytes"
        if change == "algorithm":
            algorithm = "HS384"
        if change == "type":
            claims["type"] = "refresh"
        if change == "missing":
            del claims["exp"]
        if change == "subject":
            claims["sub"] = str(uuid4())
        if change == "family":
            claims["sid"] = str(uuid4())
        if change == "malformed_sid":
            claims["sid"] = 42
        token = jwt.encode(claims, key, algorithm=algorithm)
        assert me(client, token).status_code == 401
        assert client.get("/api/v1/me").status_code == 401


def test_generic_login_and_limits(pg_identity):
    with TestClient(create_app()) as client:
        register(client)
        bad = {"email": "a@example.com", "password": "wrong"}
        unknown = client.post("/api/v1/auth/login", json={**bad, "email": "nobody@example.com"})
        known = client.post("/api/v1/auth/login", json=bad)
        assert unknown.status_code == known.status_code == 401
        assert unknown.json()["message"] == known.json()["message"]
        for _ in range(4):
            assert client.post("/api/v1/auth/login", json=bad).status_code == 401
        response = client.post("/api/v1/auth/login", json=bad)
        assert response.status_code == 429
        assert int(response.headers["retry-after"]) > 0


def test_expiration_disabled_account_and_absolute_refresh(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        register(client)
        pair = login(client)
        with Session(engine) as session:
            expiry = session.scalar(select(SessionFamily)).expires_at
        fresh = client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
        assert fresh.status_code == 200
        with Session(engine) as session:
            assert all(t.expires_at == expiry for t in session.scalars(select(RefreshSession)))
            session.execute(update(SessionFamily).values(expires_at=utcnow() - timedelta(seconds=1)))
            session.commit()
        assert me(client, fresh.json()["access_token"]).status_code == 401
        assert (
            client.post(
                "/api/v1/auth/refresh", json={"refresh_token": fresh.json()["refresh_token"]}
            ).status_code
            == 401
        )
        pair = login(client)
        with Session(engine) as session:
            session.execute(update(Account).values(status="disabled"))
            session.commit()
        assert me(client, pair["access_token"]).status_code == 401
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}
            ).status_code
            == 401
        )


def test_register_and_refresh_limits_and_expired_bucket(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        for i in range(5):
            register(client, f"user{i}@example.com")
        assert (
            client.post(
                "/api/v1/auth/register", json={"email": "six@example.com", "password": PASSWORD}
            ).status_code
            == 429
        )
        pair = login(client, "user0@example.com")
        for _ in range(30):
            response = client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]})
            assert response.status_code == 200
            pair = response.json()
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]}).status_code
            == 429
        )
        with Session(engine) as session:
            session.execute(update(AuthBucket).values(expires_at=utcnow() - timedelta(seconds=1)))
            session.commit()
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": pair["refresh_token"]}).status_code
            == 200
        )


def test_missing_secret_fails_closed(pg_identity, monkeypatch):
    monkeypatch.delenv("JWT_SECRET")
    with TestClient(create_app()) as client:
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}
            ).status_code
            == 503
        )
