from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    __table_args__ = (CheckConstraint("base_currency = 'COP'", name="ck_profiles_currency_cop"),)
    account_id: Mapped[UUID] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="COP")
    locale: Mapped[str] = mapped_column(String(20), nullable=False, server_default="es-CO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
