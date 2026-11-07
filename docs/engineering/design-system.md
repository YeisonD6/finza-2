# Sistema de diseño FINZA — «Brote»

**Dirección elegida:** Brote (7 nov 2026). Ahorrar es cultivar: el progreso crece como los dos brotes de la cabeza de Monedin. Superficie *Operate*: la estructura es la de una app financiera conocida (pestañas, tarjetas, listas, controles nativos); la marca vive en la paleta, la tipografía, la densidad y **un gesto propio**: la barra-tallo con un brote en la punta.

Reglas que nacen de la dirección:

1. **El verde bosque es acción o dato principal.** Botones primarios, pestaña activa, encabezado del flujo neto. Nada decorativo usa verde bosque.
2. **Las barras de progreso comparten escala.** Comparaciones mensuales y presupuestos usan la misma referencia visual para poder compararse.
3. **El brote solo aparece en progreso y logros** (presupuestos, metas, hitos). No es ornamento.
4. **Monedin con intención**: bienvenida, estados vacíos, confirmaciones relevantes, metas y consejos. Nunca en formularios, listas densas ni errores técnicos.

## 1. Color

Fuente única: `mobile/src/shared/theme/tokens.ts`. Contrastes calculados con la fórmula de luminancia relativa WCAG 2.x.

| Token | Hex | Uso | Contraste verificado |
|---|---|---|---|
| `forest900` | `#163828` | Presionado de primario | — |
| `forest700` | `#1E4634` | Primario, encabezado, pestaña activa, foco | 10.6:1 sobre blanco · 9.36:1 sobre `ground` |
| `forest600` | `#2D5E46` | Texto de ingresos | 7.5:1 sobre blanco |
| `progress` | `#5E8B6A` | Relleno de barra-tallo | 3.25:1 sobre `track` (gráfico ≥3:1) |
| `sage300` | `#A8BFA3` | Avatar, decoración (eco del cuerpo de Monedin) | Decorativo, nunca texto |
| `sage100` | `#E3EBE0` | Mosaico de icono, chips en reposo | `forest700` encima: 8.7:1 |
| `track` | `#E6ECE3` | Pista de barras | — |
| `ground` | `#EEF2EC` | Fondo de la app (gris salvia, eco del fondo de la referencia) | — |
| `surface` | `#FFFFFF` | Tarjetas, hojas, barra de pestañas | — |
| `cream` | `#F3E6DE` | Tarjeta de Monedin (cara de Monedin) | `#3B2F2A` encima: 10.57:1 |
| `cheek` | `#E8A9A2` | Acento decorativo mínimo (mejillas) | Decorativo |
| `ink` | `#17261E` | Texto principal | 15.76:1 blanco · 13.92:1 `ground` |
| `inkMuted` | `#4F6157` | Texto secundario | 6.6:1 blanco · 5.83:1 `ground` · 5.4:1 `cream` |
| `onForest` | `#F4F7F2` | Texto sobre encabezado | 9.81:1 |
| `onForestMuted` | `#C9D8C6` | Secundario sobre encabezado | 7.13:1 |
| `expense` / `danger` | `#8C3A4E` | Gastos, excedido, errores | 7.42:1 blanco · 6.55:1 `ground` |
| `warning` | `#8A5A00` | Presupuesto cerca del límite | 5.93:1 blanco |
| `border` | `#D5DDD2` | Separadores e inputs en reposo | Input enfocado usa `forest700` 2 px |

**Nunca solo color:** gasto lleva signo «−» y la palabra «Gasto» en la etiqueta accesible; presupuestos dicen «Al día», «Cerca del límite» o «Excedido por $…»; la comparación usa flecha + texto «más/menos que octubre».

## 2. Tipografía

**Manrope** (variable, OFL, vía `@expo-google-fonts/manrope`): sans grotesca humanista con cifras claras; no está entre los defaults saturados y tiene numerales tabulares para montos. Todos los montos usan `fontVariant: ['tabular-nums']`.

| Variante | Tamaño/alto de línea | Peso | Uso |
|---|---|---|---|
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
- Radios: `sm 8` (chips) · `md 12` (inputs, mosaicos de icono) · `lg 20` (tarjetas) · `xl 28` (base del encabezado) · `pill 999`.
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
| `SproutProgress` | Barra-tallo con brote en la punta, estado textual | role `progressbar`, `accessibilityValue {min,max,now,text}` |
| `MonthSwitcher` | ‹ Mes › con límites | Botones con etiqueta «Mes anterior: octubre 2026» |
| `SegmentedControl` | Gasto / Ingreso | role `tab`/`radio`, `selected` |
| `CategoryChip` | Selección de categoría con icono | role `radio`, `selected`, marca visual + texto |
| `TextField` / `AmountField` | Campos con etiqueta persistente, error asociado | label, hint con error, foco al primer inválido |
| `ListRow` / `MovementRow` | Fila de movimiento (icono, nombre, fecha, monto) | Un solo foco con resumen completo |
| `EmptyState` | Monedin + mensaje + acción | Imagen decorativa oculta; texto significativo |
| `Banner` | Éxito/error/información en línea | Anuncio una sola vez + háptico |
| `TabBar` | Barra inferior con botón central «+» | role `tab`, `selected`, etiqueta «Registrar movimiento» |
| `Monedin` | Mascota (imagen recortada de la referencia) con estados de movimiento | Decorativa (`accessible={false}`) salvo cuando lleva mensaje |

## 6. Monedin

- Recurso: `mobile/assets/brand/monedin{,@2x,@3x}.png`, recortado sin alterar la referencia `assets/brand/monedin-reference.jpg`.
- Tamaños: `hero` 200 (onboarding), `md` 120 (vacíos, celebraciones), `sm` 56 (tarjeta de consejo).
- Momentos: bienvenida (3 pasos), primer uso sin movimientos, lista vacía, meta creada/completada, presupuesto excedido (consejo amable, nunca regaño), consejo del mes en Inicio (máximo una tarjeta).
- Voz: tú, cercano y breve. Ej.: «Vas muy bien. Te quedan $ 180.000 para comida.» / «Te pasaste $ 18.000 en transporte. ¿Ajustamos el presupuesto?»

## 7. Movimiento

Herramienta: `Animated` de React Native con `useNativeDriver: true` (solo `transform` y `opacity`). Hook `useReducedMotion()` basado en `AccessibilityInfo.isReduceMotionEnabled` + listener. Curvas: `easeOut = Easing.bezier(0.23, 1, 0.32, 1)`, `easeInOut = Easing.bezier(0.77, 0, 0.175, 1)`.

| Momento | Frecuencia / propósito | Especificación | Reduce Motion |
|---|---|---|---|
| Presión de botón | Decenas al día / feedback | `scale 1→0.97`, 120 ms `easeOut`; vuelta 160 ms | Sin escala; solo cambio de color |
| Cambio de pestaña | Decenas al día | **Sin animación** (cambio instantáneo) | — |
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
