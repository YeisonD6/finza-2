from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CHAR,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base


class Goal(Base):
    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("length(trim(name)) BETWEEN 1 AND 60", name="ck_goal_name"),
        CheckConstraint("target_amount > 0 AND target_amount <= 999999999999999.99", name="ck_goal_amount"),
        CheckConstraint("target_amount = trunc(target_amount, 2)", name="ck_goal_amount_cents").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("currency = 'COP'", name="ck_goal_currency"),
        CheckConstraint("target_date <= '9998-12-31'", name="ck_goal_date"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    target_amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    currency: Mapped[str] = mapped_column(CHAR(3))
    target_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GoalContribution(Base):
    __tablename__ = "goal_contributions"
    __table_args__ = (
        UniqueConstraint("owner_id", "client_request_id", name="uq_contribution_owner_request"),
        CheckConstraint("amount > 0 AND amount <= 999999999999999.99", name="ck_contribution_amount"),
        CheckConstraint("amount = trunc(amount, 2)", name="ck_contribution_amount_cents").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("currency = 'COP'", name="ck_contribution_currency"),
        CheckConstraint("occurred_on >= '1900-01-01'", name="ck_contribution_date"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    goal_id: Mapped[UUID] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    currency: Mapped[str] = mapped_column(CHAR(3))
    occurred_on: Mapped[date] = mapped_column(Date)
    note: Mapped[str | None] = mapped_column(String(140))
    client_request_id: Mapped[UUID] = mapped_column(Uuid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
