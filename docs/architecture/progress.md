# Avance de Finza — 30 octubre 2026

## Actualización 2 noviembre 2026 — Tarea 5: componentes y accesibilidad transversal

Implementación transversal desarrollada y verificada automáticamente. AppButton/FormField reutilizados y separados en shared/ui, conservando AuthControls como fachada; nuevos AmountInput, Screen, Feedback, paleta y utilidades de anuncios/foco. Sin cambios de backend, migraciones, contratos ni dependencias. No se reconstruyeron identidad, movimientos o dashboard.

Labels con IDs únicos/estables, error incorporado al hint y visible, propósito/ref/autofill conservados, COP como cadena y ayuda visible. Estados seleccionado/presionado/deshabilitado/busy con señales textuales, foco visible y controles mínimos de 48 dp. Pantallas comparten teclado/scroll/título; Atrás de Android vuelve o cancela y no abandona una escritura pendiente. Cabecera de movimientos dentro de FlatList desplazable. Categorías y mes con errores asociados y foco, errores remotos recuperables, carga/reintento, filas obsoletas ocultas tras error y acciones únicas aunque coincidan monto/fecha. Cambio de modo borra contraseña/visibilidad y conserva email. Guardado solicita éxito una vez; regreso al dashboard muestra éxito y evita otro resumen inmediato. No se limita escalado o líneas del texto.

Revisión independiente encontró un error real: focus ejecutado con editable=false durante catch era ignorado por React Native. Corregido con useDeferredFocus: esperar al render habilitado y solicitar foco en el siguiente frame, con cancelación al salir. Prueba comprueba que no se enfoca mientras está bloqueado y se solicita una vez después. Queda pendiente confirmar ejecución/lectura real del foco en hardware. Un conteo de anuncios no acredita que TalkBack no los interrumpa.

**Resultados reales:** 113 pruebas backend sobre PostgreSQL18 real, sin omisiones; puente TypeScript→HTTP→PG con reinicio de API. 10 pruebas cliente/dominio y 41 Jest UI/caché verdes (19 nuevas frente a Tarea 4); TypeScript, Prettier sobre src/tests, Ruff y pip check correctos. La paleta real supera 4.5:1 en texto/estados y 3:1 en bordes; ratios en docs/accessibility/first-delivery.md. Export Android/Hermes final de 1184 módulos correcto; no APK ni recorrido en dispositivo. Pruebas ajustadas a API instalada de Testing Library14; no se rebajaron validaciones de producción. Orden conforme usuario: primero implementación, después comprobación/corrección. Revisión independiente confirmó resuelto el hallazgo de foco, sin críticos/importantes concretos restantes. PostgreSQL temporal iniciado para la suite y detenido al terminar; cada prueba eliminó solo su base finza_test_<uuid>.

**Cierre manual pendiente:** Android/TalkBack, foco/teclado real, anuncio de éxito audible, fuente 1.5x/2x en vertical/horizontal, targets efectivos, SecureStore y Apple; Docker/ADB no disponibles en PATH, Compose/CI remoto sin ejecutar. No afirmar auditoría/conformidad WCAG 2.2 AA. Checklist y matriz de evidencia: docs/accessibility/first-delivery.md. Grafo FINZA-2 sin símbolos útiles y freshness not_tracked, revisado mediante fuente directa tras búsqueda/cobertura. Aviso TestClient/httpx y avisos de herramientas anteriores conservados; sin cambios de dependencias ni push/despliegue.

**Siguiente tarea: 6 — integración y entrega reproducible.** Completar comandos unificados y README reproducible, E2E nativo cuando haya herramientas, Compose desde base vacía y evidencia accesible del equipo; reutilizar pruebas/migraciones/puente existentes. El código de Tarea 5 no debe rehacerse para empezar Tarea 6; el cierre manual sigue abierto hasta contar con evidencia.

## Actualización 2 noviembre 2026 — Tarea 4: dashboard financiero

Implementados GET /api/v1/dashboard/summary?month=YYYY-MM y dashboard móvil como inicio después del login. Incluye ingresos, gastos, **Flujo neto del mes**, comparación con el mes calendario completo anterior y cinco últimos movimientos activos del mes. Registrar desde dashboard abre el formulario existente; guardar vuelve al mes contable del registro y actualiza las cifras. Navegación hacia movimientos y regreso, perfil/logout y aislamiento de caché conservados.

