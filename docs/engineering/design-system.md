# Sistema de diseño FINZA — «Vidrio de bosque» (v4)

**Dirección vigente:** Vidrio de bosque (8 nov 2026). Evoluciona «Brote» (v3, 7 nov 2026) hacia algo más minimalista y con profundidad: un solo dato protagonista por pantalla, superficies de vidrio translúcido sobre un fondo con luz suave, modo claro y oscuro según el sistema y Monedin como un personaje 2.5D que respira. Superficie *Operate*: la estructura sigue siendo la de una app financiera conocida (pestañas, listas, controles nativos); la marca vive en la paleta, la tipografía ligera de las cifras, el vidrio y la barra-tallo con brote.

Reglas que nacen de la dirección:

1. **Una pregunta por pantalla.** Inicio responde «¿cómo va mi mes?»; lo demás (presupuestos, metas, categorías, consejos) vive en **Análisis**, a un toque.
2. **El verde es acción o dato principal.** Botón primario, pestaña activa, barra del mes en curso. Nada decorativo usa verde salvo el resplandor de fondo.
3. **El vidrio flota, el contenido no.** El desenfoque real solo va en lo que flota sobre contenido que se desplaza (barra de pestañas); las tarjetas son translúcidas sin desenfoque.
4. **El brote solo aparece en progreso y logros.** No es ornamento.
5. **Monedin con intención**: bienvenida, estados vacíos, confirmaciones relevantes, metas y consejos. Nunca en formularios, listas densas ni errores técnicos.
6. **Nunca solo color** (se mantiene de v3): gasto lleva signo «−» y la palabra «Gasto» en la etiqueta accesible; la pestaña activa lleva su nombre escrito; los estados de presupuesto se dicen con texto.

Exploración y tableros aprobados: artefacto «Vidrio de bosque» (Inicio claro/oscuro, Registrar, rig de Monedin, onboarding y referencias). Informe de referencias: [references-v4.md](references-v4.md).

## 1. Color

Fuente única: `mobile/src/shared/theme/tokens.ts`. La app sigue el esquema del sistema (`userInterfaceStyle: "automatic"`). `ThemeRoot` (`src/app/_layout.tsx`) lee `useColorScheme()` y llama a `applyColorScheme()`, que reemplaza la paleta en el mismo objeto `colors` y avisa a los suscriptores. Cada componente que lee la paleta llama a `useThemeRefresh()` (un `useSyncExternalStore` sobre el esquema) y se vuelve a dibujar sin remontarse; la lista de Movimientos además pasa el esquema como `extraData`.

**Cambio de tema sin pérdida:** como nada se remonta, un formulario abierto (por ejemplo Registrar), el mes elegido y la pila de navegación sobreviven al cambio de claro a oscuro. Lo comprueba `MovementForm.test.tsx` («a theme change re-colours the open form…»). Regla para componentes nuevos: si leen `colors`, `styles`, `categoryTone`, `categoryPalette` o `getColorScheme`, llaman a `useThemeRefresh()` al principio.

**División semántica (nueva en v4):** los tokens de **relleno** (`forest*`, `dangerFill`) llevan texto claro encima; los tokens de **tinta** (`accent`, `danger`, `expense`, `ink*`) son para texto e iconos sobre el fondo o una superficie. En claro `accent` y `forest700` coinciden; en oscuro `accent` es menta y `forest700` sigue siendo un relleno profundo.

Contrastes calculados con la fórmula de luminancia relativa WCAG 2.x (script en el repositorio de trabajo, no inventados). «Tarjeta» es el vidrio compuesto sobre el fondo: `#F6F8F7` en claro y `#191E1C` en oscuro.

### Claro

