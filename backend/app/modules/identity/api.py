from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.identity import limits, sessions
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import Account, SessionFamily
from app.modules.identity.schemas import (
    AccountResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
)
from app.modules.identity.service import DuplicateEmail, register
from app.modules.identity.tokens import digest
from app.modules.users.models import UserProfile

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])


@router.post("/register", response_model=AccountResponse, status_code=201)
def register_account(
    data: RegisterRequest, request: Request, session: Annotated[Session, Depends(get_session)]
):
    limits.consume(session, "register", request.client.host if request.client else "unknown", 5, 3600)
    try:
        return register(session, data)
    except DuplicateEmail:
        raise HTTPException(status_code=409, detail="El correo ya está registrado") from None


@router.post("/login", response_model=TokenPair)
def login_account(data: LoginRequest, request: Request, session: Annotated[Session, Depends(get_session)]):
    subject = f"{request.client.host if request.client else 'unknown'}:{data.email}"
    key = limits.consume(session, "login", subject, 5, 900)
    account = sessions.verify_credentials(session, str(data.email), data.password.get_secret_value())
    limits.reset(session, key)
    return sessions.login(session, account)


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


@me_router.get("/api/v1/me", response_model=AccountResponse)
def me(
    family: Annotated[SessionFamily, Depends(current_family)],
    session: Annotated[Session, Depends(get_session)],
):
    account = session.get(Account, family.account_id)
    profile = session.get(UserProfile, family.account_id)
    return AccountResponse(id=account.id, email=account.email, base_currency=profile.base_currency)
