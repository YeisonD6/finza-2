from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.identity.sessions import active_family
from app.modules.identity.tokens import decode_access

bearer = HTTPBearer(auto_error=False)


def current_family(
    session: Annotated[Session, Depends(get_session)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    if credentials is None:
        raise HTTPException(401, "Se requiere iniciar sesión", headers={"WWW-Authenticate": "Bearer"})
    account_id, family_id = decode_access(credentials.credentials)
    return active_family(session, account_id, family_id)
