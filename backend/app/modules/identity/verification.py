"""E-mail confirmation by one-time link. Confirmation never blocks using FINZA; it proves
the address belongs to the person, which recovery e-mails and account linking rely on."""

import logging
import os
import secrets
from datetime import timedelta
from urllib.parse import urlencode
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.identity.models import Account, EmailVerificationToken
from app.modules.identity.tokens import digest
from app.shared import mailer
from app.shared.time import ensure_utc, utcnow

VERIFY_HOURS = 24
INVALID = "El enlace no es válido o ya venció. Pide uno nuevo desde FINZA."
logger = logging.getLogger("finza.identity")


def enabled() -> bool:
    return mailer.mail_mode() in {"smtp", "log"}


def verify_link(raw: str) -> str:
    base = os.getenv("FINZA_VERIFY_LINK_BASE", "finza://verify-email")
    return f"{base}?{urlencode({'token': raw})}"


def send(session: Session, account_id: UUID) -> bool:
    """Issue a fresh link (older ones stop working) and e-mail it. False when mail is off."""
    account = session.get(Account, account_id)
    if account is None or account.email_verified_at is not None or not enabled():
        return False
    now = utcnow()
    session.execute(
        update(EmailVerificationToken)
        .where(EmailVerificationToken.account_id == account.id, EmailVerificationToken.used_at.is_(None))
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(32)
    session.add(
        EmailVerificationToken(
            account_id=account.id, token_hash=digest(raw), expires_at=now + timedelta(hours=VERIFY_HOURS)
        )
    )
    session.commit()
    try:
        mailer.send(
            account.email,
            "Confirma tu correo en FINZA",
            "Hola,\n\nConfirma que este correo es tuyo para proteger tu cuenta de FINZA y poder "
            f"recuperarla si olvidas la contraseña. Abre este enlace en tu teléfono (vence en {VERIFY_HOURS} "
            f"horas):\n\n{verify_link(raw)}\n\nSi no creaste una cuenta en FINZA, ignora este mensaje.\n",
        )
    except Exception:  # Registration must not fail because the mail server is down.
        logger.exception("Verification e-mail could not be sent")
    return True


def complete(session: Session, raw: str) -> None:
    token = session.scalar(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.token_hash == digest(raw))
        .with_for_update()
    )
    if token is None or token.used_at is not None or ensure_utc(token.expires_at) <= utcnow():
        raise HTTPException(400, INVALID)
    account = session.get(Account, token.account_id)
    if account is None or account.status != "active":
        raise HTTPException(400, INVALID)
    token.used_at = utcnow()
    if account.email_verified_at is None:
        account.email_verified_at = utcnow()
    session.commit()
