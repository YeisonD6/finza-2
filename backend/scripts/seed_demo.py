"""Create a demo account with realistic data for the live demo and the defense.

Uses only the public HTTP API (same contracts as the app), so it also works as a
smoke test. Development only: never point it at a shared or production API.

    cd backend
    .venv/bin/python -m scripts.seed_demo                       # http://127.0.0.1:8000
    FINZA_API_URL=http://127.0.0.1:8000 .venv/bin/python -m scripts.seed_demo

Demo credentials (local development data only, not a secret):
    email:    demo@finza.app            (override with FINZA_DEMO_EMAIL)
    password: finza-demo-2026           (override with FINZA_DEMO_PASSWORD)

Re-running is safe: movements and contributions use fixed client_request_id
values, so the API treats repeats as idempotent retries; budgets are upserts;
goals are created only if no goal with the same name exists.
"""

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import UTC, date, datetime, timedelta

API = os.getenv("FINZA_API_URL", "http://127.0.0.1:8000").rstrip("/")
EMAIL = os.getenv("FINZA_DEMO_EMAIL", "demo@finza.app")
PASSWORD = os.getenv("FINZA_DEMO_PASSWORD", "finza-demo-2026")
NAMESPACE = uuid.UUID("6b1f3c9e-2f5a-4c55-9d1e-6a7a0f1d2c30")


def bogota_today() -> date:
    return (datetime.now(UTC) - timedelta(hours=5)).date()


def request(method: str, path: str, body=None, token: str | None = None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, (json.loads(raw) if raw else None)


def key(label: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"{EMAIL}:{label}"))


def shift(day: date, months: int, dom: int) -> date:
    """Day `dom` of the month `months` away from `day`, clamped to the month and never future."""
    year, month = divmod(day.month - 1 + months, 12)
    year += day.year
    month += 1
    first_next = date(year + (month == 12), month % 12 + 1, 1)
    result = date(year, month, min(dom, (first_next - timedelta(days=1)).day))
    return min(result, day)


def main() -> int:
    status, _ = request("POST", "/api/v1/auth/register", {"email": EMAIL, "password": PASSWORD})
    if status not in (201, 409):
        print(f"Registro falló ({status}).", file=sys.stderr)
    status, tokens = request("POST", "/api/v1/auth/login", {"email": EMAIL, "password": PASSWORD})
    if status != 200:
        print(
            f"No se pudo iniciar sesión ({status}). ¿API en {API}? ¿Cuenta con otra contraseña?",
            file=sys.stderr,
        )
        return 1
    token = tokens["access_token"]
    _, categories = request("GET", "/api/v1/categories", token=token)
    by_name = {c["name"]: c["id"] for c in categories}

    today = bogota_today()
    movements = [
        # (label, type, amount, months_ago, day, category, note)
        ("prev-salary", "income", "3200000", -1, 1, "Salario", "Salario"),
        ("prev-rent", "expense", "1100000", -1, 2, "Servicios", "Arriendo"),
        ("prev-market", "expense", "412000", -1, 6, "Alimentación", "Mercado del mes"),
        ("prev-bus", "expense", "186000", -1, 10, "Transporte", "Recarga TuLlave"),
        ("prev-lunch", "expense", "264000", -1, 18, "Alimentación", "Almuerzos"),
        ("prev-internet", "expense", "95000", -1, 20, "Servicios", "Internet"),
        ("prev-other", "expense", "150000", -1, 25, "Otros gastos", "Regalo de cumpleaños"),
        ("cur-salary", "income", "3200000", 0, 1, "Salario", "Salario"),
        ("cur-freelance", "income", "450000", 0, 3, "Otros ingresos", "Diseño de logo freelance"),
        ("cur-rent", "expense", "1100000", 0, 2, "Servicios", "Arriendo"),
        ("cur-market", "expense", "386400", 0, 4, "Alimentación", "Mercado en el Éxito"),
        ("cur-bus", "expense", "186000", 0, 3, "Transporte", "Recarga TuLlave"),
        ("cur-uber", "expense", "82500", 0, 5, "Transporte", "Uber al aeropuerto"),
        ("cur-lunch", "expense", "18500", 0, 6, "Alimentación", "Almuerzo"),
        ("cur-coffee", "expense", "9000", 0, 6, "Alimentación", "Tinto y pandebono"),
        ("cur-netflix", "expense", "26900", 0, 5, "Servicios", "Netflix"),
        ("cur-gas", "expense", "64300", 0, 4, "Servicios", "Gas natural"),
    ]
    for label, kind, amount, months, dom, category, note in movements:
        status, body = request(
            "POST",
            "/api/v1/movements",
            {
                "type": kind,
                "amount": amount,
                "occurred_on": shift(today, months, dom).isoformat(),
                "category_id": by_name[category],
                "note": note,
                "client_request_id": key(label),
            },
            token,
        )
        if status not in (200, 201):
            print(f"Movimiento {label}: {status} {body}", file=sys.stderr)

    for category, limit in (("Alimentación", "500000"), ("Transporte", "250000"), ("Servicios", "1600000")):
        status, body = request("PUT", f"/api/v1/budgets/{by_name[category]}", {"amount": limit}, token)
        if status not in (200, 201):
            print(f"Presupuesto {category}: {status} {body}", file=sys.stderr)

    _, existing = request("GET", "/api/v1/goals", token=token)
    names = {g["name"]: g["id"] for g in existing}
    goals = [
        (
            "Viaje a Cartagena",
            "2000000",
            shift(today, 0, 1).replace(year=today.year + 1).isoformat(),
            ["400000", "250000"],
        ),
        ("Fondo de emergencia", "3000000", None, ["1000000", "200000"]),
    ]
    for name, target, target_date, contributions in goals:
        goal_id = names.get(name)
        if goal_id is None:
            status, body = request(
                "POST",
                "/api/v1/goals",
                {"name": name, "target_amount": target, "target_date": target_date},
                token,
            )
            if status != 201:
                print(f"Meta {name}: {status} {body}", file=sys.stderr)
                continue
            goal_id = body["id"]
        for index, amount in enumerate(contributions):
            status, body = request(
                "POST",
                f"/api/v1/goals/{goal_id}/contributions",
                {
                    "amount": amount,
                    "occurred_on": shift(today, index - len(contributions) + 1, 5).isoformat(),
                    "note": "Aporte mensual",
                    "client_request_id": key(f"{name}:{index}"),
                },
                token,
            )
            if status not in (200, 201):
                print(f"Aporte {name}: {status} {body}", file=sys.stderr)

    print(f"Cuenta de demostración lista: {EMAIL} (contraseña documentada en scripts/seed_demo.py)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
