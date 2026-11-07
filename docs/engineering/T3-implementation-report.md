# T3 — Implementación de la base móvil Brote

Fecha: 7 de noviembre de 2026. Rama: `entrega-final-finza`.

Se implementaron tema, Manrope, componentes, Monedin, bienvenida, autenticación, Inicio, Movimientos, formulario modal y Perfil. Metas conserva la pantalla transitoria solicitada. No se instalaron dependencias ni se hicieron commits o push. No se editaron `backend/**`, OpenAPI, esquema generado, `baseApi.ts` ni las APIs reservadas para T2. Los cambios de otras tareas presentes en el árbol no forman parte del inventario de T3.

## Comportamiento y decisiones

- Expo Router separa `(auth)`, `(tabs)` y `movement/*`; el botón central es una acción. Se usa la API instalada de Expo Router 58 (`expo-router/js-tabs`, `emitter`, `navigateToTab`, `useIsFocused`, `usePreventRemove`). Las pestañas cambian sin animación y los formularios son modales nativos.
- La sesión se restaura desde el layout raíz. El estado del mes y la confirmación se montan con la clave del perfil. Logout conserva el reset original de RTK Query y el mensaje de fallo de revocación remota en la pantalla de login.
- Registrar conserva cadenas decimales, `normalizeAmount`, UUID estable en reintentos, bloqueo de doble envío y foco diferido. Guardar vuelve a Inicio en el mes contable, anuncia una sola vez y celebra el primer movimiento únicamente si el resumen previo estaba disponible y vacío. Editar vuelve a su origen; archivar exige confirmación. La navegación queda bloqueada mientras se guarda, crea categoría o archiva.
- Movimientos conserva `FlatList`, filtros, cursores y errores. «Cargar más» acumula por ID sin duplicados; un error oculta todas las filas cargadas. Las filas se agrupan por fecha contable sin interpretar `occurred_on` como fecha UTC.
- Inicio usa `currentData`, oculta cifras tras error y conserva las razones de comparación sin inventar porcentajes. Se dejó el comentario de integración para T5.
- `FormField` y `Feedback` son aliases de `TextField` y `Banner`; `AuthControls` mantiene sus exportaciones. El formateador visual reutiliza el formateador exacto existente y oculta los centavos cero sin modificar el dominio ni los contratos.
- Los colores están centralizados en `tokens.ts`. Todos los controles compartidos tienen mínimo 48 dp, estados accesibles y foco visible; montos con numerales tabulares y sin truncamiento. Las animaciones de reposo se detienen al ocultar su pestaña.
- Web es una previsualización de desarrollo: refresh y onboarding viven solo en memoria. Native usa SecureStore. El fallo al guardar credenciales se propaga; la bandera de onboarding tolera errores. Haptics, anuncios y BackHandler son seguros en web.

## Validación ejecutada

Los comandos se ejecutaron desde `mobile/`, con las dependencias existentes.

