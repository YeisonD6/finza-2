# Ingeniería inversa de MonAi — Informe

**Fecha:** 7 de noviembre de 2026
**Objeto:** «Finanzas personales – MonAi» (`app.getmonai.android`), desarrollador Florian Vates.
**Finalidad:** comprender decisiones de producto y diseño para construir una propuesta propia superior. **No** se copia código, marca, textos ni recursos gráficos.

## 1. Metodología y límites

| Fuente | Método | Estado |
|---|---|---|
| Sitio oficial `get-monai.app` (inicio, FAQ, términos/privacidad) | Lectura del contenido público | Verificado |
| App Store iOS (id 6447112647) | Lectura de ficha, notas de versión y etiquetas de privacidad | Verificado |
| Google Play (`hl=es`, Colombia) | Renderizado en navegador real y lectura del DOM | Verificado |
| Capturas de la ficha de Google Play | Observación visual | Observado parcialmente |
| APK (manifiesto, permisos, clases, dependencias) | REA + JADX | **No disponible**: no se ha recibido el APK. No se descargó de espejos no oficiales |
| Uso real con emulador/ADB | Pruebas controladas | **No disponible**: sin APK ni SDK Android en el equipo |

Herramienta preparada: **REA 6.8.0** (`rea-agents`, proyecto `morluto/rea`, licencia MIT). El repositorio indicado (`NabilRFG12/Reverse-Engineer-anything`) es una copia idéntica del upstream (`e762e32` existe en `morluto/rea`). Se instaló aislado en `~/tools/rea-cli` con `--ignore-scripts`, ejecutado con Node 24.22.2, y se registró como servidor MCP en Claude Code (conectado), Codex (habilitado) y Gemini CLI (registrado; Gemini lo marca deshabilitado). El análisis Android requiere además JDK ≥ 17 y `jadx-headless-mcp 0.7.1`, que se instalarán solo si se recibe el APK.

Leyenda: **V** verificado en fuente oficial · **P** observado parcialmente · **I** inferido · **N/D** no disponible.

## 2. Metadatos

| Dato | Valor | Nivel |
|---|---|---|
| Google Play | 4,4★, 1,17 mil reseñas, 50 mil+ descargas, actualizada 29 oct 2026, «Para todos» | V |
| App Store | 4,8★, 891 valoraciones, v1.10.3, iOS 18+, 56,1 MB | V |
| Modelo | Gratis con compras: prueba de 7 días; Free limitado a 20 transacciones/mes e historial del mes actual; Basic, Family, Student | V |
| Seguridad de datos (Play) | Declara «no se recogen datos», «los datos no se cifran», «los datos no se pueden eliminar» | V |
| Inconsistencia | La ficha Android dice que los datos se guardan «en tu iCloud» (texto heredado de iOS) | V |
| Terceros (política de privacidad) | Appwrite (Frankfurt), OpenAI, Anthropic, Groq, RevenueCat, TelemetryDeck, Meta (WhatsApp, opcional) | V |

## 3. Funcionalidades

| Función | MonAi | Plataforma | Nivel |
|---|---|---|---|
| Registro de gastos e ingresos | Sí | Ambas | V |
| Registro por voz | Sí, dicta varias compras y las separa | Ambas (Android con errores de reconocimiento documentados) | V |
| Lenguaje natural escrito | «almuerzo $12», «mercado 45.50 ayer» → monto, fecha y categoría | Ambas | V |
| Categorización automática con IA | Sí (OpenAI) | Ambas | V |
| División de una transacción | Varias compras en un dictado; no divide un gasto entre personas | Ambas | V |
| Categorías personalizadas | Sí, con emoji y tipo ingreso/gasto | Ambas | V |
| Medios de pago / cuentas | No existen como entidad; se sustituyen con #etiquetas | Ambas | V |
| Presupuestos | Límite mensual por categoría, barras de progreso, alertas, *rollover* | Ambas | V |
| Etiquetas | #hashtags | Ambas | V |
| Recurrentes | Frecuencia; se registran al abrir la app; editar una/futuras/pasadas | Ambas | V |
| Historial | Gratuito solo mes actual | Ambas | V |
| Informes y gráficas | Gráfica de categorías en inicio; la FAQ dice que no busca «gráficas avanzadas» | Ambas | V |
| Análisis con IA (chat) | Beta en iOS; «próximamente» en Android | iOS | V |
| Importar/exportar | CSV propio; sin PDF | Ambas | V |
| Listas compartidas | Invitación por enlace; se actualizan al abrir la app | Ambas | V |
| Sincronización | Cuenta MonAi (Appwrite) o iCloud | Ambas / iOS | V |
| Offline | Almacenamiento local en Android sin cuenta | Android | I |
| Notificaciones | Alertas de presupuesto | Ambas | V |
| Automatizaciones | Apple Pay/SMS/correo vía Atajos (iOS); lectura de notificaciones bancarias (Android) | Diferente por SO | V |
| Widgets | Inicio, categorías, presupuestos | Ambas (Android desde la última versión) | V |
| Modo oscuro | Añadido en la última versión de Android tras solicitudes | Android | V |
| Accesibilidad declarada | No se menciona en ninguna fuente | — | N/D |
| Metas de ahorro | No se menciona | — | N/D |
| Mascota | No tiene | — | V (observado) |

## 4. Análisis visual (capturas de Google Play)

**Observado:** fondo blanco, acento coral/naranja, tipografía sans geométrica en negrita para cifras, número grande del total del mes en el centro, barras verticales por categoría con emoji, botón circular de micrófono centrado abajo, burbujas de texto tipo chat para las entradas. Lenguaje cercano («Fácil. Simple. Hermoso.»).

