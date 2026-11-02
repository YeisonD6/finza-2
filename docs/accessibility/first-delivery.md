# Primera entrega — componentes y evidencia de accesibilidad

Tarea 5, 2 noviembre 2026. Implementación y comprobaciones automáticas realizadas; validación nativa pendiente. No se acredita conformidad WCAG 2.2 AA ni se atribuyen pruebas Android a iOS.

## Componentes compartidos

- AppButton y FormField conservan la fachada AuthControls para los imports existentes. Propagan semántica, hints, estados, valores accesibles, refs y autofill. Botones con nombre estable al procesar, selección textual, foco visible, estados presionado/deshabilitado y bloqueo de activación.
- FormField usa IDs de label únicos y estables, hint que incorpora el error y texto de error visible. No publica el contenido de contraseñas en accessibilityValue/hint. Ref para recuperar foco, tamaño mínimo y estilos de error/foco.
- AmountInput conserva literalmente la cadena tecleada (coma, ceros y montos grandes), con COP y ayuda visibles. normalizeAmount existente valida al enviar; no convierte dinero a Number.
- Screen comparte SafeAreaView, KeyboardAvoidingView, scroll, título y petición de foco al navegar. Atrás de Android usa el mismo callback que la acción visible y se bloquea durante guardado. La lista virtualizada inserta título/Atrás en su propia cabecera desplazable, sin ScrollView anidado ni cabecera fija que quite espacio al teclado.
- Feedback y announcements centralizan mensajes; los estados se anuncian por cambio y los reintentos explícitos pueden repetir errores. iOS usa petición de anuncio en cola; solo se comprobó la llamada, no VoiceOver. El formulario emite una petición de éxito al guardar; el dashboard suprime el resumen automático inicial al regresar de ese guardado. Oír el mensaje completo sin interrupciones sigue pendiente en hardware.
- useDeferredFocus espera a que busy/operation deje de bloquear los campos y termine el render antes de pedir foco. React Native ignora focus con editable=false; la revisión independiente detectó y se corrigió ese orden en errores de autenticación/guardar/crear categoría.

## Evidencia automática de esta tarea

41 pruebas Jest UI/caché, 10 de cliente/dominio y 113 backend PostgreSQL reales sin omisiones. TypeScript, Prettier, Ruff y pip check correctos; export Android/Hermes final de 1184 módulos. El puente real TypeScript→FastAPI→PostgreSQL y reinicio de API siguen verdes; no equivale a ejecutar la UI en teléfono. Testing Library14 valida semántica/estado, no layout nativo ni pronunciación del lector.

| Pantalla | Comprobado automáticamente | Comprobación nativa pendiente |
|---|---|---|
| Login/registro | Propósito/autofill, errores y conservación de email, password y visibilidad reiniciados al cambiar modo, doble envío bloqueado, navegación visible | TalkBack, foco tras errores/volver, autofill/teclado y lectura segura real |
| Dashboard | COP exacto, negativo con texto, comparación/vacío/carga/error/reintento, sin cifras del mes previo ni obsoletas tras error | Orden de lectura, montos pronunciados, foco al volver y anuncio de éxito sin interrupción |
| Registrar/editar | Error asociado a monto, datos conservados, categoría inválida/servidor, guardado único y una llamada de éxito, foco pospuesto hasta habilitar | Foco real al primer error, selección y teclado sin ocultar acciones; confirmación audible de guardado |
| Movimientos | Nombres distintos para filas con mismo monto/fecha, error de mes asociado, ocultación de filas obsoletas, reintento/archivo confirmado | Alert nativo, páginas/filtros, desplazamiento/foco y acciones de editar/archivar con lector |
| Compartidos | Label IDs únicos/estables, refs, estado deshabilitado/busy/selección, foco visual, texto sin truncado forzado, Atrás bloqueado al guardar y manejador retirado al salir | Interacción con teclado físico, TalkBack/VoiceOver, tamaños efectivos y texto 1.5x/2x |

Contraste calculado por luminancia relativa sobre la paleta real: texto #14233D/blanco **15.70:1**, secundario y deshabilitado #506078/blanco **6.39:1**, error #991B1B/blanco **8.31:1**, éxito #166534/blanco **7.13:1**, presionado #243D60/blanco **10.99:1**. Superan 4.5:1; bordes #506078/blanco superan 3:1. Pruebas de estilo comprueban botones mínimo 48×48 y inputs mínimo 48 de alto. No se midieron capturas ni geometría efectiva de dispositivo. Sin límite de líneas ni desactivación de escalado en los controles; desplazamientos programados sin animación.

## Recorrido manual de aceptación — NO EJECUTADO

- [ ] Registrar dispositivo/OS/build, fecha, tamaño de fuente, orientación, pasos, esperado/observado, video/capturas, hallazgo y corrección.
- [ ] Con TalkBack: registro inválido/válido → login erróneo/válido → dashboard → gasto válido → dashboard actualizado → editar/archivar → logout y usuario B. Ningún dato de A visible en B.
- [ ] Sin monto, fecha futura, categoría inexistente y error de servidor: petición terminada, campos habilitados, primer inválido enfocado, ayuda/error leídos y borrador conservado. Reintentar sin duplicar.
- [ ] Oír «Movimiento guardado» completo una sola vez y comprobar foco lógico al volver. El conteo de llamadas automatizado no prueba la duración audible ni descarta interrupciones nativas.
- [ ] Probar texto 1.5x y2x en vertical y horizontal, teléfono pequeño, teclado abierto/físico y Reduce Motion: cifras/botones completos, foco visible y ninguna acción oculta/inoperable. Medir targets y contraste efectivo.
- [ ] Probar Atrás de Android en registro, nuevo/editar y listado: mismo destino que cancelar/volver; no sale del formulario durante una escritura pendiente.
- [ ] Red lenta/sin conexión: carga, error y reintento operables; caché privada limpiada al salir y sin cifras obsoletas presentadas como actuales.
- [ ] iOS según disponibilidad: repetir con VoiceOver/Inspector, colas de anuncios, teclado y SafeArea. Sin fecha/resultados hasta ejecutarlo.

Checklists de detalle: [movimientos](movements-checklist.md), [dashboard](dashboard-checklist.md). Docker/Compose, APK/development build, E2E nativo y CI remoto no ejecutados aquí. La Tarea 6 debe completar reproducción del equipo, herramientas/contenedores disponibles y evidencias nativas; no reconstruir los módulos ya implementados.
