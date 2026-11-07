"""Google/Apple identities, password-less accounts and password reset tokens."""

import sqlalchemy as sa
from alembic import op

revision = "005_external_identities"
down_revision = "004_budgets_goals"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("accounts") as batch:
        batch.alter_column("password_hash", existing_type=sa.String(512), nullable=True)
    op.create_table(
        "external_identities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("account_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "subject", name="uq_external_identities_provider_subject"),
        sa.CheckConstraint("provider IN ('google', 'apple')", name="ck_external_identities_provider"),
    )
    op.create_index("ix_external_identities_account_id", "external_identities", ["account_id"])
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("account_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_password_reset_tokens_account_id", "password_reset_tokens", ["account_id"])


def downgrade():
    op.drop_index("ix_password_reset_tokens_account_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_index("ix_external_identities_account_id", table_name="external_identities")
    op.drop_table("external_identities")
    # Password-less accounts cannot satisfy NOT NULL; refuse instead of inventing hashes.
    if op.get_bind().execute(sa.text("SELECT count(*) FROM accounts WHERE password_hash IS NULL")).scalar():
        raise RuntimeError(
            "Hay cuentas sin contraseña (Google/Apple); no se puede revertir 005 sin perderlas"
        )
    with op.batch_alter_table("accounts") as batch:
        batch.alter_column("password_hash", existing_type=sa.String(512), nullable=False)
