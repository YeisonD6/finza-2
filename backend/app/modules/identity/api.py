from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.identity.schemas import AccountResponse, RegisterRequest
from app.modules.identity.service import DuplicateEmail, register

router = APIRouter(prefix="/api/v1/auth", tags=["identity"])


@router.post("/register", response_model=AccountResponse, status_code=201)
def register_account(data: RegisterRequest, session: Annotated[Session, Depends(get_session)]):
    try:
        return register(session, data)
    except DuplicateEmail:
        raise HTTPException(status_code=409, detail="El correo ya está registrado") from None
