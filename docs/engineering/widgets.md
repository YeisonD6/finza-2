# Widgets de FINZA

FINZA ofrece tres widgets para la pantalla de inicio: **Resumen del mes**, **Presupuesto** y **Atajos**. En iOS hay además un widget de **Balance** para la pantalla bloqueada. Este documento explica cómo funcionan, qué datos guardan y cómo compilarlos y probarlos.

## Alcance y estado

| Prioridad | Función | Android | iOS |
| --- | --- | --- | --- |
| P0 | Balance del mes (neto, ingresos, gastos) | Hecho y probado en el emulador (datos reales de la cuenta demo) | Código escrito, sin compilar |
| P0 | Presupuesto más urgente | Hecho; snapshot y vista previa verificados en el emulador, falta verlo colocado en la pantalla de inicio | Código escrito, sin compilar |
| P0 | Atajos: gasto, ingreso, historial | Hecho; «Gasto» probado en el emulador. «Ingreso» con el formulario ya abierto se corrigió, pero falta volver a probarlo; «Historial» falta probarlo | Código escrito, sin compilar |
| P0 | Ocultar montos | Hecho: ajuste en la app y botón de ojo en el widget (ojo probado en el emulador, con «Monto oculto» para TalkBack) | Código escrito: ajuste en la app y botón interactivo (iOS 17) |
| P0 | Actualización de datos | Hecho: la app publica al cambiar sus datos | Código escrito: la app recarga las líneas de tiempo |
| P1 | Deep links | Hecho: `finza://movement/new?type=…`, `finza://budgets`, `finza://movements` | Mismos enlaces |
| P1 | Configuración | Pantalla Perfil › Widgets | Igual |
| P1 | Monedin | En el widget de resumen, sin deformarlo (reducción proporcional) | Requiere añadir la imagen al catálogo de la extensión |
| P1 | Ahorro (metas) | No incluido; ver «Pendiente» | No incluido |
| P2 | Pantalla bloqueada | No aplica en teléfonos Android | Widget `accessoryRectangular` con `privacySensitive` |
| P2 | Voz / acciones avanzadas | No incluido | No incluido |

## Arquitectura

```
App (React Native)
  useWidgetSync  ── consultas RTK Query del mes en curso (las mismas de Inicio)
       │
       ▼
  buildSnapshot()  ── texto ya formateado, sin token ni correo
       │  JSON
       ▼
  modules/finza-widgets  (módulo Expo local)
    Android: SharedPreferences privadas  ──►  AppWidgetProvider + RemoteViews
    iOS:     UserDefaults del App Group  ──►  WidgetKit (extensión)
```

- `src/features/widgets/snapshot.ts`: construye el snapshot. Es una función pura y tiene tests en `tests/widgets-snapshot.test.ts`.
- `src/features/widgets/useWidgetSync.ts`: va montado en el layout raíz. Comparte con Inicio las consultas `dashboard` y `budgets` del mes en curso (hora de Bogotá), así que no duplica peticiones. Publica cuando ambas terminan.
- `src/features/widgets/native.ts`: es el puente con el módulo nativo. En web, Expo Go y Jest el módulo no existe, y cada llamada se convierte en una operación vacía.
- `modules/finza-widgets/android`: el autolinking de Expo enlaza el módulo. Su `AndroidManifest.xml` declara los tres receivers, de modo que Android no necesita un config plugin.
- `modules/finza-widgets/ios`: un módulo Swift escribe en el App Group y llama a `WidgetCenter.reloadAllTimelines()`.
- `modules/finza-widgets/widget-extension`: el código SwiftUI de la extensión WidgetKit.
- `modules/finza-widgets/app.plugin.js`: añade el App Group a la app iOS, solo si existe `FINZA_IOS_APP_GROUP`.

## Datos y privacidad

El snapshot contiene únicamente:

- el mes, los totales del mes (neto, ingresos, gastos) y sus etiquetas para lector de pantalla;
- el nombre y el porcentaje del presupuesto más urgente, y cuántos presupuestos están en alerta;
- la hora de publicación.

**No contiene** el token de acceso, el refresh token, el correo, el id de cuenta ni movimientos individuales. Un test verifica que el JSON no incluya esas palabras.

- **Android:** `SharedPreferences` en modo privado (`finza_widgets`). Ninguna otra app puede leerlas.
- **iOS:** `UserDefaults` del App Group, compartido solo con la extensión de FINZA.
- **Cerrar sesión o eliminar la cuenta:** `useWidgetSync` publica un snapshot vacío y los widgets piden iniciar sesión.
- **Ocultar montos:** desde Perfil › Widgets, o con el ojo del widget de resumen. Las cifras se reemplazan por `••••••` y el lector de pantalla dice «Monto oculto». El porcentaje del presupuesto sigue visible porque no revela montos.
- **iOS, pantalla bloqueada:** las cifras llevan `privacySensitive()` y el sistema las oculta mientras el teléfono está bloqueado.

## Cuándo se actualizan

Los widgets **no tienen sesión y nunca llaman a la API**. Esto es deliberado: tener un token fuera del almacenamiento seguro de la app sería un riesgo. La app publica en estos momentos:

