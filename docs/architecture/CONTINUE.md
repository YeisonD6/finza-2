# Continuar Finza — 2 noviembre 2026

## Último avance: Fase 2 / Tarea 3

- Categorías de sistema y privadas + movimientos COP implementados en backend/BD/móvil. No rehacer autenticación. Migración vigente: **003_movements**; aplicar con Alembic antes de iniciar la API.
- Endpoints privados: GET/POST /api/v1/categories; GET/POST /api/v1/movements; GET/PATCH/DELETE /api/v1/movements/{id}. UUID client_request_id obligatorio al crear; mismo usuario/clave/contenido devuelve recibo original (200), contenido distinto 409. Nunca reaparece un archivado por replay.
- Filtrar por month=YYYY-MM, type=income|expense y category_id. Listado paginado con next_cursor; solo recursos propios activos. DELETE archiva y es repetible para el propietario.
- Categorías existentes inmutables; se pueden añadir categorías privadas. Edición/archivo son operaciones de movimientos. Cuenta/perfil/logout existentes conservados.
- Última suite: 87 backend PG reales sin omisiones (incluye puente y reinicio de API), 10 cliente/dominio, 11 UI/caché. Tipos, lint y export Android correctos. Ver progress.md para límites y decisiones.
- Manual Android/TalkBack/teclado/Alert/foco/SecureStore, Apple y Docker pendientes. No afirmar auditoría accesible o prueba de APK realizadas. Lista en docs/accessibility/movements-checklist.md.
- **Siguiente funcionalidad: Tarea 4, dashboard financiero.** No reconstruir categorías, movimientos ni sesiones.

El estado de autenticación que sigue se conserva como referencia de Fase1; los contadores de pruebas anteriores quedan reemplazados por los de arriba.

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

Validar manualmente flujos de autenticación y movimientos con dispositivo real y TalkBack. Docker sigue pendiente. Desarrollar **Tarea4: dashboard financiero** con ingresos, gastos, flujo neto, comparación mensual y últimos cinco activos del mes; no confundir flujo neto con saldo o patrimonio. Reutilizar servicios/consultas de lectura del módulo de movimientos y tags Dashboard ya previstos. Mantener aislamiento por propietario y tratamiento de cero/negativo/sin mes anterior según revisión vinculante.
