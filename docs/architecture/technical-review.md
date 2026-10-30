# Revisión técnica vinculante — 30 octubre 2026

Complementa el diseño aprobado; en caso de ambigüedad prevalecen estas reglas.

Ubicación física definitiva: rutas Expo en `mobile/src/app`, store en `mobile/src/core/store.ts` y providers junto a core. Las referencias `mobile/app` y `src/app/store.ts` de los esquemas iniciales se sustituyen por estas rutas; las features continúan en `mobile/src/features`. Esto evita que Expo trate el store como una pantalla. Node24 LTS y SDK58 quedan como base verificada de herramientas.

## Dinero y redondeo

- Primer corte: COP; importe estrictamente positivo, máximo `999999999999999.99`, hasta dos decimales. Guardar en NUMERIC(19,4); CHECK de moneda, positividad, máximo y escala de centavos. Código de moneda CHAR(3), sin enum cerrado a COP para futuras migraciones.
- JSON de entrada/salida: cadenas con punto decimal, sin separadores de miles ni exponentes. Salida canónica de dos decimales (`"1234.50"`). Rechazar float, NaN, infinito, negativos, cero y exceso de decimales. No redondear silenciosamente entradas.
- Python Decimal desde cadena; TypeScript conserva cadenas. El formateo visual en español no cambia el valor enviado. La UI convierte la coma decimal a punto y valida; no usa parseFloat para dinero.
- Cálculos con precisión 38 en contexto local. SUM de importes exactos; redondear únicamente resultados publicados a centavos con ROUND_HALF_UP. Porcentajes a dos decimales. No reutilizar importes de pantalla redondeados como entradas de cálculos.
- Multimoneda futura: moneda original, tasa Decimal positiva, fecha/fuente, moneda destino y monto convertido. Cada conversión conserva su tasa histórica; no revalorizar movimientos pasados al cambiar una preferencia. No agregar monedas distintas.

## Fechas

- occurred_on: DATE contable seleccionada por el usuario, formato YYYY-MM-DD; nunca convertirla mediante Date UTC en móvil. created_at/updated_at/deleted_at: TIMESTAMPTZ UTC.
- Primer corte usa America/Bogota para determinar hoy y mes predeterminado; rechaza fechas contables futuras y anteriores a 1900-01-01.
- Mes solicitado válido 1900-01 a 9998-12. Intervalos [primer día, primer día siguiente), con año bisiesto y diciembre cubiertos por pruebas. El mes anterior de enero se obtiene del año anterior.
- La fecha de edición no cambia occurred_on; editar o archivar recalcula el mes contable original y sus comparaciones.

## Dashboard

- I = suma de ingresos activos COP del propietario en el mes; G = suma de gastos activos; N = I - G. Etiqueta «Flujo neto del mes», nunca saldo ni patrimonio en este corte.
- Mes vacío: I=G=N=0, lista vacía, mensaje para registrar primer movimiento.
- Delta absoluto = N actual - N anterior cuando existe al menos un movimiento activo anterior. Porcentaje = delta / N anterior * 100 solamente si N anterior > 0. Anterior cero/negativo: porcentaje null, razón zero_baseline/negative_baseline; mostrar diferencia absoluta. Sin registros anteriores: diferencias null, razón no_previous_data.
- Ejemplos: I=1000, G=250 → N=750; anterior 500 → delta=250, 50%; anterior -100 → delta=850, porcentaje null. Igualdad produce 0%. No llamar rentabilidad a esta comparación.
- Últimos cinco del MES solicitado, orden occurred_on DESC, created_at DESC, id DESC; excluir archivados y otros propietarios. Consultas agregadas, no cargar todo el historial en Python.
- Pantalla informa que se compara con el mes calendario completo anterior, incluso cuando el actual está incompleto.

## Seguridad comprobable

