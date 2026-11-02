# Continuar Finza — 2 noviembre 2026

Rama: codex/finza-foundations. Leer este archivo y progress.md antes de trabajar.

## Estado actual

- Autenticación implementada: registro Argon2id, login, access JWT HS256 (15 min), refresh opaco rotatorio (familia absoluta 30 días), replay revoca familia, logout y /api/v1/me con sesión activa y propietario comprobados.
- Migraciones 001_identity y 002_sessions: cuentas/perfiles/tokens, session_families con bloqueo PostgreSQL y auth_buckets distribuidos. Upgrade/downgrade y Alembic check cubiertos por pruebas.
- Cliente móvil: registro/login, recuperación SecureStore, perfil privado, logout, refresh compartido entre 401 concurrentes, tokens fuera de Redux y limpieza de caché/peticiones entre identidades.
- Resultados: 61 pruebas backend sin omitidas (incluye puente TypeScript→FastAPI→PostgreSQL real), 8 cliente de sesión, 4 UI/caché, Ruff, pip check, TypeScript y export Android correctos. Warning conocido de deprecación TestClient/httpx. Detalles en progress.md.
- Docker no instalado en PATH ni ruta estándar. Compose incorpora migración previa a API, pero ejecución y build de contenedores siguen sin comprobar. CI actualizado, no ejecutado remotamente.
- PostgreSQL 18.4 en C:/Program Files/PostgreSQL/18/bin. Instancia de prueba creada en tmp/pg-verification, puerto 55439, usuario finza_test. Solo datos sintéticos, loopback y trust para pruebas locales. Se detiene al cerrar esta sesión.
- Node24 requerido. TypeScript 5.9 fijado por compatibilidad peer del generador OpenAPI 7; única exclusión intencional de expo install --check. No usar --force/--legacy-peer-deps. Contrato actualizado.
- JWT_SECRET obligatorio (>=32 bytes aleatorios); no hay clave por defecto. Sin clave, auth responde 503. Ver backend/.env.example; el código lee variables de entorno, no carga .env automáticamente.
- Fase implementada y verificada automáticamente; cierre manual pendiente en Android real (SecureStore/TalkBack/teclado/texto 1.5x). No hay SDK Android/ADB disponible en este entorno; tampoco se ejecutaron pruebas Apple. No declarar auditoría WCAG completa.

## Repetir pruebas en PowerShell desde raíz

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/tmp/pg-verification" -l "$PWD/tmp/pg-verification.log" -o '-h 127.0.0.1 -p 55439' -w start
$env:FINZA_PG_ADMIN_URL='postgresql+psycopg://finza_test@127.0.0.1:55439/postgres'
$env:DATABASE_URL=$env:FINZA_PG_ADMIN_URL
$env:FINZA_NODE='C:/Users/ACER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
cd backend
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tests migrations
cd ..
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/tmp/pg-verification" -m fast -w stop
```

Si tmp/pg-verification no existe (otro computador): usar PostgreSQL de prueba propio y definir las URLs, o Docker disponible con el servicio db. FINZA_PG_ADMIN_URL solo para pruebas con privilegios CREATE DATABASE; la API normal debe usar usuario de aplicación con privilegios limitados.

En mobile, usando Node24: `npm ci`, `npm test`, `npm run typecheck`, `npm run export:android`. Instalar dependencias móviles antes del pytest completo para que la prueba puente no se omita. CI backend no instala mobile y omite explícitamente el puente; localmente sí se ejecutó.

Para desarrollo: establecer DATABASE_URL de aplicación y JWT_SECRET aleatorio en la terminal, ejecutar desde backend `.venv/Scripts/python -m alembic upgrade head` y `.venv/Scripts/python -m uvicorn app.main:app --reload --host 0.0.0.0`. Ajustar EXPO_PUBLIC_API_URL al host LAN para teléfono o 10.0.2.2 para emulador.

## Próximo trabajo acotado

Validar manualmente registro/login/restauración/logout con SecureStore real y TalkBack, incluyendo modo avión y fallos recuperables; documentar evidencia por pantalla. Docker sigue pendiente. La siguiente funcionalidad es tarea 3: categorías y movimientos COP con autorización por propietario, idempotencia y archivo lógico; después dashboard (tarea 4). No reimplementar autenticación.
