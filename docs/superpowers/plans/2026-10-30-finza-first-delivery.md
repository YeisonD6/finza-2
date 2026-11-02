# Finza primera entrega — Implementation Plan

> **For agentic workers:** ejecución inline con superpowers:executing-plans. Pasos verificables y pruebas antes del código. Este turno inicia la fase 0 (tarea 1); las tareas 2–6 constituyen la entrega vertical posterior.

**Goal:** Registro/login, movimientos COP y dashboard mensual accesibles con aislamiento por usuario.
**Architecture:** Monolito modular FastAPI y PostgreSQL; cliente Expo Router con Redux Toolkit/RTK Query. Cálculos puros independientes de HTTP y persistencia.
**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL 17; Expo, TypeScript, Redux Toolkit.
**Spec:** ../specs/2026-10-30-finza-mvp-architecture-design.md y ../../architecture/technical-review.md (prioridad en detalles).

## Global Constraints

- COP único; Decimal desde cadena, dos decimales de entrada, ROUND_HALF_UP solo en resultados.
- DATE contable y timestamps UTC; calendario America/Bogota.
- Aislamiento por propietario, 404 para ajenos, archivo lógico y auditoría transaccional.
- Android/TalkBack real pendiente; Apple según disponibilidad; no certificar pruebas no realizadas.
- 48 dp, contraste 4.5:1/3:1, texto 1.5x, semántica y foco por pantalla.
- No microservicios ni módulos vacíos. No despliegue público en esta fase.

## Review Focus

- Doble toque/reintento tras timeout: una sola escritura (tarea 3).
- Cambio A→B con peticiones pendientes: ningún dato A en caché/UI B (tarea 2).
- Fecha contable en límite de mes desde teléfono en otra zona (tareas 1 y 4).
- Flujo anterior cero/negativo: sin división engañosa ni infinito (tareas 1 y 4).
- Teclado/texto ampliado/lector simultáneos: formulario operable y error anunciado (tareas 5 y 6).

## Responsabilidades propuestas (rotables)

| Entrega | Responsable | Revisión | Validación |
|---|---|---|---|
| Base y dinero | Yeison | Juan David | Isabela |
| Identidad vertical | Juan David | Isabela | Yeison |
| Movimientos vertical | Isabela | Yeison | Juan David |
| Dashboard vertical | Yeison | Juan David | Isabela |
| Accesibilidad/evidencias | Isabela | Juan David | Yeison |

Asignación propuesta, no afirmación de disponibilidad. Cada responsable toca UI/API/pruebas de su sección; los otros revisan y reproducen para defenderla académicamente.

### Tarea 1: Fase 0 — fundaciones ejecutables

**Files:** backend/app/{main.py,core/database.py,shared/money.py,shared/accounting_dates.py,modules/dashboard/domain.py}; backend/tests/test_foundations.py; backend/pyproject.toml; infra/compose.yaml; mobile/{package.json,app.json,app/_layout.tsx,app/index.tsx,src/app/store.ts,src/shared/api/baseApi.ts}; .github/workflows/quality.yml; README.md.
**Interfaces:** parse_amount(value: str, currency: str = "COP") -> Decimal; month_bounds(month: str) -> tuple[date,date]; accounting_today(now: datetime) -> date; compare_net(current: Decimal, previous: Decimal | None) -> dict; create_app() -> FastAPI. Mobile health endpoint consumes /health/live.

- [ ] Crear pruebas: "0.10" + "0.20" = Decimal("0.30"); entradas float, cero, exponente, NaN, 3 decimales y USD rechazadas; límite monetario; redondeo ±1.005; febrero 2024 y diciembre; timestamp UTC 2026-11-01T02:00 corresponde a octubre 31 Bogotá; comparaciones 750/500=50%, cero/negativo null; health devuelve estado, readiness 503 sin PG.
- [ ] Ejecutar pytest y confirmar fallo por funciones inexistentes.
- [ ] Implementar funciones, API health/readiness con SELECT 1, configuración PG, Compose y shell Expo con store/API.
- [ ] Ejecutar pytest, lint, npm typecheck y export Expo. CI levanta PG para readiness real; local informar si Docker falta.
- [ ] Registrar resultados y pendientes en docs/architecture/progress.md. Commit local solo cuando proceda; nunca subir secretos.