| Token | Hex | Uso | Contraste verificado |
|---|---|---|---|
| `ground` | `#E9EEEA` | Fondo de la app (salvia muy claro) | — |
| `glass` | blanco 60 % | Tarjetas (`Card`), pastillas | Compuesto `#F6F8F7` |
| `glassStrong` | `rgba(250,252,251,0.82)` | Barra de pestañas en Android (sin desenfoque) | Compuesto `#F7F9F8` |
| `glassBorder` | blanco 90 % | Borde de vidrio (decorativo) | — |
| `ink` | `#0E1712` | Texto principal | 15.55:1 fondo · 17.12:1 tarjeta |
| `inkMuted` | `#47534C` | Texto secundario, iconos inactivos de la barra | 6.85:1 fondo · 7.54:1 tarjeta · 7.61:1 barra |
| `inkSubtle` | `#5F6B64` | Metadatos (solo ≥ 13 px) | 4.74:1 fondo · 5.22:1 tarjeta |
| `accent` / `forest700` | `#1E4634` | Acción, pestaña activa, foco, barra del mes | 9.03:1 fondo · 9.94:1 tarjeta · 8.54:1 `sage100` |
| `onForest` | `#F4F7F2` | Texto sobre bosque | 9.81:1 sobre `forest700` |
| `expense` / `danger` | `#8C3A4E` | Gastos, errores | 6.32:1 fondo · 6.96:1 tarjeta · 6.04:1 `expenseTint` |
| `dangerFill` | `#8C3A4E` | Fondo del botón peligroso | `onForest` 6.87:1 |
| `warning` | `#8A5A00` | Cerca del límite | 5.05:1 fondo |
| `progress` | `#5A8767` | Relleno de barra-tallo | 3.16:1 sobre `track` (gráfico ≥ 3:1) |
| `track` | `#DCE3DE` | Pista de barras | — |
| `sage100` | `#E0E9E2` | Píldora de la pestaña activa, mosaicos | — |
| `borderStrong` | `#7D8781` | Borde de inputs, barras de meses anteriores | 3.16:1 fondo · 3.48:1 tarjeta (WCAG 1.4.11) |
| `glowA` | `#B9E2C7` | Resplandor de fondo (decorativo) | Ver nota |

En v4 `progress` pasó de `#5E8B6A` a `#5A8767`: con la pista nueva el anterior daba 2.99:1, por debajo de 3:1. El widget nativo de Android conserva su propia pareja `#5E8B6A`/`#E8E4DA` (3,1:1, ver [widgets.md](widgets.md)).

### Oscuro

| Token | Hex | Uso | Contraste verificado |
|---|---|---|---|
| `ground` | `#0A100D` | Fondo | — |
| `surface` | `#141B17` | Superficie sólida (Reducir transparencia) | — |
| `glass` | blanco 6 % | Tarjetas | Compuesto `#191E1C` |
| `glassStrong` | `rgba(22,30,26,0.86)` | Barra en Android | Compuesto `#141C18` |
| `ink` | `#F1F4F0` | Texto principal | 17.33:1 fondo · 15.23:1 tarjeta |
| `inkMuted` | `#A3AEA7` | Texto secundario | 8.39:1 fondo · 7.37:1 tarjeta · 7.58:1 barra |
| `inkSubtle` | `#909B94` | Metadatos | 6.68:1 fondo · 5.87:1 tarjeta |
| `accent` / `forest600` | `#8FD9AE` | Acción como tinta, pestaña activa, barra del mes | 11.63:1 fondo · 10.21:1 tarjeta · 9.44:1 `sage100` |
| `forest700` | `#2E6A4F` | Relleno del botón primario | `onForest` 5.91:1 |
| `expense` / `danger` | `#F2A1B1` | Gastos, errores | 9.62:1 fondo · 8.45:1 tarjeta · 7.55:1 `expenseTint` |
| `dangerFill` | `#A84459` | Fondo del botón peligroso | `onForest` 5.34:1 |
| `warning` | `#E8B65C` | Cerca del límite | 10.32:1 fondo |
| `progress` | `#7FC49A` | Barra-tallo | 6.67:1 sobre `track` |
| `track` | `#26302B` | Pista | — |
| `borderStrong` | `#6B766F` | Bordes de control | 4.07:1 fondo · 3.57:1 tarjeta |
| `mint` | `#CFE3D2` | Barras y presionado sobre tarjetas bosque (igual que en claro) | 3.23:1 sobre la pista de la tarjeta `forest700` · texto `forest700` encima 4.73:1 |
| `glowA` | `#2F7464` al 55 % | Resplandor de fondo | Ver nota |

