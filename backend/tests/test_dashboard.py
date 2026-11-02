from datetime import UTC, datetime
from decimal import Decimal, localcontext

import pytest
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.modules.dashboard.domain import compare_net
from app.modules.movements.models import Movement

# Reuse the existing two-user PostgreSQL/API fixture, not a mock financial store.
pytest_plugins = ["test_movements"]
URL = "/api/v1/dashboard/summary"


def add(api, *, amount="1.00", day="2024-02-29", kind="income", user="a", **changes):
    from test_movements import payload

    client, _, a, b, expense, income = api
    result = client.post(
        "/api/v1/movements",
        json=payload(
            income if kind == "income" else expense, amount=amount, occurred_on=day, type=kind, **changes
        ),
        headers=a if user == "a" else b,
    )
    assert result.status_code == 201, result.text
    return result.json()


def summary(api, month="2024-02", user="a"):
    client, _, a, b, _, _ = api
    response = client.get(URL, params={"month": month}, headers=a if user == "a" else b)
    assert response.status_code == 200, response.text
    assert response.headers["cache-control"] == "no-store"
    return response.json()


def test_totals_comparison_and_owner_isolation(movement_api):
    add(movement_api, amount="1000.00")
    add(movement_api, amount="250.00", kind="expense")
    add(movement_api, amount="500.00", day="2024-01-31")
    add(movement_api, amount="999999999999999.99", user="b", note="foreign-private-note")
    add(movement_api, amount="999999.99", day="2024-01-31", user="b")
    archived = add(movement_api, amount="9999.00")
    client, _, a, b, _, _ = movement_api
    assert client.delete("/api/v1/movements/" + archived["id"], headers=a).status_code == 204
    data = summary(movement_api)
    assert (data["income"], data["expense"], data["net"]) == ("1000.00", "250.00", "750.00")
    assert data["comparison"] == {"delta": "250.00", "percent": "50.00", "reason": "comparable"}
    assert data["currency"] == "COP" and data["month"] == "2024-02"
    assert len(data["recent_movements"]) == 2
    assert "foreign-private-note" not in str(data)
    for row in data["recent_movements"]:
        assert not {"owner_id", "request_hash", "creation_snapshot", "deleted_at"} & row.keys()
    # Supplying an owner parameter cannot override the authenticated identity.
    spoofed = client.get(URL + "?month=2024-02&owner_id=another-user", headers=b).json()
    assert spoofed["income"] == "999999999999999.99"
    assert spoofed["recent_movements"][0]["note"] == "foreign-private-note"


@pytest.mark.parametrize(
    "prior,net,delta,percent,reason",
    [
        (None, "750.00", None, None, "no_previous_data"),
        ("0.00", "750.00", "750.00", None, "zero_baseline"),
        ("-100.00", "750.00", "850.00", None, "negative_baseline"),
        ("500.00", "750.00", "250.00", "50.00", "comparable"),
        ("750.00", "750.00", "0.00", "0.00", "comparable"),
        ("500.00", "-250.00", "-750.00", "-150.00", "comparable"),
        ("-100.00", "-250.00", "-150.00", None, "negative_baseline"),
    ],
)
def test_baselines_and_negative_cash_flow(movement_api, prior, net, delta, percent, reason):
    add(movement_api, amount=net.lstrip("-"), kind="expense" if net.startswith("-") else "income")
    if prior is not None:
        if prior == "0.00":
            add(movement_api, amount="100.00", day="2024-01-01")
            add(movement_api, amount="100.00", day="2024-01-31", kind="expense")
        else:
            add(
                movement_api,
                amount=prior.lstrip("-"),
                day="2024-01-31",
                kind="expense" if prior.startswith("-") else "income",
            )
    # An archived prior or another user's prior does not establish a baseline.
    archived = add(movement_api, amount="1.00", day="2024-01-31")
    client, _, a, _, _, _ = movement_api
    client.delete("/api/v1/movements/" + archived["id"], headers=a)
    add(movement_api, amount="500.00", day="2024-01-31", user="b")
    data = summary(movement_api)
    assert data["net"] == net
    assert data["comparison"] == {"delta": delta, "percent": percent, "reason": reason}


@pytest.mark.parametrize("with_prior", [False, True])
def test_empty_month_and_empty_current_with_previous_data(movement_api, with_prior):
    if with_prior:
        add(movement_api, amount="100.00", day="2024-01-31")
    data = summary(movement_api)
    assert data["income"] == data["expense"] == data["net"] == "0.00"
    assert data["recent_movements"] == []
    assert data["comparison"] == (
        {"delta": "-100.00", "percent": "-100.00", "reason": "comparable"}
        if with_prior
        else {"delta": None, "percent": None, "reason": "no_previous_data"}
    )


