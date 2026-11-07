import re
from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.movements.schemas import MovementCreate, valid_date
from app.shared.accounting_dates import accounting_today
from app.shared.time import utcnow


def target_date_value(value):
    if value is None:
        return None
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Usa una fecha YYYY-MM-DD")
    result = date.fromisoformat(value)
    if not accounting_today(utcnow()) <= result <= date(9998, 12, 31):
        raise ValueError("La fecha objetivo debe estar entre hoy en Colombia y 9998-12-31")
    return result


class GoalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=60)
    target_amount: str
    currency: Literal["COP"] = "COP"
    target_date: date | None = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("target_amount", mode="before")
    @classmethod
    def money(cls, value):
        return MovementCreate.money(value)

    @field_validator("target_date", mode="before")
    @classmethod
    def target(cls, value):
        return target_date_value(value)


class GoalPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=1, max_length=60)
    target_amount: str | None = None
    target_date: date | None = None

    @model_validator(mode="before")
    @classmethod
    def not_empty_or_null(cls, values):
        if (
            not isinstance(values, dict)
            or not values
            or any(value is None and key != "target_date" for key, value in values.items())
        ):
            raise ValueError("Envía al menos un campo; solo target_date admite null")
        return values

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, value):
        return GoalCreate.clean_name(value)

    @field_validator("target_amount", mode="before")
    @classmethod
    def money(cls, value):
        return MovementCreate.money(value)

    @field_validator("target_date", mode="before")
    @classmethod
    def target(cls, value):
        return target_date_value(value)


class GoalOut(BaseModel):
    id: UUID
    name: str
    target_amount: str
    saved_amount: str
    remaining: str
    percent: str
    target_date: date | None
    status: Literal["active", "completed"]
    currency: Literal["COP"]
    created_at: datetime


class ContributionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: str
    currency: Literal["COP"] = "COP"
    occurred_on: date
    note: str | None = Field(default=None, max_length=140)
    client_request_id: UUID

    @field_validator("amount", mode="before")
    @classmethod
    def money(cls, value):
        return MovementCreate.money(value)

    @field_validator("occurred_on", mode="before")
    @classmethod
    def accounting_date(cls, value):
        return valid_date(value)


class ContributionOut(BaseModel):
    id: UUID
    goal_id: UUID
    amount: str
    currency: Literal["COP"]
    occurred_on: date
    note: str | None
    client_request_id: UUID
    created_at: datetime
