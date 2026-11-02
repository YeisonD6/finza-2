from typing import Literal

from pydantic import BaseModel

from app.modules.movements.schemas import MovementOut


class DashboardComparison(BaseModel):
    delta: str | None
    percent: str | None
    reason: Literal["comparable", "zero_baseline", "negative_baseline", "no_previous_data"]


class DashboardSummary(BaseModel):
    month: str
    currency: Literal["COP"] = "COP"
    income: str
    expense: str
    net: str
    comparison: DashboardComparison
    recent_movements: list[MovementOut]