### Tarea 2: Identidad vertical

**Estado 2026-11-02:** código backend/móvil implementado y verificado automáticamente (61 backend, 8 cliente, 4 UI/caché; puente real con PG). Migración adicional 002_sessions para familias y límites distribuidos. Cierre manual TalkBack/SecureStore en dispositivo pendiente por falta de SDK/ADB/hardware; ver progress.md. El orden de implementación/pruebas siguió la instrucción posterior del usuario de desarrollar primero y verificar/corregir después.

**Files:** backend/app/modules/identity/{api,schemas,service,models,repository}.py; modules/users/{models,service}.py; core/security.py; migrations/versions/001_identity.py; tests/security/test_sessions.py; mobile/src/features/auth/{api/authApi.ts,session.ts,screens/LoginScreen.tsx,screens/RegisterScreen.tsx}; mobile/app/(auth)/{login,register}.tsx.
**Interfaces:** register(email,password)->Account; login(email,password)->TokenPair; refresh(token)->TokenPair; logout(session_id)->None; current_account()->Account. TokenPair access_token, refresh_token, expires_in; /me devuelve id/email/base_currency COP, nunca hash.

- [ ] Escribir tests HTTP/PG: contraseña 11/129 inválida, email duplicado, hash no expuesto, credenciales erróneas idénticas, token firmado incorrectamente/expirado sin acceso; refresh replay/concurrencia; logout invalida acceso; límites 429.
- [ ] Ejecutar tests rojos con pytest tests/security/test_sessions.py.
- [ ] Implementar migración accounts/profiles/sessions y rotación con familia/lock; tokens con políticas de revisión técnica. Crear pantallas con labels/autofill y sesión SecureStore; limpiar caché y cancelar peticiones al salir.
- [ ] Probar cambio A→B, login sin red, expiración durante petición y dos 401 simultáneos. npm test y pytest completos verdes.
- [ ] Aceptación: registro→login→me→logout funciona con PG, token revocado denegado y sin datos A al entrar B.

### Tarea 3: Movimientos vertical

**Files:** modules/movements/{api,schemas,service,models,repository}.py; migrations/versions/002_movements.py; tests/security/test_ownership.py; tests/integration/test_movements.py; mobile/src/features/movements/{api/movementsApi.ts,screens/MovementForm.tsx,screens/MovementList.tsx}; app/(private)/movements/{index,new,[id]}.tsx.
**Interfaces:** create_movement(account_id, CreateMovement)->Movement; list_movements(account_id,month,cursor,limit)->Page; update/archive requieren id+owner. CreateMovement: type income|expense, amount string, currency COP, occurred_on ISO date, category_id UUID, note <=500, client_request_id UUID; extras rechazados.

- [ ] Tests rojos: A crea; B no lee/edita/archiva; owner_id extra 422, categoría B 404; importe inválido 422; idempotencia mismo UUID/payload devuelve recurso único y distinto payload 409; fecha futura inválida; lista paginada estable sin ajenos.
- [ ] Ejecutar pytest tests/security/test_ownership.py tests/integration/test_movements.py.
- [ ] Crear tablas con restricciones, seed categorías sistema idempotente, service transaccional y pruebas PostgreSQL. Añadir formulario/lista usando cadenas monetarias.
- [ ] Probar error/timeout conserva formulario, reintento mismo UUID, editar invalida mes original y nuevo, archivo excluido; pytest/npm test verdes.
- [ ] Aceptación: datos persisten al reiniciar API; doble envío no duplica y operaciones ajenas no cambian A.

