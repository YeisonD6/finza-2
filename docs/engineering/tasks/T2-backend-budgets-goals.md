# T2 — Backend: presupuestos, metas de ahorro y desglose por categoría

**Asignado a:** Codex · **Revisor:** Claude · **Rama:** `entrega-final-finza`

## Contexto

FINZA es un monolito modular FastAPI + PostgreSQL (`backend/app/modules/*`). Ya existen `identity`, `movements` y `dashboard`, con reglas vinculantes en `docs/architecture/technical-review.md` (dinero como `Decimal` desde cadena, NUMERIC(19,4), salida canónica `"1234.50"`, fechas contables America/Bogota, aislamiento por `owner_id` obtenido solo del JWT, 404 idéntico para recursos ajenos, `extra="forbid"` en contratos de escritura, idempotencia con `client_request_id`). Lee ese documento y los módulos `movements` y `dashboard` antes de escribir código, y sigue exactamente sus patrones (api.py / schemas.py / service.py / repository.py / models.py, `get_session`, dependencia de cuenta actual, manejo de errores, `app/shared/money.py`, `app/shared/accounting_dates.py`).

Migración vigente: `003_movements`. Las migraciones deben seguir funcionando en PostgreSQL **y** en SQLite (ver cómo `003_movements.py` usa `batch` y condiciones por dialecto).

## Objetivo

1. Corregir la regresión existente.
2. Añadir el desglose de gastos por categoría al dashboard.
3. Añadir el módulo `budgets` (presupuesto mensual recurrente por categoría de gasto).
4. Añadir el módulo `goals` (metas de ahorro con aportes).
5. Exponer todo en OpenAPI, regenerar tipos móviles y añadir los endpoints RTK Query móviles.

## 0. Regresión (hacer primero)

- `tests/test_foundations.py::test_unknown_route_has_stable_error` falla porque el commit `5e78809` añadió `detail` a las respuestas de error (el cliente móvil lo usa). Actualiza la prueba para aceptar el contrato actual `{code, message, detail, field_errors, request_id}` y añade una aserción de que `detail == message`. No elimines `detail`.
- `ruff check app tests migrations` reporta 2 errores: corrígelos.

## 1. Dashboard: `expense_by_category`

Añadir a `DashboardSummary` (sin romper campos existentes):

```json
"expense_by_category": [
  {"category_id": "uuid", "name": "Alimentación", "total": "620000.00", "share_percent": "31.71"}
]
```

- Solo gastos activos COP del propietario en el mes solicitado; agrupado por categoría; orden `total DESC, name ASC`.
- `share_percent` = total / gasto del mes × 100, dos decimales ROUND_HALF_UP, cadena. Si el gasto del mes es 0 la lista es vacía.
- Agregación en SQL (sin cargar movimientos en Python). Puede ser una consulta adicional en el repositorio del dashboard.

## 2. Módulo `budgets`

Tabla `budgets`: `id UUID PK`, `owner_id FK accounts ON DELETE CASCADE`, `category_id FK categories`, `amount NUMERIC(19,4)` (mismas CHECK que movimientos: >0, ≤ 999999999999999.99, escala de centavos en PG), `currency CHAR(3) CHECK = 'COP'`, `created_at`, `updated_at` TIMESTAMPTZ. `UNIQUE(owner_id, category_id)`. El presupuesto es recurrente: aplica a todos los meses.

Endpoints (prefijo `/api/v1`, auth Bearer obligatorio, respuestas `no-store` ya aplicadas por middleware):

| Método | Ruta | Cuerpo / query | Respuesta |
|---|---|---|---|
| GET | `/budgets` | `month=YYYY-MM` opcional (por defecto mes actual de Bogotá) | `{"month": "2026-11", "currency": "COP", "items": [BudgetStatus]}` |
| PUT | `/budgets/{category_id}` | `{"amount": "800000.00", "currency": "COP"}` | `BudgetStatus` del mes actual; 201 si se creó, 200 si se actualizó |
| DELETE | `/budgets/{category_id}` | — | 204; repetible (idempotente) para el propietario |

`BudgetStatus`:

```json
{"category_id": "uuid", "category_name": "Transporte", "limit": "300000.00", "spent": "318000.00",
 "remaining": "-18000.00", "percent": "106.00", "status": "exceeded"}
```

- `spent` = suma de gastos activos COP de esa categoría en el mes. `remaining = limit - spent` (puede ser negativo). `percent = spent/limit×100` (2 decimales).
- `status`: `on_track` si percent < 80, `warning` si 80 ≤ percent ≤ 100, `exceeded` si percent > 100.
- Orden: `percent DESC, category_name ASC`.
- Solo categorías de tipo `expense` visibles para el propietario (sistema o propias). Categoría inexistente, ajena o de ingreso → 404 (ajena/inexistente) o 422 (tipo ingreso) con el formato de error estándar.
- Una sola consulta agregada para el GET.

## 3. Módulo `goals`

Tablas:

- `goals`: `id`, `owner_id`, `name VARCHAR(60)` (1–60 tras `strip`, no vacío), `target_amount NUMERIC(19,4)` (mismas CHECK), `currency 'COP'`, `target_date DATE NULL` (≥ hoy Bogotá al crear o editar; ≤ 9998-12-31), `created_at`, `updated_at`, `archived_at NULL`.
- `goal_contributions`: `id`, `goal_id FK goals ON DELETE CASCADE`, `owner_id`, `amount NUMERIC(19,4)` (>0, mismas CHECK), `currency 'COP'`, `occurred_on DATE` (no futura, ≥1900-01-01), `note VARCHAR(140) NULL`, `client_request_id UUID`, `created_at`, `deleted_at NULL`. `UNIQUE(owner_id, client_request_id)`.

