# Continuar Finza

Rama: codex/finza-foundations. Leer este archivo y progress.md antes de trabajar.

## Estado actual

- Endpoint registro backend probado con SQLite de pruebas y PostgreSQL 18 real: email normalizado único, contraseña 12–128 caracteres, extras rechazados, hash Argon2id, perfil COP en transacción.
- Migración 001_identity: accounts, user_profiles, refresh_sessions. Alembic upgrade/downgrade/upgrade y check contra modelos pasaron.
- Suite completa: 43 passed, sin skips con PostgreSQL; warning conocido TestClient/httpx. Ruff y pip check verdes.
- Docker no instalado en PATH ni ruta estándar. Compose incorpora migración previa a API, pero ejecución y build de contenedores siguen sin comprobar. CI actualizado, no ejecutado remotamente.
- PostgreSQL 18.4 en C:/Program Files/PostgreSQL/18/bin. Instancia de prueba creada en tmp/pg-verification, puerto 55439, usuario finza_test. Solo datos sintéticos, loopback y trust para pruebas locales. Se detiene al cerrar esta sesión.
- Shell móvil sin login; contrato actualizado. Node24 requerido. Persisten los avisos Expo descritos en progress.md.

## Repetir pruebas en PowerShell desde raíz

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/tmp/pg-verification" -l "$PWD/tmp/pg-verification.log" -o '-h 127.0.0.1 -p 55439' -w start
$env:FINZA_PG_ADMIN_URL='postgresql+psycopg://finza_test@127.0.0.1:55439/postgres'
$env:DATABASE_URL=$env:FINZA_PG_ADMIN_URL
cd backend
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff check app tests migrations
cd ..
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D "$PWD/tmp/pg-verification" -m fast -w stop
```

Si tmp/pg-verification no existe (otro computador): usar PostgreSQL de prueba propio y definir las URLs, o Docker disponible con el servicio db. FINZA_PG_ADMIN_URL solo para pruebas con privilegios CREATE DATABASE; la API normal debe usar usuario de aplicación con privilegios limitados.

## Próximo trabajo acotado

Continuar tarea 2 del plan de primera entrega: login, access JWT, refresh rotatorio transaccional/familias, logout, rate limiting y pruebas negativas/concurrencia. Después pantallas de autenticación, SecureStore, limpieza de caché entre usuarios y pruebas de accesibilidad. No declarar terminada Fase 1 ni publicar el registro hasta cubrir esas piezas.
