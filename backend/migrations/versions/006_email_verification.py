"""E-mail confirmation: accounts.email_verified_at and one-time confirmation tokens."""

import sqlalchemy as sa
from alembic import op

revision = "006_email_verification"
down_revision = "005_external_identities"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("accounts", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    # Google and Apple only link verified addresses, so accounts that already have a
    # linked identity with the same e-mail are confirmed. Everyone else starts unconfirmed.
    op.execute(
        """
        UPDATE accounts SET email_verified_at = CURRENT_TIMESTAMP
        WHERE EXISTS (
            SELECT 1 FROM external_identities ei
            WHERE ei.account_id = accounts.id AND lower(ei.email) = accounts.email
        )
        """
    )
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("account_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_email_verification_tokens_account_id", "email_verification_tokens", ["account_id"])


def downgrade():
    op.drop_index("ix_email_verification_tokens_account_id", table_name="email_verification_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_column("accounts", "email_verified_at")
