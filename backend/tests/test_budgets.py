from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import event, inspect
from sqlalchemy.orm import Session
from test_movements import payload

from app.modules.budgets.service import list_statuses

pytest_plugins = ["test_movements"]
URL = "/api/v1/budgets"


def put(api, category=None, amount="100.00", user="a"):
    client, _, a, b, expense, _ = api
    return client.put(
        f"{URL}/{category or expense}",
        json={"amount": amount, "currency": "COP"},
        headers=a if user == "a" else b,
    )


def test_upsert_recurs_by_month_and_delete_is_repeatable(movement_api):
    client, _, a, b, expense, _ = movement_api
    response = put(movement_api)
    assert response.status_code == 201
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["limit"] == "100.00"
    assert put(movement_api, amount="200").status_code == 200
    for month in ("2024-02", "9998-12"):
        data = client.get(URL, params={"month": month}, headers=a).json()
        assert data["month"] == month and data["currency"] == "COP"
        assert data["items"][0]["limit"] == "200.00"
    assert client.get(URL, headers=b).json()["items"] == []
    assert put(movement_api, amount="20.00", user="b").status_code == 201
    for _ in range(2):
        assert client.delete(f"{URL}/{expense}", headers=a).status_code == 204
    assert client.get(URL, headers=a).json()["items"] == []
    assert client.get(URL, headers=b).json()["items"][0]["limit"] == "20.00"


def test_status_boundaries_order_and_archive_recalculates(movement_api):
    client, _, a, b, _, _ = movement_api
    categories = client.get("/api/v1/categories?type=expense", headers=a).json()
    spent = ["79.99", "80.00", "100.00", "100.01"]
    records = []
    for category, amount in zip(categories, spent, strict=True):
        assert put(movement_api, category["id"]).status_code == 201
        record = client.post("/api/v1/movements", json=payload(category["id"], amount=amount), headers=a)
        assert record.status_code == 201
        records.append(record.json())
    # All of these must be excluded from February's spending.
    category = categories[0]["id"]
    for headers, day in ((b, "2024-02-29"), (a, "2024-01-31"), (a, "2024-03-01")):
        assert (
            client.post(
                "/api/v1/movements", json=payload(category, amount="500.00", occurred_on=day), headers=headers
            ).status_code
            == 201
        )
    items = client.get(URL + "?month=2024-02", headers=a).json()["items"]
    assert [item["percent"] for item in items] == list(reversed(spent))
    assert [item["status"] for item in items] == ["exceeded", "warning", "warning", "on_track"]
    assert items[0]["remaining"] == "-0.01"
    assert client.delete("/api/v1/movements/" + records[-1]["id"], headers=a).status_code == 204
    items = client.get(URL + "?month=2024-02", headers=a).json()["items"]
    cleared = next(item for item in items if item["category_id"] == records[-1]["category_id"])
    assert (cleared["spent"], cleared["percent"], cleared["remaining"], cleared["status"]) == (
        "0.00",
        "0.00",
        "100.00",
        "on_track",
    )
    assert put(movement_api, category, amount="200.00").status_code == 200
    assert (
        next(
            item
            for item in client.get(URL + "?month=2024-02", headers=a).json()["items"]
            if item["category_id"] == category
        )["percent"]
        == "40.00"
    )


def test_tied_percent_sorted_by_name_and_one_aggregate_query(movement_api):
    client, engine, a, _, _, _ = movement_api
    categories = client.get("/api/v1/categories?type=expense", headers=a).json()
    for category in reversed(categories):
        assert put(movement_api, category["id"]).status_code == 201
    statements = []

    def capture(*args):
        statements.append(args[2])

    owner = UUID(client.get("/api/v1/me", headers=a).json()["id"])
    event.listen(engine, "before_cursor_execute", capture)
    try:
        with Session(engine) as session:
            result = list_statuses(session, owner, "2024-02")
    finally:
        event.remove(engine, "before_cursor_execute", capture)
    assert len(statements) == 1
    assert [item.category_name for item in result.items] == sorted(c["name"] for c in categories)


