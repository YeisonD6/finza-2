# FINZA

_Tus cuentas claras, con Monedin a tu lado._

App móvil de finanzas personales en pesos colombianos: registra ingresos y gastos en segundos, muestra el flujo neto del mes y en qué categorías se va el dinero, y ayuda a cumplir presupuestos y metas de ahorro. Está diseñada para usarse también con lector de pantalla y letra grande.

**Documento técnico final:** [docs/entrega-final/FINZA-documento-final.md](docs/entrega-final/FINZA-documento-final.md) (y su PDF en la misma carpeta).

## Funcionalidades

- Registro e inicio de sesión con correo y contraseña, recuperación de contraseña y verificación de correo. Google y Apple están programados y se ocultan mientras no haya credenciales.
- Inicio: flujo neto del mes, ingresos, gastos, comparación con el mes anterior y últimos movimientos. Deslizar hacia abajo actualiza.
- Registrar movimientos con un formulario o escribiendo en español («almuerzo 18 mil»); el texto se interpreta en el teléfono.
- Movimientos por mes con filtros; deslizar una fila a la izquierda la archiva (también hay botón «Archivar movimiento»).
- Presupuestos mensuales por categoría con estado en texto: al día, cerca del límite, excedido.
- Metas de ahorro con abonos y porcentaje de avance.
- Análisis del gasto por categoría con una dona que también se lee en texto.
- Modo claro y oscuro, Monedin animado y widgets de Android (solo en development build).

## Arquitectura

```text
Teléfono (Expo / React Native)  ── HTTP JSON + token ──>  API FastAPI  ── SQL ──>  PostgreSQL 17
```

| Carpeta                    | Contenido                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `mobile/src/app`           | Pantallas; cada archivo es una ruta de Expo Router: `(auth)`, `(tabs)`, `movement`, `goal`, `budgets`, `security`, `insights`    |
| `mobile/src/features`      | Lógica por función: `auth`, `dashboard`, `movements`, `quick-entry`, `budgets`, `goals`, `widgets`                               |
| `mobile/src/shared`        | Componentes (`ui`), tema y animaciones (`theme`), Monedin (`brand`), cliente de la API (`api`), formato de dinero (`formatting`) |
| `mobile/src/core/store.ts` | Redux Toolkit + RTK Query                                                                                                        |
| `backend/app/modules`      | Un módulo por tema: `identity`, `users`, `movements`, `dashboard`, `budgets`, `goals`, `audit`                                   |
| `backend/migrations`       | Migraciones Alembic `001_identity` a `006_email_verification`                                                                    |
| `infra/compose.yaml`       | PostgreSQL + migraciones + API con Docker                                                                                        |
| `docs/`                    | Arquitectura, diseño, accesibilidad, decisiones y entrega final                                                                  |

Detalle: [arquitectura](docs/engineering/architecture.md), [decisiones](docs/delivery/decisions.md), [sistema de diseño](docs/engineering/design-system.md), [autenticación](docs/engineering/auth.md), [widgets](docs/engineering/widgets.md).

## Requisitos

- Python 3.12 y Node 24 LTS con npm.
- PostgreSQL 17, local o con Docker Compose.
- Para el teléfono: **Expo Go para SDK 58**, en la misma red Wi-Fi que el computador.

## Variables de entorno

Nunca se suben a Git: `.env` y `.env.local` están en `.gitignore`. Cada carpeta tiene su plantilla `.env.example`.

| Archivo              | Variable                                           | Para qué                                                                                                  |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `backend/.env.local` | `DATABASE_URL`                                     | Conexión a PostgreSQL, dialecto `postgresql+psycopg://`                                                   |
|                      | `JWT_SECRET`                                       | Clave aleatoria de al menos 32 bytes: `python -c "import secrets; print(secrets.token_urlsafe(48))"`      |
|                      | `FINZA_MAIL_MODE`                                  | `log` en desarrollo: los enlaces de correo se escriben en la consola de la API                            |
|                      | `FINZA_CORS_ORIGINS`                               | Solo para la vista web de desarrollo, por ejemplo `http://localhost:8081`                                 |
|                      | `FINZA_GOOGLE_CLIENT_IDS`, `FINZA_APPLE_AUDIENCES` | Opcionales: activan Google y Apple                                                                        |
| `infra/.env`         | `POSTGRES_PASSWORD`, `JWT_SECRET`                  | Solo si se usa Docker Compose                                                                             |
| `mobile/.env.local`  | `EXPO_PUBLIC_API_URL`                              | Vacía o `auto`: la app usa la IP del computador que corre Metro. Emulador Android: `http://10.0.2.2:8000` |
|                      | `EXPO_PUBLIC_API_PORT`                             | Puerto de la API cuando se usa `auto` (8000 por defecto)                                                  |

