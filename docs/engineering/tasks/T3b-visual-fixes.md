# T3b — Correcciones de la revisión visual de T3 (emulador Android)

**Asignado a:** Codex · **Revisor:** Claude · **Depende de:** T3 (en el árbol de trabajo, sin commit)

Revisión hecha en un emulador Pixel (1080×2400, Android 15, Expo Go) recorriendo bienvenida → registro → inicio de sesión → registrar gasto → Inicio → Movimientos → Metas → Perfil contra la API real. El flujo funciona de punta a punta; estos son los defectos que hay que corregir antes del commit. Respeta `docs/engineering/design-system.md` (Brote) y las restricciones de T3. **No edites `backend/**`** (Claude lo corrige en paralelo).

## 1. Selección visible como texto (bloqueante)

`AppButton` (línea ~122) añade el texto « ✓ Seleccionado» cuando `active`. Rompe el ajuste de línea («Hoy ✓ Selecc / ionado», «Todos ✓ Sele / ccionado», «Crear cuenta ✓ / Seleccionado») en `SegmentedControl`, chips de fecha, filtros y `CategoryChip`.

- Elimina ese texto visible. La selección se comunica con: fondo `forest700` + texto `onForest` **y** un icono lucide `Check` (16, trazo 2) delante de la etiqueta en el estado activo (señal no cromática), más `accessibilityState={{ selected: true }}` (TalkBack ya dice «seleccionado»).
- Actualiza las pruebas que buscan «… ✓ Seleccionado» para consultar por rol/nombre y `accessibilityState.selected`.

## 2. Etiquetas de campo invisibles en el formulario de movimiento (bloqueante)

En `movement/new` las etiquetas «Categoría», «Fecha contable» y «Nota (opcional)» aparecen como un punto o recortadas en el primer render (en la segunda captura «Categoría» aparece cortada a «egoría»). Investiga la causa (probables: `Text` con altura 0 por `lineHeight`/`fontFamily` antes de cargar Manrope, un contenedor con altura fija o `overflow: hidden`, o la animación de entrada). Todas las etiquetas deben verse completas siempre, también con fuente al 200 %. Añade una prueba que verifique que las tres etiquetas se renderizan con su texto.

## 3. Barra de pestañas

- «Movimientos» se parte en «Movimient / os». Mantén **«Movimientos»** con `numberOfLines={1}` + `adjustsFontSizeToFit` + `minimumFontScale 0.85` solo en la etiqueta de pestaña, y caption 12/16; si aun así no cabe a escala de fuente grande, permite dos líneas **sin cortar palabras** (nunca partir una palabra). Mantén `accessibilityLabel` completo.
- Pestaña activa: hoy solo se distingue por un subrayado del texto. Usa icono y etiqueta en `forest700` con peso 700 y un indicador tipo píldora `sage100` (64×32, radio pill) detrás del icono (patrón Material 3), y los inactivos en `inkMuted`. Sin animación (regla de Brote).

## 4. Selector de mes (Inicio y Movimientos)

Quita el botón grande «Elegir mes». El texto central «Noviembre 2026» pasa a ser el botón que abre el selector (role `button`, `accessibilityLabel` «Mes: noviembre 2026. Toca para elegir otro mes», icono `ChevronDown` 16 a la derecha). Las flechas ‹ › se mantienen. Actualiza las pruebas que pulsan «Elegir mes».

## 5. Inicio

- Quita el título «Inicio» del encabezado verde (la pestaña ya lo dice). En su lugar, saludo `subhead` «Hola» + nombre local del correo o simplemente el wordmark «FINZA» en `label` 700 con tracking 1; el avatar se queda a la derecha.
- Encabezado más compacto: reduce el padding vertical para que en 1080×2400 la tarjeta de Monedin y el inicio de «Últimos movimientos» queden visibles sin desplazar.
- Monto del flujo neto: negativos como **«−$ 18.500»** (signo menos tipográfico U+2212 antes del símbolo), positivos «$ 18.500» sin «+». «COP» va **en línea** tras el monto en `label` `onForestMuted` («−$ 18.500 COP»), no en una línea aparte. Corrige `formatCOP` en `shared/formatting/money.ts` para que **todos** los negativos salgan como «−$ X» (hoy sale «$ −18.500» en Inicio y «-$ 18.500» con guion en la fila de Movimientos); añade pruebas.
- Línea de comparación: con «Sin datos del mes anterior» sobra el guion largo decorativo; muestra solo el texto `onForestMuted`.

