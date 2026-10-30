from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.identity.models import Account
from app.modules.identity.schemas import AccountResponse, RegisterRequest
from app.modules.users.models import UserProfile


class DuplicateEmail(Exception):
    pass


def register(session: Session, data: RegisterRequest) -> AccountResponse:
    account = Account(email=str(data.email), password_hash=hash_password(data.password.get_secret_value()))
    try:
        session.add(account)
        session.flush()
        session.add(UserProfile(account_id=account.id, base_currency="COP", locale="es-CO"))
        session.flush()
        result = AccountResponse(id=account.id, email=account.email, base_currency="COP")
        session.commit()
        return result
    except IntegrityError as exc:
        session.rollback()
        # Only PostgreSQL unique violation on email (or SQLite test equivalent).
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
        if constraint == "accounts_email_key" or "accounts.email" in str(exc.orig):
            raise DuplicateEmail from None
        raise
