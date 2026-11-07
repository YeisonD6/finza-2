"""E-mail confirmation: link on sign-up, single use, expiry, resend and provider-verified accounts."""

import logging
import re
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.identity import external
from app.modules.identity.models import EmailVerificationToken

PASSWORD = "correct horse battery"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
LINK = re.compile(r"finza://verify-email\?token=([\w-]+)")


@pytest.fixture
def mail_log(monkeypatch, caplog):
    monkeypatch.setenv("FINZA_MAIL_MODE", "log")
    caplog.set_level(logging.WARNING, logger="finza.mail")
    return caplog


def signup(client, email="a@example.com"):
    assert (
        client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD}).status_code == 201
    )
    return client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD}).json()


def auth(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_signup_sends_link_that_confirms_once(pg_identity, mail_log):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        tokens = signup(client)
        assert client.get("/api/v1/me", headers=auth(tokens)).json()["email_verified"] is False
        (raw,) = LINK.findall(mail_log.text)
        with Session(engine) as session:
            assert session.scalar(select(EmailVerificationToken)).token_hash != raw  # digest only
        assert client.post("/api/v1/auth/email/verify", json={"token": raw}).status_code == 204
        assert client.get("/api/v1/me", headers=auth(tokens)).json()["email_verified"] is True
        assert client.post("/api/v1/auth/email/verify", json={"token": raw}).status_code == 400
        resend = client.post("/api/v1/me/email/verification", headers=auth(tokens))
        assert resend.status_code == 409


def test_resend_replaces_old_link_and_expired_links_fail(pg_identity, mail_log):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        tokens = signup(client)
        assert client.post("/api/v1/me/email/verification", headers=auth(tokens)).status_code == 202
        first, second = LINK.findall(mail_log.text)
        assert client.post("/api/v1/auth/email/verify", json={"token": first}).status_code == 400
        with Session(engine) as session:
            session.execute(
                update(EmailVerificationToken).values(expires_at=EmailVerificationToken.created_at)
            )
            session.commit()
        assert client.post("/api/v1/auth/email/verify", json={"token": second}).status_code == 400
        assert client.post("/api/v1/auth/email/verify", json={"token": "short"}).status_code == 422


def test_resend_without_mail_is_unavailable_and_signup_still_works(pg_identity, monkeypatch):
    monkeypatch.delenv("FINZA_MAIL_MODE", raising=False)
    with TestClient(create_app()) as client:
        tokens = signup(client)
        assert client.get("/api/v1/auth/providers").json()["email_verification"] is False
        assert client.post("/api/v1/me/email/verification", headers=auth(tokens)).status_code == 503


def test_resend_is_rate_limited(pg_identity, mail_log):
    with TestClient(create_app()) as client:
        tokens = signup(client)
        codes = [
            client.post("/api/v1/me/email/verification", headers=auth(tokens)).status_code for _ in range(4)
        ]
        assert codes == [202, 202, 202, 429]


def test_google_accounts_start_confirmed(pg_identity, monkeypatch):
    audience = "test-web-client.apps.googleusercontent.com"
    monkeypatch.setenv("FINZA_GOOGLE_CLIENT_IDS", audience)
    monkeypatch.setattr(external, "signing_key", lambda provider, token: KEY.public_key())
    now = int(time.time())
    token = jwt.encode(
        {
            "iss": "https://accounts.google.com",
            "aud": audience,
            "sub": "g-1",
            "iat": now,
            "exp": now + 600,
            "email": "g@example.com",
            "email_verified": True,
        },
        KEY,
        algorithm="RS256",
    )
    with TestClient(create_app()) as client:
        tokens = client.post("/api/v1/auth/oauth/google", json={"id_token": token}).json()
        assert client.get("/api/v1/me", headers=auth(tokens)).json()["email_verified"] is True
