"""Access JWTs and opaque refresh secrets; configuration has no insecure default."""

import hashlib
import os
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException

ISSUER = "finza-api"
AUDIENCE = "finza-mobile"
ACCESS_SECONDS = 900


def signing_key() -> str:
    key = os.getenv("JWT_SECRET", "")
    if len(key.encode()) < 32:
        raise HTTPException(503, "Configuración de autenticación no disponible")
    return key


def utcnow() -> datetime:
    return datetime.now(UTC)


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_refresh() -> str:
    return secrets.token_urlsafe(32)


def access_token(account_id: UUID, family_id: UUID) -> str:
    now = utcnow()
    return jwt.encode(
        {
            "sub": str(account_id),
            "sid": str(family_id),
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": now,
            "nbf": now,
            "exp": now + timedelta(seconds=ACCESS_SECONDS),
            "jti": str(uuid4()),
            "type": "access",
        },
        signing_key(),
        algorithm="HS256",
    )


def decode_access(token: str) -> tuple[UUID, UUID]:
    try:
        claims = jwt.decode(
            token,
            signing_key(),
            algorithms=["HS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["sub", "sid", "iss", "aud", "iat", "nbf", "exp", "jti", "type"]},
        )
        if claims["type"] != "access":
            raise ValueError("Wrong token type")
        if not isinstance(claims["sub"], str) or not isinstance(claims["sid"], str):
            raise TypeError("Malformed identity claims")
        return UUID(claims["sub"]), UUID(claims["sid"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            401, "Sesión inválida o expirada", headers={"WWW-Authenticate": "Bearer"}
        ) from None
