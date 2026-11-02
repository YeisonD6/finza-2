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

El backend ofrece `POST /api/v1/auth/register` con JSON `{"email":"laura@example.com","password":"una contraseña larga"}`. Devuelve id, email normalizado y moneda COP; no inicia sesión. Login (`POST /api/v1/auth/login`) recibe las mismas credenciales y devuelve access_token/refresh_token. Refresh y logout reciben `{"refresh_token":"..."}`; `GET /api/v1/me` requiere Bearer access_token.

Antes de usar auth, establecer JWT_SECRET aleatorio de al menos 32 bytes en la terminal; puede generarse con `backend/.venv/Scripts/python -c "import secrets; print(secrets.token_urlsafe(48))"`. Guardarlo localmente fuera de Git. backend/.env.example documenta variables; la API lee el entorno y no carga archivos .env sola. Para Compose definir JWT_SECRET también en infra/.env. No hay clave insegura por defecto.

Regenerar contrato desde backend: `.venv/Scripts/python -m scripts.export_openapi`; luego desde mobile: `npm run api:types`. Incluye auth y /me. TypeScript se mantiene en 5.9 por compatibilidad del generador OpenAPI7; es la única exclusión explícita de la comprobación de versiones Expo.

## Límites actuales

Autenticación backend/móvil implementada y probada automáticamente, incluyendo cliente TypeScript contra API/PG reales y aislamiento de sesiones/caché. Desde mobile ejecutar `npm test`, `npm run typecheck` y `npm run export:android`. La prueba hardware Android/TalkBack/SecureStore y Apple sigue pendiente. Movimientos y dashboard conectado pertenecen a la siguiente fase. Ver CONTINUE.md y progress.md para resultados y límites de dependencias.
