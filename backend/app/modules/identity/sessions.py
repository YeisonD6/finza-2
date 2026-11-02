from datetime import timedelta
from uuid import UUID

from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import password_hasher
from app.modules.identity.models import Account, RefreshSession, SessionFamily
from app.modules.identity.tokens import ACCESS_SECONDS, access_token, digest, new_refresh, utcnow

# A real hash makes unknown and known-account password checks use the same KDF.
DUMMY_HASH = password_hasher.hash("finza-dummy-password-not-a-credential")


def verify_credentials(session: Session, email: str, password: str) -> Account:
    account = session.scalar(select(Account).where(Account.email == email))
    try:
        valid = password_hasher.verify(account.password_hash if account else DUMMY_HASH, password)
    except (VerificationError, InvalidHashError):
        valid = False
    if not valid or account is None or account.status != "active":
        raise HTTPException(401, "Correo o contraseña incorrectos")
    return account


def pair(session: Session, family: SessionFamily) -> dict:
    raw = new_refresh()
    session.add(
        RefreshSession(
            account_id=family.account_id,
            family_id=family.id,
            token_hash=digest(raw),
            expires_at=family.expires_at,
        )
    )
    result = {
        "access_token": access_token(family.account_id, family.id),
        "refresh_token": raw,
        "token_type": "bearer",
        "expires_in": ACCESS_SECONDS,
    }
    session.commit()
    return result


def login(session: Session, account: Account) -> dict:
    family = SessionFamily(account_id=account.id, expires_at=utcnow() + timedelta(days=30))
    session.add(family)
    session.flush()
    return pair(session, family)


def family_for_refresh(session: Session, raw: str) -> tuple[SessionFamily, RefreshSession]:
    token = session.scalar(select(RefreshSession).where(RefreshSession.token_hash == digest(raw)))
    if token is None:
        raise HTTPException(401, "Sesión inválida o expirada")
    # The permanent family row serializes refresh/replay/logout, even across rotated tokens.
    family = session.scalar(
        select(SessionFamily).where(SessionFamily.id == token.family_id).with_for_update()
    )
    session.refresh(token)
    if family is None:
        raise HTTPException(401, "Sesión inválida o expirada")
    return family, token


def revoke(session: Session, family: SessionFamily) -> None:
    family.revoked_at = utcnow()
    session.execute(
        update(RefreshSession).where(RefreshSession.family_id == family.id).values(revoked_at=utcnow())
    )
    session.commit()


def rotate(session: Session, raw: str) -> dict:
    family, token = family_for_refresh(session, raw)
    account = session.get(Account, family.account_id)
    if (
        family.revoked_at
        or family.expires_at <= utcnow()
        or token.revoked_at
        or not account
        or account.status != "active"
    ):
        revoke(session, family)
        raise HTTPException(401, "Sesión inválida o expirada")
    token.revoked_at = utcnow()
    return pair(session, family)


def logout_refresh(session: Session, raw: str) -> None:
    token = session.scalar(select(RefreshSession).where(RefreshSession.token_hash == digest(raw)))
    if token:
        family, _ = family_for_refresh(session, raw)
        revoke(session, family)


def active_family(session: Session, account_id: UUID, family_id: UUID) -> SessionFamily:
    family = session.scalar(
        select(SessionFamily).where(SessionFamily.id == family_id, SessionFamily.account_id == account_id)
    )
    account = session.get(Account, account_id)
    if (
        not family
        or family.revoked_at
        or family.expires_at <= utcnow()
        or not account
        or account.status != "active"
    ):
        raise HTTPException(401, "Sesión inválida o expirada")
    return family
