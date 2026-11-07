# Visión de producto — FINZA 2.0

## Nombre y tagline

**FINZA** — *Tus cuentas claras, con Monedin a tu lado.*

## Propósito

Ayudar a jóvenes en Colombia a entender y dirigir su dinero mes a mes: registrar ingresos y gastos en segundos, ver con claridad su flujo neto y en qué categorías gastan, fijar presupuestos y ahorrar para metas concretas, con una experiencia accesible para personas que usan lectores de pantalla o texto ampliado.

## Problema

1. **Registrar es tedioso**: las apps tradicionales exigen muchos campos; el usuario abandona en la primera semana.
2. **Los números no se entienden**: «saldo», «balance» y gráficas sin texto confunden; no se sabe si el mes va mejor o peor que el anterior.
3. **Gastar sin límite consciente**: sin presupuestos por categoría, el exceso se descubre a fin de mes.
4. **Ahorrar sin objetivo**: el ahorro sin meta concreta se diluye.
5. **Exclusión**: las apps financieras suelen depender de color y gráficas, sin soporte serio para TalkBack/VoiceOver ni texto grande.
6. **Desconfianza**: apps que envían datos financieros a terceros o declaran no cifrar datos (ver informe MonAi).

## Personas

> Reconstruidas por el equipo para la Fase 3 a partir del alcance de la Fase 1 (el documento entregado de Fase 1 no está en el repositorio). No provienen de una investigación de usuarios nueva.

| Persona | Contexto | Objetivos | Dolores | Necesidades de accesibilidad |
|---|---|---|---|---|
| **Laura, 21**, estudiante universitaria en Chía | Mesada + trabajo de medio tiempo; paga transporte y almuerzos a diario | Saber cuánto le queda para comida y transporte; ahorrar para un viaje | Olvida registrar; no entiende en qué se le va el dinero | Ninguna declarada; usa el móvil con una mano en el bus |
| **Andrés, 27**, analista junior en Bogotá | Primer salario estable, arriendo y servicios | Controlar gastos fijos, no pasarse del presupuesto, fondo de emergencia | Apps complicadas o con anuncios; teme compartir datos | Ninguna declarada |
| **Camila, 24**, diseñadora con baja visión | Usa TalkBack y tamaño de fuente 200 % | Llevar sus finanzas de forma autónoma | Gráficas sin texto, botones sin etiqueta, textos cortados | Lector de pantalla, alto contraste, objetivos táctiles grandes, sin dependencia del color |

## Propuesta de valor (UVP)

Finanzas personales **claras, exactas, privadas y accesibles**, con un acompañante (Monedin) que explica y celebra sin infantilizar.

## Competidores (análisis actualizado)

| | **MonAi** | **Wallet (BudgetBakers)** | **Monefy** | **FINZA** |
|---|---|---|---|---|
| Registro rápido | Voz + IA en la nube | Manual / sincronización bancaria | Manual muy rápido | Formulario sin fricción + registro rápido en lenguaje natural **en el dispositivo** |
| Presupuestos | Sí | Sí | Básico | Sí, con estado textual (al día / cerca / excedido) |
| Metas de ahorro | No | Sí | No | Sí, con aportes y Monedin |
| Flujo neto y comparación mensual | No (solo gasto) | Sí | Parcial | Sí, con reglas explícitas de comparación |
| Privacidad | Datos a OpenAI/Anthropic/Groq; Play declara «no cifra» | Cuenta en la nube | Local / Drive | Servidor propio, Argon2id, sesiones rotatorias, sin terceros de IA |
| Accesibilidad declarada | No | Parcial | No | WCAG 2.2 AA móvil como requisito de terminado |
| Moneda local | Multimoneda | Multimoneda | Multimoneda | COP exacto (NUMERIC), sin flotantes |
| Precio | Suscripción (Free muy limitado) | Freemium | Freemium | Académico / gratuito |

> Wallet y Monefy se describen a partir de conocimiento público general del equipo; las afirmaciones verificables con fuente están en el informe de MonAi.

## Diferenciadores e innovación

1. **Registro rápido local**: intérprete determinista en español («almuerzo 18 mil ayer», «salario 2.5 millones») que propone monto, fecha, tipo y categoría para confirmar. Sin red, sin coste y sin enviar datos a terceros.
2. **Exactitud verificable**: dinero como decimal de extremo a extremo, idempotencia en registros, pruebas con PostgreSQL real.
3. **Accesibilidad de primera clase**: cada cifra tiene texto; cada gráfica tiene alternativa; TalkBack verificado en emulador.
4. **Monedin funcional**: aparece en momentos con propósito (bienvenida, vacíos, confirmaciones, metas, consejos), respetando Reduce Motion.

## Priorización

| Prioridad | Funcionalidades |
|---|---|
| **P0** | Corrección de regresión; sistema de diseño y rediseño de todas las pantallas; navegación por pestañas; onboarding con Monedin; dashboard con desglose por categoría; presupuestos; accesibilidad y pruebas; documentación final |
| **P1** | Metas de ahorro con aportes; registro rápido en lenguaje natural; iconos por categoría |
| **P2** | Modo oscuro; dictado por voz (teclado del sistema); exportar CSV |
| **P3** | Recurrentes, listas compartidas, widgets, IA de análisis, multimoneda, sincronización bancaria |