**Nota sobre el resplandor:** `AmbientGlow` es un degradado radial estático cuyo centro cae en la esquina superior derecha, detrás del área segura. En su punto máximo `ink`, `accent` y `expense` siguen sobre 5:1 en ambos modos, e `inkMuted` sobre 4.5:1 (5.66 claro, 4.53 oscuro); `inkSubtle` baja a 3.91:1 (claro) y 3.61:1 (oscuro), por eso **no se coloca texto `inkSubtle` en esa esquina**. Fuera del centro el degradado se desvanece al fondo.

### Colores de categoría

Familias terrosas por categoría, una versión por modo (`categoryPalette`, mutada con el esquema). Las categorías del sistema tienen tono fijo; las personales reciben uno estable derivado de su id. El color siempre acompaña al nombre y al icono.

| Familia | Claro `ink`/`tint` | Claro `chart`/tarjeta | Oscuro `ink`/`tint` | Oscuro `chart`/tarjeta |
|---|---|---|---|---|
| salary | 8.67:1 | 7.03:1 | 8.98:1 | 6.96:1 |
| income | 7.27:1 | 5.18:1 | 8.77:1 | 6.77:1 |
| food | 6.22:1 | 4.64:1 | 8.22:1 | 5.70:1 |
| transport | 7.71:1 | 5.34:1 | 8.32:1 | 6.46:1 |
| services | 6.38:1 | 3.65:1 | 8.81:1 | 7.01:1 |
| other | 7.36:1 | 5.22:1 | 8.39:1 | 5.56:1 |
| custom | 6.68:1 | 3.83:1 | 8.93:1 | 6.31:1 |

Todos los `chart` superan 3:1 (WCAG 1.4.11) y todas las tintas 4.5:1.

**Marcas de terceros:** el logotipo «G» de Google conserva sus colores oficiales y el botón de Apple es el componente del sistema; ambos están exentos de los tokens.

## 2. Tipografía

**Manrope** (OFL, `@expo-google-fonts/manrope`). v4 añade el peso **300 (`Manrope_300Light`)** para la cifra protagonista: una cifra grande y ligera se lee como «el dato» sin gritar. Todos los montos usan `fontVariant: ['tabular-nums']`.

| Variante | Tamaño/alto de línea | Peso | Uso |
|---|---|---|---|
| `amount` | 52/60 (60/72 en Registrar) | 300, tracking −2 | Flujo neto en Inicio, monto que se escribe |
| `hero` | 34/40 | 800, tracking −0.8 | Titular de bienvenida y acceso |
| `display` | 40/48 | 800, tracking −0.5 | Montos de formularios secundarios (metas, presupuestos) |
| `title` | 28/36 | 700 | Título de pantalla |
| `heading` | 20/28 | 700 | Secciones |
| `subhead` | 17/24 | 600 | Nombres en filas, Gasto/Ingreso |
| `body` | 16/24 | 500 | Texto general |
| `label` | 14/20 | 600 | Etiquetas y botones pequeños |
| `caption` | 13/18 | 500 | Metadatos |

Reglas: `allowFontScaling` siempre activo; sin `numberOfLines` en etiquetas; la cifra de Inicio usa `adjustsFontSizeToFit` en una línea para que montos de muchos dígitos no se partan. El campo de monto de Registrar mide su texto con un gemelo oculto para que el «$» quede pegado a la cifra.

## 3. Espacio, forma y profundidad

- Escala de 4: `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 56`. Margen lateral 20 (24 en Inicio).
- Radios: botones **en píldora** (radio 26 = mitad de su alto mínimo de 52) en toda la app; barra de pestañas 32; píldoras de 44 dp con radio 22; tarjetas `lg 24`; inputs `control 16`.
- **Capas:** fondo (`ground` + `AmbientGlow`) → tarjetas de vidrio (`glass` + borde `glassBorder`) → elementos flotantes (`GlassSurface`). Sombra de la barra: color `shadow`, offset (0, 12), opacidad 0.16, radio 24, `elevation 8`.
- **`GlassSurface`** (`shared/ui/Glass.tsx`): en iOS y web, `BlurView` (intensidad 40) + velo `glass`; en Android, relleno denso `glassStrong` sin desenfoque en vivo (un desenfoque real necesita capturar un `BlurTargetView`); con **Reducir transparencia** (iOS) se vuelve `surface` sólido.
- Áreas táctiles: mínimo 48×48 dp (44 dp de alto en píldoras con `hitSlop` o fila de 48).

