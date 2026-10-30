# Finza

Monolito modular: FastAPI + PostgreSQL y Expo/React Native + Redux Toolkit/RTK Query.

## Documentación

- [Arquitectura](docs/superpowers/specs/2026-10-30-finza-mvp-architecture-design.md)
- [Revisión técnica vinculante](docs/architecture/technical-review.md): dinero, fechas, seguridad, accesibilidad y prioridades.
- [Plan de la primera entrega](docs/superpowers/plans/2026-10-30-finza-first-delivery.md): archivos, responsables, pruebas y aceptación.
- [Avance y limitaciones](docs/architecture/progress.md).

## Desarrollo local (PowerShell)

Requisitos: Python 3.12, Node 24 LTS (>=24.3), npm y Docker Compose para PostgreSQL. Expo SDK 58 y sus dependencias siguen la matriz oficial bundledNativeModules y package-lock. No asumir que Expo Go de otra versión es compatible: usar un development build si corresponde.

Las rutas están en `mobile/src/app`; el store en `mobile/src/core`. El Node global de esta máquina es 20: para los comandos móviles seleccionar Node24. Durante la preparación se usó el ejecutable disponible `C:/Users/ACER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`; no se cambió la instalación global.

Desde la raíz:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.lock.txt
Copy-Item infra/.env.example infra/.env
# Cambiar POSTGRES_PASSWORD en infra/.env (solo desarrollo; sin símbolos URL reservados).
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

API: http://localhost:8000/docs. Health `/health/live`; readiness `/health/ready` responde 503 si PostgreSQL no está disponible. Compose es exclusivamente desarrollo, no configuración de producción.

Alternativa sin Docker para trabajar en API/dominio (readiness seguirá 503):

```powershell
cd backend
.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0
```

Si hay PostgreSQL instalado por separado, definir DATABASE_URL con dialecto postgresql+psycopg. No publicar esa variable ni guardar credenciales en git.

Móvil, en otra terminal:

```powershell
cd mobile
npm ci
Copy-Item .env.example .env
npm start
```

Para Android emulado, API en http://10.0.2.2:8000. En teléfono físico, EXPO_PUBLIC_API_URL usa la IP LAN del computador; ambos dispositivos deben compartir red. La URL es pública en el bundle; nunca poner secretos en EXPO_PUBLIC_. El shell inicial no requiere API para mostrar la pantalla.

## Verificación

```powershell
cd backend
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tests
cd ../mobile
npm run typecheck
npm run export:android
```

La prueba de readiness PostgreSQL se omite si DATABASE_URL no está definida. Las pruebas de migración/registro/concurrencia crean y eliminan una base aislada y requieren FINZA_PG_ADMIN_URL con permiso CREATE DATABASE. CI configura ambas variables con su PostgreSQL de pruebas; nunca usar credenciales de producción.

La migración `001_identity` crea accounts, user_profiles y refresh_sessions. Compose prepara primero la base, luego ejecuta Alembic y finalmente arranca API. Docker/Compose todavía no se pudieron ejecutar en esta máquina; la conexión y migración sí se verificaron directamente contra PostgreSQL 18 instalado localmente.

El backend ofrece `POST /api/v1/auth/register` con JSON `{"email":"laura@example.com","password":"una contraseña larga"}`. Devuelve id, email normalizado y moneda COP; no inicia sesión. Login, refresh, logout y límites de intentos están pendientes; no desplegar el registro públicamente hasta completarlos.

Regenerar contrato desde backend: `.venv/Scripts/python -m scripts.export_openapi`; luego desde mobile: `npm run api:types`. El contrato inicial solo contiene health; endpoints privados se agregan con sus módulos.

## Límites actuales

La base prepara API health, primitivas de dinero/fecha/comparación y shell móvil. Registro backend y tablas de identidad probados; login, persistencia financiera, aislamiento HTTP de recursos privados y dashboard conectado pendientes. No ingresar datos financieros reales hasta completar seguridad y pruebas de la entrega vertical.
