import re
from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.shared.accounting_dates import accounting_today
from app.shared.money import parse_amount, rounded
from app.shared.time import utcnow

MovementType = Literal["income", "expense"]


class CategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=60)
    movement_type: MovementType


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    movement_type: MovementType
    is_system: bool


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        raise ValueError("Usa una fecha YYYY-MM-DD")
    result = date.fromisoformat(value)
    if not date(1900, 1, 1) <= result <= accounting_today(utcnow()):
        raise ValueError("La fecha debe estar entre 1900-01-01 y hoy en Colombia")
    return result


class MovementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: MovementType
    amount: str
    currency: Literal["COP"] = "COP"
    occurred_on: date
    category_id: UUID
    note: str = Field(default="", max_length=500)
    client_request_id: UUID

    @field_validator("amount", mode="before")
    @classmethod
    def money(cls, value):
        try:
            return rounded(parse_amount(value))
        except ValueError:
            raise ValueError(
                "El monto debe ser mayor que $0, con máximo dos decimales y 15 dígitos enteros"
            ) from None

    @field_validator("occurred_on", mode="before")
    @classmethod
    def accounting_date(cls, value):
        return valid_date(value)


class MovementPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: MovementType | None = None
    amount: str | None = None
    currency: Literal["COP"] | None = None
    occurred_on: date | None = None
    category_id: UUID | None = None
    note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="before")
    @classmethod
    def not_empty_or_null(cls, values):
        if not isinstance(values, dict) or not values or any(v is None for v in values.values()):
            raise ValueError("Envía al menos un campo; no se permiten valores nulos")
        return values

    @field_validator("amount", mode="before")
    @classmethod
    def money(cls, value):
        return MovementCreate.money(value)

    @field_validator("occurred_on", mode="before")
    @classmethod
    def accounting_date(cls, value):
        return valid_date(value)


class MovementOut(BaseModel):
    id: UUID
    type: MovementType
    amount: str
    currency: Literal["COP"]
    category_id: UUID
    occurred_on: date
    note: str
    client_request_id: UUID


class MovementPage(BaseModel):
    items: list[MovementOut]
    next_cursor: str | None
    month: str
