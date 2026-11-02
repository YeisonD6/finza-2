# Autenticación — evidencia de accesibilidad

Estado 2026-11-02: pruebas automáticas UI verdes; ninguna prueba de hardware realizada. Falta SDK/ADB/dispositivo en el entorno de desarrollo actual. Apple queda según disponibilidad.

- [ ] Android real: registrar dispositivo/OS/build y fecha.
- [ ] TalkBack: título → email → contraseña → mostrar/ocultar → ingresar/crear → cambiar formulario.
- [ ] Campos con etiqueta persistente, propósito/autofill y contraseña oculta inicialmente.
- [ ] Email inválido/contraseña corta: error útil anunciado, foco al primer inválido y conservación del email.
- [ ] Sin red: formulario recuperable y botón reintentar; sin envío duplicado mientras busy.
- [ ] Tras registro: confirmación y retorno lógico a login; tras ingreso perfil de cuenta; logout elimina datos visibles.
- [ ] Reiniciar app: recuperación con SecureStore real; token revocado vuelve a login.
- [ ] Texto 1.5x (y revisar 2x), teclado abierto y orientación: no recortar campos ni ocultar acciones.
- [ ] Contraste medido 4.5:1 normal /3:1 grande, controles >=48dp y ninguna dependencia exclusiva del color.
- [ ] Reduce Motion: sin animación decorativa en este flujo.
- [ ] Cambiar cuenta A→B: no aparecen perfil ni mensajes privados de A.
- [ ] Adjuntar capturas/video y registrar hallazgos antes de afirmar auditoría completada.
