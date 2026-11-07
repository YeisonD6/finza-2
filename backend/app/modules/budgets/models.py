from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import CHAR, CheckConstraint, DateTime, ForeignKey, Numeric, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("owner_id", "category_id", name="uq_budget_owner_category"),
        CheckConstraint("amount > 0 AND amount <= 999999999999999.99", name="ck_budget_amount"),
        CheckConstraint("amount = trunc(amount, 2)", name="ck_budget_amount_cents").ddl_if(
            dialect="postgresql"
        ),
        CheckConstraint("currency = 'COP'", name="ck_budget_currency"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[UUID] = mapped_column(ForeignKey("categories.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(19, 4))
    currency: Mapped[str] = mapped_column(CHAR(3))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
