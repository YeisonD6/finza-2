"""Schema revisions will be added alongside their owning modules."""

import os

from alembic import context
from sqlalchemy import create_engine

from app.core.models import Base
from app.modules.audit.models import AuditEvent  # noqa: F401
from app.modules.identity.models import Account, RefreshSession  # noqa: F401
from app.modules.movements.models import Category, Movement  # noqa: F401
from app.modules.users.models import UserProfile  # noqa: F401

metadata = Base.metadata
url = os.environ["DATABASE_URL"]
if context.is_offline_mode():
    context.configure(url=url, target_metadata=metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