## 4. Iconografía

`lucide-react-native` (trazo 1.75; 2.25 en la pestaña activa), una sola familia. Mapa de categorías sin cambios: Salario → `BriefcaseBusiness`, Otros ingresos → `Coins`, Alimentación → `UtensilsCrossed`, Transporte → `Bus`, Servicios → `Zap`, Otros gastos → `Shapes`, personales → `Tag`. Iconos siempre con texto o `accessibilityLabel`; los decorativos se ocultan al lector.

## 5. Componentes (`mobile/src/shared/ui`)

| Componente | Responsabilidad | Accesibilidad |
|---|---|---|
| `AppText` | Variantes tipográficas | Escalado, `lineHeight` |
| `AppButton` | `primary` · `secondary` · `ghost` · `danger` (fondo `dangerFill`), en píldora. Ocupado: rueda pequeña **y el mismo nombre de la acción** («Guardar gasto»), a plena opacidad | role `button`, `accessibilityState` (`busy`), 52 dp |
| `IconButton` | Acción solo icono | `accessibilityLabel` obligatorio, 48 dp |
| `Card` | Vidrio translúcido con borde y radio 24 | Agrupa contenido relacionado |
| `GlassSurface` / `AmbientGlow` | Vidrio flotante / luz de fondo estática | El resplandor se oculta al lector |
| `AmountText` | Formatea COP desde cadena; variante `amount` ligera | Etiqueta hablada «Monto de $ … pesos colombianos» |
| `AmountField` | Campo de monto; `hero` = cifra grande centrada con «$», sin caja (solo un error dibuja la línea inferior) | Etiqueta «Monto», pista con las reglas de formato |
| `UnderlineTabs` | Dos o tres palabras; la elegida en `ink` con subrayado de 2 px y negrita | role `tablist`/`tab`, `selected`; nunca solo color |
| `SegmentedControl` | Pista salvia con segmento elevado; variante `quiet` = píldoras de vidrio separadas (fecha en Registrar) | role `tab`, `selected`, check + negrita |
| `CategoryChip` | Selección de categoría en píldora | role `radio`, `selected` |
| `TextField` | Etiqueta persistente, error asociado; ranuras `leading`/`trailing` | label, pista con error, foco al primer inválido |
| `SproutProgress` | Barra-tallo con brote | role `progressbar`, `accessibilityValue` |
| `Banner` | Aviso en línea; `success` y `error` llevan icono (círculo con check / alerta), `status` no | El significado no depende solo del color (WCAG 1.4.1); los errores son `alert` |
| `Skeleton` (`SkeletonList`, `SkeletonSummary`) | Bloques con la forma del contenido mientras carga la primera vez; las recargas con datos visibles son silenciosas | Un solo `progressbar` «Cargando…» por grupo, `busy`; los bloques no se leen |
| `MonthSwitcher` | ‹ Mes › con límites | Etiquetas «Mes anterior: …» |
| `MovementRow` | Fila de movimiento | Un solo foco con resumen completo |
| `TabBar` | Barra de vidrio **flotante**: solo la pestaña activa muestra su palabra (icono + nombre en píldora `sage100`); «+» central | role `tab`, `selected`, nombres hablados en todas |
| `Screen` | Pantalla con título, resplandor y relleno inferior para la barra (`TabBarSpaceContext`); el pie de los formularios ya no es una franja blanca | Foco al título al entrar |
| `SwipeToArchive` | Deslizar una fila a la izquierda para archivar (Movimientos): umbral de 96 pt, resistencia pasado el umbral, toque háptico al cruzarlo, un *flick* rápido también cuenta; al soltar pide confirmación y la fila vuelve con un resorte | La acción «Archivar» del lector de pantalla y el botón del detalle siguen disponibles; el soltar no cuenta como toque en la fila |
| `Monedin` | Rig 2.5D de la mascota (sección 6) | Decorativo (`accessible={false}`) |

