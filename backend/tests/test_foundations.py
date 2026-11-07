from datetime import UTC, date, datetime
from decimal import Decimal, localcontext

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.dashboard.domain import compare_net
from app.shared.accounting_dates import accounting_today, month_bounds
from app.shared.money import parse_amount, rounded


def test_money_is_exact():
    assert parse_amount("0.10") + parse_amount("0.20") == Decimal("0.30")
    assert parse_amount("999999999999999.99") == Decimal("999999999999999.99")


def test_amount_does_not_depend_on_callers_precision():
    with localcontext() as context:
        context.prec = 6
        assert parse_amount("123456.78") == Decimal("123456.78")


@pytest.mark.parametrize(
    "value",
    [0.1, 1, True, "0", "-1", "1.001", "NaN", "Infinity", "1e2", "1,00", " 1", "1000000000000000", ""],
)
def test_reject_invalid_amount(value):
    with pytest.raises(ValueError):
        parse_amount(value)


def test_reject_foreign_currency():
    with pytest.raises(ValueError):
        parse_amount("10.00", "USD")


def test_round_half_up_both_signs():
    assert rounded(Decimal("1.005")) == "1.01"
    assert rounded(Decimal("-1.005")) == "-1.01"


@pytest.mark.parametrize(
    "month,start,end",
    [
        ("2024-02", date(2024, 2, 1), date(2024, 3, 1)),
        ("2026-12", date(2026, 12, 1), date(2027, 1, 1)),
    ],
)
def test_month_bounds(month, start, end):
    assert month_bounds(month) == (start, end)


@pytest.mark.parametrize("month", ["2026-00", "2026-13", "2026-1", "1899-12", "9999-12"])
def test_invalid_month(month):
    with pytest.raises(ValueError):
        month_bounds(month)


def test_accounting_day_uses_bogota():
    assert accounting_today(datetime(2026, 11, 1, 2, tzinfo=UTC)) == date(2026, 10, 31)
    with pytest.raises(ValueError):
        accounting_today(datetime(2026, 11, 1))


@pytest.mark.parametrize(
    "previous,delta,percent,reason",
    [
        (Decimal(500), "250.00", "50.00", "comparable"),
        (Decimal(0), "750.00", None, "zero_baseline"),
        (Decimal(-100), "850.00", None, "negative_baseline"),
        (None, None, None, "no_previous_data"),
    ],
)
def test_dashboard_baselines(previous, delta, percent, reason):
    assert compare_net(Decimal(750), previous) == {"delta": delta, "percent": percent, "reason": reason}


def test_health_and_contract():
    with TestClient(create_app()) as client:
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        assert response.headers.get("x-request-id")
        assert "/health/ready" in client.get("/openapi.json").json()["paths"]


def test_readiness_never_claims_ready_without_database(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with TestClient(create_app()) as client:
        response = client.get("/health/ready")
        assert response.status_code == 503
        assert response.json()["code"] == "database_unavailable"
        assert "password" not in response.text


def test_unknown_route_has_stable_error():
    with TestClient(create_app()) as client:
        response = client.get("/missing")
        assert response.status_code == 404
        assert set(response.json()) == {"code", "message", "detail", "field_errors", "request_id"}
        assert response.json()["detail"] == response.json()["message"]
