# Avance de Finza — 30 octubre 2026

## Actualización 2 noviembre 2026 — Fase 1 autenticación

Implementados login, access JWT (iss/aud/sub/sid/exp/nbf/iat/type/jti), refresh opaco con SHA-256 persistido, familias bloqueadas con SELECT FOR UPDATE, expiración absoluta, replay con revocación de familia y logout que invalida access existentes. /me valida familia y cuenta activa; no acepta propietario desde cliente. Límites atómicos en PostgreSQL: registro 5/h/IP, login 5 intentos fallidos/15min por IP+email (se reserva antes de verificar y se limpia tras éxito), refresh 30/min/familia. Identificadores de buckets en HMAC, sin IP/email en claro; ventanas desde primer intento. JWT_SECRET obligatorio sin valor por defecto. Respuestas privadas de auth y /me no-store.

Móvil: pantallas de registro/login y perfil privado; formularios con labels/autofill, texto escalable, controles >=48, errores anunciados/foco y doble envío bloqueado. Refresh en SecureStore y access solo en memoria; Redux conserva perfil/estado, nunca tokens/contraseñas. Refresh single-flight, generación de sesión para descartar respuestas antiguas, cancelación de queries/mutations y resetApiState al salir/cambiar cuenta. Restore al inicio y logout local incluso sin conexión; la UI informa cuando no logra confirmar revocación remota/almacenamiento. Si no hay red, la revocación de servidor no se puede garantizar hasta que expire la familia o se revoque con conexión.

Migración 002_sessions crea session_families/auth_buckets y FK de tokens; Compose requiere JWT_SECRET e incluye migración antes de API. El grafo aún carece de símbolos de estos archivos (Tier2, cobertura not_tracked), por lo que se revisó fuente directa.

Resultado final: **61 pruebas backend pasaron, 0 omitidas**, con PostgreSQL18 real y puente TypeScript→HTTP FastAPI→PG. Incluye migraciones upgrade/downgrade/check, 401 JWT malformado/expirado/algoritmo/firma/issuer/audience/tipo/identidad incorrectos, cuenta deshabilitada, refresh absoluto/replay/concurrente, aislamiento A/B, logout y límites 429. **8 pruebas del cliente de sesión y 4 de UI/caché pasaron**; TypeScript, Ruff, pip check y compatibilidad Expo pasaron (exclusión TypeScript documentada). Export Android final: 1163 módulos, bundle Hermes generado; no APK ni prueba de dispositivo. Generación OpenAPI actualizada y revisión independiente corregida.

El lockfile se reinstaló con `npm ci --ignore-scripts` sin conflictos de peer dependencies. No se modificó Node global; se usó Node24 del runtime. El PostgreSQL de pruebas ya estaba ejecutándose al comenzar y no se detuvo una instancia preexistente del usuario; cada prueba eliminó solo su base temporal finza_test_<uuid>.

Revisión independiente encontró que un fallo al borrar SecureStore evitaba revocación remota. Se reprodujo con test rojo, se corrigió para intentar ambas operaciones y el test pasó. Pruebas UI ajustadas a la API asíncrona de Testing Library14; Jest usa entradas CJS para immer/react-redux y limpia timers de RTK al terminar.

Decisión de herramientas: TypeScript 5.9, porque openapi-typescript7 requiere ^5.x; Expo recomienda 6 pero no lo exige para ejecutar. Se intentó la actualización y se revirtió ante peer incompatible; exclusión explícita solo de TypeScript en expo.install.exclude. Router alineado con la matriz nueva. Sin cambios de arquitectura ni instalación global Node. Código móvil formateado con Prettier.

Seguridad de dependencias: npm audit fix sin --force corrigió los avisos altos detectados (zod/cadena Expo). Quedan 33 paquetes señalados (32 moderate, 1 low), principalmente glob/minimatch/deepmerge y herramientas; npm sugiere downgrade incompatible a Expo51 para varios de ellos, no aplicado. No se afirma que el árbol esté libre de vulnerabilidades. TestClient/httpx conserva aviso de deprecación.

Pendientes reales para cierre manual: SDK Android/ADB y dispositivo/emulador no disponibles; SecureStore nativo, TalkBack, texto ampliado, teclado y Apple no probados en hardware. Docker/Compose y CI remoto tampoco ejecutados. Registro/login/perfil/logout ya tienen implementación y pruebas automáticas; no confundir ese resultado con conformidad WCAG ni prueba de binario Android.

Fuentes primarias de implementación: [FastAPI/JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/) y [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). Las duraciones, rate limits y revocación por familia son decisiones propias de Finza.

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
