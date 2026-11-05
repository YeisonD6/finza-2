"""Lockable session families and distributed auth limits."""

import sqlalchemy as sa
from alembic import op

revision = "002_sessions"
down_revision = "001_identity"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "session_families",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("account_id", sa.Uuid(), sa.ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_session_families_account_id", "session_families", ["account_id"])
    op.execute(
        "INSERT INTO session_families (id, account_id, expires_at) SELECT family_id, account_id, min(expires_at) FROM refresh_sessions GROUP BY family_id, account_id"
    )
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("refresh_sessions") as batch_op:
            batch_op.create_foreign_key(
                "fk_refresh_family", "session_families", ["family_id"], ["id"], ondelete="CASCADE"
            )
    else:
        op.create_foreign_key(
            "fk_refresh_family", "refresh_sessions", "session_families", ["family_id"], ["id"], ondelete="CASCADE"
        )
    op.create_table(
        "auth_buckets",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_auth_buckets_expires_at", "auth_buckets", ["expires_at"])


def downgrade():
    op.drop_table("auth_buckets")
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("refresh_sessions") as batch_op:
            batch_op.drop_constraint("fk_refresh_family", type_="foreignkey")
    else:
        op.drop_constraint("fk_refresh_family", "refresh_sessions", type_="foreignkey")
    op.drop_table("session_families")
