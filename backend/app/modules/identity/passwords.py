"""Password change (signed in) and recovery by e-mailed one-time link."""

import logging
import os
import secrets
from datetime import timedelta
from urllib.parse import urlencode
from uuid import UUID

from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import hash_password, password_hasher
from app.modules.identity.models import Account, PasswordResetToken, RefreshSession, SessionFamily
from app.modules.identity.tokens import digest
from app.shared import mailer
from app.shared.time import ensure_utc, utcnow

RESET_MINUTES = 30
logger = logging.getLogger("finza.identity")


def revoke_families(session: Session, account_id: UUID, *, keep: UUID | None = None) -> None:
    families = select(SessionFamily.id).where(
        SessionFamily.account_id == account_id, SessionFamily.revoked_at.is_(None)
    )
    if keep is not None:
        families = families.where(SessionFamily.id != keep)
    ids = list(session.scalars(families))
    if not ids:
        return
    now = utcnow()
    session.execute(update(SessionFamily).where(SessionFamily.id.in_(ids)).values(revoked_at=now))
    session.execute(update(RefreshSession).where(RefreshSession.family_id.in_(ids)).values(revoked_at=now))


def change(session: Session, account: Account, family_id: UUID, current: str | None, new: str) -> None:
    if account.password_hash:
        try:
            valid = bool(current) and password_hasher.verify(account.password_hash, current)
        except (VerificationError, InvalidHashError):
            valid = False
        if not valid:
            raise HTTPException(400, "La contraseña actual no es correcta")
    account.password_hash = hash_password(new)
    # Other devices must sign in again; this one keeps its session.
    revoke_families(session, account.id, keep=family_id)
    session.commit()


def reset_link(raw: str) -> str:
    base = os.getenv("FINZA_RESET_LINK_BASE", "finza://reset-password")
    return f"{base}?{urlencode({'token': raw})}"


def request_reset(session: Session, email: str) -> None:
    """Always behaves the same for unknown accounts so the endpoint cannot reveal who is registered."""
    account = session.scalar(select(Account).where(Account.email == email))
    if account is None or account.status != "active":
        return
    now = utcnow()
    session.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.account_id == account.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(32)
    session.add(
        PasswordResetToken(
            account_id=account.id, token_hash=digest(raw), expires_at=now + timedelta(minutes=RESET_MINUTES)
        )
    )
    session.commit()
    try:
        mailer.send(
            account.email,
            "Restablece tu contraseña de FINZA",
            "Hola,\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta de FINZA.\n"
            f"Abre este enlace en tu teléfono (vence en {RESET_MINUTES} minutos):\n\n{reset_link(raw)}\n\n"
            "Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.\n",
        )
    except Exception:  # Never reveal delivery problems to the requester.
        logger.exception("Password reset e-mail could not be sent")


def complete_reset(session: Session, raw: str, new: str) -> None:
    token = session.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == digest(raw)).with_for_update()
    )
    if token is None or token.used_at is not None or ensure_utc(token.expires_at) <= utcnow():
        raise HTTPException(400, "El enlace no es válido o ya venció. Solicita uno nuevo.")
    account = session.get(Account, token.account_id)
    if account is None or account.status != "active":
        raise HTTPException(400, "El enlace no es válido o ya venció. Solicita uno nuevo.")
    token.used_at = utcnow()
    account.password_hash = hash_password(new)
    revoke_families(session, account.id)
    session.commit()
