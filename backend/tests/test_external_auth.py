"""Google/Apple sign-in, password change and password recovery against real PostgreSQL."""

import hashlib
import logging
import re
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.identity import external
from app.modules.identity.models import Account, PasswordResetToken

PASSWORD = "correct horse battery"
GOOGLE_AUD = "test-web-client.apps.googleusercontent.com"
APPLE_AUD = "app.finza.mobile"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
OTHER_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def providers(monkeypatch):
    monkeypatch.setenv("FINZA_GOOGLE_CLIENT_IDS", f"{GOOGLE_AUD}, other-client")
    monkeypatch.setenv("FINZA_APPLE_AUDIENCES", APPLE_AUD)
    monkeypatch.setattr(external, "signing_key", lambda provider, token: KEY.public_key())


def id_token(provider="google", key=KEY, **overrides):
    now = int(time.time())
    claims = {
        "iss": "https://accounts.google.com" if provider == "google" else "https://appleid.apple.com",
        "aud": GOOGLE_AUD if provider == "google" else APPLE_AUD,
        "sub": "provider-subject-1",
        "iat": now,
        "exp": now + 600,
        "email": "laura@example.com",
        "email_verified": True if provider == "google" else "true",
    }
    claims.update(overrides)
    claims = {name: value for name, value in claims.items() if value is not None}
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": "test"})


def sign_in(client, provider="google", token=None, nonce=None):
    body = {"id_token": token or id_token(provider)}
    if nonce is not None:
        body["nonce"] = nonce
    return client.post(f"/api/v1/auth/oauth/{provider}", json=body)


def me(client, token):
    return client.get("/api/v1/me", headers={"Authorization": f"Bearer {token}"})


def test_google_creates_account_then_reuses_link(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        first = sign_in(client)
        assert first.status_code == 200, first.text
        profile = me(client, first.json()["access_token"]).json()
        assert profile["email"] == "laura@example.com"
        assert profile["has_password"] is False and profile["providers"] == ["google"]
        # Same subject with a changed e-mail still maps to the same account.
        again = sign_in(client, token=id_token(email="nuevo@example.com"))
        assert me(client, again.json()["access_token"]).json()["id"] == profile["id"]
        # A password-less account cannot be entered with any password.
        failed = client.post("/api/v1/auth/login", json={"email": "laura@example.com", "password": "x" * 12})
        assert failed.status_code == 401
    with Session(engine) as session:
        assert (
            session.scalar(select(Account).where(Account.email == "laura@example.com")).password_hash is None
        )


def test_verified_email_links_confirmed_password_account(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        client.post("/api/v1/auth/register", json={"email": "laura@example.com", "password": PASSWORD})
        with Session(engine) as session:
            session.execute(update(Account).values(email_verified_at=func.now()))
            session.commit()
        password_login = client.post(
            "/api/v1/auth/login", json={"email": "laura@example.com", "password": PASSWORD}
        )
        apple = sign_in(client, "apple", id_token("apple", sub="apple-sub"), nonce=None)
        assert apple.status_code == 200, apple.text
        a = me(client, password_login.json()["access_token"]).json()
        b = me(client, apple.json()["access_token"]).json()
        assert a["id"] == b["id"] and b["has_password"] is True and b["providers"] == ["apple"]


def test_provider_email_takes_over_unconfirmed_password_account(pg_identity):
    """Someone who pre-registers another person's address loses that password and its sessions."""
    with TestClient(create_app()) as client:
        client.post("/api/v1/auth/register", json={"email": "laura@example.com", "password": PASSWORD})
        squatter = client.post(
            "/api/v1/auth/login", json={"email": "laura@example.com", "password": PASSWORD}
        ).json()
        owner = sign_in(client)
        assert owner.status_code == 200, owner.text
        profile = me(client, owner.json()["access_token"]).json()
        assert profile["has_password"] is False and profile["email_verified"] is True
        assert me(client, squatter["access_token"]).status_code == 401
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "laura@example.com", "password": PASSWORD}
            ).status_code
            == 401
        )


@pytest.mark.parametrize(
    "token, status",
    [
        (lambda: id_token(email_verified=False), 422),
        (lambda: id_token(email=None), 422),
        (lambda: id_token(aud="someone-else"), 401),
        (lambda: id_token(iss="https://evil.example"), 401),
        (lambda: id_token(exp=int(time.time()) - 120), 401),
        (lambda: id_token(key=OTHER_KEY), 401),
        (lambda: id_token(nonce="unexpected-nonce"), 401),
    ],
)
def test_rejects_untrusted_tokens(pg_identity, token, status):
    with TestClient(create_app()) as client:
        response = sign_in(client, token=token())
        assert response.status_code == status, response.text
        assert "laura@example.com" not in response.text


