from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime
from decimal import Decimal, localcontext
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_movements import payload

from app.main import create_app
from app.modules.audit.models import AuditEvent
from app.modules.goals.models import Goal, GoalContribution
from app.modules.goals.schemas import ContributionCreate, GoalCreate, GoalPatch
from app.modules.goals.service import out

pytest_plugins = ["test_movements"]
URL = "/api/v1/goals"


def goal_body(**changes):
    return {
        "name": "  Viaje a Cartagena  ",
        "target_amount": "100.00",
        "currency": "COP",
        "target_date": "9998-12-31",
        **changes,
    }


def contribution_body(**changes):
    return {
        "amount": "25.00",
        "currency": "COP",
        "occurred_on": "2024-02-29",
        "note": "Ahorro",
        "client_request_id": str(uuid4()),
        **changes,
    }


def create_goal(api, headers=None, **changes):
    client, _, a, _, _, _ = api
    response = client.post(URL, json=goal_body(**changes), headers=headers or a)
    assert response.status_code == 201, response.text
    return response.json()


def test_goal_progress_idempotency_and_soft_deleted_allocations_do_not_change_dashboard(movement_api):
    client, engine, a, _, expense, _ = movement_api
    assert client.post("/api/v1/movements", json=payload(expense), headers=a).status_code == 201
    before = client.get("/api/v1/dashboard/summary?month=2024-02", headers=a).json()
    goal = create_goal(movement_api)
    assert goal["name"] == "Viaje a Cartagena"
    assert (goal["saved_amount"], goal["remaining"], goal["percent"], goal["status"]) == (
        "0.00",
        "100.00",
        "0.00",
        "active",
    )
    url = f"{URL}/{goal['id']}"
    contributions_url = url + "/contributions"
    body = contribution_body()
    response = client.post(contributions_url, json=body, headers=a)
    assert response.status_code == 201
    original = response.json()
    replay = client.post(contributions_url, json=body, headers=a)
    assert replay.status_code == 200 and replay.json() == original
    assert replay.headers["Idempotent-Replayed"] == "true"
    for changes in ({"amount": "26.00"}, {"note": "Otro"}, {"occurred_on": "2024-02-28"}):
        assert client.post(contributions_url, json={**body, **changes}, headers=a).status_code == 409
    progress = client.get(url, headers=a).json()
    assert (progress["saved_amount"], progress["remaining"], progress["percent"]) == (
        "25.00",
        "75.00",
        "25.00",
    )
    large = client.post(contributions_url, json=contribution_body(amount="80.00"), headers=a)
    assert large.status_code == 201
    progress = client.get(url, headers=a).json()
    assert (progress["saved_amount"], progress["remaining"], progress["percent"], progress["status"]) == (
        "105.00",
        "0.00",
        "100.00",
        "completed",
    )
    for _ in range(2):
        assert client.delete(contributions_url + "/" + large.json()["id"], headers=a).status_code == 204
    assert client.get(url, headers=a).json()["saved_amount"] == "25.00"
    assert [r["id"] for r in client.get(contributions_url, headers=a).json()] == [original["id"]]
    # A retry of a deleted allocation returns the immutable resource, without restoring savings.
    large_replay = client.post(
        contributions_url,
        json={
            **contribution_body(),
            **{
                k: large.json()[k] for k in ("amount", "currency", "occurred_on", "note", "client_request_id")
            },
        },
        headers=a,
    )
    assert large_replay.status_code == 200 and large_replay.json() == large.json()
    assert client.get(url, headers=a).json()["saved_amount"] == "25.00"
    assert client.get("/api/v1/dashboard/summary?month=2024-02", headers=a).json() == before
    with Session(engine) as session:
        assert session.get(GoalContribution, UUID(large.json()["id"])).deleted_at is not None
    assert client.get(URL, headers=a).headers["cache-control"] == "no-store"


def test_edit_target_nullable_date_and_repeatable_archive(movement_api):
    client, _, a, _, _, _ = movement_api
    goal = create_goal(movement_api)
    url = f"{URL}/{goal['id']}"
    assert (
        client.post(url + "/contributions", json=contribution_body(amount="100.00"), headers=a).status_code
        == 201
    )
    assert client.get(url, headers=a).json()["status"] == "completed"
    changed = client.patch(
        url, json={"name": "  Nueva meta ", "target_amount": "200", "target_date": None}, headers=a
    )
    assert changed.status_code == 200
    assert changed.json()["name"] == "Nueva meta" and changed.json()["target_date"] is None
    assert (changed.json()["percent"], changed.json()["status"]) == ("50.00", "active")
    assert client.patch(url, json={"target_amount": "25.00"}, headers=a).json()["percent"] == "100.00"
    for _ in range(2):
        assert client.delete(url, headers=a).status_code == 204
    assert client.get(URL, headers=a).json() == []
    for method, path, body in (
        ("get", url, None),
        ("patch", url, {"name": "resurrect"}),
        ("get", url + "/contributions", None),
        ("post", url + "/contributions", contribution_body()),
    ):
        response = getattr(client, method)(path, headers=a, **({"json": body} if body else {}))
        assert response.status_code == 404


