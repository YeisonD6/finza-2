from datetime import date, datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("movement_type IN ('income', 'expense')", name="ck_category_type"),
        CheckConstraint(
            "(is_system AND owner_id IS NULL) OR (NOT is_system AND owner_id IS NOT NULL)",
            name="ck_category_owner",
        ),
        UniqueConstraint("owner_id", "name_key", "movement_type", name="uq_category_owner_name_type"),
        Index(
            "uq_category_system_name_type",
            "name_key",
            "movement_type",
            unique=True,
            postgresql_where=text("owner_id IS NULL"),
        ),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    name_key: Mapped[str] = mapped_column(Text, nullable=False)
    movement_type: Mapped[str] = mapped_column(String(10), nullable=False)
    is_system: Mapped[bool] = mapped_column(nullable=False, default=False)


class Movement(Base):
    __tablename__ = "movements"
    __table_args__ = (
        UniqueConstraint("owner_id", "client_request_id", name="uq_movement_owner_request"),
        CheckConstraint("type IN ('income', 'expense')", name="ck_movement_type"),
        CheckConstraint("currency = 'COP'", name="ck_movement_currency"),
        CheckConstraint(
            "amount > 0 AND amount <= 999999999999999.99 AND amount = trunc(amount, 2)",
            name="ck_movement_amount",
        ),
        CheckConstraint("occurred_on >= DATE '1900-01-01'", name="ck_movement_date"),
        Index("ix_movements_owner_order", "owner_id", "occurred_on", "created_at", "id"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    category_id: Mapped[UUID] = mapped_column(ForeignKey("categories.id"), nullable=False)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    client_request_id: Mapped[UUID] = mapped_column(Uuid, nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    creation_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
