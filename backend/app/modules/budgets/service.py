from decimal import Decimal, localcontext
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.budgets import repository as repo
from app.modules.budgets.models import Budget
from app.modules.budgets.schemas import BudgetList, BudgetStatus, BudgetUpsert
from app.modules.movements.service import require_category
from app.shared.accounting_dates import accounting_today, month_bounds
from app.shared.money import rounded
from app.shared.time import utcnow


def selected_month(month: str | None):
    selected = month if month is not None else accounting_today(utcnow()).strftime("%Y-%m")
    try:
        start, end = month_bounds(selected)
    except ValueError:
        raise HTTPException(422, "Ingresa un mes válido YYYY-MM (1900-01 a 9998-12)") from None
    return selected, start, end


def out(row):
    record, name, spent = row
    with localcontext() as context:
        context.prec = 38
        percent = spent / record.amount * 100
        return BudgetStatus(
            category_id=record.category_id,
            category_name=name,
            limit=rounded(record.amount),
            spent=rounded(spent),
            remaining=rounded(record.amount - spent),
            percent=rounded(percent),
            status="on_track" if percent < 80 else "warning" if percent <= 100 else "exceeded",
        )


def list_statuses(session: Session, owner: UUID, month: str | None):
    selected, start, end = selected_month(month)
    return BudgetList(month=selected, items=[out(row) for row in repo.statuses(session, owner, start, end)])


def upsert(session: Session, owner: UUID, category_id: UUID, data: BudgetUpsert):
    require_category(session, owner, category_id, "expense")
    record = repo.budget(session, owner, category_id)
    created = record is None
    if created:
        record = Budget(
            owner_id=owner, category_id=category_id, amount=Decimal(data.amount), currency=data.currency
        )
        session.add(record)
        try:
            session.flush()
        except IntegrityError:
            session.rollback()
            require_category(session, owner, category_id, "expense")
            record = repo.budget(session, owner, category_id)
            if record is None:
                raise
            created = False
    if not created:
        record.amount = Decimal(data.amount)
        record.updated_at = utcnow()
    session.flush()
    _, start, end = selected_month(None)
    result = out(repo.statuses(session, owner, start, end, category_id)[0])
    session.commit()
    return result, created


def remove(session: Session, owner: UUID, category_id: UUID):
    require_category(session, owner, category_id, "expense")
    repo.remove(session, owner, category_id)
    session.commit()