Los aportes son **asignaciones de ahorro**: no son movimientos y **no** alteran ingresos, gastos ni flujo neto. Documenta esto en un docstring del servicio.

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/goals` | — | `[Goal]` activas (no archivadas), orden `created_at ASC, id ASC` |
| POST | `/goals` | `{"name", "target_amount", "currency": "COP", "target_date"?}` | 201 `Goal` |
| GET | `/goals/{id}` | — | `Goal` |
| PATCH | `/goals/{id}` | campos opcionales `name`, `target_amount`, `target_date` (null para quitar) | `Goal` |
| DELETE | `/goals/{id}` | — | 204, archiva; repetible |
| GET | `/goals/{id}/contributions` | — | `[Contribution]` activas, `occurred_on DESC, created_at DESC, id DESC` |
| POST | `/goals/{id}/contributions` | `{"amount", "currency": "COP", "occurred_on", "note"?, "client_request_id"}` | 201 `Contribution`; reintento idéntico → 200 con el mismo recurso; misma clave con contenido distinto → 409 |
| DELETE | `/goals/{id}/contributions/{contribution_id}` | — | 204, borrado lógico; repetible |

`Goal`:

```json
{"id": "uuid", "name": "Viaje a Cartagena", "target_amount": "2000000.00", "saved_amount": "450000.00",
 "remaining": "1550000.00", "percent": "22.50", "target_date": "2027-06-30", "status": "active",
 "currency": "COP", "created_at": "..."}
```

- `saved_amount` = suma de aportes activos. `remaining = max(target - saved, 0)`. `percent = min(saved/target×100, 100)` con 2 decimales. `status = "completed"` cuando saved ≥ target, si no `"active"`.
- Todo filtrado por `owner_id`; goal ajena/archivada → 404 idéntico.
- Crear aporte, su idempotencia y su comprobación de propiedad de la meta en una transacción, igual que movimientos.

## 4. Migración

`backend/migrations/versions/004_budgets_goals.py` (down_revision `003_movements`), con upgrade y downgrade, índices por `owner_id`, compatible PG + SQLite. Registrar los modelos donde Alembic los descubra (ver `migrations/env.py`). `alembic check` debe quedar sin diferencias (hay una prueba de metadata en `test_postgres.py`/`test_identity_postgres.py`; extiéndela si enumera tablas).

## 5. Contrato y móvil

- Registrar routers en `app/main.py`.
- Regenerar `mobile/openapi.json` (`.venv/bin/python -m scripts.export_openapi` desde `backend`) y `mobile/src/shared/api/schema.d.ts` (`npm run api:types` desde `mobile`).
- Añadir tags `Budgets` y `Goals` en `mobile/src/shared/api/baseApi.ts`.
- Crear `mobile/src/features/budgets/api.ts` y `mobile/src/features/goals/api.ts` con `baseApi.injectEndpoints`, tipados con `schema.d.ts`, siguiendo `mobile/src/features/movements/api.ts`: queries `useBudgetsQuery(month)`, `useGoalsQuery()`, `useGoalContributionsQuery(goalId)`; mutations `useUpsertBudgetMutation`, `useDeleteBudgetMutation`, `useCreateGoalMutation`, `useUpdateGoalMutation`, `useArchiveGoalMutation`, `useAddContributionMutation`, `useDeleteContributionMutation`. Las mutaciones de movimientos deben invalidar también `Budgets` (el gasto cambia el consumo); las de aportes invalidan `Goals`.
- Tests Jest de los slices al estilo de `mobile/src/features/movements/__tests__/api.test.tsx`.
- **No** toques pantallas, componentes UI, navegación, `package.json` ni dependencias: otra tarea trabaja en paralelo sobre la UI.

## Restricciones

- No cambiar el comportamiento de endpoints existentes salvo el campo añadido al dashboard.
- Sin dependencias nuevas. Sin floats para dinero. Sin secretos.
- Formatea solo los archivos que tocas (ruff format / prettier sobre esos archivos).
- No hagas commits ni push; deja los cambios en el árbol de trabajo.

## Criterios de aceptación

1. `pytest -q` sin fallos (sin PostgreSQL las pruebas PG se omiten; el revisor ejecutará la suite completa con PostgreSQL 17).
2. `ruff check app tests migrations` limpio.
3. Pruebas nuevas en `backend/tests/test_budgets.py`, `test_goals.py` y ampliación de `test_dashboard.py`, usando las fixtures PG existentes (dos usuarios reales), que cubran como mínimo:
   - desglose por categoría: orden, porcentajes, exclusión de archivados/otros meses/otros usuarios, mes vacío;
   - presupuestos: upsert 201/200, estados on_track/warning/exceeded en los límites 79.99/80/100/100.01, categoría de ingreso 422, categoría ajena 404, aislamiento A/B, DELETE repetible, archivar un gasto reduce `spent`;
   - metas: validaciones (nombre vacío, monto 0/negativo/float/3 decimales, fecha pasada), progreso y `completed`, tope 100 %, aislamiento A/B (GET/PATCH/DELETE/aportes sobre meta ajena → 404 sin modificar nada), idempotencia de aportes (200 mismo recurso / 409 contenido distinto), aportes no alteran el dashboard, borrado lógico de aporte.
   - migración 004 upgrade/downgrade.
4. `npm run typecheck` y `npm test` en `mobile` sin fallos.
5. Resumen final con archivos tocados, decisiones y cualquier limitación (p. ej., pruebas que no pudiste ejecutar por falta de red/PostgreSQL en tu sandbox).
