import base64
import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.audit.models import AuditEvent
from app.modules.movements import repository as repo
from app.modules.movements.models import Category, Movement
from app.modules.movements.schemas import CategoryCreate, MovementCreate, MovementOut, MovementPatch
from app.shared.accounting_dates import accounting_today, month_bounds
from app.shared.money import rounded
from app.shared.time import utcnow


def out(record: Movement) -> MovementOut:
    return MovementOut(
        id=record.id,
        type=record.type,
        amount=rounded(record.amount),
        currency=record.currency,
        category_id=record.category_id,
        occurred_on=record.occurred_on,
        note=record.note,
        client_request_id=record.client_request_id,
    )


def audit(session: Session, owner: UUID, kind: str, resource: str, resource_id: UUID):
    session.add(AuditEvent(actor_id=owner, event_type=kind, resource_type=resource, resource_id=resource_id))


def require_category(session: Session, owner: UUID, category_id: UUID, movement_type: str | None = None):
    category = repo.category(session, owner, category_id)
    if not category:
        raise HTTPException(404, "Recurso no encontrado")
    if movement_type and category.movement_type != movement_type:
        raise HTTPException(422, "La categoría no corresponde al tipo de movimiento")
    return category


def create_category(session: Session, owner: UUID, data: CategoryCreate):
    record = Category(
        owner_id=owner,
        name=data.name,
        name_key=data.name.casefold(),
        movement_type=data.movement_type,
        is_system=False,
    )
    session.add(record)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(409, "Ya existe una categoría con ese nombre y tipo") from None
    audit(session, owner, "category_created", "category", record.id)
    session.commit()
    return record


def create(session: Session, owner: UUID, data: MovementCreate):
    payload = data.model_dump(mode="json", exclude={"client_request_id"})
    fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

    def replay(record):
        if record.request_hash != fingerprint:
            raise HTTPException(409, "Esta clave de solicitud ya se usó con otro contenido")
        return MovementOut.model_validate(record.creation_snapshot), True

    existing = repo.request_record(session, owner, data.client_request_id)
    if existing:
        return replay(existing)
    require_category(session, owner, data.category_id, data.type)
    record = Movement(
        id=uuid4(),
        owner_id=owner,
        type=data.type,
        amount=Decimal(data.amount),
        currency=data.currency,
        occurred_on=data.occurred_on,
        category_id=data.category_id,
        note=data.note,
        client_request_id=data.client_request_id,
        request_hash=fingerprint,
    )
    result = out(record)
    record.creation_snapshot = result.model_dump(mode="json")
    session.add(record)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        existing = repo.request_record(session, owner, data.client_request_id)
        if existing:
            return replay(existing)
        raise
    audit(session, owner, "movement_created", "movement", record.id)
    session.commit()
    return result, False


def get(session: Session, owner: UUID, movement_id: UUID, **options):
    record = repo.movement(session, owner, movement_id, **options)
    if not record:
        raise HTTPException(404, "Recurso no encontrado")
    return record


def edit(session: Session, owner: UUID, movement_id: UUID, data: MovementPatch):
    record = get(session, owner, movement_id, lock=True)
    changes = data.model_dump(exclude_unset=True)
    require_category(
        session, owner, changes.get("category_id", record.category_id), changes.get("type", record.type)
    )
    if "amount" in changes:
        changes["amount"] = Decimal(changes["amount"])
    changed = any(getattr(record, key) != value for key, value in changes.items())
    if changed:
        for key, value in changes.items():
            setattr(record, key, value)
        record.updated_at = utcnow()
        audit(session, owner, "movement_updated", "movement", record.id)
    result = out(record)
    session.commit()
    return result


def archive(session: Session, owner: UUID, movement_id: UUID):
    record = get(session, owner, movement_id, lock=True, archived=True)
    if not record.deleted_at:
        record.deleted_at = utcnow()
        record.updated_at = record.deleted_at
        audit(session, owner, "movement_archived", "movement", record.id)
    session.commit()


def list_page(
    session: Session,
    owner: UUID,
    month: str | None,
    limit: int,
    movement_type: str | None,
    category_id: UUID | None,
    cursor: str | None,
    query: str | None = None,
):
    query = (query or "").strip() or None
    month = month if month is not None else accounting_today(utcnow()).strftime("%Y-%m")
    try:
        start, end = month_bounds(month)
    except ValueError:
        raise HTTPException(422, "El mes debe tener formato YYYY-MM válido") from None
    if category_id:
        require_category(session, owner, category_id)
    context = [str(owner), month, movement_type, str(category_id) if category_id else None]
    if query:
        context.append(query)
    position = None
    if cursor:
        try:
            value = json.loads(base64.urlsafe_b64decode(cursor))
            if value["context"] != context:
                raise ValueError("Cursor context mismatch")
            if not all(isinstance(value[key], str) for key in ("date", "created", "id")):
                raise ValueError("Malformed cursor position")
            position = (
                date.fromisoformat(value["date"]),
                datetime.fromisoformat(value["created"]),
                UUID(value["id"]),
            )
            if position[1].utcoffset() is None:
                raise ValueError("Timezone required")
        except (ValueError, TypeError, KeyError, UnicodeError):
            raise HTTPException(422, "Cursor inválido para estos filtros") from None
    rows = repo.page(session, owner, start, end, limit, movement_type, category_id, position, query)
    items = rows[:limit]
    next_cursor = None
    if len(rows) > limit:
        last = items[-1]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps(
                {
                    "context": context,
                    "date": last.occurred_on.isoformat(),
                    "created": last.created_at.isoformat(),
                    "id": str(last.id),
                }
            ).encode()
        ).decode()
    return {"items": [out(record) for record in items], "next_cursor": next_cursor, "month": month}