def test_latest_five_are_month_scoped_and_stably_ordered(movement_api):
    client, engine, a, _, _, _ = movement_api
    rows = [add(movement_api, day="2024-02-28", note=f"row-{n}") for n in range(7)]
    later = add(movement_api, day="2024-02-29", note="last-day")
    archived = add(movement_api, day="2024-02-29", note="archived")
    client.delete("/api/v1/movements/" + archived["id"], headers=a)
    add(movement_api, day="2024-03-01", note="next-month")
    add(movement_api, day="2024-01-31", note="previous-month")
    add(movement_api, user="b", note="foreign")
    # Tie both timestamps; id descending must make ordering deterministic.
    with Session(engine) as session:
        session.execute(
            update(Movement)
            .where(Movement.id.in_([r["id"] for r in rows]))
            .values(created_at=datetime(2024, 3, 1, tzinfo=UTC))
        )
        session.commit()
    data = summary(movement_api)
    expected = [later["id"]] + sorted([r["id"] for r in rows], reverse=True)[:4]
    assert [r["id"] for r in data["recent_movements"]] == expected
    assert data["income"] == "8.00"  # aggregate includes all eight, not only the latest five


def test_edit_archive_and_idempotent_replay_recompute_dashboard(movement_api):
    from test_movements import payload

    client, _, a, _, _, income = movement_api
    body = payload(income, type="income", amount="100.00")
    created = client.post("/api/v1/movements", json=body, headers=a).json()
    url = "/api/v1/movements/" + created["id"]
    assert summary(movement_api)["net"] == "100.00"
    assert client.post("/api/v1/movements", json=body, headers=a).status_code == 200
    assert summary(movement_api)["net"] == "100.00"
    assert (
        client.patch(url, json={"amount": "250.00", "occurred_on": "2024-03-01"}, headers=a).status_code
        == 200
    )
    assert summary(movement_api)["net"] == "0.00"
    march = summary(movement_api, "2024-03")
    assert march["net"] == "250.00" and march["comparison"]["reason"] == "no_previous_data"
    assert client.delete(url, headers=a).status_code == 204
    assert client.post("/api/v1/movements", json=body, headers=a).status_code == 200
    assert summary(movement_api, "2024-03")["recent_movements"] == []
    assert summary(movement_api)["net"] == "0.00"


def test_decimal_sums_exceed_single_movement_limit_without_float_loss(movement_api):
    add(movement_api, amount="999999999999999.99")
    add(movement_api, amount="999999999999999.99")
    add(movement_api, amount="0.10", kind="expense")
    add(movement_api, amount="0.20", kind="expense")
    data = summary(movement_api)
    assert data["income"] == "1999999999999999.98"
    assert data["expense"] == "0.30"
    assert data["net"] == "1999999999999999.68"


@pytest.mark.parametrize(
    "month", ["", "2024-13", "2024-00", "2024-2", "1899-12", "9999-01", "2024-02-01", "abcd-ef"]
)
def test_invalid_month_is_not_silently_replaced(movement_api, month):
    client, _, a, _, _, _ = movement_api
    assert client.get(URL, params={"month": month}, headers=a).status_code == 422


@pytest.mark.parametrize("month", ["1900-01", "9998-12"])
def test_month_extremes(movement_api, month):
    assert summary(movement_api, month)["net"] == "0.00"


def test_accounting_month_defaults_to_bogota_and_january_compares_december(movement_api, monkeypatch):
    monkeypatch.setattr("app.modules.dashboard.service.utcnow", lambda: datetime(2024, 2, 1, 2, tzinfo=UTC))
    add(movement_api, day="2023-12-31", amount="100.00")
    add(movement_api, day="2024-01-01", amount="50.00")
    client, _, a, _, _, _ = movement_api
    data = client.get(URL, headers=a).json()
    assert data["month"] == "2024-01"
    assert data["net"] == "50.00"
    assert data["comparison"] == {"delta": "-50.00", "percent": "-50.00", "reason": "comparable"}


def test_unauthenticated_malformed_and_revoked_session_denied(movement_api):
    client, _, _, _, _, _ = movement_api
    add(movement_api, note="private-dashboard")
    for headers in ({}, {"Authorization": "Bearer tampered"}):
        response = client.get(URL, headers=headers)
        assert response.status_code == 401
        assert "private-dashboard" not in response.text
    pair = client.post(
        "/api/v1/auth/login", json={"email": "a@example.com", "password": "correct horse battery"}
    ).json()
    headers = {"Authorization": "Bearer " + pair["access_token"]}
    assert client.get(URL, headers=headers).status_code == 200
    assert (
        client.post("/api/v1/auth/logout", json={"refresh_token": pair["refresh_token"]}).status_code == 204
    )
    assert client.get(URL, headers=headers).status_code == 401


def test_percent_round_half_up_and_no_negative_zero_with_small_context():
    with localcontext() as context:
        context.prec = 6
        assert compare_net(Decimal("202.01"), Decimal(200))["percent"] == "1.01"
        assert compare_net(Decimal("197.99"), Decimal(200))["percent"] == "-1.01"
        result = compare_net(Decimal("999999999999999.98"), Decimal("999999999999999.99"))
        assert result["delta"] == "-0.01" and result["percent"] == "0.00"
