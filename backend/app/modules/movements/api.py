from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import SessionFamily
from app.modules.movements import repository, service
from app.modules.movements.schemas import (
    CategoryCreate,
    CategoryOut,
    MovementCreate,
    MovementOut,
    MovementPage,
    MovementPatch,
    MovementType,
)

router = APIRouter(prefix="/api/v1", tags=["movements"])
DB = Annotated[Session, Depends(get_session)]
Family = Annotated[SessionFamily, Depends(current_family)]


@router.get("/categories", response_model=list[CategoryOut])
def categories(session: DB, family: Family, type: MovementType | None = None):
    return repository.categories(session, family.account_id, type)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def category_create(data: CategoryCreate, session: DB, family: Family):
    return service.create_category(session, family.account_id, data)


@router.get("/movements", response_model=MovementPage)
def movements(
    session: DB,
    family: Family,
    month: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    type: MovementType | None = None,
    category_id: UUID | None = None,
    cursor: Annotated[str | None, Query(max_length=1024)] = None,
    q: Annotated[str | None, Query(max_length=80, description="Busca en nota o categoría")] = None,
):
    return service.list_page(session, family.account_id, month, limit, type, category_id, cursor, q)


@router.post("/movements", response_model=MovementOut, status_code=201)
def movement_create(data: MovementCreate, session: DB, family: Family, response: Response):
    result, replay = service.create(session, family.account_id, data)
    if replay:
        response.status_code = 200
        response.headers["Idempotent-Replayed"] = "true"
    return result


@router.get("/movements/{movement_id}", response_model=MovementOut)
def movement_get(movement_id: UUID, session: DB, family: Family):
    return service.out(service.get(session, family.account_id, movement_id))


@router.patch("/movements/{movement_id}", response_model=MovementOut)
def movement_edit(movement_id: UUID, data: MovementPatch, session: DB, family: Family):
    return service.edit(session, family.account_id, movement_id, data)


@router.delete("/movements/{movement_id}", status_code=204)
def movement_archive(movement_id: UUID, session: DB, family: Family):
    service.archive(session, family.account_id, movement_id)
    return Response(status_code=204)