def test_foreign_and_missing_resources_have_identical_errors_and_no_side_effects(movement_api):
    client, engine, a, b, _, _ = movement_api
    goal = create_goal(movement_api)
    url = f"{URL}/{goal['id']}"
    body = contribution_body()
    original = client.post(url + "/contributions", json=body, headers=a).json()
    missing = f"{URL}/{uuid4()}"
    for method, suffix, data in (
        ("get", "", None),
        ("patch", "", {"name": "attack"}),
        ("delete", "", None),
        ("get", "/contributions", None),
        ("post", "/contributions", body),
        ("delete", "/contributions/" + original["id"], None),
    ):
        args = {"headers": b, **({"json": data} if data else {})}
        foreign = getattr(client, method)(url + suffix, **args)
        absent = getattr(client, method)(missing + suffix, **args)
        assert foreign.status_code == absent.status_code == 404
        assert {k: v for k, v in foreign.json().items() if k != "request_id"} == {
            k: v for k, v in absent.json().items() if k != "request_id"
        }
    assert client.get(URL + "?owner_id=" + goal["id"], headers=b).json() == []
    assert client.get(url, headers=a).json()["name"] == goal["name"]
    assert client.get(url, headers=a).json()["saved_amount"] == "25.00"
    other_goal = create_goal(movement_api, headers=b)
    other_url = f"{URL}/{other_goal['id']}/contributions"
    # Same key is scoped to the authenticated owner.
    assert client.post(other_url, json=body, headers=b).status_code == 201
    assert client.delete(other_url + "/" + original["id"], headers=b).status_code == 404
    own_second_goal = create_goal(movement_api)
    assert (
        client.post(f"{URL}/{own_second_goal['id']}/contributions", json=body, headers=a).status_code == 409
    )
    assert client.get(url, headers=a).json()["saved_amount"] == "25.00"
    with Session(engine) as session:
        assert session.get(Goal, UUID(goal["id"])).archived_at is None
        assert session.get(GoalContribution, UUID(original["id"])).deleted_at is None
        assert len(session.scalars(select(GoalContribution)).all()) == 2


def test_goal_and_contribution_ordering(movement_api):
    client, engine, a, _, _, _ = movement_api
    goals = [create_goal(movement_api, name=f"Meta {i}") for i in range(3)]
    with Session(engine) as session:
        session.execute(update(Goal).values(created_at=datetime(2024, 3, 1, tzinfo=UTC)))
        session.commit()
    assert [g["id"] for g in client.get(URL, headers=a).json()] == sorted(g["id"] for g in goals)
    url = f"{URL}/{goals[0]['id']}/contributions"
    records = [client.post(url, json=contribution_body(), headers=a).json() for _ in range(3)]
    earlier = client.post(url, json=contribution_body(occurred_on="2024-02-28"), headers=a).json()
    with Session(engine) as session:
        session.execute(update(GoalContribution).values(created_at=datetime(2024, 3, 1, tzinfo=UTC)))
        session.commit()
    assert [r["id"] for r in client.get(url, headers=a).json()] == sorted(
        (r["id"] for r in records), reverse=True
    ) + [earlier["id"]]


@pytest.mark.parametrize(
    "changes",
    [
        {"name": " "},
        {"name": "x" * 61},
        {"target_amount": "0"},
        {"target_amount": "-1"},
        {"target_amount": 1.5},
        {"target_amount": "1.001"},
        {"target_date": "1900-01-01"},
        {"target_date": "9999-01-01"},
        {"owner_id": str(uuid4())},
        {"currency": "USD"},
    ],
)
def test_invalid_goals_write_nothing(movement_api, changes):
    client, engine, a, _, _, _ = movement_api
    assert client.post(URL, json=goal_body(**changes), headers=a).status_code == 422
    with Session(engine) as session:
        assert session.scalar(select(Goal)) is None


@pytest.mark.parametrize(
    "changes",
    [
        {},
        {"name": None},
        {"name": " "},
        {"target_amount": None},
        {"target_amount": "1.001"},
        {"target_date": "1900-01-01"},
        {"owner_id": str(uuid4())},
        {"currency": "COP"},
    ],
)
def test_invalid_patch_preserves_goal(movement_api, changes):
    client, _, a, _, _, _ = movement_api
    goal = create_goal(movement_api)
    url = f"{URL}/{goal['id']}"
    assert client.patch(url, json=changes, headers=a).status_code == 422
    assert client.get(url, headers=a).json() == goal


@pytest.mark.parametrize(
    "changes",
    [
        {"amount": "0"},
        {"amount": "-1"},
        {"amount": 1.5},
        {"amount": "1.001"},
        {"occurred_on": "1899-12-31"},
        {"occurred_on": "9998-12-31"},
        {"occurred_on": "2024-02-29T00:00:00Z"},
        {"note": "x" * 141},
        {"owner_id": str(uuid4())},
        {"currency": "USD"},
    ],
)
def test_invalid_contributions_write_nothing(movement_api, changes):
    client, engine, a, _, _, _ = movement_api
    goal = create_goal(movement_api)
    assert (
        client.post(
            f"{URL}/{goal['id']}/contributions", json=contribution_body(**changes), headers=a
        ).status_code
        == 422
    )
    with Session(engine) as session:
        assert session.scalar(select(GoalContribution)) is None


