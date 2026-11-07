# Sistema de diseño FINZA — «Brote»

**Dirección elegida:** Brote (7 nov 2026). Ahorrar es cultivar: el progreso crece como los dos brotes de la cabeza de Monedin. Superficie *Operate*: la estructura es la de una app financiera conocida (pestañas, tarjetas, listas, controles nativos); la marca vive en la paleta, la tipografía, la densidad y **un gesto propio**: la barra-tallo con un brote en la punta.

Reglas que nacen de la dirección:

1. **El verde bosque es acción o dato principal.** Botones primarios, pestaña activa, encabezado del flujo neto. Nada decorativo usa verde bosque.
2. **Las barras de progreso comparten escala.** Comparaciones mensuales y presupuestos usan la misma referencia visual para poder compararse.
3. **El brote solo aparece en progreso y logros** (presupuestos, metas, hitos). No es ornamento.
4. **Monedin con intención**: bienvenida, estados vacíos, confirmaciones relevantes, metas y consejos. Nunca en formularios, listas densas ni errores técnicos.

## 1. Color

Fuente única: `mobile/src/shared/theme/tokens.ts` (v2, 7 nov 2026). Contrastes calculados con la fórmula de luminancia relativa WCAG 2.x. v2 cambia el fondo salvia por **papel cálido** para que el verde sea acento y no ambiente, y añade un bosque profundo para el héroe de bienvenida.

| Token | Hex | Uso | Contraste verificado |
|---|---|---|---|
| `forest950` | `#10291D` | Fondo del héroe de bienvenida | `onForest` 14.32:1 · `mint` 11.48:1 |
| `forest900` | `#163828` | Presionado de primario | — |
| `forest700` | `#1E4634` | Primario, encabezado, pestaña activa, foco | 10.60:1 blanco · 9.56:1 `ground` · 8.67:1 `sage100` |
| `forest600` | `#2D5E46` | Texto de ingresos, iconos de validación | 7.50:1 blanco |
| `progress` | `#5E8B6A` | Relleno de barra-tallo | 3.08:1 sobre `track` (gráfico ≥3:1) |
| `mint` | `#CFE3D2` | Anillos de crecimiento del héroe | Decorativo |
| `sage300` | `#A8BFA3` | Avatar, decoración (eco del cuerpo de Monedin) | Decorativo, nunca texto |
| `sage100` | `#E2EBDF` | Mosaicos de icono, avisos suaves (confirmar correo, consejos) | `inkMuted` 5.65:1 · `forest700` 8.67:1 |
| `track` | `#E8E4DA` | Pista de barras | — |
| `ground` | `#F5F3EE` | Fondo de la app (papel cálido) | — |
| `surface` | `#FFFFFF` | Tarjetas, hojas, inputs, barra de pestañas | — |
| `cream` / `creamInk` | `#F3E6DE` / `#3B2F2A` | Tarjeta de Monedin | 10.57:1 |
| `cheek` | `#E8A9A2` | Acento decorativo mínimo (mejillas) | Decorativo |
| `ink` | `#141D18` | Texto principal | 17.23:1 blanco · 15.54:1 `ground` |
| `inkMuted` | `#545C56` | Texto secundario | 6.90:1 blanco · 6.22:1 `ground` |
| `inkSubtle` | `#6B716C` | Metadatos de baja prioridad (solo ≥ 13 px) | 5.00:1 blanco · 4.50:1 `ground` |
| `onForest` / `onForestMuted` | `#F4F7F2` / `#C9D8C6` | Texto sobre bosque | 9.81 / 7.13:1 sobre `forest700` |
| `expense` / `danger` | `#8C3A4E` | Gastos, excedido, errores | 7.42:1 blanco · 6.69:1 `ground` |
| `warning` | `#8A5A00` | Presupuesto cerca del límite | 5.93:1 blanco · 5.34:1 `ground` |
| `border` | `#D9D4C8` | Separadores (no identifica controles) | Decorativo |
| `borderStrong` | `#848780` | Borde de inputs y botón secundario (WCAG 1.4.11) | 3.65:1 blanco · 3.29:1 `ground` |

En v2 `borderStrong` pasó de `#8E918A` a `#848780`: el primero daba 2.88:1 sobre `ground`, por debajo del 3:1 exigido para identificar controles.

### Colores de categoría (v3, 7 nov 2026)

Una familia terrosa y apagada por categoría, para que las listas y el gráfico se lean más rápido sin competir con el verde bosque. Fuente: `categoryPalette` en `tokens.ts` y `categoryTone()` en `shared/ui/categoryTheme.ts`. Las categorías del sistema tienen un tono fijo; las personales reciben uno estable derivado de su id. **El color nunca va solo**: siempre acompaña al nombre de la categoría y a su icono.

