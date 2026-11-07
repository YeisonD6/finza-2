# T3 — Móvil: sistema de diseño «Brote», navegación por pestañas y rediseño de pantallas existentes

**Asignado a:** Codex · **Revisor:** Claude · **Rama:** `entrega-final-finza`

## Contexto

Lee primero: `PRODUCT.md`, `docs/engineering/design-system.md` (fuente de verdad visual: tokens, tipografía, componentes, Monedin, movimiento, voz), `docs/engineering/architecture.md` (mapa de navegación) y `docs/architecture/technical-review.md` (dinero, fechas, accesibilidad por pantalla).

La app móvil (`mobile/`, Expo SDK 58, RN 0.88, TS estricto, Expo Router, RTK Query) funciona pero su UI es una columna de textos y botones idénticos y toda la app vive en una sola ruta (`src/app/index.tsx` + `FinancialHome` con `useState`). La lógica (auth, movimientos, dashboard, caché, foco diferido, anuncios, idempotencia) es sólida y **debe conservarse**.

Dependencias ya instaladas por el revisor (no instales otras): `react-native-svg`, `lucide-react-native`, `@expo-google-fonts/manrope`, `expo-font`, `expo-haptics`, `expo-splash-screen`, `react-native-web`, `@expo/metro-runtime`. Recursos: `mobile/assets/brand/monedin.png` (+ `@2x`, `@3x`), recorte transparente de la mascota.

**En paralelo** otra tarea (T2) modifica `backend/**`, `mobile/openapi.json`, `mobile/src/shared/api/schema.d.ts`, `mobile/src/shared/api/baseApi.ts` y `mobile/src/features/*/api.ts`, y crea `mobile/src/features/{budgets,goals}/api.ts`. **No edites esos archivos.**

## Objetivo

Construir la base visual y de navegación y rediseñar las pantallas existentes (bienvenida, login/registro, Inicio, Movimientos, Registrar/Editar) con el sistema «Brote», sin perder funcionalidad ni accesibilidad.

## 1. Tema y tokens — `src/shared/theme/`

- `tokens.ts`: colores, espaciado, radios, sombras, tipografía y movimiento exactamente como en `design-system.md` (§1–§3, §7). Exporta objetos `as const` tipados. Nada de colores literales fuera de este archivo (excepto el recurso de imagen).
- `fonts.ts`: carga de Manrope 500/600/700/800 con `useFonts` de `@expo-google-fonts/manrope`; mapa variante → `fontFamily`.
- `motion.ts`: curvas `easeOut`/`easeInOut` (`Easing.bezier`), duraciones y hook `useReducedMotion()` (`AccessibilityInfo.isReduceMotionEnabled` + listener `reduceMotionChanged`).
- `haptics.ts`: `tapLight()`, `success()`, `error()` sobre `expo-haptics`, no-op en web y tolerante a fallos.

## 2. Componentes — `src/shared/ui/`

Crea o reescribe según `design-system.md` §5: `AppText`, `AppButton` (variantes `primary|secondary|ghost|danger`, conserva su API actual: `title`, `onPress`, `busy`, `disabled`, `selected`, props de accesibilidad; añade `variant`, `icon`, `size`), `IconButton`, `Card`, `AmountText`, `SproutProgress`, `MonthSwitcher`, `SegmentedControl`, `CategoryChip`, `TextField` (reemplaza a `FormField` conservando su comportamiento: label id único, hint con error, ref, autofill, foco visible), `AmountField` (sobre `AmountInput`: cifra grande, conserva literalmente la cadena tecleada, nunca `parseFloat`), `MovementRow`, `EmptyState`, `Banner` (reemplaza a `Feedback`, conserva `useAnnouncement`), `Screen` (conserva SafeArea, teclado, foco al título, Atrás de Android; nuevas variantes con encabezado verde o título simple), `TabBar`, y `src/shared/brand/Monedin.tsx` (props `size: 'sm'|'md'|'hero'`, `motion: 'none'|'idle'|'appear'|'celebrate'`, decorativo por defecto con `accessible={false}` e `importantForAccessibility="no-hide-descendants"`).

- `AuthControls.tsx` debe seguir exportando `AppButton`, `FormField` (alias de `TextField`) y `styles` para no romper imports, o actualiza todos los imports.
- `SproutProgress`: pista `track`, relleno `progress` (o `expense` si excede, `warning` si ≥80 %), brote SVG de dos hojas en la punta del relleno (silueta inspirada en los dos brotes de la cabeza de Monedin, trazo `forest700`), `accessibilityRole="progressbar"` con `accessibilityValue={{min:0,max:100,now,text}}`. Animación de §7.
- `AmountText`: recibe cadena decimal (`"1234.50"`), formatea `$ 1.234,50` / `$ 1.234` con `formatCOP` existente (`features/movements/domain.ts`) o una versión en `shared/formatting/money.ts` que lo reutilice; prop `tone: 'neutral'|'income'|'expense'|'auto'`; etiqueta accesible con palabra «Ingreso/Gasto» cuando corresponde y signo.
- Íconos de categoría: `src/shared/ui/categoryIcon.ts` con el mapa de `design-system.md` §4 (por nombre de categoría de sistema; `Tag` por defecto).
- Mínimo 48×48 dp en todo lo pulsable; `hitSlop` donde el visual sea menor.

