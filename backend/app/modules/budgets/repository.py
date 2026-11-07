from datetime import date
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.modules.budgets.models import Budget
from app.modules.movements.models import Category, Movement
from app.modules.movements.repository import active_month_conditions


def budget(session: Session, owner: UUID, category_id: UUID):
    return session.scalar(
        select(Budget).where(Budget.owner_id == owner, Budget.category_id == category_id).with_for_update()
    )


def statuses(session: Session, owner: UUID, start: date, end: date, category_id: UUID | None = None):
    spent = (
        select(Movement.category_id, func.sum(Movement.amount).label("spent"))
        .where(*active_month_conditions(owner, start, end), Movement.type == "expense")
        .group_by(Movement.category_id)
        .subquery()
    )
    total = func.coalesce(spent.c.spent, 0)
    statement = (
        select(Budget, Category.name, total.label("spent"))
        .join(Category, Category.id == Budget.category_id)
        .outerjoin(spent, spent.c.category_id == Budget.category_id)
        .where(Budget.owner_id == owner)
        .order_by((total / Budget.amount).desc(), Category.name.asc())
    )
    if category_id is not None:
        statement = statement.where(Budget.category_id == category_id)
    return session.execute(statement).all()


def remove(session: Session, owner: UUID, category_id: UUID):
    session.execute(delete(Budget).where(Budget.owner_id == owner, Budget.category_id == category_id))