Se reutilizan current_family, las condiciones de lectura del módulo movimientos, su DTO público, compare_net, dinero Decimal y calendario Bogotá. Agregados y cinco filas se obtienen en una sola sentencia SQL para compartir snapshot incluso ante escrituras concurrentes; no se carga el historial completo. Filtros de propietario/COP/archivo/DATE se aplican antes del agregado. No se requieren tablas ni migraciones nuevas: head sigue siendo 003_movements.

Mes vacío devuelve ceros y lista vacía. Sin registros anteriores no hay comparación; con flujo anterior cero/negativo se informa diferencia absoluta y porcentaje null. Base positiva permite porcentaje ROUND_HALF_UP; un porcentaje diminuto redondeado a cero se publica como 0.00, evitando -0.00. Importes y porcentajes viajan como cadenas, sin float, y los totales pueden superar el límite de un movimiento. Mes predeterminado Bogotá y extremos 1900-01/9998-12 probados. La pantalla usa currentData para no mostrar cifras del mes anterior al cambiar consulta y oculta cifras obsoletas ante error; permite reintentar. Todos los dashboards se invalidan tras crear/editar/archivar.

**Evidencia automática:** 113 pruebas backend pasaron, sin omisiones, sobre PostgreSQL18 real; incluye 26 pruebas nuevas de dashboard, migraciones upgrade/downgrade/check previas, aislamiento A/B, token ausente/alterado y sesión revocada, precisión/centavos/límites, fechas/orden estable, edición/archivo/replay y puente TypeScript→HTTP→FastAPI→PG con reinicio real de API. Móvil: 10 pruebas cliente/dominio y 22 UI/caché pasaron; incluye recorrido con componentes y RTK reales dashboard→formulario→guardar→dashboard y actualización automática. Ruff, pip check y TypeScript verdes. Contrato OpenAPI/tipos regenerados. Expo export Android: bundle Hermes de 1177 módulos generado; no es un APK ni prueba de dispositivo. Expo comprobó su matriz local sin conexión; TypeScript sigue como exclusión intencional documentada. Aviso de deprecación TestClient/httpx existente.

Orden de trabajo conforme instrucción actual del usuario: desarrollar primero y verificar/corregir después. No se reconstruyeron autenticación, categorías ni movimientos. Grafo FINZA-2 sin símbolos útiles (generation 2026-10-30T19:17:52Z, freshness not_tracked); revisión mediante fuente directa tras consultas/cobertura. Revisión independiente final sin hallazgos críticos/importantes: consistencia SQL, autorización, cálculos, contrato, navegación, caché y cobertura de pruebas. Esa revisión no ejecutó nuevamente las suites ni sustituyó pruebas nativas.

**Pendientes manuales:** Android real, TalkBack, teclado/foco, texto 1.5x/2x, SecureStore nativo y Apple; no hay Docker/ADB en este entorno. Checklist específico: docs/accessibility/dashboard-checklist.md. No se afirma conformidad WCAG ni ejecución de contenedores/CI remoto. Sin cambios de dependencias en esta tarea; los avisos de herramientas registrados en Tarea2 no se consideran resueltos. Siguiente tarea del plan: **5 — componentes y accesibilidad transversal**, después 6 — integración y entrega reproducible.

La instancia PostgreSQL temporal estaba detenida al comenzar Tarea4; se inició para las pruebas y se detuvo al terminar. Cada prueba eliminó solo su propia base finza_test_<uuid>. Sin push ni despliegue.

## Actualización 2 noviembre 2026 — Tarea 3: categorías y movimientos COP

Implementados GET/POST categories y GET/POST/GET por id/PATCH/DELETE movements. Se reutiliza current_family, sin rehacer autenticación. Migración 003_movements: categorías, movimientos y audit_events; seis categorías de sistema con UUID estables, creadas una sola vez por Alembic. Cada usuario puede añadir categorías privadas; las categorías existentes no se editan/eliminan en este corte para no alterar la clasificación histórica. Las acciones de edición y archivo de esta tarea corresponden a movimientos.

