"""Verify Google and Apple ID tokens and map them to FINZA accounts.

The app obtains an ID token from the provider's official SDK; the API checks
its signature against the provider's published keys (JWKS), its issuer,
audience (our client IDs), expiry and nonce, and then issues regular FINZA
sessions. No provider secret is needed for this verification, and provider
tokens are never stored.

Configuration (comma-separated, from Google Cloud / Apple Developer):
    FINZA_GOOGLE_CLIENT_IDS  OAuth client IDs (web, Android, iOS) that may be the token audience
    FINZA_APPLE_AUDIENCES    iOS bundle ID(s) and/or Services ID used for Sign in with Apple
A provider with no configured audience is disabled (503), never "open".
"""

import hashlib
import hmac
import os
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.identity.models import Account, ExternalIdentity
from app.modules.users.models import UserProfile


@dataclass(frozen=True)
class Provider:
    name: str
    label: str
    jwks_url: str
    issuers: tuple[str, ...]
    audience_env: str


PROVIDERS = {
    "google": Provider(
        "google",
        "Google",
        "https://www.googleapis.com/oauth2/v3/certs",
        ("https://accounts.google.com", "accounts.google.com"),
        "FINZA_GOOGLE_CLIENT_IDS",
    ),
    "apple": Provider(
        "apple",
        "Apple",
        "https://appleid.apple.com/auth/keys",
        ("https://appleid.apple.com",),
        "FINZA_APPLE_AUDIENCES",
    ),
}


@dataclass(frozen=True)
class VerifiedIdentity:
    provider: str
    subject: str
    email: str | None
    email_verified: bool


def audiences(provider: Provider) -> list[str]:
    return [value.strip() for value in os.getenv(provider.audience_env, "").split(",") if value.strip()]


def enabled_providers() -> dict[str, bool]:
    return {name: bool(audiences(provider)) for name, provider in PROVIDERS.items()}


@lru_cache(maxsize=4)
def _jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600, timeout=5)


def signing_key(provider: Provider, token: str):
    """Public key for the token's `kid`; tests replace this with a local key."""
    return _jwks_client(provider.jwks_url).get_signing_key_from_jwt(token).key


def _truthy(value) -> bool:
    return value is True or value == "true"


def _nonce_matches(claim, raw_nonce: str) -> bool:
    if not isinstance(claim, str):
        return False
    hashed = hashlib.sha256(raw_nonce.encode()).hexdigest()
    # Apple carries SHA-256(nonce); Google carries the nonce as sent.
    return hmac.compare_digest(claim, hashed) or hmac.compare_digest(claim, raw_nonce)


def verify(provider_name: str, token: str, nonce: str | None) -> VerifiedIdentity:
    provider = PROVIDERS.get(provider_name)
    if provider is None:
        raise HTTPException(404, "Proveedor no disponible")
    allowed = audiences(provider)
    if not allowed:
        raise HTTPException(503, f"El inicio de sesión con {provider.label} no está configurado")
    try:
        key = signing_key(provider, token)
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=allowed,
            options={"require": ["iss", "aud", "sub", "iat", "exp"]},
            leeway=30,
        )
    except (jwt.PyJWKClientError, jwt.InvalidTokenError):
        raise HTTPException(
            401, f"No pudimos validar tu cuenta de {provider.label}. Inténtalo de nuevo."
        ) from None
    if claims.get("iss") not in provider.issuers:
        raise HTTPException(401, f"No pudimos validar tu cuenta de {provider.label}. Inténtalo de nuevo.")
    if (nonce is not None or "nonce" in claims) and not (
        nonce and _nonce_matches(claims.get("nonce"), nonce)
    ):
        raise HTTPException(401, f"No pudimos validar tu cuenta de {provider.label}. Inténtalo de nuevo.")
    subject = claims["sub"]
    if not isinstance(subject, str) or not 1 <= len(subject) <= 255:
        raise HTTPException(401, f"No pudimos validar tu cuenta de {provider.label}. Inténtalo de nuevo.")
    email = claims.get("email")
    email = email.lower() if isinstance(email, str) and 3 <= len(email) <= 320 else None
    return VerifiedIdentity(provider.name, subject, email, _truthy(claims.get("email_verified")))


def account_for(session: Session, identity: VerifiedIdentity, *, retry: bool = True) -> Account:
    """Existing link → that account; verified email of an existing account → link it; else create one."""
    link = session.scalar(
        select(ExternalIdentity).where(
            ExternalIdentity.provider == identity.provider, ExternalIdentity.subject == identity.subject
        )
    )
    if link is not None:
        account = session.get(Account, link.account_id)
    else:
        if not identity.email or not identity.email_verified:
            raise HTTPException(
                422, "Tu cuenta no compartió un correo verificado. Usa otro método para continuar."
            )
        account = session.scalar(select(Account).where(Account.email == identity.email))
        try:
            if account is None:
                account = Account(email=identity.email, password_hash=None)
                session.add(account)
                session.flush()
                session.add(UserProfile(account_id=account.id, base_currency="COP", locale="es-CO"))
            session.add(
                ExternalIdentity(
                    account_id=account.id,
                    provider=identity.provider,
                    subject=identity.subject,
                    email=identity.email,
                )
            )
            session.flush()
        except IntegrityError:
            # A concurrent first sign-in created the same link or account; use the winner once.
            session.rollback()
            if not retry:
                raise
            return account_for(session, identity, retry=False)
    if account is None or account.status != "active":
        raise HTTPException(403, "Esta cuenta no está activa")
    return account
