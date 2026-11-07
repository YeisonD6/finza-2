"""Schema revisions will be added alongside their owning modules."""

import os
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine

from app.core.database import _connect_args
from app.core.models import Base
from app.modules.audit.models import AuditEvent  # noqa: F401
from app.modules.budgets.models import Budget  # noqa: F401
from app.modules.goals.models import Goal, GoalContribution  # noqa: F401
from app.modules.identity.models import Account, RefreshSession  # noqa: F401
from app.modules.movements.models import Category, Movement  # noqa: F401
from app.modules.users.models import UserProfile  # noqa: F401


def _load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())


_load_env()

metadata = Base.metadata
url = os.environ.get("DATABASE_URL", "sqlite+pysqlite:///./finza_dev.db")
if context.is_offline_mode():
    context.configure(url=url, target_metadata=metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url, connect_args=_connect_args(url))
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=metadata,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
