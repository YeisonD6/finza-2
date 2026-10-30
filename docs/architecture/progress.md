# Avance de Finza — 30 octubre 2026

## Actualización más reciente: identidad backend

Se verificó PostgreSQL 18.4 local en instancia aislada: readiness FastAPI, migración 001_identity, comparación de metadata Alembic, downgrade y nueva subida. Registro de usuarios probado con Argon2id, perfil COP, validaciones, secreto no expuesto y duplicados simultáneos (201/409, una cuenta y un perfil). Suite: 43 passed, 0 skipped, warning TestClient conocido; ruff/pip check sin errores. Docker no disponible: Compose modificado con servicio migrate pero no ejecutado. Contrato OpenAPI/tipos regenerados. Ver CONTINUE.md para reanudar. Las notas anteriores de identidad no implementada y PG pendiente quedan superadas solo para registro/tablas/conexión; login, refresh/logout y aislamiento de recursos privados siguen pendientes.

Plan: docs/superpowers/plans/2026-10-30-finza-first-delivery.md

## Implementado en el inicio de fase 0

- Rama codex/finza-foundations. No push ni despliegue.
- Revisión técnica de los seis puntos solicitados y plan de la primera entrega con responsables propuestos.
- FastAPI health, readiness SELECT 1, request_id y errores HTTP estables.
- Reglas de dinero COP, redondeo, calendario Bogotá y comparación de flujo neto.
- Compose PostgreSQL/API y plantilla Alembic. Todavía sin tablas de negocio.
- Expo SDK 58, React Native 0.88.1, Redux Toolkit/RTK Query y TypeScript; pantalla inicial explícita, sin login simulado.
- OpenAPI exportado y tipos generados. CI configurado para PG real y export móvil.

## Evidencia

- Pruebas escritas antes de implementación: colección falló por app inexistente; luego reglas y HTTP verdes.
- Suite backend: 32 pasaron, 1 omitida (requiere PostgreSQL real), 1 warning de deprecación de TestClient/httpx.
- Ruff: sin errores después de formato.
- Prueba de regresión de precisión Decimal: falló con InvalidOperation antes del arreglo; pasó después junto con suite completa.
- TypeScript sin errores, contrato generado y export Android final completado (1155 módulos) con rutas en src/app. Es bundle JavaScript/Hermes, no APK ni prueba de dispositivo.
- Revisión independiente: corregidos contexto Decimal y comando Compose/DATABASE_URL.
- Grafo FINZA-2 aún no registra archivos nuevos (generación 2026-10-30T19:17:52Z); revisión de fuente directa realizada, sin inferir exhaustividad del grafo.

## Decisiones de ejecución

- El repositorio sin commits iniciales se trabaja en rama local autorizada, sin worktree adicional.
- Rutas en mobile/src/app y store en mobile/src/core: Expo interpreta cualquier src/app como raíz de navegación, incluso si solo contiene store o queda vacío. El diseño lógico por funcionalidades permanece.
- SDK58 requiere Node moderno: pruebas móviles usan Node24.22.1 disponible en runtime. No se cambió Node global del usuario. El equipo debe usar Node24 para npm start/ci.
- Moneda, fecha y comparación son reglas puras; seguridad entre usuarios queda en tareas 2–3, no se declara implementada porque exista su especificación.

## Pendientes antes de cerrar fase 0 / entregar funcionalidad

- Docker no disponible en PATH: Compose y PG real no se ejecutaron localmente. CI está escrito, no ejecutado remotamente.
- Componentes compartidos de formularios accesibles y pruebas UI se completan al desarrollar autenticación y movimientos; el shell solo aporta texto escalable, contraste y título semántico.
- TalkBack, VoiceOver, Inspector y recorrido real de dispositivos NO realizados.
- npm audit SDK58: 8 avisos (5 low, 3 high), principalmente cadena de herramientas Expo/deepmerge/zod. npm propone downgrade mayor a SDK51; no aplicado por incompatibilidad. Revisar con proveedores antes de publicación; no proclamar dependencias libres de vulnerabilidades ni tratar número de paquetes afectados como vulnerabilidades independientes.
- TestClient advierte deprecación de httpx; sigue funcionando. Migración de herramienta de pruebas pendiente.
- Identidad, persistencia, permisos por propietario, idempotencia, dashboard agregado y sus pruebas negativas están planificados, no implementados en esta fase inicial.

## Siguiente entrega

Tarea 2 identidad vertical (backend, migración, pantallas y pruebas de sesiones), seguida por tareas 3–4. Corregir avisos de herramientas/confirmar entorno PG antes de declarar lista una versión para usuarios.