Las variables `EXPO_PUBLIC_` quedan dentro de la app: nunca pongas secretos en ellas.

## Cómo ejecutarlo

### 1. Base de datos y API

**Opción A, con Docker Compose** (base de datos, migraciones y API en el puerto 8000):

```bash
cp infra/.env.example infra/.env   # cambiar POSTGRES_PASSWORD y JWT_SECRET
docker compose --env-file infra/.env -f infra/compose.yaml up --build -d
```

**Opción B, sin Docker** (PostgreSQL ya instalado):

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock.txt
cp .env.example .env.local         # completar DATABASE_URL, JWT_SECRET y FINZA_MAIL_MODE=log
set -a && . ./.env.local && set +a
.venv/bin/python -m alembic upgrade head
.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

En Windows, usar `.venv\Scripts\python` y definir las variables en PowerShell con `$env:NOMBRE="valor"`.

La documentación interactiva queda en http://localhost:8000/docs. `GET /health/ready` responde 503 si PostgreSQL no está disponible.

### 2. Cuenta de demostración

Con la API corriendo, desde `backend/`:

```bash
FINZA_API_URL=http://127.0.0.1:8000 .venv/bin/python -m scripts.seed_demo
```

Crea `demo@finza.app` con movimientos, presupuestos y metas. La contraseña está documentada en `backend/scripts/seed_demo.py`.

### 3. App móvil

```bash
cd mobile
npm ci
npx expo start
```

Escanea el QR con Expo Go: con la cámara en iPhone o desde la propia Expo Go en Android. Si la API no usa el puerto 8000, crea `mobile/.env.local` con `EXPO_PUBLIC_API_URL=auto` y `EXPO_PUBLIC_API_PORT=<puerto>` y reinicia Metro. Si cambias de red, reinicia Metro y escanea el QR nuevo.

## Pruebas

```bash
cd backend && .venv/bin/python -m pytest -q && .venv/bin/python -m ruff check app tests migrations
cd mobile && npm test && npm run typecheck
```

Las pruebas de PostgreSQL necesitan `DATABASE_URL` y `FINZA_PG_ADMIN_URL` (un usuario con permiso para crear bases de datos). GitHub Actions ([quality.yml](.github/workflows/quality.yml)) corre todo en cada cambio, además de `npm run export:android`.

Si cambia la API, regenera el contrato: desde `backend/`, `.venv/bin/python -m scripts.export_openapi`; luego desde `mobile/`, `npm run api:types`.

## Accesibilidad

- Etiquetas, roles y estados nativos (`accessibilityLabel`, `accessibilityRole`, `accessibilityState`) en botones, campos, filas y gráficas. Cada fila de movimiento se lee como un solo elemento.
- Texto con contraste de 4,5:1 o más y gráficos y bordes de 3:1 o más, en modo claro y oscuro ([tabla de contraste](docs/engineering/design-system.md)).
- Controles de 48 dp o más, fuente escalable y nada que dependa solo del color: los gastos llevan signo y los presupuestos dicen su estado en texto.
- Errores anunciados con foco en el primer campo inválido; los guardados se anuncian.
- Con «Reducir movimiento», las animaciones quedan quietas. Hay vibración háptica en confirmaciones y errores.
- Pendiente: recorrido completo con TalkBack y VoiceOver en un teléfono real ([listas de verificación](docs/accessibility/)).

## Equipo

Isabela Benítez · Juan David Rubio · Yeison Niño Arias — Desarrollo de Aplicaciones Móviles, Universidad de La Sabana, 2026.
