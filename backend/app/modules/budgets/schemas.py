from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

from app.modules.movements.schemas import MovementCreate


class BudgetUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str
    currency: Literal["COP"] = "COP"

    @field_validator("amount", mode="before")
    @classmethod
    def money(cls, value):
        return MovementCreate.money(value)


class BudgetStatus(BaseModel):
    category_id: UUID
    category_name: str
    limit: str
    spent: str
    remaining: str
    percent: str
    status: Literal["on_track", "warning", "exceeded"]


class BudgetList(BaseModel):
    month: str
    currency: Literal["COP"] = "COP"
    items: list[BudgetStatus]
