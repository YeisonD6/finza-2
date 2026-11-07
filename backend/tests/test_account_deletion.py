"""Account deletion: confirmation rules and that every owned record goes with the account."""

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.main import create_app
from app.modules.audit.models import AuditEvent
from app.modules.budgets.models import Budget
from app.modules.goals.models import Goal, GoalContribution
from app.modules.identity.models import Account, RefreshSession, SessionFamily
from app.modules.movements.models import Category, Movement

PASSWORD = "correct horse battery"


def signup(client, email):
    client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD})
    tokens = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD}).json()
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def fill(client, headers):
    private = client.post(
        "/api/v1/categories", json={"name": "Mascotas", "movement_type": "expense"}, headers=headers
    ).json()
    for category in (private["id"],):
        movement = {
            "type": "expense",
            "amount": "15000.00",
            "currency": "COP",
            "category_id": category,
            "occurred_on": "2026-11-02",
            "note": "Concentrado",
            "client_request_id": str(uuid4()),
        }
        assert client.post("/api/v1/movements", json=movement, headers=headers).status_code == 201
    assert client.put(
        f"/api/v1/budgets/{private['id']}", json={"amount": "80000.00"}, headers=headers
    ).status_code in (
        200,
        201,
    )
    goal = client.post(
        "/api/v1/goals", json={"name": "Viaje", "target_amount": "500000.00"}, headers=headers
    ).json()
    contribution = {
        "amount": "20000.00",
        "occurred_on": "2026-11-03",
        "client_request_id": str(uuid4()),
    }
    assert client.post(
        f"/api/v1/goals/{goal['id']}/contributions", json=contribution, headers=headers
    ).status_code in (
        200,
        201,
    )


def owned(engine, email):
    with Session(engine) as session:
        account = session.scalar(select(Account).where(Account.email == email))
        if account is None:
            return None
        counts = {}
        for model, column in [
            (Movement, Movement.owner_id),
            (Category, Category.owner_id),
            (Budget, Budget.owner_id),
            (Goal, Goal.owner_id),
            (GoalContribution, GoalContribution.owner_id),
            (SessionFamily, SessionFamily.account_id),
            (RefreshSession, RefreshSession.account_id),
            (AuditEvent, AuditEvent.actor_id),
        ]:
            counts[model.__name__] = session.scalar(select(func.count()).where(column == account.id))
        return counts


def test_delete_requires_matching_email_and_password_then_removes_everything(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        mine = signup(client, "borrar@example.com")
        other = signup(client, "queda@example.com")
        fill(client, mine)
        fill(client, other)
        before = owned(engine, "borrar@example.com")
        assert all(
            before[name] > 0 for name in ("Movement", "Category", "Budget", "Goal", "GoalContribution")
        )

        def delete(body, headers=mine):
            return client.request("DELETE", "/api/v1/me", json=body, headers=headers)

        assert delete({"confirm_email": "otro@example.com", "password": PASSWORD}).status_code == 400
        assert delete({"confirm_email": "borrar@example.com", "password": "equivocada"}).status_code == 400
        assert delete({"confirm_email": "borrar@example.com"}).status_code == 400
        assert owned(engine, "borrar@example.com") == before

        assert delete({"confirm_email": " Borrar@Example.com ", "password": PASSWORD}).status_code == 204
        assert owned(engine, "borrar@example.com") is None
        with Session(engine) as session:
            leftovers = session.scalar(
                select(func.count()).select_from(Category).where(Category.name == "Mascotas")
            )
        assert leftovers == 1  # only the other person's private category remains
        assert client.get("/api/v1/me", headers=mine).status_code == 401
        assert client.get("/api/v1/movements", headers=other).json()["month"]
        assert owned(engine, "queda@example.com")["Movement"] == 1


def test_delete_is_rate_limited(pg_identity):
    with TestClient(create_app()) as client:
        mine = signup(client, "limite@example.com")
        codes = [
            client.request(
                "DELETE", "/api/v1/me", json={"confirm_email": "x@example.com"}, headers=mine
            ).status_code
            for _ in range(6)
        ]
        assert codes == [400] * 5 + [429]


def test_password_less_account_confirms_with_email_only(pg_identity):
    _, engine = pg_identity
    with TestClient(create_app()) as client:
        mine = signup(client, "social@example.com")
        with Session(engine) as session:  # same state a Google/Apple-only account has
            session.execute(update(Account).values(password_hash=None))
            session.commit()
        response = client.request(
            "DELETE", "/api/v1/me", json={"confirm_email": "social@example.com"}, headers=mine
        )
        assert response.status_code == 204
        assert owned(engine, "social@example.com") is None
