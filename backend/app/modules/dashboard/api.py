from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.dashboard.schemas import DashboardSummary
from app.modules.dashboard.service import summary
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import SessionFamily

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    session: Annotated[Session, Depends(get_session)],
    family: Annotated[SessionFamily, Depends(current_family)],
    month: Annotated[str | None, Query(max_length=7)] = None,
):
    return summary(session, family.account_id, month)
