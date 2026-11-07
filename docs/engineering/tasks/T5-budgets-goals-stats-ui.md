# T5 — Móvil: presupuestos, metas, gasto por categoría, registro rápido y Monedin

**Asignado a:** Codex · **Revisor:** Claude · **Depende de:** T2 (API), T3 (sistema de diseño y navegación), T4 (intérprete)

## Contexto

Lee `PRODUCT.md`, `docs/engineering/design-system.md`, `docs/engineering/architecture.md`, `docs/engineering/tasks/T2-backend-budgets-goals.md` (contratos) y revisa lo construido en T3 (`mobile/src/shared/theme`, `mobile/src/shared/ui`, `mobile/src/shared/brand/Monedin.tsx`, `mobile/src/app/**`). Usa **solo** los componentes y tokens existentes; si falta uno, créalo en `shared/ui` siguiendo el mismo estilo. Endpoints RTK Query ya disponibles en `mobile/src/features/budgets/api.ts` y `mobile/src/features/goals/api.ts`; desglose en `useDashboardQuery(month).data.expense_by_category`. Intérprete en `mobile/src/features/quick-entry/parser.ts`.

## 1. Inicio: nuevas secciones (en el hueco marcado `T5`)

1. **Presupuestos del mes** (si hay al menos uno): tarjeta con las 3 categorías de mayor `percent` usando `SproutProgress` (etiqueta «Alimentación», valor «$ 620.000 de $ 800.000», estado textual «Al día» / «Cerca del límite» / «Excedido por $ 18.000») y enlace «Ver todos» → `/budgets`. Si no hay presupuestos: fila discreta «Crea un presupuesto para controlar tus gastos» → `/budgets`.
2. **Gasto por categoría**: gráfica de barras horizontales SVG (`react-native-svg`) ordenada por total, con icono de categoría, nombre, monto y porcentaje en **texto visible** junto a cada barra (la gráfica nunca es la única fuente). Contenedor `accessible` con `accessibilityLabel` resumen («Gasto por categoría: Alimentación 620.000 pesos, 32 por ciento; …»). Todas las barras usan la misma escala (100 % = categoría mayor). Oculta la sección si no hay gastos.
3. **Consejo de Monedin** (máximo una tarjeta `cream` con Monedin `sm`), elegido por regla determinista y documentada en `src/features/dashboard/monedinTip.ts` (función pura con pruebas):
   - algún presupuesto `exceeded` → «Te pasaste $ X en {categoría}. ¿Ajustamos el presupuesto?» (acción «Revisar» → `/budgets`);
   - si no, alguno `warning` → «Vas al {percent} % de {categoría}. Te quedan $ X.»;
   - si no, flujo neto positivo y comparación `comparable` con delta > 0 → «¡Vas mejor que el mes pasado! Considera aportar a una meta.» (acción → pestaña Metas);
   - si no, sin movimientos en el mes → ninguna tarjeta (ya existe el estado vacío);
   - si no → ninguna tarjeta.
   Nunca regaña ni usa mayúsculas/exclamaciones múltiples.

## 2. Presupuestos — `src/app/budgets.tsx` (+ `src/features/budgets/components/*`)

- Pantalla con título «Presupuestos», `MonthSwitcher` (consulta `useBudgetsQuery(month)`), texto «Límites mensuales que se repiten cada mes.».
- Lista de presupuestos con `SproutProgress` y estado textual; tocar uno abre la edición.
- Sección «Categorías sin presupuesto» con las categorías de gasto restantes (de `/categories?type=expense`) y botón «Definir» en cada una.
- Edición en hoja/modal simple o pantalla `budgets/[categoryId].tsx`: `AmountField` (cadena, valida con `normalizeAmount`), «Guardar» (PUT), «Quitar presupuesto» (DELETE con confirmación nativa). Errores de validación del servidor asociados al campo y anunciados.
- Estado vacío con Monedin: «Define cuánto quieres gastar por categoría y te aviso cuando te acerques al límite.»
- Acceso también desde Perfil («Presupuestos»).

## 3. Metas — `src/app/(tabs)/goals.tsx`, `src/app/goal/new.tsx`, `src/app/goal/[id].tsx`

