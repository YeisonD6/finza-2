import os
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


def _connect_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"timeout": 3}
    return {"connect_timeout": 3}


@lru_cache(maxsize=4)
def get_engine(url: str):
    return create_engine(url, pool_pre_ping=True, connect_args=_connect_args(url))


def get_session():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    try:
        with Session(get_engine(url)) as session:
            yield session
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Base de datos no disponible") from None


def database_ready(url: str | None) -> bool:
    if not url:
        return False
    engine = None
    try:
        engine = create_engine(url, connect_args=_connect_args(url))
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except (SQLAlchemyError, ValueError):
        return False
    finally:
        if engine is not None:
            engine.dispose()
