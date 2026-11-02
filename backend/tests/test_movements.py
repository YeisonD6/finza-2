import base64
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.audit.models import AuditEvent
from app.modules.movements.models import Category, Movement


@pytest.fixture
def movement_api(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        headers = []
        for name in ("a", "b"):
            credentials = {"email": f"{name}@example.com", "password": "correct horse battery"}
            assert client.post("/api/v1/auth/register", json=credentials).status_code == 201
            login = client.post("/api/v1/auth/login", json=credentials)
            assert login.status_code == 200
            headers.append({"Authorization": "Bearer " + login.json()["access_token"]})
        a, b = headers
        categories = client.get("/api/v1/categories", headers=a).json()
        expense = next(c["id"] for c in categories if c["movement_type"] == "expense")
        income = next(c["id"] for c in categories if c["movement_type"] == "income")
        yield client, engine, a, b, expense, income


def payload(category, **changes):
    return {
        "type": "expense",
        "amount": "12345.60",
        "currency": "COP",
        "category_id": category,
        "occurred_on": "2024-02-29",
        "note": "Prueba",
        "client_request_id": str(uuid4()),
        **changes,
    }


def test_categories_are_seeded_private_and_type_filtered(movement_api):
    client, engine, a, b, _, _ = movement_api
    assert len(client.get("/api/v1/categories", headers=a).json()) == 6
    data = {"name": "  Mascotas  ", "movement_type": "expense"}
    response = client.post("/api/v1/categories", json=data, headers=a)
    assert response.status_code == 201
    private = response.json()
    assert private["name"] == "Mascotas" and not private["is_system"]
    assert private["id"] not in [c["id"] for c in client.get("/api/v1/categories", headers=b).json()]
    assert all(
        c["movement_type"] == "income" for c in client.get("/api/v1/categories?type=income", headers=a).json()
    )
    assert client.post("/api/v1/categories", json={**data, "name": "mascotas"}, headers=a).status_code == 409
    assert (
        client.post("/api/v1/categories", json={**data, "owner_id": str(uuid4())}, headers=a).status_code
        == 422
    )
    assert client.post("/api/v1/categories", json={**data, "name": " "}, headers=a).status_code == 422
    assert client.get("/api/v1/categories").status_code == 401
    with Session(engine) as session:
        assert len(session.scalars(select(Category).where(Category.is_system)).all()) == 6


def test_crud_idempotency_archive_snapshot_and_audit(movement_api):
    client, engine, a, _, expense, income = movement_api
    data = payload(expense)
    response = client.post("/api/v1/movements", json=data, headers=a)
    assert response.status_code == 201 and response.headers["cache-control"] == "no-store"
    original = response.json()
    movement_id = original["id"]
    assert original["amount"] == "12345.60" and "owner_id" not in original and "request_hash" not in original
    url = "/api/v1/movements/" + movement_id
    replay = client.post("/api/v1/movements", json=data, headers=a)
    assert replay.status_code == 200 and replay.json() == original
    assert client.post("/api/v1/movements", json={**data, "amount": "2.00"}, headers=a).status_code == 409
    changed = client.patch(
        url,
        json={"amount": "250.1", "type": "income", "category_id": income, "occurred_on": "2024-03-01"},
        headers=a,
    )
    assert changed.status_code == 200 and changed.json()["amount"] == "250.10"
    assert client.get("/api/v1/movements?month=2024-02", headers=a).json()["items"] == []
    assert client.get("/api/v1/movements?month=2024-03", headers=a).json()["items"][0]["id"] == movement_id
    assert client.post("/api/v1/movements", json=data, headers=a).json() == original
    assert client.get(url, headers=a).json()["amount"] == "250.10"
    assert client.delete(url, headers=a).status_code == 204
    assert client.delete(url, headers=a).status_code == 204
    assert client.get(url, headers=a).status_code == 404
    assert client.patch(url, json={"note": "resurrect"}, headers=a).status_code == 404
    assert client.get("/api/v1/movements?month=2024-03", headers=a).json()["items"] == []
    assert client.post("/api/v1/movements", json=data, headers=a).json() == original
    with Session(engine) as session:
        record = session.scalar(select(Movement))
        assert record.deleted_at and record.amount == Decimal("250.10")
        events = session.scalars(select(AuditEvent).where(AuditEvent.resource_id == record.id)).all()
        assert sorted(e.event_type for e in events) == [
            "movement_archived",
            "movement_created",
            "movement_updated",
        ]


def test_owner_isolation_and_category_validation(movement_api):
    client, engine, a, b, expense, income = movement_api
    response = client.post("/api/v1/movements", json=payload(expense), headers=a)
    url = "/api/v1/movements/" + response.json()["id"]
    missing = "/api/v1/movements/" + str(uuid4())
    for method, body in [("get", None), ("patch", {"note": "attack"}), ("delete", None)]:
        args = {"headers": b}
        if body:
            args["json"] = body
        foreign = getattr(client, method)(url, **args)
        absent = getattr(client, method)(missing, **args)
        assert foreign.status_code == absent.status_code == 404
        assert foreign.json()["message"] == absent.json()["message"]
    assert client.get("/api/v1/movements?month=2024-02", headers=b).json()["items"] == []
    assert (
        client.post("/api/v1/movements", json=payload(expense, owner_id=str(uuid4())), headers=a).status_code
        == 422
    )
    private = client.post(
        "/api/v1/categories", json={"name": "Solo B", "movement_type": "expense"}, headers=b
    ).json()["id"]
    assert client.post("/api/v1/movements", json=payload(private), headers=a).status_code == 404
    assert client.patch(url, json={"category_id": private}, headers=a).status_code == 404
    assert client.get("/api/v1/movements", params={"category_id": private}, headers=a).status_code == 404
    assert client.post("/api/v1/movements", json=payload(income), headers=a).status_code == 422
    assert client.patch(url, json={"type": "income"}, headers=a).status_code == 422
    assert client.get(url, headers=a).json()["note"] == "Prueba"
    assert client.get(url).status_code == 401
    # Same UUID is independent for each owner, not globally shared.
    reused = payload(expense, client_request_id=response.json()["client_request_id"])
    assert client.post("/api/v1/movements", json=reused, headers=b).status_code == 201
    with Session(engine) as session:
        assert len(session.scalars(select(Movement)).all()) == 2


@pytest.mark.parametrize(
    "changes",
    [
        {"amount": 0.1},
        {"amount": "0"},
        {"amount": "-1"},
        {"amount": "NaN"},
        {"amount": "1e2"},
        {"amount": "1.001"},
        {"amount": "1,20"},
        {"amount": "1000000000000000"},
        {"currency": "USD"},
        {"occurred_on": "2023-02-29"},
        {"occurred_on": "1899-12-31"},
        {"occurred_on": "9998-12-31"},
        {"occurred_on": "2024-02-29T23:00:00Z"},
        {"note": "x" * 501},
        {"type": "transfer"},
        {"client_request_id": "not-uuid"},
    ],
)
def test_invalid_input_writes_nothing(movement_api, changes):
    client, engine, a, _, expense, _ = movement_api
    response = client.post("/api/v1/movements", json=payload(expense, **changes), headers=a)
    assert response.status_code == 422, response.text
    with Session(engine) as session:
        assert session.scalar(select(Movement)) is None
        assert session.scalar(select(AuditEvent).where(AuditEvent.resource_type == "movement")) is None


def test_money_boundaries_and_patch_rules(movement_api):
    client, engine, a, _, expense, _ = movement_api
    response = client.post(
        "/api/v1/movements",
        json=payload(expense, amount="999999999999999.99", occurred_on="1900-01-01"),
        headers=a,
    )
    assert response.status_code == 201
    url = "/api/v1/movements/" + response.json()["id"]
    for changes in [
        {},
        {"amount": None},
        {"note": None},
        {"amount": "1.001"},
        {"client_request_id": str(uuid4())},
        {"owner_id": str(uuid4())},
    ]:
        assert client.patch(url, json=changes, headers=a).status_code == 422
    with Session(engine) as session:
        for changes in [{"amount": Decimal(0)}, {"amount": Decimal("1.001")}, {"currency": "USD"}]:
            with pytest.raises(IntegrityError):
                session.execute(update(Movement).values(**changes))
                session.commit()
            session.rollback()
    assert client.get(url, headers=a).json()["amount"] == "999999999999999.99"


def test_concurrent_retries_create_one_movement_and_audit(movement_api):
    _client, engine, a, _, expense, _ = movement_api
    data = payload(expense)

    def send(_):
        with TestClient(create_app()) as c:
            return c.post("/api/v1/movements", json=data, headers=a)

    with ThreadPoolExecutor(4) as executor:
        results = list(executor.map(send, range(4)))
    assert sorted(r.status_code for r in results) == [200, 200, 200, 201]
    assert len({r.json()["id"] for r in results}) == 1
    with Session(engine) as session:
        assert len(session.scalars(select(Movement)).all()) == 1
        assert (
            len(session.scalars(select(AuditEvent).where(AuditEvent.event_type == "movement_created")).all())
            == 1
        )


def test_pagination_filters_and_cursor_validation(movement_api):
    client, engine, a, b, expense, income = movement_api
    ids = []
    for i in range(7):
        result = client.post(
            "/api/v1/movements",
            json=payload(expense, occurred_on="2024-02-29" if i < 4 else "2024-02-28"),
            headers=a,
        )
        assert result.status_code == 201
        ids.append(result.json()["id"])
    client.post("/api/v1/movements", json=payload(income, type="income"), headers=a)
    client.post("/api/v1/movements", json=payload(expense, occurred_on="2024-03-01"), headers=a)
    with Session(engine) as session:
        session.execute(update(Movement).values(created_at=datetime(2024, 3, 1, tzinfo=UTC)))
        session.commit()
    params = {"month": "2024-02", "type": "expense", "category_id": expense, "limit": 2}
    seen = []
    cursor = None
    first_cursor = None
    while True:
        page = client.get(
            "/api/v1/movements", params={**params, **({"cursor": cursor} if cursor else {})}, headers=a
        )
        assert page.status_code == 200, page.text
        seen.extend(item["id"] for item in page.json()["items"])
        cursor = page.json()["next_cursor"]
        first_cursor = first_cursor or cursor
        if not cursor:
            break
    assert len(seen) == len(set(seen)) == 7 and set(seen) == set(ids)
    assert seen[:4] == sorted(ids[:4], reverse=True)
    assert (
        client.get("/api/v1/movements", params={**params, "cursor": first_cursor}, headers=b).status_code
        == 422
    )
    assert (
        client.get(
            "/api/v1/movements", params={**params, "month": "2024-03", "cursor": first_cursor}, headers=a
        ).status_code
        == 422
    )
    for extra in [
        {"month": "2024-13"},
        {"month": ""},
        {"limit": 0},
        {"limit": 101},
        {"cursor": "invalid"},
        {"type": "transfer"},
    ]:
        assert client.get("/api/v1/movements", params={**params, **extra}, headers=a).status_code == 422
    malformed = json.loads(base64.urlsafe_b64decode(first_cursor))
    malformed["id"] = 42
    assert (
        client.get(
            "/api/v1/movements",
            params={**params, "cursor": base64.urlsafe_b64encode(json.dumps(malformed).encode()).decode()},
            headers=a,
        ).status_code
        == 422
    )


def test_accounting_date_is_bogota_not_phone_or_utc(movement_api, monkeypatch):
    client, _, a, _, expense, _ = movement_api
    monkeypatch.setattr("app.modules.movements.schemas.utcnow", lambda: datetime(2026, 11, 1, 2, tzinfo=UTC))
    assert (
        client.post(
            "/api/v1/movements", json=payload(expense, occurred_on="2026-11-01"), headers=a
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/movements", json=payload(expense, occurred_on="2026-10-31"), headers=a
        ).status_code
        == 201
    )


def test_audit_failure_rolls_back_movement(movement_api, monkeypatch):
    _, engine, a, _, expense, _ = movement_api

    def broken(*args):
        raise RuntimeError("simulated audit failure")

    monkeypatch.setattr("app.modules.movements.service.audit", broken)
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        assert client.post("/api/v1/movements", json=payload(expense), headers=a).status_code == 500
    with Session(engine) as session:
        assert session.scalar(select(Movement)) is None


def test_unicode_category_normalization_does_not_overflow(movement_api):
    client, engine, a, _, _, _ = movement_api
    name = "\u0390" * 60
    result = client.post("/api/v1/categories", json={"name": name, "movement_type": "expense"}, headers=a)
    assert result.status_code == 201, result.text
    with Session(engine) as session:
        category = session.get(Category, result.json()["id"])
        assert category.name == name and len(category.name_key) == 180


def test_edit_archive_race_cannot_resurrect(movement_api):
    client, engine, a, _, expense, _ = movement_api
    created = client.post("/api/v1/movements", json=payload(expense), headers=a).json()
    url = "/api/v1/movements/" + created["id"]

    def action(kind):
        with TestClient(create_app()) as c:
            return (
                c.patch(url, json={"note": "edited"}, headers=a).status_code
                if kind == "edit"
                else c.delete(url, headers=a).status_code
            )

    with ThreadPoolExecutor(2) as executor:
        edit_status, archive_status = list(executor.map(action, ["edit", "archive"]))
    assert edit_status in (200, 404) and archive_status == 204
    assert client.get(url, headers=a).status_code == 404
    with Session(engine) as session:
        record = session.scalar(select(Movement))
        assert record.deleted_at is not None
