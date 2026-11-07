"""Contributions are savings allocations, not movements: income, expenses and net cash flow never change."""

from decimal import Decimal, localcontext
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.goals import repository as repo
from app.modules.goals.models import Goal, GoalContribution
from app.modules.goals.schemas import ContributionCreate, ContributionOut, GoalCreate, GoalOut, GoalPatch
from app.modules.movements.service import audit
from app.shared.money import rounded
from app.shared.time import utcnow


def out(row):
    record, saved = row
    with localcontext() as context:
        context.prec = 38
        return GoalOut(
            id=record.id,
            name=record.name,
            target_amount=rounded(record.target_amount),
            saved_amount=rounded(saved),
            remaining=rounded(max(record.target_amount - saved, Decimal(0))),
            percent=rounded(min(saved / record.target_amount * 100, Decimal(100))),
            target_date=record.target_date,
            status="completed" if saved >= record.target_amount else "active",
            currency=record.currency,
            created_at=record.created_at,
        )


def contribution_out(record: GoalContribution):
    return ContributionOut(
        id=record.id,
        goal_id=record.goal_id,
        amount=rounded(record.amount),
        currency=record.currency,
        occurred_on=record.occurred_on,
        note=record.note,
        client_request_id=record.client_request_id,
        created_at=record.created_at,
    )


def require_goal(session: Session, owner: UUID, goal_id: UUID, **options):
    record = repo.goal(session, owner, goal_id, **options)
    if record is None:
        raise HTTPException(404, "Recurso no encontrado")
    return record


def list_goals(session: Session, owner: UUID):
    return [out(row) for row in repo.progress(session, owner)]


def get(session: Session, owner: UUID, goal_id: UUID):
    rows = repo.progress(session, owner, goal_id)
    if not rows:
        raise HTTPException(404, "Recurso no encontrado")
    return out(rows[0])


def create(session: Session, owner: UUID, data: GoalCreate):
    record = Goal(owner_id=owner, **{**data.model_dump(), "target_amount": Decimal(data.target_amount)})
    session.add(record)
    session.flush()
    audit(session, owner, "goal_created", "goal", record.id)
    result = out((record, Decimal(0)))
    session.commit()
    return result


def edit(session: Session, owner: UUID, goal_id: UUID, data: GoalPatch):
    record = require_goal(session, owner, goal_id, lock=True)
    changes = data.model_dump(exclude_unset=True)
    if "target_amount" in changes:
        changes["target_amount"] = Decimal(changes["target_amount"])
    if any(getattr(record, key) != value for key, value in changes.items()):
        for key, value in changes.items():
            setattr(record, key, value)
        record.updated_at = utcnow()
        audit(session, owner, "goal_updated", "goal", record.id)
    result = get(session, owner, goal_id)
    session.commit()
    return result


def archive(session: Session, owner: UUID, goal_id: UUID):
    record = require_goal(session, owner, goal_id, lock=True, archived=True)
    if record.archived_at is None:
        record.archived_at = utcnow()
        record.updated_at = record.archived_at
        audit(session, owner, "goal_archived", "goal", record.id)
    session.commit()


def list_contributions(session: Session, owner: UUID, goal_id: UUID):
    require_goal(session, owner, goal_id)
    return [contribution_out(record) for record in repo.contributions(session, owner, goal_id)]


def add_contribution(session: Session, owner: UUID, goal_id: UUID, data: ContributionCreate):
    # Lock the owning goal before checking retries, inserting or auditing, so archiving
    # and concurrent contributions serialize in the same transaction as ownership.
    require_goal(session, owner, goal_id, lock=True)

    def replay(record):
        if (record.goal_id, record.amount, record.currency, record.occurred_on, record.note) != (
            goal_id,
            Decimal(data.amount),
            data.currency,
            data.occurred_on,
            data.note,
        ):
            raise HTTPException(409, "Esta clave de solicitud ya se usó con otro contenido")
        return contribution_out(record), True

    existing = repo.request_record(session, owner, data.client_request_id)
    if existing is not None:
        return replay(existing)
    record = GoalContribution(
        owner_id=owner, goal_id=goal_id, **{**data.model_dump(), "amount": Decimal(data.amount)}
    )
    session.add(record)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        require_goal(session, owner, goal_id, lock=True)
        existing = repo.request_record(session, owner, data.client_request_id)
        if existing is not None:
            return replay(existing)
        raise
    audit(session, owner, "contribution_created", "goal_contribution", record.id)
    result = contribution_out(record)
    session.commit()
    return result, False


def delete_contribution(session: Session, owner: UUID, goal_id: UUID, contribution_id: UUID):
    require_goal(session, owner, goal_id, lock=True)
    record = repo.contribution(session, owner, goal_id, contribution_id)
    if record is None:
        raise HTTPException(404, "Recurso no encontrado")
    if record.deleted_at is None:
        record.deleted_at = utcnow()
        audit(session, owner, "contribution_deleted", "goal_contribution", record.id)
    session.commit()