- El servidor obtiene account_id exclusivamente de JWT validado (firma, algoritmo permitido, exp, iss, aud, sub, sesión activa). Nunca de owner_id enviado por cliente. Rechazar campos extra en contratos de escritura.
- Access 15 minutos; refresh aleatorio 256 bits, hash SHA-256 persistido, expiración absoluta 30 días por familia. Rotación transaccional con bloqueo de fila; reutilización revoca familia. Logout revoca familia y endpoints privados verifican sesión activa. Móvil serializa refresh concurrentes.
- Argon2id mediante librería; no criptografía casera. Contraseña 12–128 caracteres; login genérico. Límite inicial login 5 fallos/15 min por combinación IP+identificador normalizado, registro 5/h/IP, refresh 30/min/sesión. Estado compartido en PostgreSQL para no depender de memoria por worker; no guardar IP cruda innecesariamente.
- Todas las lecturas/escrituras privadas filtran id Y owner_id. Recurso inexistente o ajeno → 404 idéntico. Lista/dashboard de B nunca incluyen datos de A. Categorías de sistema accesibles; privadas solo al dueño y de tipo compatible.
- Pruebas automáticas con dos usuarios reales y PostgreSQL: GET/PATCH/DELETE ajenos, categoría ajena, owner_id manipulado, filtros/paginación, totales y recientes, token ausente/expirado/alterado, logout, replay y refresh concurrente. Verificar ausencia de modificación en A después del intento de B.
- RTK Query se resetea en logout/cambio de cuenta; no persistir caché financiera. SecureStore solo refresh, access en memoria; no tokens en logs/Redux DevTools. Limpiar solicitudes de sesión anterior.
- POST movimiento incluye client_request_id UUID único por propietario; reintento idéntico devuelve mismo recurso, contenido distinto con misma clave → 409. Guardado + auditoría en una transacción.
- TLS en despliegue; CORS no sustituye autorización móvil. Logs solo metadatos y request_id. Backups cifrados y prueba de restauración antes de usar datos reales.

## Accesibilidad por pantalla

Criterios transversales: texto 4.5:1; texto grande/gráficos 3:1; controles 48 dp (supera mínimo del documento); escalado 1.5x sin recorte y revisión 2x; sin dependencia exclusiva del color/gestos; Reduce Motion; etiquetas persistentes. WCAG es referencia: no afirmar conformidad total de app nativa solo por pasar scanner.

| Pantalla | Recorrido verificable | Error/estado que debe probarse |
|---|---|---|
| Registro | Título, email, contraseña, mostrar contraseña, crear cuenta, login; propósito de cada campo | Email inválido/duplicado y contraseña corta: anuncio, foco al primer inválido, conservar email; busy impide doble envío |
| Login | Título, credenciales, mostrar, ingresar, registro | Mensaje genérico anunciado, foco útil; caída de red conserva email; no leer contraseña en claro |
| Dashboard | Título/mes, I/G/N, comparación, registrar, últimos movimientos | Vacío, loading, error/reintento, negativo con signo/texto; números anunciados en COP; gráficos con resumen |
| Registrar/editar | Título, tipo, monto COP, categoría, fecha, nota, guardar | Sin monto/fecha futura: foco/anuncio y conservación; teclado no oculta guardar; éxito anunciado una vez y foco lógico al volver |
| Movimientos | Mes/filtros, filas con tipo/monto/fecha, editar/archivar | Alternativa a swipe, confirmación antes de archivar; paginación accesible sin saltos ni duplicación |

Evidencias por pantalla: dispositivo/OS/versión, fecha, pasos, esperado/observado, captura o video, hallazgo y corrección. TalkBack Android: pendiente hasta ejecución real. VoiceOver/Inspector Apple: planificado según disponibilidad, nunca ejecutado por inferencia. Pruebas automatizadas de semántica complementan, no sustituyen recorrido manual.

## Prioridades y calendario relativo

| Ventana orientativa | Entrega | Condición de salida |
|---|---|---|
| Semana 1 | Fase 0: base técnica | API health, CI, configuración PG, dominio dinero/fecha probado, shell móvil |
| Semanas 2–3 | Identidad | registro/login/logout seguros y pruebas negativas |
| Semanas 4–5 | Movimientos + dashboard | recorrido completo, reintentos sin duplicación, auditoría TalkBack |
| Semanas 6–8 | Portafolio manual | aportes/retiros/precios y rendimiento probado |
| Semanas 9–10 | Metas | progreso y asignaciones sin contar dos veces aportes |
| Semanas 11–12 | Simulaciones | r=0, inflación/costos, plazos y avisos probados |
| Semanas 13–14 | Planeado vs. Real | plan versionado por mes y diferencia trazable |
| Semanas 15–16 | Reserva y cierre | pruebas, accesibilidad, documentación y demo |

Ventanas relativas, no fechas prometidas: ajustar al calendario real. Si hay retrasos, posponer CSV, precios externos, anuncios de terceros y modo oscuro antes de recortar seguridad/accesibilidad. El bloque PUBLICIDAD puede ser demostrativo sin SDK. No añadir hardware sin un caso de uso de Finza; biometría es mejora posterior. Las semanas del curso aportan conceptos, no obligan a usar toda librería en el MVP.

Fuentes técnicas consultadas: [Decimal](https://docs.python.org/3/library/decimal.html), [RTK Query](https://redux.js.org/toolkit/rtk-query/usage/cache-behavior), [React Native accesibilidad](https://reactnative.dev/docs/accessibility), [versiones FastAPI](https://fastapi.tiangolo.com/deployment/versions/). Políticas de límites, fechas y redondeo son decisiones de Finza, no mandatos de esas librerías.
