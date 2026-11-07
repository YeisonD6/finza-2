from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.budgets import service
from app.modules.budgets.schemas import BudgetList, BudgetStatus, BudgetUpsert
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import SessionFamily

router = APIRouter(prefix="/api/v1/budgets", tags=["budgets"])
DB = Annotated[Session, Depends(get_session)]
Family = Annotated[SessionFamily, Depends(current_family)]


@router.get("", response_model=BudgetList)
def budgets(session: DB, family: Family, month: Annotated[str | None, Query(max_length=7)] = None):
    return service.list_statuses(session, family.account_id, month)


@router.put("/{category_id}", response_model=BudgetStatus, responses={201: {"model": BudgetStatus}})
def budget_upsert(category_id: UUID, data: BudgetUpsert, session: DB, family: Family, response: Response):
    result, created = service.upsert(session, family.account_id, category_id, data)
    response.status_code = 201 if created else 200
    return result


@router.delete("/{category_id}", status_code=204)
def budget_delete(category_id: UUID, session: DB, family: Family):
    service.remove(session, family.account_id, category_id)
    return Response(status_code=204)