### Tarea 4: Dashboard vertical

**Files:** modules/dashboard/{api,schemas,service,repository}.py; tests/integration/test_dashboard.py; mobile/src/features/dashboard/{api/dashboardApi.ts,screens/DashboardScreen.tsx}; app/(private)/index.tsx.
**Interfaces:** GET summary?month=YYYY-MM -> {month,currency,income,expense,net,comparison:{delta,percent,reason},recent_movements}; importes strings, delta/percent nullable; repositorio filtra dueño/moneda/deleted_at/DATE antes de agregar.

- [ ] Tests rojos con A/B y fechas: ingresos 1000/gastos 250→750; anterior 500→250/50%; anterior cero/negativo/sin datos; mes vacío; archivados; cinco recientes del mes en orden determinista; fecha fuera del mes excluida.
- [ ] Ejecutar pytest tests/integration/test_dashboard.py.
- [ ] Implementar agregados SQL y endpoint privado; tarjetas accesibles y mensaje comparativo; no llamar saldo a net.
- [ ] Ejecutar suite completa y pruebas UI de caché invalidada al crear/editar/archivar, error/reintento y mes vacío.
- [ ] Aceptación: dashboard actualizado tras movimiento sin recarga manual y solo datos del propietario.

### Tarea 5: Componentes y accesibilidad transversal

**Files:** mobile/src/shared/ui/{AppButton,FormField,AmountInput,Screen}.tsx; mobile/src/shared/accessibility/announcements.ts; mobile/src/shared/ui/__tests__/forms.test.tsx; docs/accessibility/first-delivery.md.
**Interfaces:** componentes propagan role/label/state/value; FormField identifica label/error; Screen permite foco al título; guardar anuncia éxito una vez. No agrupar controles hijos ocultando acciones.

- [ ] Tests UI rojos: error sin monto asociado y foco recuperable, campos conservados, busy bloquea submit duplicado, controles con nombres únicos, importes no convertidos a float.
- [ ] Implementar mínimos reutilizables y sustituir duplicaciones en pantallas.
- [ ] npm test/typecheck; recorrido real TalkBack con 1.5x/teclado y Reduce Motion; medir contraste y target.
- [ ] Aceptación por pantalla según tabla de revisión técnica. Registrar pendientes Apple explícitamente.

### Tarea 6: Integración y entrega reproducible

**Files:** mobile/e2e/first-delivery.yaml; backend/tests/integration/test_migrations.py; docs/accessibility/first-delivery.md; README.md; .github/workflows/quality.yml.
**Interfaces:** Compose + alembic upgrade head sobre PG vacío; URL LAN móvil configurable; sin credenciales demo compartidas en despliegue.

- [ ] Añadir pruebas migraciones desde cero y recorrido E2E registro→login→gasto→dashboard→logout, incluyendo pérdida de red y error recuperable.
- [ ] Ejecutar docker compose --env-file infra/.env -f infra/compose.yaml up -d. Para Alembic desde host, establecer DATABASE_URL con postgresql+psycopg, localhost:5432 y la contraseña local (la variable del contenedor no se hereda); ejecutar backend/.venv/Scripts/python -m alembic -c backend/alembic.ini upgrade head desde raíz; suites PG completas.
- [ ] CI lint/typecheck/tests/contrato + Expo export; grabar TalkBack <=3 minutos y reflexión 300–500 palabras.
- [ ] Aceptación: los tres integrantes reproducen README, aislamiento probado, ningún crítico de seguridad/accesibilidad abierto; restauración de backup antes de datos reales.

## Comandos y verificación

Los comandos operativos de fase 0 están en README y se verifican en el entorno disponible. Los comandos/migraciones de tareas 2–6 son futuros y solo se declararán ejecutados cuando existan. No se marcarán tareas futuras como terminadas por tener su plan escrito.
