"""Recurring category budgets and savings allocations independent of movements."""

import sqlalchemy as sa
from alembic import op

revision = "004_budgets_goals"
down_revision = "003_movements"
branch_labels = None
depends_on = None


def money_checks(table, column):
    checks = [
        sa.CheckConstraint(f"{column} > 0 AND {column} <= 999999999999999.99", name=f"ck_{table}_amount")
    ]
    if op.get_bind().dialect.name == "postgresql":
        checks.append(sa.CheckConstraint(f"{column} = trunc({column}, 2)", name=f"ck_{table}_amount_cents"))
    return checks


def upgrade():
    op.create_table(
        "budgets",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("amount", sa.Numeric(19, 4), nullable=False),
        sa.Column("currency", sa.CHAR(3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("owner_id", "category_id", name="uq_budget_owner_category"),
        sa.CheckConstraint("currency = 'COP'", name="ck_budget_currency"),
        *money_checks("budget", "amount"),
    )
    op.create_index("ix_budgets_owner_id", "budgets", ["owner_id"])
    op.create_table(
        "goals",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(60), nullable=False),
        sa.Column("target_amount", sa.Numeric(19, 4), nullable=False),
        sa.Column("currency", sa.CHAR(3), nullable=False),
        sa.Column("target_date", sa.Date()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("length(trim(name)) BETWEEN 1 AND 60", name="ck_goal_name"),
        sa.CheckConstraint("target_date <= '9998-12-31'", name="ck_goal_date"),
        sa.CheckConstraint("currency = 'COP'", name="ck_goal_currency"),
        *money_checks("goal", "target_amount"),
    )
    op.create_index("ix_goals_owner_id", "goals", ["owner_id"])
    op.create_table(
        "goal_contributions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("goal_id", sa.Uuid(), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(19, 4), nullable=False),
        sa.Column("currency", sa.CHAR(3), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("note", sa.String(140)),
        sa.Column("client_request_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("owner_id", "client_request_id", name="uq_contribution_owner_request"),
        sa.CheckConstraint("currency = 'COP'", name="ck_contribution_currency"),
        sa.CheckConstraint("occurred_on >= '1900-01-01'", name="ck_contribution_date"),
        *money_checks("contribution", "amount"),
    )
    op.create_index("ix_goal_contributions_owner_id", "goal_contributions", ["owner_id"])
    op.create_index("ix_goal_contributions_goal_id", "goal_contributions", ["goal_id"])


def downgrade():
    op.drop_table("goal_contributions")
    op.drop_table("goals")
    op.drop_table("budgets")
