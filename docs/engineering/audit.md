# Auditoría técnica inicial de FINZA — Fase 0

**Fecha:** 7 de noviembre de 2026 · **Rama:** `entrega-final-finza` · **Commit auditado:** `5e78809`
**Alcance:** repositorio completo, entorno local y ejecución de las suites automáticas. No se modificó código durante esta auditoría.

## 1. Estado de Git

| Comprobación | Resultado |
|---|---|
| Directorio | `/home/rubxo/Proyectos/finza-2` |
| Rama activa | `entrega-final-finza`, sincronizada con `origin/entrega-final-finza` |
| Remotos | `origin` → `rubxo/finza-2` (fork) · `upstream` → `YeisonD6/finza-2` (original) |
| Divergencia | `HEAD`, `main`, `origin/main` y `upstream/main` apuntan a `5e78809`: sin diferencias |
| Cambios locales | Solo sin seguimiento: `assets/brand/` (referencia de Monedin) y `docs/requirements/phase-3.md` |
| Historial | 6 commits: 5 de YeisonD6 (30 oct – 2 nov) y 1 de isabelaBenitez777 (5 nov) |

> El curso exige trazabilidad equitativa de commits. El historial actual no refleja aún la participación del tercer integrante; esto **no** se debe falsear: cada integrante debe hacer sus propios commits.

## 2. Arquitectura real encontrada

| Capa | Tecnología verificada |
|---|---|
| Móvil | Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript 5.9 estricto, Expo Router 58 |
| Estado | Redux Toolkit 2.9 + RTK Query (caché, invalidación por tags, reset en logout) |
| Sesión móvil | Refresh token en `expo-secure-store`; access token solo en memoria; refresh *single-flight* |
| Backend | FastAPI (monolito modular por funcionalidades: `identity`, `movements`, `dashboard`, `audit`) |
| Persistencia | PostgreSQL 17/18 (producción/CI) con SQLAlchemy 2 y Alembic; SQLite admitido para desarrollo (commit `5e78809`) |
| Seguridad | Argon2id, JWT HS256 15 min, refresh opaco rotatorio con detección de *replay*, límites de intentos en BD, aislamiento por `owner_id` |
| Contrato | OpenAPI exportado → `openapi-typescript` → `mobile/src/shared/api/schema.d.ts` |
| Infra | `infra/compose.yaml` (db → migrate → api); CI en `.github/workflows/quality.yml` |

La guía universitaria menciona React Native/Expo, Redux Toolkit/Context y Supabase/SQLite como referencias. FINZA ya cumple con Expo + Redux Toolkit y usa PostgreSQL (equivalente relacional a Supabase, que también es PostgreSQL). **No se justifica cambiar de stack**: la base es sólida, está probada y es defendible.

## 3. Ejecución verificada

| Suite | Comando | Resultado (7 nov 2026) |
|---|---|---|
| Backend con PostgreSQL 17 real (contenedor aislado) | `pytest -q` | **112 pasan, 1 falla** (`test_unknown_route_has_stable_error`) |
| Backend sin PostgreSQL | `pytest -q` | 40 pasan, 72 omitidas, 1 falla (la misma) |
| Lint backend | `ruff check app tests migrations` | **2 errores** (corregibles con `--fix`) |
| Tipos móvil | `npm run typecheck` | Correcto |
| Jest UI/caché | `jest --runInBand` | 41/41 |
| Cliente/dominio | `tsx --test tests/*.test.ts` | 10/10 |

**Causa de la falla:** el commit `5e78809` añadió el campo `detail` a las respuestas de error para que el cliente móvil lo lea, pero la prueba de contrato sigue esperando exactamente `{code, message, field_errors, request_id}`. Es una regresión de contrato introducida sin actualizar su prueba.

## 4. Matriz de diagnóstico

