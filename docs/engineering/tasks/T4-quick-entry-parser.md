# T4 — Intérprete local de registro rápido (es-CO)

**Asignado a:** Codex · **Revisor:** Claude · **Rama:** `entrega-final-finza`

## Contexto

Diferenciador frente a MonAi (que envía el texto a OpenAI): FINZA interpreta frases cortas en español **en el dispositivo**, de forma determinista, sin red ni terceros, y solo **propone** valores que el usuario confirma en el formulario existente. Reglas de dinero y fecha en `docs/architecture/technical-review.md`: el monto final es una cadena decimal canónica (`"18000"`, `"12500.50"`), nunca `number`; la fecha es `YYYY-MM-DD` calculada en America/Bogota sin conversiones UTC (reutiliza `bogotaToday()` de `mobile/src/features/movements/domain.ts`).

## Alcance (archivos permitidos)

Solo crea:

- `mobile/src/features/quick-entry/parser.ts`
- `mobile/tests/quick-entry-parser.test.ts` (se ejecuta con `tsx --test`, como `tests/movements-domain.test.ts`)

No edites ningún otro archivo (otras tareas trabajan en paralelo sobre la UI y la API).

## API

```ts
export type QuickEntryCategory = { id: string; name: string; movement_type: "income" | "expense" };
export type QuickEntrySuggestion = {
  type: "income" | "expense";          // por defecto "expense"
  amount: string | null;               // cadena decimal canónica sin separadores, p. ej. "18000" o "2500000.50"; null si no se detecta
  occurred_on: string;                 // YYYY-MM-DD; por defecto hoy en Bogotá
  category_id: string | null;          // de la lista recibida; null si no hay coincidencia
  note: string;                        // texto restante limpio (sin monto ni palabras de fecha), primera letra en mayúscula, máx. 140
  confidence: { amount: boolean; date: boolean; category: boolean; type: boolean };
  explanation: string;                 // frase en español para lector de pantalla, p. ej. "Gasto de 18.000 pesos en Alimentación, ayer."
};
export function parseQuickEntry(text: string, categories: QuickEntryCategory[], today?: string): QuickEntrySuggestion;
```

`today` (YYYY-MM-DD) se inyecta en pruebas; por defecto `bogotaToday()`.

## Reglas

**Monto** (primer número reconocido):
- `18000`, `18.000`, `18,000` (miles con 3 dígitos tras el separador), `$18.000`, `$ 18 000`, `12.500,50` (coma decimal), `12500.5` (punto decimal si no hay 3 dígitos tras él) → `"12500.50"` canónico con 2 decimales solo si hay decimales; si no, entero.
- Sufijos: `18k`, `18 mil`, `18mil` → 18000; `2.5 millones`, `2,5 millones`, `1 millón`, `1 palo`, `2 palos` (coloquial colombiano = millón), `1.2 M` → 1200000.
- Palabras: `mil` solo (= 1000), `un millón`; números en palabra del 1 al 20 y decenas comunes (`veinte`, `treinta`, `cincuenta`) seguidos de `mil` (`cincuenta mil` → 50000).
- Rechazar montos ≤ 0 o > 999999999999999.99 → `amount: null`.
- Nunca usar `parseFloat`, `Number()` ni aritmética de coma flotante para el resultado: construye la cadena con aritmética entera de `BigInt` o manipulación de cadenas.

**Fecha:** `hoy` → today; `ayer` → today−1; `anteayer`/`antier` → today−2; `el lunes`…`el domingo` → la ocurrencia pasada más reciente (si hoy es lunes, «el lunes» = hace 7 días); `el 3`/`el 3 de noviembre`/`3/11` → ese día del mes indicado (o del actual) en el año actual, y si resulta futura, del año anterior. Nunca devolver una fecha futura. Cálculo de días con aritmética de fecha civil pura (sin `Date` con zona horaria; si usas `Date`, solo `Date.UTC` y getters UTC sobre la fecha civil).

**Tipo:** `income` si aparece `salario`, `sueldo`, `nómina`/`nomina`, `pago de`, `me pagaron`, `ingreso`, `recibí`/`recibi`, `venta`, `vendí`, `prima`, `freelance`, `transferencia recibida`; si no, `expense`.

**Categoría** (solo entre las recibidas y del tipo detectado): coincidencia por nombre de categoría (sin tildes, minúsculas) y por diccionario de palabras clave para las categorías de sistema:
- Alimentación: almuerzo, desayuno, cena, comida, mercado, restaurante, café, tinto, onces, domicilio, rappi, panadería, pizza, hamburguesa, frutas, supermercado, éxito, d1, ara, olímpica.
- Transporte: bus, transmilenio, sitp, taxi, uber, didi, cabify, gasolina, peaje, parqueadero, metro, pasaje, moto.
- Servicios: luz, agua, gas, internet, celular, plan, arriendo, administración, netflix, spotify, energía, factura.
- Otros gastos: (sin palabras clave; usar solo como respaldo cuando hay monto y ninguna otra coincide → `category: false` en confianza).
- Salario: salario, sueldo, nómina, quincena, prima.
- Otros ingresos: venta, freelance, regalo, reembolso, intereses.
Categorías privadas: coincidencia por palabra completa de su nombre.

**Nota:** texto original sin el fragmento del monto, sin moneda, sin palabras de fecha ni preposiciones sueltas al final (`en`, `de`, `por`, `para`), espacios normalizados, primera letra mayúscula, máx. 140.

**Explicación:** «Gasto de 18.000 pesos en Alimentación, ayer.» / «Ingreso de 2.500.000 pesos en Salario, hoy.» / si falta monto: «No encontré un monto. Escríbelo, por ejemplo: almuerzo 18 mil.»

## Pruebas (mínimo 35 casos)

Incluye al menos: cada formato de monto anterior; `"almuerzo 18 mil ayer"`; `"uber 12.500"`; `"salario 2,5 millones"`; `"me pagaron 1 palo por el freelance"`; `"mercado en el éxito $86.400 el sábado"`; `"netflix 26900"`; `"café"` (sin monto); `"0"`; `"-5000"`; montos con 3 decimales (se trunca? **no**: monto inválido → null); fecha «el 31» cuando hoy es 7 de noviembre (→ 31 de octubre); «el lunes» siendo lunes; año bisiesto (`today=2028-03-01`, «ayer» → 2028-02-29); cambio de año (`today=2027-01-01`, «ayer» → 2026-12-31); categoría privada; tipo ingreso con categoría de gasto inexistente → category null; texto vacío; nota limpia; explicación.

## Criterios de aceptación

1. `npx tsx --test tests/quick-entry-parser.test.ts` y `npm run typecheck` en `mobile` sin fallos.
2. Sin dependencias nuevas, sin floats para dinero, funciones puras sin efectos.
3. Resumen final con cobertura de casos y limitaciones conocidas del intérprete. No hagas commits ni push.