## 6. Movimientos

- Fila (`MovementRow`): monto alineado a la derecha en la misma fila que el nombre de categoría (patrón lista financiera), nota y fecha en caption debajo; el monto no debe partirse. A fuente 200 % puede pasar debajo, alineado a la izquierda.
- Quita el botón de texto «Archivar» bajo cada fila. Tocar la fila abre la edición (ya existe) y allí va «Archivar movimiento» (variant `danger` ghost, con confirmación nativa). Añade además una acción accesible en la fila: `accessibilityActions=[{name:'archive',label:'Archivar'}]` con la misma confirmación. Ajusta pruebas.
- Los filtros de categoría deben tener un espacio final para que el último chip no quede cortado sin indicio; añade `contentContainerStyle` con padding derecho 20.

## 7. Autenticación

- Un solo título. Estructura: Monedin `sm` + wordmark «FINZA» (mayúsculas, como en la marca) arriba; título `title` «Crea tu cuenta» / «Inicia sesión»; el `SegmentedControl` Ingresar/Crear cuenta se elimina y se sustituye por un enlace inferior «¿Ya tienes cuenta? Inicia sesión» / «¿No tienes cuenta? Crea una» (botón `ghost`). Nunca «Finza» en minúsculas en texto visible.
- Contraseña: la ayuda «Usa entre 12 y 128 caracteres.» pasa **debajo** del campo en `caption` `inkMuted` (TextField ya admite `hint`; añade un prop `hintPosition` o mueve el hint debajo del input para todos los campos — preferible debajo para todos, como Material). Asociada al campo en `accessibilityHint`.
- Botón mostrar/ocultar contraseña: `IconButton` **dentro** del campo, a la derecha (48×48, `Eye`/`EyeOff`, etiqueta «Mostrar contraseña»/«Ocultar contraseña», `accessibilityState.checked`). Añade a `TextField` un slot `trailing`.
- Tras registrarse correctamente, inicia sesión automáticamente con las mismas credenciales (`auth.register` y después `auth.login`) y anuncia «Cuenta creada. Te damos la bienvenida a FINZA.»; si el login automático falla, vuelve al modo inicio de sesión con el correo relleno y el mensaje actual.

## 8. Bienvenida (3 pasos)

- Quita «Te damos la bienvenida» + «FINZA» del encabezado; arriba solo «Saltar» (ghost, a la derecha). Paso indicado con tres puntos (8 dp, activo `forest700` 24 dp de ancho) + texto accesible «Paso 1 de 3».
- Cada paso con visual distinto: 1) Monedin `hero` idle + «Hola, soy Monedin»; 2) mini maqueta estática de una fila de movimiento y el flujo neto (componentes reales con datos de ejemplo, marcados `importantForAccessibility="no-hide-descendants"` y texto alternativo en el párrafo) + «Registra en segundos»; 3) `SproutProgress` de ejemplo al 65 % + «Mira crecer tus metas». Texto del paso centrado verticalmente con el visual; elimina el gran espacio muerto.
- Botón «Siguiente» / último «Empezar».

## 9. Campo de monto (`AmountField`)

- Monto grande centrado `display` con «COP» como **sufijo** en la misma línea (label `inkMuted`), sin la etiqueta «COP» flotante encima. Placeholder «0». Sin borde de caja: solo una línea inferior 2 dp (`border` / `forest700` enfocado / `danger` error).
- Etiqueta visible corta «Monto» (label); la ayuda larga pasa a `accessibilityHint` y, visible, un caption corto debajo: «Usa coma para decimales.». Errores debajo, asociados.

## 10. Restricciones y aceptación

- Sin dependencias nuevas, sin colores literales fuera de `tokens.ts`, sin floats para dinero, Prettier sobre lo tocado, sin commits.
- `npm run typecheck`, `npm test` y `npx expo export --platform android` sin fallos.
- Resumen final con archivos tocados, la causa raíz del punto 2 y cualquier desviación.
