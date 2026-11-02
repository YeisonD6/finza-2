# Dashboard — pruebas manuales pendientes

No ejecutadas en hardware. Las pruebas Jest de semántica/estados y el export Android no sustituyen TalkBack ni acreditan conformidad WCAG 2.2 AA.

- [ ] Registrar dispositivo, versión Android/app, fecha, pasos y video/capturas del resultado observado.
- [ ] Login → dashboard: título/mes, ingresos, gastos, Flujo neto del mes y comparación se leen en orden; cifras completas en COP y negativo indicado con signo y texto.
- [ ] Consultar mes vacío: tres ceros, ausencia de movimientos y acción Registrar. No confundir cero neto con mes sin registros.
- [ ] Comparar base positiva, cero, negativa y sin registros anteriores: porcentaje solo en positiva; diferencia absoluta conservada en cero/negativa. Aviso de comparación con mes calendario completo anterior.
- [ ] Registrar desde dashboard → guardar → regreso al mes contable guardado, cifras y recientes actualizados sin actualización manual; anuncio de éxito una vez y foco lógico al volver.
- [ ] Ver movimientos → editar fecha/monto → volver: mes original, destino y comparación del siguiente mes actualizados. Archivar excluye filas y totales; cinco recientes del mes, sin archivados.
- [ ] Cambiar mes con TalkBack/teclado: label persistente, mes inválido conserva valor, error anunciado y foco al campo. Navegación a otro mes nunca muestra datos del anterior bajo el nuevo título.
- [ ] Probar carga lenta, sin red y error/reintento: estado anunciado, no cifras obsoletas presentadas como actuales, acción de reintento operable.
- [ ] Texto 1.5x y revisión 2x, pantalla pequeña, teclado abierto y Reduce Motion: sin recortes ni controles ocultos; targets >=48dp y contraste medido 4.5:1 texto / 3:1 texto grande.
- [ ] Logout/cuenta B: ninguna cifra, nota o lista de A visible; meses y navegación se reinician por cuenta.
- [ ] Apple disponible: repetir con VoiceOver/Accessibility Inspector y registrar evidencia propia. Hasta entonces pendiente, sin atribuir resultados Android a iOS.

Comprobación API: iniciar API/PG, login en Swagger y Authorize con access_token; GET /api/v1/dashboard/summary?month=2024-02. Ejemplo sintético: ingreso1000/gasto250 en febrero y neto500 en enero → income1000.00, expense250.00, net750.00, delta250.00 y percent50.00, todos como cadenas.
