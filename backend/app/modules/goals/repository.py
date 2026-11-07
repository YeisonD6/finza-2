from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.goals.models import Goal, GoalContribution


def goal(session: Session, owner: UUID, goal_id: UUID, *, lock=False, archived=False):
    statement = select(Goal).where(Goal.owner_id == owner, Goal.id == goal_id)
    if not archived:
        statement = statement.where(Goal.archived_at.is_(None))
    if lock:
        statement = statement.with_for_update()
    return session.scalar(statement)


def progress(session: Session, owner: UUID, goal_id: UUID | None = None):
    saved = (
        select(GoalContribution.goal_id, func.sum(GoalContribution.amount).label("saved"))
        .where(
            GoalContribution.owner_id == owner,
            GoalContribution.deleted_at.is_(None),
            GoalContribution.currency == "COP",
        )
        .group_by(GoalContribution.goal_id)
        .subquery()
    )
    statement = (
        select(Goal, func.coalesce(saved.c.saved, 0).label("saved"))
        .outerjoin(saved, saved.c.goal_id == Goal.id)
        .where(Goal.owner_id == owner, Goal.archived_at.is_(None))
        .order_by(Goal.created_at.asc(), Goal.id.asc())
    )
    if goal_id is not None:
        statement = statement.where(Goal.id == goal_id)
    return session.execute(statement).all()


def contributions(session: Session, owner: UUID, goal_id: UUID):
    return session.scalars(
        select(GoalContribution)
        .where(
            GoalContribution.owner_id == owner,
            GoalContribution.goal_id == goal_id,
            GoalContribution.deleted_at.is_(None),
        )
        .order_by(
            GoalContribution.occurred_on.desc(),
            GoalContribution.created_at.desc(),
            GoalContribution.id.desc(),
        )
    ).all()


def request_record(session: Session, owner: UUID, key: UUID):
    return session.scalar(
        select(GoalContribution).where(
            GoalContribution.owner_id == owner, GoalContribution.client_request_id == key
        )
    )


def contribution(session: Session, owner: UUID, goal_id: UUID, contribution_id: UUID):
    return session.scalar(
        select(GoalContribution)
        .where(
            GoalContribution.owner_id == owner,
            GoalContribution.goal_id == goal_id,
            GoalContribution.id == contribution_id,
        )
        .with_for_update()
    )