def test_concurrent_retries_create_one_contribution_and_audit(movement_api):
    client, engine, a, _, _, _ = movement_api
    goal = create_goal(movement_api)
    body = contribution_body()
    url = f"{URL}/{goal['id']}/contributions"

    def send(_):
        with TestClient(create_app()) as c:
            return c.post(url, json=body, headers=a)

    with ThreadPoolExecutor(4) as executor:
        results = list(executor.map(send, range(4)))
    assert sorted(r.status_code for r in results) == [200, 200, 200, 201]
    assert len({r.json()["id"] for r in results}) == 1
    with Session(engine) as session:
        assert len(session.scalars(select(GoalContribution)).all()) == 1
        assert (
            len(
                session.scalars(
                    select(AuditEvent).where(AuditEvent.event_type == "contribution_created")
                ).all()
            )
            == 1
        )
    assert client.get(f"{URL}/{goal['id']}", headers=a).json()["saved_amount"] == "25.00"


def test_audit_failure_rolls_back_allocation(movement_api, monkeypatch):
    _, engine, a, _, _, _ = movement_api
    goal = create_goal(movement_api)

    def broken(*args):
        raise RuntimeError("simulated audit failure")

    monkeypatch.setattr("app.modules.goals.service.audit", broken)
    with TestClient(create_app(), raise_server_exceptions=False) as client:
        assert (
            client.post(f"{URL}/{goal['id']}/contributions", json=contribution_body(), headers=a).status_code
            == 500
        )
    with Session(engine) as session:
        assert session.scalar(select(GoalContribution)) is None


def test_unauthenticated_requests(movement_api):
    client, _, _, _, _, _ = movement_api
    goal = create_goal(movement_api)
    url = f"{URL}/{goal['id']}"
    for method, path, body in (
        ("get", URL, None),
        ("post", URL, goal_body()),
        ("get", url, None),
        ("patch", url, {"name": "attack"}),
        ("delete", url, None),
        ("get", url + "/contributions", None),
        ("post", url + "/contributions", contribution_body()),
        ("delete", url + f"/contributions/{uuid4()}", None),
    ):
        assert getattr(client, method)(path, **({"json": body} if body else {})).status_code == 401


@pytest.mark.parametrize(
    "model,body",
    [
        (GoalCreate, goal_body(name=" ")),
        (GoalCreate, goal_body(target_amount="0")),
        (GoalCreate, goal_body(target_amount="-1")),
        (GoalCreate, goal_body(target_amount=1.5)),
        (GoalCreate, goal_body(target_amount="1.001")),
        (GoalCreate, goal_body(target_date="1900-01-01")),
        (GoalPatch, {"target_amount": None}),
        (GoalPatch, {"target_date": "9999-01-01"}),
        (ContributionCreate, contribution_body(amount=0.5)),
        (ContributionCreate, contribution_body(occurred_on="9998-12-31")),
    ],
)
def test_write_schemas_reject_invalid_inputs_without_database(model, body):
    with pytest.raises(ValidationError):
        model.model_validate(body)


def test_target_day_is_bogota_and_dates_are_strict(monkeypatch):
    monkeypatch.setattr("app.modules.goals.schemas.utcnow", lambda: datetime(2026, 11, 1, 2, tzinfo=UTC))
    assert GoalCreate.model_validate(goal_body(target_date="2026-10-31")).target_date == date(2026, 10, 31)
    for value in ("2026-10-30", "2026-11-01T00:00:00Z", 1793491200):
        with pytest.raises(ValidationError):
            GoalCreate.model_validate(goal_body(target_date=value))


def test_progress_round_half_up_and_precision_independent_of_caller():
    record = Goal(
        id=uuid4(),
        name="Meta",
        target_amount=Decimal("200.00"),
        currency="COP",
        created_at=datetime(2024, 3, 1, tzinfo=UTC),
    )
    with localcontext() as context:
        context.prec = 6
        assert out((record, Decimal("2.01"))).percent == "1.01"
        record.target_amount = Decimal("999999999999999.99")
        result = out((record, Decimal("1999999999999999.98")))
        assert (result.saved_amount, result.remaining, result.percent) == (
            "1999999999999999.98",
            "0.00",
            "100.00",
        )


def test_database_money_checks(movement_api):
    _, engine, _, _, _, _ = movement_api
    goal = create_goal(movement_api)
    client, _, a, _, _, _ = movement_api
    assert (
        client.post(f"{URL}/{goal['id']}/contributions", json=contribution_body(), headers=a).status_code
        == 201
    )
    with Session(engine) as session:
        for model, column in ((Goal, "target_amount"), (GoalContribution, "amount")):
            for amount in (Decimal(0), Decimal(-1), Decimal("1.001"), Decimal("999999999999999.9999")):
                with pytest.raises(IntegrityError):
                    session.execute(update(model).values(**{column: amount}))
                    session.commit()
                session.rollback()