def test_nonce_hashed_for_apple_plain_for_google(pg_identity):
    raw = "nonce-1234567890"
    with TestClient(create_app()) as client:
        hashed = hashlib.sha256(raw.encode()).hexdigest()
        assert sign_in(client, "apple", id_token("apple", nonce=hashed), nonce=raw).status_code == 200
        assert sign_in(client, "google", id_token(nonce=raw), nonce=raw).status_code == 200
        assert sign_in(client, "google", id_token(nonce=raw), nonce="different-nonce").status_code == 401
        assert sign_in(client, "google", id_token(), nonce=raw).status_code == 401


def test_unconfigured_or_unknown_provider(pg_identity, monkeypatch):
    monkeypatch.delenv("FINZA_APPLE_AUDIENCES")
    with TestClient(create_app()) as client:
        assert client.get("/api/v1/auth/providers").json() == {
            "google": True,
            "apple": False,
            "password_reset": False,
            "email_verification": False,
        }
        assert sign_in(client, "apple", id_token("apple")).status_code == 503
        assert sign_in(client, "facebook").status_code == 404


def test_change_password_keeps_this_session_and_revokes_others(pg_identity):
    with TestClient(create_app()) as client:
        client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": PASSWORD})
        here = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}).json()
        other = client.post(
            "/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}
        ).json()
        auth = {"Authorization": f"Bearer {here['access_token']}"}
        wrong = client.post(
            "/api/v1/me/password", headers=auth, json={"current_password": "nope", "new_password": "y" * 14}
        )
        assert wrong.status_code == 400
        ok = client.post(
            "/api/v1/me/password",
            headers=auth,
            json={"current_password": PASSWORD, "new_password": "una clave nueva larga"},
        )
        assert ok.status_code == 204
        assert me(client, here["access_token"]).status_code == 200
        assert me(client, other["access_token"]).status_code == 401
        assert (
            client.post("/api/v1/auth/refresh", json={"refresh_token": other["refresh_token"]}).status_code
            == 401
        )
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": "una clave nueva larga"}
            ).status_code
            == 200
        )


def test_password_less_account_can_set_a_password(pg_identity):
    with TestClient(create_app()) as client:
        tokens = sign_in(client).json()
        auth = {"Authorization": f"Bearer {tokens['access_token']}"}
        assert (
            client.post(
                "/api/v1/me/password", headers=auth, json={"new_password": "mi primera clave"}
            ).status_code
            == 204
        )
        assert me(client, tokens["access_token"]).json()["has_password"] is True
        login = client.post(
            "/api/v1/auth/login", json={"email": "laura@example.com", "password": "mi primera clave"}
        )
        assert login.status_code == 200


def test_password_reset_flow_is_single_use_and_revokes_sessions(pg_identity, monkeypatch, caplog):
    _, engine = pg_identity
    monkeypatch.setenv("FINZA_MAIL_MODE", "log")
    with TestClient(create_app()) as client:
        client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": PASSWORD})
        session_before = client.post(
            "/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD}
        ).json()
        with caplog.at_level(logging.WARNING, logger="finza.mail"):
            known = client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"})
            unknown = client.post("/api/v1/auth/password/forgot", json={"email": "nadie@example.com"})
        assert known.status_code == unknown.status_code == 202
        assert known.json() == unknown.json()
        links = re.findall(r"finza://reset-password\?token=([\w-]+)", caplog.text)
        assert len(links) == 1
        raw = links[0]
        with Session(engine) as session:
            assert session.scalar(select(PasswordResetToken)).token_hash != raw  # only the digest is stored
        new = {"token": raw, "new_password": "otra clave muy larga"}
        assert client.post("/api/v1/auth/password/reset", json=new).status_code == 204
        assert client.post("/api/v1/auth/password/reset", json=new).status_code == 400  # single use
        assert me(client, session_before["access_token"]).status_code == 401
        assert (
            client.post(
                "/api/v1/auth/login", json={"email": "a@example.com", "password": "otra clave muy larga"}
            ).status_code
            == 200
        )


def test_expired_reset_link_and_new_request_invalidates_old(pg_identity, monkeypatch, caplog):
    _, engine = pg_identity
    monkeypatch.setenv("FINZA_MAIL_MODE", "log")
    with TestClient(create_app()) as client:
        client.post("/api/v1/auth/register", json={"email": "a@example.com", "password": PASSWORD})
        with caplog.at_level(logging.WARNING, logger="finza.mail"):
            client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"})
            client.post("/api/v1/auth/password/forgot", json={"email": "a@example.com"})
        first, second = re.findall(r"reset-password\?token=([\w-]+)", caplog.text)
        assert (
            client.post(
                "/api/v1/auth/password/reset", json={"token": first, "new_password": "z" * 14}
            ).status_code
            == 400
        )
        with Session(engine) as session:
            session.execute(update(PasswordResetToken).values(expires_at=PasswordResetToken.created_at))
            session.commit()
        assert (
            client.post(
                "/api/v1/auth/password/reset", json={"token": second, "new_password": "z" * 14}
            ).status_code
            == 400
        )
