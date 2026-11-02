# Movimientos COP — pruebas manuales pendientes

Estado: código y pruebas automáticas implementados. No se realizaron pruebas de dispositivo/TalkBack ni de Apple.

- [ ] Registrar dispositivo, SO, versión/build, fecha y evidencia (video/capturas).
- [ ] Login → movimientos → nuevo gasto válido COP → confirmar que aparece en su mes contable.
- [ ] Seleccionar ingreso/gasto y categorías con TalkBack; selección visible con texto y estado nativo, sin depender del color.
- [ ] Guardar sin monto, con fecha futura o sin categoría: mensaje útil, anuncio y foco al primer error; nota y campos válidos conservados.
- [ ] Teclado abierto y texto 1.5x (revisar 2x): botones y cifras completos, controles >=48dp, contraste medido.
- [ ] Cortar red al guardar y reintentar SIN cambiar campos ni cerrar formulario: un solo movimiento. Cambiar campos implica nueva solicitud; no hay borrador offline persistente.
- [ ] Crear categoría personal y comprobar que no aparece al entrar con otra cuenta.
- [ ] Editar monto/tipo/categoría/fecha; comprobar lista de origen/destino y cifras exactas.
- [ ] Archivar: confirmar con Alert, cancelar no modifica; tras confirmar desaparece, éxito anunciado y foco lógico.
- [ ] Páginas y filtros: mes vacío, solo ingresos/gastos, categoría; acceso por foco sin swipe obligatorio.
- [ ] Logout y cuenta B: ninguna fila, nota ni error privado de A visible; logout/red degradada informado.
- [ ] Reduce Motion: flujo sin animación decorativa. No declarar conformidad WCAG completa desde el scanner.

Swagger para API: iniciar sesión, Authorize con access_token; GET categories para category_id y POST movements con monto cadena ("1234.50"), fecha YYYY-MM-DD y client_request_id UUID único. DELETE es archivo lógico, no borrado físico.
