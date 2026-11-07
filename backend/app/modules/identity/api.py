from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.identity import external, limits, passwords, sessions, verification
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import Account, ExternalIdentity, SessionFamily
from app.modules.identity.schemas import (
    AccountResponse,
    ChangePasswordRequest,
    ExternalSignInRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    ProvidersResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    VerifyEmailRequest,
)
from app.modules.identity.service import DuplicateEmail, register
from app.modules.identity.tokens import digest
from app.modules.users.models import UserProfile
from app.shared.mailer import mail_mode

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])


@router.post("/register", response_model=AccountResponse, status_code=201)
def register_account(
    data: RegisterRequest, request: Request, session: Annotated[Session, Depends(get_session)]
):
    limits.consume(session, "register", request.client.host if request.client else "unknown", 5, 3600)
    try:
        account = register(session, data)
    except DuplicateEmail:
        raise HTTPException(status_code=409, detail="El correo ya está registrado") from None
    verification.send(session, account.id)
    return account


@router.post("/login", response_model=TokenPair)
def login_account(data: LoginRequest, request: Request, session: Annotated[Session, Depends(get_session)]):
    subject = f"{request.client.host if request.client else 'unknown'}:{data.email}"
    key = limits.consume(session, "login", subject, 5, 900)
    account = sessions.verify_credentials(session, str(data.email), data.password.get_secret_value())
    limits.reset(session, key)
    return sessions.login(session, account)


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.get("/providers", response_model=ProvidersResponse)
def providers():
    """Which sign-in methods this server can complete, so the app never shows a dead button."""
    mail = mail_mode() in {"smtp", "log"}
    return ProvidersResponse(**external.enabled_providers(), password_reset=mail, email_verification=mail)


@router.post("/oauth/{provider}", response_model=TokenPair)
def external_sign_in(
    provider: str,
    data: ExternalSignInRequest,
    request: Request,
    session: Annotated[Session, Depends(get_session)],
):
    limits.consume(session, "oauth", client_ip(request), 20, 900)
    identity = external.verify(provider, data.id_token.get_secret_value(), data.nonce)
    account = external.account_for(session, identity)
    return sessions.login(session, account)


@router.post("/password/forgot", status_code=202)
def forgot_password(
    data: ForgotPasswordRequest, request: Request, session: Annotated[Session, Depends(get_session)]
):
    limits.consume(session, "forgot-ip", client_ip(request), 10, 3600)
    limits.consume(session, "forgot-email", str(data.email), 3, 3600)
    passwords.request_reset(session, str(data.email))
    return {"message": "Si el correo está registrado, te enviamos un enlace para restablecer la contraseña."}


@router.post("/password/reset", status_code=204)
def reset_password(
    data: ResetPasswordRequest, request: Request, session: Annotated[Session, Depends(get_session)]
):
    limits.consume(session, "reset", client_ip(request), 10, 900)
    passwords.complete_reset(session, data.token.get_secret_value(), data.new_password.get_secret_value())
    return Response(status_code=204)


@router.post("/email/verify", status_code=204)
def verify_email(
    data: VerifyEmailRequest, request: Request, session: Annotated[Session, Depends(get_session)]
):
    """Opened from the e-mailed link; works without a session so any device can confirm."""
    limits.consume(session, "verify-email", client_ip(request), 20, 900)
    verification.complete(session, data.token.get_secret_value())
    return Response(status_code=204)


@router.post("/refresh", response_model=TokenPair)
def refresh_account(data: RefreshRequest, session: Annotated[Session, Depends(get_session)]):
    # Group all rotations in the same limiter; unknown tokens use a separate bounded key.
    from sqlalchemy import select

    from app.modules.identity.models import RefreshSession

    raw = data.refresh_token.get_secret_value()
    token = session.scalar(select(RefreshSession).where(RefreshSession.token_hash == digest(raw)))
    limits.consume(session, "refresh", str(token.family_id) if token else "unknown", 30, 60)
    return sessions.rotate(session, raw)


@router.post("/logout", status_code=204)
def logout_account(data: RefreshRequest, session: Annotated[Session, Depends(get_session)]):
    sessions.logout_refresh(session, data.refresh_token.get_secret_value())
    return Response(status_code=204)


me_router = APIRouter(tags=["identity"])


@me_router.get("/api/v1/me", response_model=MeResponse)
def me(
    family: Annotated[SessionFamily, Depends(current_family)],
    session: Annotated[Session, Depends(get_session)],
):
    account = session.get(Account, family.account_id)
    profile = session.get(UserProfile, family.account_id)
    linked = session.scalars(
        select(ExternalIdentity.provider).where(ExternalIdentity.account_id == account.id)
    ).all()
    return MeResponse(
        id=account.id,
        email=account.email,
        base_currency=profile.base_currency,
        has_password=account.password_hash is not None,
        providers=sorted(set(linked)),
        email_verified=account.email_verified_at is not None,
    )


@me_router.post("/api/v1/me/email/verification", status_code=202)
def resend_verification(
    family: Annotated[SessionFamily, Depends(current_family)],
    session: Annotated[Session, Depends(get_session)],
):
    account = session.get(Account, family.account_id)
    if account.email_verified_at is not None:
        raise HTTPException(409, "Tu correo ya está confirmado")
    if not verification.enabled():
        raise HTTPException(503, "El envío de correos no está configurado en este servidor")
    limits.consume(session, "verify-resend", str(account.id), 3, 3600)
    verification.send(session, account.id)
    return {"message": f"Te enviamos un enlace de confirmación a {account.email}."}


@me_router.post("/api/v1/me/password", status_code=204)
def change_password(
    data: ChangePasswordRequest,
    family: Annotated[SessionFamily, Depends(current_family)],
    session: Annotated[Session, Depends(get_session)],
):
    limits.consume(session, "change-password", str(family.account_id), 5, 900)
    account = session.get(Account, family.account_id)
    current = data.current_password.get_secret_value() if data.current_password else None
    passwords.change(session, account, family.id, current, data.new_password.get_secret_value())
    return Response(status_code=204)