## 6. Monedin

- Recurso: `mobile/assets/brand/monedin{,@2x,@3x}.png`, recortado sin alterar la referencia `assets/brand/monedin-reference.jpg`. **v4 no redibuja la mascota**: anima capas sobre la misma imagen.
- **Rig 2.5D** (`shared/brand/Monedin.tsx`, Reanimated en el hilo de UI):
  - *Respiración*: `scaleY 1→1.014`, `scaleX 1→0.994` y `translateY` mínimo, con origen en los pies (`transformOrigin 50% 92%`), ciclo ≈ 3.4 s seno.
  - *Parpadeo*: dos párpados del color del pelaje muestreado (`#D7C6BC`), ubicados sobre los ojos medidos en `monedin@3x.png` (761×768), `scaleY 0→1→0` en 180 ms con origen arriba; intervalo irregular 2.8–5.4 s y doble parpadeo ocasional.
  - *Sombra de contacto*: elipse bajo los pies que se encoge y aclara con la respiración y los saltos.
  - *Inclinación*: en tamaños `md` y `hero`, el sensor de gravedad (`useAnimatedSensor`, 32 ms) inclina la figura hasta ±8° (`hero`) o ±5° (`md`) con un resorte suave; el sensor solo se registra mientras Monedin está en reposo y el movimiento está permitido.
  - Sin brillo especular: sin recortar a la silueta se vería como un rectángulo sobre el fondo.
- Tamaños: `hero` 200 (bienvenida), `md` 120 (vacíos, celebraciones), `sm` 56 (cabeceras, consejos, avisos).
- Momentos y voz: sin cambios respecto de v3 (bienvenida, recorrido, acceso, confirmaciones, vacíos, metas, consejo del mes ahora en Análisis). Tú, cercano y breve.

## 7. Movimiento

Herramientas: `Animated` de React Native (`useNativeDriver: true`) para la interfaz y **Reanimated 4** para el rig de Monedin. Hook `useReducedMotion()` basado en `AccessibilityInfo`. Curvas: `easeOut = bezier(0.23, 1, 0.32, 1)`, `easeInOut = bezier(0.77, 0, 0.175, 1)`; la respiración usa seno (`Easing.inOut(Easing.sin)`).

| Momento | Frecuencia / propósito | Especificación | Reduce Motion |
|---|---|---|---|
| Presión de botón | Decenas al día / feedback | `scale 1→0.97`, 120 ms; vuelta 160 ms | Solo color |
| Cambio de pestaña | Decenas al día | **Sin animación** | — |
| Cambio de mes en Inicio | Ocasional / evitar salto | `opacity` + `translateY 8→0`, 220 ms | Solo opacidad 150 ms |
| Entrada de acceso | Ocasional | Bloques escalonados 40 ms, 320 ms | Solo opacidad 150 ms |
| Cifras | Lectura de datos | **Sin conteo animado** | — |
| Barra-tallo | Ocasional / estado | `scaleX` 280 ms, escalonado 40 ms | Estado final |
| Banner de éxito | Ocasional / feedback | `translateY −16→0`, 240 ms; sale 200 ms; háptico | Solo opacidad |
| Esqueleto de carga | Primera carga / estado | Pulso de opacidad 0,55↔1, 900 ms por mitad, `easeInOut`, en bucle | Quieto al 70 % |
| Actualizar Inicio | Ocasional | Tirar hacia abajo (`RefreshControl`) en lugar del botón «Actualizar resumen» | Nativo del sistema |
| Monedin aparece | Raro / deleite | `scale 0.94→1` + opacidad 320 ms `easeOut` | Solo opacidad 200 ms |
| Monedin en reposo | Raro (bienvenida, vacíos) | Respiración + parpadeo + inclinación (sección 6) | Estático, sin párpados ni sensor |
| Monedin celebra | Raro (meta, primer movimiento) | Salto con resorte `damping 14, stiffness 160` + giro ±6°, una vez; háptico | Solo háptico + mensaje |
| Deslizar para archivar | Ocasional / feedback y continuidad | La fila sigue al dedo (Gesture Handler 3 + Reanimated en el hilo de UI); vuelve con resorte `damping 22, stiffness 260`; la franja «Archivar» crece de 85 % a 100 % con el avance | Vuelta con `timing` 150 ms `easeOut`, sin resorte |
| Fondo y vidrio | Siempre visible | **Estáticos**: el resplandor no se mueve | — |