def test_categories_and_owner_spoofing(movement_api):
    client, _, a, b, expense, income = movement_api
    private = client.post(
        "/api/v1/categories", json={"name": "Solo A", "movement_type": "expense"}, headers=a
    ).json()["id"]
    assert put(movement_api, private).status_code == 201
    for category in (private, str(uuid4())):
        response = put(movement_api, category, user="b")
        assert response.status_code == 404
        assert response.json()["detail"] == "Recurso no encontrado"
        assert client.delete(f"{URL}/{category}", headers=b).status_code == 404
    assert put(movement_api, income).status_code == 422
    assert client.delete(f"{URL}/{income}", headers=a).status_code == 422
    assert (
        client.put(
            f"{URL}/{expense}", json={"amount": "1.00", "owner_id": str(uuid4())}, headers=a
        ).status_code
        == 422
    )
    assert client.get(URL + "?owner_id=" + str(uuid4()), headers=b).json()["items"] == []
    assert client.get(URL, headers=a).json()["items"][0]["category_id"] == private
    assert client.get(URL).status_code == 401
    assert client.put(f"{URL}/{expense}", json={"amount": "1.00"}).status_code == 401
    assert client.delete(f"{URL}/{expense}").status_code == 401


@pytest.mark.parametrize("month", ["", "2024-2", "2024-00", "2024-13", "1899-12", "9999-01"])
def test_invalid_month(movement_api, month):
    client, _, a, _, _, _ = movement_api
    assert client.get(URL, params={"month": month}, headers=a).status_code == 422


def test_default_month_is_bogota_and_upsert_returns_current_spending(movement_api, monkeypatch):
    monkeypatch.setattr("app.modules.budgets.service.utcnow", lambda: datetime(2024, 3, 1, 2, tzinfo=UTC))
    client, _, a, _, expense, _ = movement_api
    assert (
        client.post("/api/v1/movements", json=payload(expense, amount="10.00"), headers=a).status_code == 201
    )
    response = put(movement_api)
    assert response.json()["spent"] == "10.00"
    assert client.get(URL, headers=a).json()["month"] == "2024-02"


def test_migration_004_sqlite_round_trip(tmp_path, monkeypatch):
    from sqlalchemy import create_engine

    url = "sqlite:///" + str(tmp_path / "migration.db")
    monkeypatch.setenv("DATABASE_URL", url)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    engine = create_engine(url)
    try:
        command.upgrade(config, "003_movements")
        command.upgrade(config, "head")
        assert {"budgets", "goals", "goal_contributions"} <= set(inspect(engine).get_table_names())
        command.check(config)
        command.downgrade(config, "003_movements")
        assert not {"budgets", "goals", "goal_contributions"} & set(inspect(engine).get_table_names())
        assert {"movements", "categories"} <= set(inspect(engine).get_table_names())
        command.upgrade(config, "head")
        command.check(config)
    finally:
        engine.dispose()


def test_migration_004_postgres_round_trip(pg_identity):
    config, engine = pg_identity
    command.check(config)
    command.downgrade(config, "003_movements")
    assert not {"budgets", "goals", "goal_contributions"} & set(inspect(engine).get_table_names())
    command.upgrade(config, "head")
    command.check(config)
    columns = {column["name"]: column for column in inspect(engine).get_columns("budgets")}
    assert columns["amount"]["type"].precision == 19
    assert columns["amount"]["type"].scale == 4
    assert columns["created_at"]["type"].timezone


@pytest.mark.parametrize("amount", ["0", "-1", 0.5, 1, True, "1.001", "1e2", "NaN", "1000000000000000"])
def test_budget_money_contract(amount):
    from pydantic import ValidationError

    from app.modules.budgets.schemas import BudgetUpsert

    with pytest.raises(ValidationError):
        BudgetUpsert(amount=amount)


@pytest.mark.parametrize(
    "changes", [{"amount": "0"}, {"amount": "-1"}, {"amount": 0.5}, {"amount": "1.001"}, {"currency": "USD"}]
)
def test_invalid_budget_write_preserves_limit(movement_api, changes):
    client, _, a, _, expense, _ = movement_api
    assert put(movement_api).status_code == 201
    assert (
        client.put(
            f"{URL}/{expense}", json={"amount": "100.00", "currency": "COP", **changes}, headers=a
        ).status_code
        == 422
    )
    assert client.get(URL, headers=a).json()["items"][0]["limit"] == "100.00"


def test_budget_database_money_checks(movement_api):
    from decimal import Decimal

    from sqlalchemy import update
    from sqlalchemy.exc import IntegrityError

    from app.modules.budgets.models import Budget

    _, engine, _, _, _, _ = movement_api
    assert put(movement_api, amount="999999999999999.99").status_code == 201
    with Session(engine) as session:
        for changes in (
            {"amount": Decimal(0)},
            {"amount": Decimal("1.001")},
            {"amount": Decimal("999999999999999.9999")},
            {"currency": "USD"},
        ):
            with pytest.raises(IntegrityError):
                session.execute(update(Budget).values(**changes))
                session.commit()
            session.rollback()
