from datetime import date, datetime
from uuid import UUID

from sqlalchemy import func, or_, select, tuple_
from sqlalchemy.orm import Session

from app.modules.movements.models import Category, Movement


def categories(session: Session, owner: UUID, movement_type: str | None = None):
    statement = select(Category).where(or_(Category.owner_id.is_(None), Category.owner_id == owner))
    if movement_type:
        statement = statement.where(Category.movement_type == movement_type)
    return session.scalars(statement.order_by(Category.name, Category.id)).all()


def category(session: Session, owner: UUID, category_id: UUID):
    return session.scalar(
        select(Category).where(
            Category.id == category_id, or_(Category.owner_id.is_(None), Category.owner_id == owner)
        )
    )


def movement(session: Session, owner: UUID, movement_id: UUID, *, lock=False, archived=False):
    statement = select(Movement).where(Movement.id == movement_id, Movement.owner_id == owner)
    if not archived:
        statement = statement.where(Movement.deleted_at.is_(None))
    if lock:
        statement = statement.with_for_update()
    return session.scalar(statement)


def request_record(session: Session, owner: UUID, key: UUID):
    return session.scalar(
        select(Movement).where(Movement.owner_id == owner, Movement.client_request_id == key)
    )


def active_month_conditions(owner: UUID, start: date, end: date):
    """Shared read scope for movement lists and the financial dashboard."""
    return (
        Movement.owner_id == owner,
        Movement.deleted_at.is_(None),
        Movement.currency == "COP",
        Movement.occurred_on >= start,
        Movement.occurred_on < end,
    )


ACCENTED, PLAIN = "áéíóúüñ", "aeiouun"


def folded(text: str) -> str:
    """Lowercase without Spanish accents, matching the SQL side of search()."""
    return text.casefold().translate(str.maketrans(ACCENTED, PLAIN))


def search_condition(owner: UUID, query: str):
    """Note or category name contains the query, ignoring case and Spanish accents."""
    escaped = folded(query).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"

    def fold(column):
        return func.translate(func.lower(column), ACCENTED, PLAIN)

    matching_categories = select(Category.id).where(
        or_(Category.owner_id.is_(None), Category.owner_id == owner),
        fold(Category.name).like(pattern, escape="\\"),
    )
    return or_(
        fold(func.coalesce(Movement.note, "")).like(pattern, escape="\\"),
        Movement.category_id.in_(matching_categories),
    )


def page(
    session: Session,
    owner: UUID,
    start: date,
    end: date,
    limit: int,
    movement_type: str | None,
    category_id: UUID | None,
    position: tuple[date, datetime, UUID] | None,
    query: str | None = None,
):
    statement = select(Movement).where(*active_month_conditions(owner, start, end))
    if query:
        statement = statement.where(search_condition(owner, query))
    if movement_type:
        statement = statement.where(Movement.type == movement_type)
    if category_id:
        statement = statement.where(Movement.category_id == category_id)
    if position:
        statement = statement.where(
            tuple_(Movement.occurred_on, Movement.created_at, Movement.id) < tuple_(*position)
        )
    return session.scalars(
        statement.order_by(Movement.occurred_on.desc(), Movement.created_at.desc(), Movement.id.desc()).limit(
            limit + 1
        )
    ).all()
