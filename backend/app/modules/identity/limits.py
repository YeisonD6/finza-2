"""Atomic PostgreSQL counters shared by workers; identifiers/IPs stored only as HMAC."""

import hashlib
import hmac
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import case, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.modules.identity.models import AuthBucket
from app.modules.identity.tokens import signing_key, utcnow


def bucket_key(scope: str, subject: str) -> str:
    return hmac.new(signing_key().encode(), f"{scope}:{subject}".encode(), hashlib.sha256).hexdigest()


def consume(session: Session, scope: str, subject: str, limit: int, seconds: int) -> str:
    now = utcnow()
    key = bucket_key(scope, subject)
    expired = AuthBucket.expires_at <= now
    insert = pg_insert if session.bind.dialect.name == "postgresql" else sqlite_insert
    statement = insert(AuthBucket).values(key=key, count=1, expires_at=now + timedelta(seconds=seconds))
    statement = statement.on_conflict_do_update(
        index_elements=[AuthBucket.key],
        set_={
            "count": case((expired, 1), else_=AuthBucket.count + 1),
            "expires_at": case((expired, now + timedelta(seconds=seconds)), else_=AuthBucket.expires_at),
        },
    ).returning(AuthBucket.count, AuthBucket.expires_at)
    count, _expires = session.execute(statement).one()
    session.commit()
    if count > limit:
        raise HTTPException(
            429, "Demasiados intentos. Intenta más tarde", headers={"Retry-After": str(seconds)}
        )
    return key


def reset(session: Session, key: str) -> None:
    session.execute(delete(AuthBucket).where(AuthBucket.key == key))
    session.commit()
