from datetime import date
from decimal import localcontext
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.dashboard.domain import compare_net
from app.modules.dashboard.repository import monthly_snapshot
from app.modules.dashboard.schemas import DashboardSummary
from app.modules.movements.service import out
from app.shared.accounting_dates import accounting_today, month_bounds
from app.shared.money import rounded
from app.shared.time import utcnow


def summary(session: Session, owner: UUID, month: str | None) -> DashboardSummary:
    selected = month if month is not None else accounting_today(utcnow()).strftime("%Y-%m")
    try:
        start, end = month_bounds(selected)
    except ValueError:
        raise HTTPException(422, "Ingresa un mes válido YYYY-MM (1900-01 a 9998-12)") from None
    previous_start = date(start.year - 1, 12, 1) if start.month == 1 else date(start.year, start.month - 1, 1)
    data = monthly_snapshot(session, owner, start, end, previous_start)
    with localcontext() as context:
        context.prec = 38
        net = data.income - data.expense
        previous_net = data.previous_income - data.previous_expense if data.previous_count else None
    return DashboardSummary(
        month=selected,
        income=rounded(data.income),
        expense=rounded(data.expense),
        net=rounded(net),
        comparison=compare_net(net, previous_net),
        recent_movements=[out(row) for row in data.recent],
    )
