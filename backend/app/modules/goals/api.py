from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.modules.goals import service
from app.modules.goals.schemas import ContributionCreate, ContributionOut, GoalCreate, GoalOut, GoalPatch
from app.modules.identity.dependencies import current_family
from app.modules.identity.models import SessionFamily

router = APIRouter(prefix="/api/v1/goals", tags=["goals"])
DB = Annotated[Session, Depends(get_session)]
Family = Annotated[SessionFamily, Depends(current_family)]


@router.get("", response_model=list[GoalOut])
def goals(session: DB, family: Family):
    return service.list_goals(session, family.account_id)


@router.post("", response_model=GoalOut, status_code=201)
def goal_create(data: GoalCreate, session: DB, family: Family):
    return service.create(session, family.account_id, data)


@router.get("/{goal_id}", response_model=GoalOut)
def goal_get(goal_id: UUID, session: DB, family: Family):
    return service.get(session, family.account_id, goal_id)


@router.patch("/{goal_id}", response_model=GoalOut)
def goal_edit(goal_id: UUID, data: GoalPatch, session: DB, family: Family):
    return service.edit(session, family.account_id, goal_id, data)


@router.delete("/{goal_id}", status_code=204)
def goal_archive(goal_id: UUID, session: DB, family: Family):
    service.archive(session, family.account_id, goal_id)
    return Response(status_code=204)


@router.get("/{goal_id}/contributions", response_model=list[ContributionOut])
def goal_contributions(goal_id: UUID, session: DB, family: Family):
    return service.list_contributions(session, family.account_id, goal_id)


@router.post(
    "/{goal_id}/contributions",
    response_model=ContributionOut,
    status_code=201,
    responses={200: {"model": ContributionOut}},
)
def contribution_create(
    goal_id: UUID, data: ContributionCreate, session: DB, family: Family, response: Response
):
    result, replay = service.add_contribution(session, family.account_id, goal_id, data)
    if replay:
        response.status_code = 200
        response.headers["Idempotent-Replayed"] = "true"
    return result


@router.delete("/{goal_id}/contributions/{contribution_id}", status_code=204)
def contribution_delete(goal_id: UUID, contribution_id: UUID, session: DB, family: Family):
    service.delete_contribution(session, family.account_id, goal_id, contribution_id)
    return Response(status_code=204)
