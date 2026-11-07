from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.modules.movements.schemas import MovementOut


class DashboardComparison(BaseModel):
    delta: str | None
    percent: str | None
    reason: Literal["comparable", "zero_baseline", "negative_baseline", "no_previous_data"]


class ExpenseByCategory(BaseModel):
    category_id: UUID
    name: str
    total: str
    share_percent: str


class DashboardSummary(BaseModel):
    month: str
    currency: Literal["COP"] = "COP"
    income: str
    expense: str
    net: str
    comparison: DashboardComparison
    recent_movements: list[MovementOut]
    expense_by_category: list[ExpenseByCategory] = Field(default_factory=list)