- Lista: tarjetas por meta con nombre, `SproutProgress` (ahorrado/objetivo, estado «Completada» con icono), «Faltan $ X», fecha objetivo opcional («Para 30 jun 2027»). Botón primario «Nueva meta». Estado vacío con Monedin `md` `idle`: «Ahorrar es más fácil con un objetivo. ¿Para qué quieres ahorrar?» + «Crear mi primera meta».
- Nueva/editar meta: nombre (1–60), monto objetivo (`AmountField`), fecha objetivo opcional con chips «En 3 meses» / «En 6 meses» / «En 1 año» / «Sin fecha» / «Otra» (YYYY-MM-DD validada, no pasada). Crear y editar con PATCH; archivar con confirmación.
- Detalle: cabecera con progreso grande, `SproutProgress`, aportes (lista con fecha, monto, nota; eliminar con confirmación) y botón «Aportar» que abre un formulario corto (monto, fecha hoy/ayer/otra, nota) con `client_request_id` UUID retenido en reintentos sin cambios (mismo patrón que `MovementForm`). Al alcanzar el 100 %: Monedin `celebrate`, `haptics.success()`, banner «¡Meta cumplida!» anunciado una vez.
- Texto aclaratorio visible en el detalle: «Los aportes son dinero que apartas para esta meta; no cambian tus ingresos ni gastos del mes.»

## 4. Registro rápido en `movement/new`

- Encima del formulario, `TextField` «Escribe o dicta tu movimiento» con placeholder «Ej.: almuerzo 18 mil ayer» y hint «Rellena el formulario para que lo revises antes de guardar». El dictado lo aporta el teclado del sistema; no añadas permisos de micrófono.
- Al pulsar «Interpretar» (o enviar desde el teclado): `parseQuickEntry(texto, categorías)` → rellena tipo, monto, fecha (chip correspondiente), categoría y nota **sin guardar**; muestra la `explanation` en un `Banner` informativo (anunciado) y mueve el foco al monto. Si falta el monto, anuncia la explicación y enfoca el monto. El usuario siempre confirma con «Guardar».
- No disponible en edición.

## 5. Perfil

Completa la pantalla de T3: tarjeta de cuenta (correo, moneda COP), enlaces «Presupuestos», «Privacidad y seguridad» (texto real: contraseñas con Argon2id, sesiones de 15 min con renovación rotatoria, token de renovación en almacenamiento seguro del dispositivo, sin anuncios ni envío de datos a terceros, sin IA en la nube), «Accesibilidad» (texto real de lo que soporta la app: lector de pantalla, texto grande, movimiento reducido, sin depender del color) y «Volver a ver la bienvenida» (reinicia la bandera y navega a welcome). Versión de la app (`expo-constants`). Cerrar sesión.

## 6. Restricciones

- No edites `backend/**` ni los contratos. Sin dependencias nuevas. Sin colores literales fuera de `tokens.ts`. Sin floats para dinero.
- Pantallas ≤ ~250 líneas; subcomponentes en `src/features/<feature>/components/`.
- Accesibilidad según `design-system.md` y `technical-review.md`: etiquetas, roles, estados, 48 dp, foco al primer error, anuncios una vez, estado textual que no depende del color, escalado sin recortes.
- Prettier sobre lo que tocas. No hagas commits ni push.

## 7. Criterios de aceptación

1. `npm run typecheck`, `npm test` y `npx expo export --platform android` sin fallos.
2. Pruebas nuevas: `monedinTip` (cada regla), gráfica de categorías (texto visible y etiqueta resumen, escala), pantalla de presupuestos (lista, definir, quitar con confirmación, error asociado), metas (vacío, crear con validación, aportar con idempotencia de clave en reintento, celebración al completar una sola vez), registro rápido (rellena sin guardar, foco al monto, explicación anunciada).
3. Resumen final con archivos, decisiones, desviaciones y limitaciones.

## 8. Anexo tras la revisión de T3/T3b (7 nov 2026)

- **Un solo Monedin por pantalla.** La tarjeta fija «Tu mes, paso a paso» de Inicio desaparece: la sustituye la tarjeta de `monedinTip` (§1.3). Con el mes vacío solo queda el estado vacío con Monedin.
- Iconos lucide en web: hoy reciben `accessible={false}` y React avisa «Received `false` for a non-boolean attribute `accessible`». Centraliza los iconos decorativos en un helper (p. ej. `DecorativeIcon` en `shared/ui`) que en web no pase `accessible` al SVG y en nativo lo oculte del lector (`accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"` en el contenedor).
- La vista web (`.claude/launch.json`, servidor `mobile`) se usa para QA visual; no debe tener errores en consola en las pantallas nuevas.
- Datos de demostración: `backend/scripts/seed_demo.py` crea dos meses de movimientos, presupuestos en los tres estados y dos metas con aportes; úsalos para probar visualmente (no para las pruebas automáticas).