Importes NUMERIC(19,4), positivos, COP, centavos y límites comprobados en API/BD; JSON canónico de dos decimales como cadena. DATE contable con límites 1900/hoy Bogotá; timestamps aware y orden por fecha contable/created_at/id. Consulta por mes, tipo y categoría; paginación keyset (límite 1–100), cursor ligado al usuario y filtros, nunca usado como autorización. Listas y consultas excluyen archivados; recurso ajeno/inexistente siempre 404. PATCH no permite owner_id/client_request_id y valida categoría/tipo tras combinar cambios.

Idempotencia: UNIQUE(owner_id,client_request_id), hash del contenido canónico original y recibo de creación inmutable (JSONB). Primera creación 201, replay idéntico 200 con Idempotent-Replayed, otro contenido 409. Incluso después de editar/archivar, replay devuelve el recibo original sin revertir la fila actual ni reactivar el registro. Escritura y evento de auditoría en la misma transacción; audit_events registra acción/actor/recurso/fecha, sin copiar nota ni monto. Bloqueo de fila serializa edición/archivo; ediciones válidas sobre el mismo campo conservan la última escritura, no hay restauración implícita.

Móvil: pantalla principal de movimientos después de login, FlatList, filtros, páginas anterior/siguiente, creación/edición y archivo con confirmación. Formularios con COP explícito, nota, fecha contable y categoría; crear categoría privada desde formulario. Clave UUID de Expo Crypto retenida al reintentar sin cambios; cambiar contenido genera otra clave. No se añadió cola offline persistente: cerrar/matar el formulario no conserva un borrador ni su clave. Guardado cambia al mes contable del registro y limpia filtros para mostrarlo; RTK Query invalida todas las listas y el tag Dashboard preparado para tarea4. Profile, logout y limpieza de sesión/caché previos se conservan.

Accesibilidad implementada: labels persistentes, controles >=48, selección con texto visible y estado nativo, errores anunciados/foco, teclado adaptable, archivo sin gesto exclusivo, retorno de foco al título y diferencias ingreso/gasto expresadas en texto. Confirmación native Alert y foco real requieren prueba de dispositivo; no se infiere su funcionamiento con TalkBack desde Jest.

Revisión independiente: detectó expansión Unicode casefold de 60 a 180 caracteres (se cambió name_key a TEXT y se probó el caso) y falta de selección visual (se añadió marcador textual y prueba UI). Fuente directa: el grafo FINZA-2 sigue sin símbolos y cobertura not_tracked. No se delegó implementación.

Resultados: 87 pruebas backend pasaron sin omisiones sobre PostgreSQL18 real, conservando las de identidad. Incluyen aislamiento A/B, categorías privadas/tipo, validaciones y límites, cuatro POST concurrentes con un solo movimiento/audit, PATCH/archivo concurrentes, replay tras editar/archivar, rollback por fallo de auditoría, fechas Bogotá, paginación con empates y constraints BD. Puente TypeScript real→HTTP→PG cubre CRUD; reinicia el proceso FastAPI y comprueba un movimiento persistido. 10 pruebas de cliente/dominio y 11 UI/caché verdes; comprobación de tipos y export Android (1174 módulos) correctas. Ruff/pip check verdes; aviso TestClient/httpx conocido.

Pendientes manuales: Docker/Compose sin herramienta disponible; Android/ADB/SDK, TalkBack, SecureStore nativo, texto 1.5x y Apple sin dispositivo en este entorno. Ver docs/accessibility/movements-checklist.md. La instalación de Expo Crypto conserva los 33 avisos moderados/bajos conocidos de herramientas; no se forzaron downgrades ni hubo push/despliegue. Siguiente tarea: **4 — dashboard financiero**, sumas I/G/flujo neto y comparación conforme revisión técnica, consumiendo estos movimientos activos.

La instancia PostgreSQL temporal estaba detenida al iniciar Tarea3; se inició para las pruebas y se detuvo al terminar. Cada prueba usó y eliminó su base finza_test_<uuid>; no se eliminaron bases ni datos del usuario.

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
