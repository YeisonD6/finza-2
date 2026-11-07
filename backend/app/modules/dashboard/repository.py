"""Read-only projection; one SQL statement gives totals and rows the same snapshot."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select, true
from sqlalchemy.orm import Session, aliased

from app.modules.movements.models import Category, Movement
from app.modules.movements.repository import active_month_conditions


@dataclass
class MonthlySnapshot:
    income: Decimal
    expense: Decimal
    previous_income: Decimal
    previous_expense: Decimal
    previous_count: int
    recent: list[Movement]


def expense_by_category(session: Session, owner: UUID, start: date, end: date):
    total = func.sum(Movement.amount).label("total")
    return session.execute(
        select(Category.id, Category.name, total)
        .join(Movement, Movement.category_id == Category.id)
        .where(*active_month_conditions(owner, start, end), Movement.type == "expense")
        .group_by(Category.id, Category.name)
        .order_by(total.desc(), Category.name.asc())
    ).all()


def monthly_snapshot(session: Session, owner: UUID, start: date, end: date, previous_start: date):
    def total(kind: str, current: bool):
        period = Movement.occurred_on >= start if current else Movement.occurred_on < start
        return func.coalesce(func.sum(Movement.amount).filter(Movement.type == kind, period), 0)

    totals = (
        select(
            total("income", True).label("income"),
            total("expense", True).label("expense"),
            total("income", False).label("previous_income"),
            total("expense", False).label("previous_expense"),
            func.count().filter(Movement.occurred_on < start).label("previous_count"),
        )
        .where(*active_month_conditions(owner, previous_start, end))
        .cte("totals")
    )
    latest = aliased(
        Movement,
        select(Movement)
        .where(*active_month_conditions(owner, start, end))
        .order_by(Movement.occurred_on.desc(), Movement.created_at.desc(), Movement.id.desc())
        .limit(5)
        .subquery("latest"),
    )
    # Outer join keeps the aggregate row even when the requested month is empty.
    rows = session.execute(
        select(totals, latest)
        .select_from(totals)
        .outerjoin(latest, true())
        .order_by(latest.occurred_on.desc(), latest.created_at.desc(), latest.id.desc())
    ).all()
    first = rows[0]
    return MonthlySnapshot(
        income=first.income,
        expense=first.expense,
        previous_income=first.previous_income,
        previous_expense=first.previous_expense,
        previous_count=first.previous_count,
        recent=[row[-1] for row in rows if row[-1] is not None],
    )