- al abrir la app o volver a ella (se vuelve a pedir el mes en curso);
- al crear, editar o archivar un movimiento, y al cambiar un presupuesto (RTK Query invalida y vuelve a pedir los datos);
- al cerrar sesión (snapshot vacío).

Si el teléfono pasa a un mes nuevo sin abrir la app, el widget lo detecta en su actualización periódica (cada 30 min en Android; la línea de tiempo de iOS cada 30 min). En ese caso muestra «Empezó un mes nuevo. Abre FINZA para actualizar.» y nunca presenta cifras del mes anterior como si fueran del actual. Cada widget indica la hora de su última actualización.

## Enlaces profundos

| Acción | Enlace |
| --- | --- |
| Tocar el resumen | abre la app |
| Gasto | `finza://movement/new?type=expense` |
| Ingreso | `finza://movement/new?type=income` |
| Historial | `finza://movements` |
| Tocar el presupuesto | `finza://budgets` |

Si no hay sesión, las pantallas protegidas redirigen al inicio de sesión (`PrivateScreen` y `MovementModal`). El destino del enlace no se recuerda después de iniciar sesión.

## Accesibilidad

- Cada botón tiene descripción en español: «Registrar un gasto», «Ocultar montos», etc. Los iconos y Monedin son decorativos y quedan ocultos para el lector de pantalla.
- Las cifras tienen etiquetas habladas con el mismo formato de la app: «Balance del mes: Monto de …».
- Los botones tienen como mínimo 48 dp. Los textos están en `sp`, así que respetan el tamaño de fuente del sistema, y el neto se reduce automáticamente antes de cortarse.
- **Colores Brote:** en modo oscuro las superficies blancas pasan a `#1B2420` con texto claro; el widget verde se mantiene. Contraste mínimo de texto:

| Combinación | Contraste |
| --- | --- |
| `#C9D8C6` sobre `#1E4634` | 7,1:1 |
| `#8A5A00` sobre blanco | 5,9:1 |
| `#545C56` sobre blanco | 6,9:1 |
| Barra `#5E8B6A` sobre pista `#E8E4DA` (no textual) | 3,1:1 |
| Modo oscuro: `#C9D8C6` sobre `#1B2420` | 10,7:1 |

## Compilar y probar en Android

El widget necesita código nativo, así que **no funciona en Expo Go**: hace falta un build de desarrollo. Las carpetas `android/` e `ios/` se generan con `expo prebuild` y están en `.gitignore`.

```bash
cd mobile
export JAVA_HOME=/ruta/a/jdk-17 ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --platform android --no-install
npm run android:native        # equivale a: npx expo run:android
```

El build necesita la plataforma Android 37, build-tools 37.0.0, el NDK 27.1.12297006 y CMake 3.30.5, que son las versiones que fija React Native 0.88. Para agregar el widget en el teléfono: mantén presionado un espacio vacío de la pantalla de inicio, toca **Widgets** y busca **Finza**.

## iOS: pasos que requieren cuenta de Apple

Esto no se puede compilar ni probar desde Linux, y exige una cuenta de Apple Developer:

1. Crear el App Group, por ejemplo `group.co.edu.unisabana.finza`, en el portal de Apple, y habilitarlo para la app.
2. Ejecutar `FINZA_IOS_APP_GROUP=group.co.edu.unisabana.finza npx expo prebuild --platform ios`. El plugin añade el entitlement y la clave `FinzaAppGroup` al `Info.plist` de la app.
3. En Xcode: File › New › Target › **Widget Extension**, con el nombre `FinzaWidgets`, iOS 17 o superior y sin «Include Configuration App Intent».
4. Reemplazar el código generado por `modules/finza-widgets/widget-extension/FinzaWidgets.swift`. Usar el `Info.plist` y el `.entitlements` de esa carpeta, y definir `FINZA_APP_GROUP` en los Build Settings del target.
5. Añadir `assets/brand/monedin@2x.png` y `monedin@3x.png` al catálogo de la extensión como **Monedin**.
6. Compilar en un dispositivo o simulador con iOS 17 o superior.

Como `ios/` se regenera, estos pasos se repiten tras cada `prebuild --clean`. Una alternativa es automatizar el target con `@bacons/apple-targets`, pero es una dependencia nueva y queda a decisión del equipo.

## Pendiente y limitaciones

- **Verificación Android pendiente:** colocar el widget de Presupuesto en la pantalla de inicio, volver a probar «Ingreso» e «Historial», y probar el cierre de sesión con los widgets puestos.

- **iOS:** sin compilar ni probar (no hay macOS ni cuenta de Apple en este entorno).
- **Metas de ahorro:** no tienen widget. Se pueden añadir al snapshot sin cambiar la arquitectura.
- **Datos viejos:** si la sesión vence y la app no se vuelve a abrir, el widget conserva el último snapshot hasta que la app publique de nuevo. Sigue mostrando la hora de actualización y nunca datos de otro mes.
- **Enlaces sin sesión:** el destino de un enlace profundo no se recuerda tras iniciar sesión.
