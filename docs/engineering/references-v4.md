# Referencias del rediseño v4 «Vidrio de bosque» — Informe

Complementa el [informe de ingeniería inversa de MonAi](reverse-engineering-monai.md) con el mismo formato: método, observación, decisión y trazabilidad hasta el código. Fecha: 8 nov 2026.

## 1. Método y límites

- **Fuentes:** capturas de pantalla y flujos que el equipo compartió (Parker, Cashcaded, Blackbird, una pantalla «Insights»), la hoja de tokens publicada de Origin, el informe REA de MonAi ya existente y el material del curso (semanas 5, 6, 9 y 10).
- **Qué no se hizo:** no se instalaron ni descompilaron Parker, Cashcaded, Blackbird ni Origin; todo lo que se dice de ellos es **observado en capturas**. No hay métricas de uso ni datos de esas apps.
- **Regla de copia:** se toman patrones de interacción y principios, nunca el aspecto, textos, marcas ni recursos. La mascota es Monedin, recortado de la referencia original y animado sin redibujarlo.

## 2. Qué tomamos y qué dejamos

| Referencia | Tomamos | Dejamos (y por qué) |
|---|---|---|
| Captura «Insights» | Cifra protagonista ligera; ingresos y gastos como datos secundarios; barras por periodo; desglose por categoría. | Emojis como iconos y porcentajes enormes sin contexto («+426 %»): no explican nada y fallan en lector de pantalla. |
| Origin (tokens) | Pocas voces tipográficas; superficies que se distinguen por tono; vidrio solo en la navegación. | Serif display y violeta (no son de FINZA). Su regla de «cero degradados» se rompe a propósito para la luz ambiental. |
| Parker | Verde bosque que funciona sobre fondo claro u oscuro; una pregunta por pantalla en el onboarding. | Muro de pago y promesas tipo «2 veces más»: no tenemos esos datos. |
| Cashcaded | Tono personal y cálido; un objeto con volumen como héroe; hojas inferiores para decisiones. | Flujo largo de suscripción y recuerdos con fotos. |
| Blackbird | Resumen limpio; conmutador compacto; barra inferior flotante con desenfoque y la acción principal destacada. | Monocromo total: FINZA necesita distinguir ingreso y gasto. |
| MonAi (REA) | Un número claro en Inicio; registro en segundos con frase libre interpretada en el teléfono. | IA en la nube y datos sin cifrar. Nos diferencian accesibilidad, privacidad y Monedin. |

## 3. Trazabilidad: de la referencia al código

| Decisión v4 | Origen | Dónde está |
|---|---|---|
| Inicio con un solo protagonista (flujo neto en Manrope 300) y una línea de ingresos/gastos | «Insights», MonAi, Blackbird | `features/dashboard/components/SummaryHeader.tsx` |
| Lo demás a un toque, en Análisis | Retroalimentación del equipo («todavía hay mucho contenido») | `app/insights.tsx`, `DashboardInsights` |
| Seis barras de gasto mensual con el mes en curso resaltado | «Insights» | `MonthlySpendCard` en `dashboard/components/MonthlyTrend.tsx` |
| Barra de pestañas flotante de vidrio; solo la activa con su nombre | Blackbird, Origin | `shared/ui/TabBar.tsx`, `shared/ui/Glass.tsx` |
| Modo claro y oscuro según el sistema, superficies por tono | Origin, Parker | `shared/theme/tokens.ts`, `ThemeRoot` en `app/_layout.tsx` |
| Resplandor de fondo estático | Decisión propia (rompe la regla de Origin) | `AmbientGlow` en `shared/ui/Glass.tsx` |
| Registrar como hoja: cifra grande, Gasto/Ingreso subrayados, frase detrás de un lápiz | Cashcaded (hojas), MonAi (frase libre) | `features/movements/MovementForm.tsx`, `QuickEntryField.tsx`, `shared/ui/UnderlineTabs.tsx` |
| Monedin con volumen y vida (respira, parpadea, se inclina) | Cashcaded (objeto 3D héroe) aplicado a la mascota propia | `shared/brand/Monedin.tsx` |
| Deslizar para archivar | Material del curso (semana 10) | `shared/ui/SwipeToArchive.tsx`, `features/movements/MovementsScreen.tsx` |

## 4. Material del curso dentro del diseño

| Tema | Qué pide | Estado en FINZA |
|---|---|---|
| Semana 10 · Reanimated | Animaciones en el hilo de UI | **Hecho** para Monedin: respiración, parpadeo, salto y lectura del sensor de gravedad corren en el hilo de UI. Las cifras **no** se animan por regla (los datos que se leen no se mueven por estilo); la interfaz restante sigue con `Animated` + `useNativeDriver`. |
| Semana 10 · Gestos | Deslizar con umbral, cancelación y resorte | **Hecho**: en Movimientos cada fila se desliza a la izquierda (`shared/ui/SwipeToArchive.tsx`, Gesture Handler 3 `usePanGesture` + Reanimated). Umbral de 96 pt con resistencia, *flick* rápido, cancelación al soltar antes del umbral o al desplazarse en vertical, vuelta con resorte y confirmación antes de archivar. Probado con las utilidades de Gesture Handler (`swipe-to-archive.test.tsx`). |
| Semana 6 · Reduce Motion | Versión quieta de todo | **Hecho**: Monedin queda estático (sin párpados ni sensor) y «aparecer» es solo un fundido; el fondo nunca se mueve. Probado en `design-system.test.tsx`. |
| Semana 6 · Reducir transparencia | Alternativa al vidrio | **Hecho** en iOS: `GlassSurface` pasa a `surface` sólido. Android no expone la preferencia y usa siempre el relleno denso. |
| Semana 6 · TalkBack / VoiceOver | Texto equivalente, objetivos ≥ 48 dp | **Hecho**: cada ficha y gráfica tiene etiqueta hablada; la pestaña activa se anuncia como seleccionada; el lápiz de Registrar anuncia si está expandido. Contrastes en [design-system.md](design-system.md). |
| Semana 9 · Navegación | Pestañas y modal tipados con Expo Router | **Hecho**: `(tabs)` con barra propia, `movement/new` como hoja modal y la nueva ruta `insights`. |
| Semana 5 · 60-30-10 | Proporción de color | **Aplicado**: fondo (60), vidrio (30), verde como acento (10). |

## 5. Verificación

- 141 pruebas de Jest pasan (`npm test` en `mobile/`), typecheck sin errores.
- Revisión visual en web (375×812) de Inicio, Movimientos, Metas, Perfil, Registrar y bienvenida en claro y oscuro.
- El bundle de Android compila con Metro; **falta** comprobar en un teléfono real el desenfoque, el sensor de inclinación, el rendimiento del rig y la sensación del gesto de deslizar.

## 6. Conclusiones

Las referencias coinciden en tres ideas que FINZA adopta con su propia identidad: **un dato protagonista**, **capas por tono y vidrio solo donde algo flota**, y **un personaje con volumen**. Lo que se descartó (porcentajes sin contexto, promesas sin datos, monocromo, IA en la nube) choca con dos principios del producto: honestidad con las cifras y accesibilidad.
