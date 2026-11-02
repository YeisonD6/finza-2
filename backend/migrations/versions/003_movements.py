"""COP movements, categories, immutable creation receipts and minimal audit."""

from uuid import UUID

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "003_movements"
down_revision = "002_sessions"
branch_labels = None
depends_on = None


def upgrade():
    categories = op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE")),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("name_key", sa.Text(), nullable=False),
        sa.Column("movement_type", sa.String(10), nullable=False),
        sa.Column("is_system", sa.Boolean(), nullable=False),
        sa.CheckConstraint("movement_type IN ('income', 'expense')", name="ck_category_type"),
        sa.CheckConstraint(
            "(is_system AND owner_id IS NULL) OR (NOT is_system AND owner_id IS NOT NULL)",
            name="ck_category_owner",
        ),
        sa.UniqueConstraint("owner_id", "name_key", "movement_type", name="uq_category_owner_name_type"),
    )
    op.create_index("ix_categories_owner_id", "categories", ["owner_id"])
    op.create_index(
        "uq_category_system_name_type",
        "categories",
        ["name_key", "movement_type"],
        unique=True,
        postgresql_where=sa.text("owner_id IS NULL"),
    )
    names = [
        ("Salario", "income"),
        ("Otros ingresos", "income"),
        ("Alimentación", "expense"),
        ("Transporte", "expense"),
        ("Servicios", "expense"),
        ("Otros gastos", "expense"),
    ]
    op.bulk_insert(
        categories,
        [
            {
                "id": UUID(int=i + 100),
                "owner_id": None,
                "name": name,
                "name_key": name.casefold(),
                "movement_type": kind,
                "is_system": True,
            }
            for i, (name, kind) in enumerate(names)
        ],
    )
    op.create_table(
        "movements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("amount", sa.Numeric(19, 4), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("note", sa.String(500), nullable=False),
        sa.Column("client_request_id", sa.Uuid(), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("creation_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("owner_id", "client_request_id", name="uq_movement_owner_request"),
        sa.CheckConstraint("type IN ('income', 'expense')", name="ck_movement_type"),
        sa.CheckConstraint("currency = 'COP'", name="ck_movement_currency"),
        sa.CheckConstraint(
            "amount > 0 AND amount <= 999999999999999.99 AND amount = trunc(amount, 2)",
            name="ck_movement_amount",
        ),
        sa.CheckConstraint("occurred_on >= DATE '1900-01-01'", name="ck_movement_date"),
    )
    op.create_index("ix_movements_owner_order", "movements", ["owner_id", "occurred_on", "created_at", "id"])
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(40), nullable=False),
        sa.Column("resource_type", sa.String(30), nullable=False),
        sa.Column("resource_id", sa.Uuid(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_events_actor_id", "audit_events", ["actor_id"])


def downgrade():
    op.drop_table("audit_events")
    op.drop_table("movements")
    op.drop_table("categories")