| Familia | Categoría | `tint` (fondo del icono) | `ink` (icono/texto) | `chart` (dona y barras) | `ink`/`tint` | `chart`/blanco |
|---|---|---|---|---|---|---|
| salary | Salario | `#E2EBDF` | `#1E4634` | `#2D5E46` | 8.67:1 | 7.50:1 |
| income | Otros ingresos | `#DCEBE7` | `#1D5247` | `#2F7464` | 7.27:1 | 5.52:1 |
| food | Alimentación | `#F7E2D8` | `#8A3A20` | `#B5532F` | 6.22:1 | 4.95:1 |
| transport | Transporte | `#DFE7F0` | `#284766` | `#47698F` | 7.71:1 | 5.70:1 |
| services | Servicios | `#F5EAD0` | `#6E4E00` | `#A57A12` | 6.38:1 | 3.89:1 |
| other | Otros gastos | `#EEE2EC` | `#673660` | `#8C5683` | 7.36:1 | 5.56:1 |
| custom | Sin tono asignado | `#ECE8DF` | `#4A514B` | `#7A7F78` | 6.68:1 | 4.09:1 |

`chart` supera 3:1 sobre blanco (WCAG 1.4.11, gráficos). `expenseTint` `#F4E4E7` es el fondo de iconos de gasto y filas de riesgo (`expense` encima: 6.04:1). `forestGlassStrong` (blanco al 18 %) es la pista de barras sobre bosque. El avatar usa `forest900` sobre `sage300` (6.53:1).

**Marcas de terceros:** el logotipo «G» de Google conserva sus cuatro colores oficiales y el botón de Apple es el componente del sistema (`AppleAuthenticationButton`); ambos están exentos de los tokens por las guías de marca de cada proveedor.

**Nunca solo color:** gasto lleva signo «−» y la palabra «Gasto» en la etiqueta accesible; presupuestos dicen «Al día», «Cerca del límite» o «Excedido por $…»; la comparación usa flecha + texto «más/menos que octubre».

## 2. Tipografía

**Manrope** (variable, OFL, vía `@expo-google-fonts/manrope`): sans grotesca humanista con cifras claras; no está entre los defaults saturados y tiene numerales tabulares para montos. Todos los montos usan `fontVariant: ['tabular-nums']`.

| Variante | Tamaño/alto de línea | Peso | Uso |
|---|---|---|---|
| `hero` | 34/40 | 800 (`Manrope_800ExtraBold`), tracking −0.8 | Titular de bienvenida y de pantallas de acceso |
| `display` | 40/48 | 800, tracking −0.5 | Flujo neto del mes |
| `title` | 28/36 | 700 | Título de pantalla |
| `heading` | 20/28 | 700 | Secciones |
| `subhead` | 17/24 | 600 | Nombres en filas, montos de tarjeta |
| `body` | 16/24 | 500 | Texto general (mínimo para lectura) |
| `label` | 14/20 | 600 | Etiquetas de campos y botones pequeños |
| `caption` | 13/18 | 500 | Metadatos (fecha, categoría) |

Reglas: `allowFontScaling` siempre activo; sin `numberOfLines` en montos ni etiquetas; los contenedores crecen con el texto (probado a 200 %). `lineHeight` explícito en todas las variantes para evitar recortes de acentos y descendentes.

## 3. Espacio, forma y profundidad