| Módulo | Estado | Evidencia | Acción necesaria |
|---|---|---|---|
| Autenticación | COMPLETO (funcional) / REQUIERE REDISEÑO (visual) | `identity/*`, `AuthScreen.tsx`, 61+ pruebas | Conservar lógica; rediseñar pantalla con identidad FINZA y Monedin de bienvenida |
| Dashboard | PARCIAL · REQUIERE REDISEÑO | `DashboardScreen.tsx` es una columna de textos y 5 botones apilados; mes se escribe como texto `YYYY-MM` | Rediseño completo: tarjeta de flujo neto, selector de mes por flechas, desglose por categoría, accesos rápidos |
| Transacciones | COMPLETO (CRUD) · REQUIERE REDISEÑO | `MovementsScreen.tsx` (341 líneas), `MovementForm.tsx` (306 líneas), idempotencia, paginación | Rediseñar lista (agrupación por día, iconos de categoría) y formulario (teclado numérico, chips de categoría) |
| Ingresos | COMPLETO | Tipo `income`, categorías Salario/Otros ingresos | Integrar en nuevo diseño |
| Gastos | COMPLETO | Tipo `expense`, 4 categorías de sistema | Integrar en nuevo diseño |
| Categorías | PARCIAL | Sistema + privadas; sin icono/color; no se pueden editar | Añadir icono/color de presentación en el cliente; gestión básica |
| Estadísticas | PENDIENTE | No existe endpoint ni pantalla de desglose | Nuevo endpoint de desglose por categoría + gráfica accesible con alternativa textual |
| Presupuestos | PENDIENTE | No existe | Nuevo módulo backend + pantalla (límite mensual por categoría, progreso) |
| Metas de ahorro | PENDIENTE | Previsto en la especificación original, no implementado | Nuevo módulo (meta, aportes, progreso) con Monedin como acompañante |
| Persistencia | COMPLETO | Migraciones 001–003, NUMERIC(19,4), constraints, PG real en pruebas | Migración 004 para presupuestos/metas |
| Backend | COMPLETO · REQUIERE CORRECCIÓN | 1 prueba roja, 2 errores ruff | Corregir contrato de errores y lint |
| Navegación | REQUIERE REDISEÑO | Una sola ruta (`index.tsx`); páginas cambiadas con `useState` en `FinancialHome` | Migrar a Expo Router con grupo `(auth)` y pestañas `(tabs)` |
| Accesibilidad | PARCIAL (sólido en código) | Labels, roles, 48 dp, foco diferido, anuncios; pruebas Jest de semántica | Mantener en el rediseño; añadir Reduce Motion, escalado 2x, evidencias en dispositivo |
| Diseño | REQUIERE REDISEÑO | `styles.ts`: 6 colores, sin escala tipográfica, sin tokens, sin iconografía ni marca | Sistema de diseño completo con tokens, tipografía, Monedin y movimiento |
| Documentación | PARCIAL | README orientado a Windows/PowerShell; docs técnicas extensas | README multiplataforma; documento final de 5 secciones; guía de defensa |
| Previsualización/E2E | PENDIENTE | Sin `react-native-web`; sin SDK Android en el equipo; Docker disponible | Habilitar vista web de desarrollo para QA visual; emulador Android para TalkBack |

## 5. Calidad de código

- **Fortalezas:** dinero como cadena decimal de extremo a extremo; fechas contables sin conversión UTC; idempotencia por `client_request_id`; aislamiento por propietario probado con dos usuarios; pruebas de concurrencia reales; reset de caché en logout.
- **Componentes grandes:** `MovementsScreen.tsx` (341) y `MovementForm.tsx` (306) mezclan presentación, filtros y estado de formulario. Conviene extraer subcomponentes en el rediseño.
- **Duplicación visual:** cada pantalla compone `Text` con `styles.label/body` manualmente; no hay componentes tipográficos ni tarjetas.
- **UX:** el usuario escribe el mes como `2024-02` y la fecha como `YYYY-MM-DD`; no hay selector. Todos los botones tienen el mismo peso visual (sin jerarquía primario/secundario).
- **Sin datos simulados:** todas las pantallas consumen la API real. No hay botones sin acción.
- **Dependencias:** 33 avisos npm moderados/bajos documentados en `progress.md`; aviso de deprecación `httpx`/TestClient.

## 6. Entorno de esta máquina

| Herramienta | Estado |
|---|---|
| Node | 24.18.0 (nvm; por defecto). 24.22.2 instalado solo para REA |
| Python | 3.12.3 + `uv` |
| Docker | 29.6 operativo (PostgreSQL de pruebas en contenedor `finza-test-pg`, puerto 55439) |
| Android SDK / ADB / Java | **No instalados**. KVM disponible (emulador viable) |
| Codex CLI | 0.166.0, sesión activa, plugin `codex@openai-codex` listo |
| Gemini CLI | 0.51.0 |

## 7. Conclusión

FINZA tiene una base técnica de muy buena calidad (seguridad, dinero, pruebas) pero una capa visual mínima y tres módulos de producto pendientes (estadísticas, presupuestos, metas). La estrategia es **conservar el núcleo y construir encima**: rediseño visual completo con sistema de diseño y Monedin, navegación por pestañas, y nuevos módulos con la misma disciplina de pruebas.