## 3. Navegación (Expo Router) — `src/app/`

Reemplaza la ruta única por:

```text
src/app/_layout.tsx            Provider Redux, carga de fuentes (splash hasta cargar), restauración de sesión al iniciar, <Stack>
src/app/index.tsx              Redirect: sin sesión → /(auth)/welcome (o /(auth)/login si ya vio la bienvenida); con sesión → /(tabs)
src/app/(auth)/_layout.tsx     Stack sin cabecera; si hay sesión → Redirect a /(tabs)
src/app/(auth)/welcome.tsx     Onboarding
src/app/(auth)/login.tsx       AuthScreen rediseñada (login/registro)
src/app/(tabs)/_layout.tsx     Tabs con TabBar propio; si no hay sesión → Redirect a /(auth)/login
src/app/(tabs)/index.tsx       Inicio
src/app/(tabs)/movements.tsx   Movimientos
src/app/(tabs)/goals.tsx       Pantalla mínima transitoria: título «Metas» y EmptyState con Monedin, sin botones; T5 la completará antes de la entrega
src/app/(tabs)/profile.tsx     Perfil: correo (useMeQuery), sección «Privacidad y seguridad» (texto real sobre cómo se guardan los datos), Cerrar sesión (lógica actual de logout con mensaje de revocación remota)
src/app/movement/new.tsx       Registrar (presentation: 'modal')
src/app/movement/[id].tsx      Editar/archivar (presentation: 'modal')
```

- La pestaña central «+» del `TabBar` no es una ruta de pestaña: navega a `/movement/new` (role `button`, etiqueta «Registrar movimiento»).
- Cambio de pestaña sin animación. Modales con transición nativa.
- Al cerrar sesión: `auth.logout()` (ya resetea RTK Query) y navegar a `/(auth)/login`. Al cambiar de cuenta no deben quedar datos del usuario anterior (conserva el patrón `key={profile.id}` o equivalente).
- Bandera «bienvenida vista» persistida con `expo-secure-store` (clave `finza.onboarded`), tolerante a error.
- Elimina `FinancialHome.tsx` cuando ya no se use; mueve su lógica de retorno tras guardar al nuevo flujo (ver §4.4).

## 4. Pantallas

### 4.1 Bienvenida (`welcome`)
Tres pasos deslizables o con botón «Siguiente» (los dos deben funcionar; con lector de pantalla basta el botón): (1) Monedin `hero` + `appear` → «Hola, soy Monedin» / «Te acompaño a entender tu dinero mes a mes.»; (2) «Registra en segundos» / «Ingresos y gastos en pesos colombianos, exactos al centavo.»; (3) «Tus datos, protegidos» / «Contraseñas cifradas con Argon2id y sesiones que caducan. Sin anuncios ni terceros.». Indicador de paso textual «Paso 2 de 3» (accesible). Botones «Crear cuenta» (primario) y «Ya tengo cuenta» (ghost) al final; «Saltar» en pasos 1–2. Fondo `ground`, Monedin en `idle` en el paso 1.

### 4.2 Login / registro
Conserva toda la lógica de `AuthScreen` (validaciones, foco diferido, bloqueo de doble envío, conservación del email, mensaje de sesión, reintento). Diseño: Monedin `sm` + logotipo «FINZA» en `title`, `SegmentedControl` Ingresar / Crear cuenta, `TextField` correo y contraseña con botón mostrar/ocultar (`IconButton` Eye/EyeOff con etiqueta), botón primario a ancho completo, texto de ayuda de contraseña (12–128) en registro.

### 4.3 Inicio (`(tabs)/index`)
Conserva la lógica de `DashboardScreen` (currentData, ocultar cifras tras error, anuncio del resumen, supresión del anuncio al volver de guardar, textos de comparación según `reason`).
- Encabezado `forest700` con radio inferior `xl`: `MonthSwitcher` (‹ mes ›, no permite meses futuros al actual de Bogotá ni antes de 1900-01), avatar con inicial del correo que navega a Perfil, etiqueta «Flujo neto del mes», cifra `display` en `onForest` con «COP», fila de comparación con flecha (▲/▼ como icono lucide `TrendingUp/TrendingDown/Minus`) y texto («$ 250.000 más que octubre (18 %)» / «Sin datos del mes anterior»), y dos mini-tarjetas translúcidas Ingresos / Gastos.
- Debajo, sobre `ground`: tarjeta «Últimos movimientos» con `MovementRow` (máx. 5) y enlace «Ver todos» → pestaña Movimientos; estado vacío con `EmptyState` (Monedin `md`) «Aún no hay movimientos en noviembre» + botón «Registrar el primero».
- Texto explicativo breve bajo la comparación: «Se compara con el mes calendario completo anterior.» (`caption`, `onForestMuted`).
- Estados: carga (esqueleto sobrio o `ActivityIndicator` con texto «Cargando…»), error con `Banner` y botón «Reintentar».
- Deja un espacio/sección marcado en el código (`{/* T5: presupuestos y gasto por categoría */}`) donde T5 añadirá secciones; no muestres nada falso ahí.
- Animación de cambio de mes (§7).