- Escala de 4: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 56`. Margen lateral de pantalla 20.
- Radios: `sm 8` (chips) · `md 12` (mosaicos de icono) · `control 16` (inputs y botones) · `lg 24` (tarjetas) · `xl 32` (base del encabezado, hoja de bienvenida) · `pill 999`.
- Controles: inputs de 56 dp de alto con relleno lateral 16 y borde `borderStrong`; botones de 52 dp. El borde enfocado es `forest700` de 2 px.
- Sombra de tarjeta: color `ink`, offset (0, 6), opacidad 0.06, radio 16, `elevation 2`. Botón flotante «+»: offset (0, 6), opacidad 0.3 de `forest700`, radio 16, `elevation 6`.
- Áreas táctiles: mínimo 48×48 dp; controles visualmente menores amplían con `hitSlop`.

## 4. Iconografía

`lucide-react-native` (trazo 1.75, tamaños 20/24), una sola familia. Mapa de categorías del sistema: Salario → `BriefcaseBusiness`, Otros ingresos → `Coins`, Alimentación → `UtensilsCrossed`, Transporte → `Bus`, Servicios → `Zap`, Otros gastos → `Shapes`; categorías privadas → `Tag`. Iconos siempre acompañados de texto o con `accessibilityLabel`; los decorativos se ocultan al lector.

## 5. Componentes (`mobile/src/shared/ui`)

| Componente | Responsabilidad | Accesibilidad |
|---|---|---|
| `AppText` | Variantes tipográficas con tokens | Escalado, `lineHeight` |
| `AppButton` | `primary` · `secondary` · `ghost` · `danger`; estados presionado, deshabilitado, ocupado | role `button`, `accessibilityState`, 48 dp, háptico ligero opcional |
| `IconButton` | Acción solo icono | `accessibilityLabel` obligatorio, 48 dp |
| `Card` | Superficie blanca con radio y sombra | Agrupa contenido relacionado (`accessible` cuando es un solo dato) |
| `AmountText` | Formatea COP desde cadena, signo y color semántico | Etiqueta hablada «Gasto de 86 mil 400 pesos» |
| `SproutProgress` | Barra-tallo con brote en la punta, estado textual; `caption` opcional más corto cuando la fila ya nombra el elemento | role `progressbar`, `accessibilityValue {min,max,now,text}` (el texto hablado conserva el nombre) |
| `MonthSwitcher` | ‹ Mes › con límites | Botones con etiqueta «Mes anterior: octubre 2026» |
| `SegmentedControl` | Pista salvia con el segmento elegido elevado en blanco: borde bosque (10.6:1), check y negrita, nunca solo el relleno | role `tab`, `selected` |
| `CategoryChip` | Selección de categoría; sin elegir es blanco con icono del color de su categoría, elegido es bosque con check | role `radio`, `selected`, marca visual + texto |
| `TextField` / `AmountField` | Campos con etiqueta persistente, error asociado | label, hint con error, foco al primer inválido |
| `ListRow` / `MovementRow` | Fila de movimiento (icono, nombre, fecha, monto) | Un solo foco con resumen completo |
| `EmptyState` | Monedin + mensaje + acción | Imagen decorativa oculta; texto significativo |
| `Banner` | Éxito/error/información en línea | Anuncio una sola vez + háptico |
| `TabBar` | Barra inferior con botón central «+»; etiquetas completas a 12 px (el anillo de foco va en la píldora, no resta ancho) | role `tab`, `selected`, etiqueta «Registrar movimiento» |
| `SettingsRow` | Fila de ajustes con mosaico de icono; `palette` le da su propio tono | Un solo foco con título y detalle |
| `Screen` | Pantalla con título; «volver» es un chevrón de 48 dp (`IconButton`) sobre el título; el título de los modales se ajusta en varias líneas | Etiqueta de volver explícita |
| `Monedin` | Mascota (imagen recortada de la referencia) con estados de movimiento | Decorativa (`accessible={false}`) salvo cuando lleva mensaje |

## 6. Monedin

- Recurso: `mobile/assets/brand/monedin{,@2x,@3x}.png`, recortado sin alterar la referencia `assets/brand/monedin-reference.jpg`.
- Tamaños: `hero` 200 (bienvenida), `md` 120 (vacíos, celebraciones), `sm` 56 (cabecera de acceso, consejos, avisos).
- Momentos: bienvenida (héroe con anillos de crecimiento), recorrido de 4 pasos (meta de ejemplo), cabecera de acceso y recuperación (pequeño, en reposo), correo enviado y contraseña restablecida, correo confirmado (celebra), primer uso sin movimientos, lista vacía, meta creada/completada, presupuesto excedido (consejo amable, nunca regaño), consejo del mes en Inicio (máximo una tarjeta).
- Voz: tú, cercano y breve. Ej.: «Vas muy bien. Te quedan $ 180.000 para comida.» / «Te pasaste $ 18.000 en transporte. ¿Ajustamos el presupuesto?»

## 7. Movimiento

Herramienta: `Animated` de React Native con `useNativeDriver: true` (solo `transform` y `opacity`). Hook `useReducedMotion()` basado en `AccessibilityInfo.isReduceMotionEnabled` + listener. Curvas: `easeOut = Easing.bezier(0.23, 1, 0.32, 1)`, `easeInOut = Easing.bezier(0.77, 0, 0.175, 1)`.

| Momento | Frecuencia / propósito | Especificación | Reduce Motion |
|---|---|---|---|
| Presión de botón | Decenas al día / feedback | `scale 1→0.97`, 120 ms `easeOut`; vuelta 160 ms | Sin escala; solo cambio de color |
| Cambio de pestaña | Decenas al día | **Sin animación** (cambio instantáneo) | — |
| Entrada de pantalla de acceso | Ocasional / continuidad | Bloques (cabecera, formulario, pie) con `opacity 0→1` + `translateY 12→0`, 320 ms `easeOut`, escalonado 40 ms (`useEntrance`) | Solo opacidad 150 ms |
| Héroe de bienvenida | Raro / primera vez | Anillos `scale 0.86→1` + opacidad 900 ms; Monedin aparece y queda en reposo; la hoja de papel sube `translateY 32→0` en 420 ms | Estado final; hoja con opacidad 150 ms |
| Recorrido de bienvenida | Raro | Desplazamiento horizontal paginado animado | Salto directo de página |
| Navegación a modal/pantalla | Ocasional / continuidad espacial | Transición nativa de la plataforma (stack) | Transición nativa (el SO la reduce) |
| Cambio de mes en Inicio | Ocasional / evitar salto brusco | Contenido `opacity 0→1` + `translateY 8→0`, 220 ms `easeOut` | Solo opacidad 150 ms |
| Cifras | Lectura de datos | **Sin conteo animado**: los datos que se leen no se mueven por estilo | — |
| Barra-tallo | Ocasional / indicación de estado | Relleno por `scaleX` desde la izquierda, 280 ms `easeOut`, escalonado 40 ms; el brote aparece al final con `opacity` 150 ms | Estado final sin animación |
| Banner de éxito | Ocasional / feedback | Entra `translateY −16→0` + opacidad, 240 ms `easeOut`; sale por el mismo camino 200 ms; háptico `success` | Solo opacidad |
| Error de validación | Ocasional / feedback | Sin sacudidas; borde de error + háptico `error` + anuncio | Igual |
| Monedin aparece | Raro / deleite | `scale 0.94→1` + opacidad, spring `damping 14, stiffness 160` | Solo opacidad |
| Monedin en reposo | Raro (onboarding, vacíos) | `translateY 0↔−4`, ciclo 2.4 s `easeInOut`, en bucle solo mientras está visible | Estático |
| Monedin celebra | Raro (meta cumplida, primer movimiento) | Salto `translateY 0→−12→0` + `rotate ±6°`, spring, una vez; háptico `success` | Solo háptico + mensaje |

## 8. Voz y contenido

Español de Colombia, tú. Montos `$ 1.245.000` (punto de miles, sin decimales cuando son ,00; dos decimales si existen). Fechas «7 nov 2026», «Hoy», «Ayer». Nunca «saldo» para el flujo neto. Errores dicen qué pasó y cómo seguir.

## 9. Composición por pantalla (v3, 7 nov 2026)

Referencias revisadas: Copilot Money y YNAB (desglose por categoría en dona con leyenda textual, color solo donde informa) y patrones de tarjetas de resumen de apps financieras. FINZA toma la idea, no el aspecto: tonos terrosos propios, brote y anillos de crecimiento.

- **Inicio:** encabezado bosque con anillos de crecimiento estáticos en la esquina (sin movimiento: se ve muchas veces al día), avatar salvia y respeto del área segura superior. Los atajos se montan sobre el borde inferior del encabezado. Movimientos con iconos de color por categoría. Presupuestos con porcentaje y estado en color + texto. **Gasto por categoría**: dona de partes del todo (decorativa, oculta al lector) + total gastado + leyenda con monto, porcentaje y barra a escala compartida.
- **Movimientos:** totales exactos del mes (ingresos/gastos) tomados del resumen compartido con Inicio, filtros más livianos.
- **Metas:** tarjeta bosque con el total ahorrado de las metas activas, barra menta y la acción «Nueva meta»; cada tarjeta de meta es un solo botón (porcentaje, fecha, barra-tallo, Ahorrado/Meta/Faltan). El detalle lista los aportes como filas con acción de eliminar.
- **Presupuestos:** tarjeta bosque con lo gastado frente al total de límites y cuántos están en alerta; categorías sin presupuesto en filas compactas con «Definir».
- **Perfil:** cada ajuste con su tono; la zona de riesgo usa `expenseTint`.
- **Acceso y bienvenida:** anillos de crecimiento discretos en la esquina (recortados al ancho de la pantalla), Monedin sobre un disco salvia; los pasos de la bienvenida se apoyan en un disco salvia con anillos.
- **Widgets:** vista previa en vivo del widget de resumen que respeta «Ocultar montos».

Reglas que se mantienen: el verde bosque solo en acción o dato principal; el brote solo en progreso; Monedin solo en momentos con intención; ninguna cifra se anima.