## 8. Voz y contenido

Español de Colombia, tú. Montos `$ 1.245.000`. Fechas «7 nov 2026», «Hoy», «Ayer». Nunca «saldo» para el flujo neto. Errores dicen qué pasó y cómo seguir. Cuando no hay porcentaje de comparación (mes anterior en cero o negativo) la razón se muestra en pantalla, no solo al lector.

## 9. Composición por pantalla (v4, 8 nov 2026)

- **Inicio:** título FINZA pequeño, avatar de vidrio, selector de mes. Protagonista: «Flujo neto del mes» en cifra ligera grande; debajo, una sola línea con flecha + «Ingresos» y «Gastos»; la comparación con el mes anterior como pie. Tarjeta de vidrio «Gasto por mes» (seis barras, el mes en curso en `accent`) con «Ver análisis». «Recientes» con tres movimientos y «Ver todos». Sin atajos ni encabezado bosque.
- **Análisis** (`/insights`, nuevo): frase de cuánto se ha gastado del ingreso, consejo de Monedin, presupuestos, metas, tendencia y dona por categoría (lo que en v3 estaba en Inicio).
- **Registrar:** hoja modal con «Gasto · Ingreso» subrayados, «Monto» como cifra de 60 px centrada, píldora «Escribir como frase» (lápiz; despliega el campo de frase con estado *expandido* anunciado), categorías en una fila desplazable, fecha en píldoras «Hoy · Ayer · Otra fecha», nota opcional y «Guardar gasto» en píldora. Se usa el teclado numérico del sistema en vez de un teclado propio: conserva dictado, lectores de pantalla y teclados externos.
- **Movimientos:** además, cada fila se desliza a la izquierda para archivar (con confirmación).
- **Inicio → Análisis:** la tarjeta «Gasto por mes» y su «Ver análisis» siempre se muestran; sin gastos en seis meses dice «Aún no hay gastos en los últimos seis meses.» y si falla un mes anterior se oculta solo el gráfico.
- **Movimientos, Metas, Presupuestos, Perfil:** heredan el fondo con resplandor, las tarjetas de vidrio, los botones en píldora y la barra flotante; su estructura no cambió en v4.
- **Acceso y bienvenida:** Monedin `hero` con el rig sobre anillos estáticos.

Reglas que se mantienen: verde solo en acción o dato principal; brote solo en progreso; Monedin solo con intención; ninguna cifra se anima; nada se comunica solo con color.

## 10. Refinamiento del 12 nov 2026

Auditoría en web (375×812) de todas las pantallas con la cuenta de demostración, contra el API real:

- **Inicio:** el aviso «Confirma tu correo» pasó **debajo** del flujo neto (antes empujaba la cifra hacia abajo); la carga muestra un esqueleto con la forma del resumen; el botón «Actualizar resumen» se reemplazó por tirar hacia abajo.
- **Movimientos:** el texto «Cargando movimientos…» solo aparece como esqueleto en la primera carga; al recargar con filas visibles no hay ruido.
- **Porcentajes:** un único formato (`percentText` en `shared/formatting/money.ts`): coma decimal y sin ceros finales («32,5 %», «40 %»), igual en metas, categorías y comparación mensual, también en el texto hablado.
- **Botones ocupados:** conservan el nombre de la acción con una rueda, en vez de «Procesando…».
- **Avisos:** éxito y error con icono.
- **Donut de categorías:** gira con `transform="rotate(-90 c c)"`; `rotation`/`origin` generaban un atributo DOM inválido en web.