### 4.4 Movimientos (`(tabs)/movements`)
Conserva la lógica de `MovementsScreen` (FlatList, filtros por tipo/categoría, paginación con cursor, editar, archivar con confirmación nativa, ocultar filas obsoletas, errores). Diseño: título «Movimientos», `MonthSwitcher`, `SegmentedControl` Todos / Gastos / Ingresos, chips de categoría desplazables horizontalmente (opcional «Todas»), lista agrupada por día con encabezados «Hoy», «Ayer», «Lun 3 nov» (`caption`, role `header`), `MovementRow` (icono de categoría en mosaico `sage100`, categoría + nota, fecha, monto con tono) que abre `/movement/[id]`. Paginación «Cargar más» accesible al final. `EmptyState` cuando no hay resultados (distinto mensaje si hay filtros activos: «No hay gastos de Transporte en noviembre» + «Quitar filtros»).

### 4.5 Registrar / Editar (`movement/new`, `movement/[id]`)
Conserva toda la lógica de `MovementForm` (validación, `normalizeAmount`, clave UUID retenida en reintentos, crear categoría privada, fecha contable sin UTC, foco al primer inválido, anuncio de éxito una vez, Atrás bloqueado al guardar, archivar con confirmación en edición).
Diseño: cabecera con `IconButton` cerrar (X, «Cerrar sin guardar») y título; `SegmentedControl` Gasto / Ingreso; `AmountField` grande centrado con «COP»; categorías como `CategoryChip` en rejilla envolvente filtradas por tipo, más chip «+ Nueva categoría» que despliega el campo existente; fecha con chips «Hoy» / «Ayer» / «Otra fecha» (este último muestra el `TextField` YYYY-MM-DD existente con su validación); nota opcional; botón primario fijo abajo «Guardar gasto» / «Guardar ingreso» que no queda oculto por el teclado. En edición, botón `danger` «Archivar movimiento».
Al guardar uno nuevo: `haptics.success()`, cerrar el modal, Inicio muestra el mes contable del movimiento y un `Banner` «Movimiento guardado» (sin repetir anuncio, igual que hoy). Si es el **primer** movimiento del usuario en ese mes (lista reciente vacía antes de guardar), el banner incluye Monedin `sm` en `celebrate` y el texto «¡Primer movimiento de noviembre!».

## 5. Vista web de desarrollo

- `npx expo start --web` debe renderizar la app para QA visual. En `Platform.OS === 'web'` el refresh token y la bandera de bienvenida se guardan **solo en memoria** (crea `src/features/auth/storage.ts` que elija SecureStore o memoria; `runtime.ts` lo usa). Documenta en un comentario que la web es solo previsualización de desarrollo.
- Haptics/announce/BackHandler deben ser no-op seguros en web.

## 6. Restricciones

- No edites los archivos de T2 listados arriba ni nada en `backend/`.
- No cambies contratos de API ni reglas de dinero/fechas. No uses `parseFloat`/`Number` para montos.
- Sin dependencias nuevas, sin colores literales fuera de `tokens.ts`, sin emoji como iconos, sin `numberOfLines` en montos/etiquetas.
- Componentes pequeños: ninguna pantalla > ~250 líneas; extrae subcomponentes a `src/features/<feature>/components/`.
- Prettier sobre los archivos que tocas. No hagas commits ni push.

## 7. Pruebas y criterios de aceptación

1. `npm run typecheck` sin errores; `npm test` verde. Actualiza las pruebas existentes para la nueva estructura **conservando** sus aserciones de comportamiento y accesibilidad (errores asociados, foco diferido, doble envío, COP exacto, ocultación de cifras tras error, archivo con confirmación, una sola llamada de éxito). No borres pruebas para hacerlas pasar.
2. Pruebas nuevas: `AmountText` (formato y etiqueta accesible con signo/palabra), `SproutProgress` (role/value/estados), `MonthSwitcher` (límites), `TabBar` (roles, seleccionado, botón +), `useReducedMotion` (Monedin no anima con reduce motion), redirecciones de sesión (sin sesión → login; con sesión → tabs).
3. `npx expo export --platform android` y `npx expo export --platform web` terminan sin errores.
4. Resumen final: archivos creados/modificados/eliminados, decisiones, desviaciones del diseño y limitaciones (lo que no pudiste ejecutar en tu sandbox).