| Comprobación                                                                                                                            | Resultado                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                                                                                     | Correcto, sin errores.                                                                                                                                                                                            |
| `./node_modules/.bin/jest --runInBand`                                                                                                  | 13 suites, **66 pruebas correctas**.                                                                                                                                                                              |
| `node --import tsx --test --test-isolation=none --test-reporter=spec tests/*.test.ts`                                                   | **184 pruebas correctas**. Incluye las pruebas del parser de la tarea paralela presentes en el árbol; T3 no editó ese parser.                                                                                     |
| `npm test` literal                                                                                                                      | Bloqueado antes de ejecutar las suites: `tsx` intenta crear `/tmp/tsx-1000/23.pipe` y el sandbox devuelve `listen EPERM`. Los dos comandos anteriores ejecutan los mismos grupos de pruebas sin ese servidor IPC. |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx --no-install expo export --platform android --output-dir /tmp/finza-t3-android --max-workers 2` | Correcto; bundle Hermes y `metadata.json` generados.                                                                                                                                                              |
| `EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx --no-install expo export --platform web --output-dir /tmp/finza-t3-web --max-workers 2`         | Correcto; HTML, chunks y recursos generados.                                                                                                                                                                      |
| Prettier sobre los archivos de T3                                                                                                       | Aplicado y comprobado.                                                                                                                                                                                            |
| `git diff --check -- mobile`                                                                                                            | Correcto.                                                                                                                                                                                                         |
| Búsqueda de colores literales fuera de tokens, `parseFloat` y truncamiento en código                                                    | Sin hallazgos en implementación. La prueba existente comprueba expresamente que no haya `numberOfLines`.                                                                                                          |

Las pruebas conservan las verificaciones de errores asociados, privacidad de contraseña, foco diferido, conservación del borrador, COP exacto, idempotencia, doble envío, caché, ocultación de datos tras error y archivo confirmado. Se migró `FinancialHome.test.tsx` a `Navigation.test.tsx`, que prueba las rutas reales, retorno al mes contable, anuncio único, sesión y bloqueo de salida. Se añadieron pruebas de AmountText, SproutProgress, límites de MonthSwitcher, TabBar, Reduce Motion, almacenamiento web y acumulación de páginas.

El renderer de rutas desactiva el autobatching de notificaciones de Redux **solo en esa prueba**: `renderRouter` reinicia los timers simulados entre renders y deja callbacks RAF de la instancia compartida asociados al reloj anterior. Se ejecutan los reducers, middleware y callbacks de reset reales. Las pruebas existentes de API/caché siguen utilizando su configuración original. El valor simulado predeterminado de Reduce Motion es estático y las pruebas dedicadas ejercitan los cambios de preferencia y limpieza del listener. No se simula el resultado de las exportaciones.

## Desviaciones y límites

- MonthSwitcher añade «Elegir mes», que despliega el campo validado YYYY-MM. Esto conserva el acceso directo a meses lejanos y la asociación de errores, además de las flechas con límites solicitadas.
- Se conserva una acción explícita de archivo en la lista, además de la acción en edición, para mantener la alternativa accesible previa.
- Con Reduce Motion, Monedin permanece completamente estático, incluida su aparición. El resto de transiciones conserva opacidad y elimina desplazamiento/escala.
- No fue posible revisar la app en navegador ni tomar capturas: `expo start --web --port 8083` quedó al detectar el puerto; una prueba directa de apertura de loopback devolvió `EPERM`. Se detuvo ese proceso. La exportación web sí se verificó.
- No se ejecutó un dispositivo/emulador Android, TalkBack/VoiceOver, teclado real, hápticos físicos ni inspección visual con fuente al 200 %. Las comprobaciones de semántica y escalado son automatizadas; queda pendiente la revisión manual requerida por la revisión técnica.
- Las pruebas de interfaz usan respuestas controladas. No se afirma validación E2E contra el backend de T2 ni un despliegue real. Presupuestos y metas funcionales corresponden a T5; no se muestran datos financieros ficticios.

## Inventario de T3

47 archivos nuevos de código/configuración/pruebas, 19 modificados y 2 eliminados, más este informe. `AmountInput.tsx` y `AuthControls.tsx` se conservaron sin cambios. No se incluyen los archivos preexistentes o de otras tareas concurrentes.

### Creados

- `mobile/src/app/(auth)/_layout.tsx`
- `mobile/src/app/(auth)/login.tsx`
- `mobile/src/app/(auth)/welcome.tsx`
- `mobile/src/app/(tabs)/_layout.tsx`
- `mobile/src/app/(tabs)/goals.tsx`
- `mobile/src/app/(tabs)/index.tsx`
- `mobile/src/app/(tabs)/movements.tsx`
- `mobile/src/app/(tabs)/profile.tsx`
- `mobile/src/app/movement/[id].tsx`
- `mobile/src/app/movement/new.tsx`
- `mobile/src/features/auth/SessionProvider.tsx`
- `mobile/src/features/auth/__tests__/storage.test.tsx`
- `mobile/src/features/auth/storage.ts`
- `mobile/src/features/dashboard/FinancialProvider.tsx`
- `mobile/src/features/dashboard/__tests__/Navigation.test.tsx`
- `mobile/src/features/dashboard/components/MonthTransition.tsx`
- `mobile/src/features/dashboard/components/SummaryHeader.tsx`
- `mobile/src/features/movements/components/AccountingDateField.tsx`
- `mobile/src/features/movements/components/CategoryPicker.tsx`
- `mobile/src/features/movements/components/MovementFilters.tsx`
- `mobile/src/features/movements/components/MovementModal.tsx`
- `mobile/src/features/movements/components/useMovementDraft.ts`
- `mobile/src/features/movements/components/useMovementList.ts`
- `mobile/src/shared/brand/Monedin.tsx`
- `mobile/src/shared/formatting/dates.ts`
- `mobile/src/shared/formatting/money.ts`
- `mobile/src/shared/theme/fonts.ts`
- `mobile/src/shared/theme/haptics.ts`
- `mobile/src/shared/theme/motion.ts`
- `mobile/src/shared/theme/tokens.ts`
- `mobile/src/shared/ui/AmountField.tsx`
- `mobile/src/shared/ui/AmountText.tsx`
- `mobile/src/shared/ui/AppText.tsx`
- `mobile/src/shared/ui/Banner.tsx`
- `mobile/src/shared/ui/Card.tsx`
- `mobile/src/shared/ui/CategoryChip.tsx`
- `mobile/src/shared/ui/EmptyState.tsx`
- `mobile/src/shared/ui/IconButton.tsx`
- `mobile/src/shared/ui/MonthSwitcher.tsx`
- `mobile/src/shared/ui/MovementRow.tsx`
- `mobile/src/shared/ui/SegmentedControl.tsx`
- `mobile/src/shared/ui/SproutProgress.tsx`
- `mobile/src/shared/ui/TabBar.tsx`
- `mobile/src/shared/ui/TextField.tsx`
- `mobile/src/shared/ui/__tests__/design-system.test.tsx`
- `mobile/src/shared/ui/categoryIcon.ts`
- `mobile/tests/setup.cjs`

### Modificados

- `mobile/jest.config.cjs`
- `mobile/src/app/_layout.tsx`
- `mobile/src/app/index.tsx`
- `mobile/src/features/auth/AuthScreen.tsx`
- `mobile/src/features/auth/__tests__/AuthScreen.test.tsx`
- `mobile/src/features/auth/runtime.ts`
- `mobile/src/features/dashboard/DashboardScreen.tsx`
- `mobile/src/features/dashboard/__tests__/DashboardScreen.test.tsx`
- `mobile/src/features/movements/MovementForm.tsx`
- `mobile/src/features/movements/MovementsScreen.tsx`
- `mobile/src/features/movements/__tests__/MovementForm.test.tsx`
- `mobile/src/features/movements/__tests__/MovementsScreen.test.tsx`
- `mobile/src/shared/accessibility/announcements.ts`
- `mobile/src/shared/ui/AppButton.tsx`
- `mobile/src/shared/ui/Feedback.tsx`
- `mobile/src/shared/ui/FormField.tsx`
- `mobile/src/shared/ui/Screen.tsx`
- `mobile/src/shared/ui/__tests__/forms.test.tsx`
- `mobile/src/shared/ui/styles.ts`

### Eliminados

- `mobile/src/features/dashboard/FinancialHome.tsx`
- `mobile/src/features/dashboard/__tests__/FinancialHome.test.tsx`

El test eliminado se sustituyó por la prueba de navegación real indicada; no se retiraron sus verificaciones de comportamiento para hacer pasar la suite.