| Aspecto | Fortaleza | Debilidad / oportunidad |
|---|---|---|
| Captura | Registro en segundos, voz como acción primaria | Depende de IA en la nube; falla sin red o con reconocimiento de voz del sistema |
| Inicio | Un número y una gráfica: jerarquía muy clara | Muestra solo gasto; no comunica flujo neto ni comparación con el mes anterior |
| Gráficas | Barras con emoji, lectura rápida | El color y el emoji son el canal principal; sin alternativa textual declarada |
| Navegación | Mínima, todo en una pantalla | Ajustes acumulan funciones (presupuestos, listas, cuenta) |
| Feedback | Tono amable | Sin acompañamiento ni educación financiera |
| Reseñas negativas | — | Transferencias, cuentas, informes, modo oscuro, funciones prometidas no disponibles en Android |

## 5. Ingeniería inversa técnica

**N/D.** No se recibió el APK, por lo que no se analizaron manifiesto, permisos, clases, dependencias ni almacenamiento. Lo único afirmable proviene de la política de privacidad (proveedores listados en §2). Cuando se disponga del APK extraído legítimamente de un dispositivo propio (`adb shell pm path app.getmonai.android` + `adb pull`), el plan es:

```bash
rea inspect-android-package /ruta/monai.apk
rea search-android-classes /ruta/monai.apk appwrite
rea search-android-classes /ruta/monai.apk revenuecat
rea trace-android-references /ruta/monai.apk <clase>
```

Sin eludir autenticación, protecciones ni extraer credenciales.

## 6. Matriz comparativa y propuesta

| Función | MonAi | FINZA actual | Oportunidad | Propuesta FINZA | Prioridad |
|---|---|---|---|---|---|
| Registro manual | V | Completo (idempotente, COP exacto) | Formulario lento (fecha y mes escritos a mano) | Formulario rediseñado: teclado numérico, chips de categoría, fecha por atajos (hoy/ayer/selector) | P0 |
| Lenguaje natural | V (IA en la nube) | No existe | Funcionar sin red, sin coste ni envío de datos a terceros | **Registro rápido**: intérprete determinista en español en el dispositivo («almuerzo 18 mil ayer») que rellena el formulario para confirmar | P1 |
| Voz | V | No existe | — | Usar el dictado del teclado del sistema en el campo de registro rápido (sin permisos nuevos) | P2 |
| Dashboard | Gasto + barras | Ingresos/gastos/flujo neto/comparación, sin diseño | Mostrar más contexto con igual simplicidad | Tarjeta de flujo neto, comparación, desglose por categoría accesible | P0 |
| Estadísticas | Gráfica de categorías | No existe | Accesibilidad de gráficas | Gráfica de dona/barras + tabla textual equivalente | P0 |
| Presupuestos | V | No existe | Alertas comprensibles sin depender del color | Límite mensual por categoría, estado en texto («Te quedan…», «Excedido»), Monedin avisa | P0 |
| Metas de ahorro | N/D | No existe | **Diferenciador** | Metas con aportes y progreso; Monedin celebra hitos | P1 |
| Categorías personalizadas | V | Parcial | Iconografía coherente | Icono y color por categoría en el cliente | P1 |
| Seguridad y privacidad | Play: «no cifra», «no se puede eliminar» | Argon2id, tokens rotatorios, aislamiento probado | **Diferenciador** de confianza | Comunicarlo en onboarding y perfil | P0 |
| Accesibilidad | N/D | Sólida en código | **Diferenciador** académico y de producto | WCAG 2.2 AA móvil, TalkBack verificado, Reduce Motion | P0 |
| Mascota/acompañamiento | No tiene | No existe | **Diferenciador** de marca | Monedin en onboarding, vacíos, confirmaciones, metas, consejos | P0 |
| Modo oscuro | Recién añadido | No | — | Tokens preparados; tema oscuro | P2 |
| Recurrentes | V | No | — | Futuro | P3 |
| Listas compartidas / IA chat / widgets / exportación | V | No | Fuera del alcance de la entrega | Futuro (roadmap) | P3 |

## 7. Conclusiones

1. MonAi gana por **velocidad de captura** y **simplicidad visual**. FINZA lo iguala con un registro rápido local y un formulario sin fricción, sin enviar datos financieros a proveedores de IA.
2. MonAi pierde en **confianza** (declaraciones de seguridad débiles en Play), **accesibilidad** (no declarada) y **acompañamiento**. Esos tres ejes son el diferenciador de FINZA: seguridad verificable, accesibilidad probada y Monedin.
3. Las funciones avanzadas de MonAi (IA en la nube, automatizaciones, listas compartidas) se documentan como roadmap; incorporarlas ahora comprometería la estabilidad de la entrega.

## Referencias

[1] MonAi, «MonAi – Expense tracker», get-monai.app, 2026. https://www.get-monai.app/
[2] MonAi, «FAQ», 2026. https://www.get-monai.app/faq
[3] MonAi, «Terms, Privacy Policy», 2026. https://www.get-monai.app/terms.html
[4] Apple, «Expense Tracker – MonAi», App Store. https://apps.apple.com/app/apple-store/id6447112647
[5] Google, «Finanzas personales – MonAi», Google Play. https://play.google.com/store/apps/details?id=app.getmonai.android
[6] morluto, «REA: Reverse Engineer Anything», v6.8.0. https://github.com/morluto/rea
