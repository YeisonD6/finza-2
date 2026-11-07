import { test } from "node:test";
import assert from "node:assert/strict";
import { bogotaToday } from "../src/features/movements/domain";
import {
  parseQuickEntry,
  type QuickEntryCategory,
} from "../src/features/quick-entry/parser";

const categories: QuickEntryCategory[] = [
  { id: "food", name: "Alimentación", movement_type: "expense" },
  { id: "transport", name: "Transporte", movement_type: "expense" },
  { id: "services", name: "Servicios", movement_type: "expense" },
  { id: "other-expense", name: "Otros gastos", movement_type: "expense" },
  { id: "salary", name: "Salario", movement_type: "income" },
  { id: "other-income", name: "Otros ingresos", movement_type: "income" },
];
const TODAY = "2026-11-07";
const parse = (text: string, today = TODAY) =>
  parseQuickEntry(text, categories, today);

for (const [text, expected] of [
  ["18000", "18000"],
  ["18.000", "18000"],
  ["18,000", "18000"],
  ["$18.000", "18000"],
  ["$ 18 000", "18000"],
  ["12.500,50", "12500.50"],
  ["12500.5", "12500.50"],
  ["18k", "18000"],
  ["18K", "18000"],
  ["18 mil", "18000"],
  ["18mil", "18000"],
  ["2.5 millones", "2500000"],
  ["2,5 millones", "2500000"],
  ["1 millón", "1000000"],
  ["1 palo", "1000000"],
  ["2 palos", "2000000"],
  ["1.2 M", "1200000"],
  ["mil", "1000"],
  ["un millón", "1000000"],
  ["cincuenta mil", "50000"],
  ["veinte mil", "20000"],
  ["treinta mil", "30000"],
  ["dieciséis mil", "16000"],
  ["00012.5", "12.50"],
  ["0,10", "0.10"],
  ["0.01k", "10"],
  ["12,500.50", "12500.50"],
  ["1.234.567,89", "1234567.89"],
  ["$ 18\u00a0000,50", "18000.50"],
  ["+5000", "5000"],
  ["999999999999999.99", "999999999999999.99"],
  ["999.999.999.999.999,99", "999999999999999.99"],
  ["999999999999999", "999999999999999"],
  ["2.555 millones", "2555000000"],
] as const) {
  test(`money preserves exact value: ${text}`, () => {
    const result = parse(text);
    assert.equal(result.amount, expected);
    assert.equal(result.confidence.amount, true);
    assert.equal(result.note, "");
  });
}

for (const text of [
  "0",
  "0.00",
  "-5000",
  "-$ 5.000",
  "$ -5000",
  "- 5000",
  "1000000000000000",
  "999999999999999.999",
  "12500.123",
  "12500,123",
  "12.500,123",
  "12.5000",
  "12..500",
  "1e3",
  "2500.555 millones",
  "999999999999999 mil",
  "0.001",
]) {
  test(`invalid money is rejected without truncation: ${text}`, () => {
    const result = parse(text);
    assert.equal(result.amount, null);
    assert.equal(result.confidence.amount, false);
    assert.equal(result.category_id, null);
  });
}

test("first numeric amount wins, including when invalid", () => {
  assert.equal(parse("almuerzo 18000 y taxi 12000").amount, "18000");
  assert.equal(parse("0 luego 18000").amount, null);
  assert.equal(parse("-5000 luego 18000").amount, null);
  assert.equal(parse("12500.123 luego 18000").amount, null);
});

for (const [word, value] of Object.entries({
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
})) {
  test(`spelled thousands: ${word}`, () => {
    assert.equal(
      parse(`${word} mil`).amount,
      (BigInt(value) * 1000n).toString(),
    );
  });
}

test("almuerzo 18 mil ayer produces a complete accessible suggestion", () => {
  assert.deepEqual(parse("almuerzo 18 mil ayer"), {
    type: "expense",
    amount: "18000",
    occurred_on: "2026-11-06",
    category_id: "food",
    note: "Almuerzo",
    confidence: { amount: true, date: true, category: true, type: false },
    explanation: "Gasto de 18.000 pesos en Alimentación, ayer.",
  });
});

for (const [text, amount, category, type] of [
  ["uber 12.500", "12500", "transport", "expense"],
  ["salario 2,5 millones", "2500000", "salary", "income"],
  ["me pagaron 1 palo por el freelance", "1000000", "other-income", "income"],
  ["mercado en el éxito $86.400 el sábado", "86400", "food", "expense"],
  ["netflix 26900", "26900", "services", "expense"],
] as const) {
  test(`required phrase: ${text}`, () => {
    const result = parse(text);
    assert.equal(result.amount, amount);
    assert.equal(result.category_id, category);
    assert.equal(result.type, type);
    if (text.includes("sábado")) {
      assert.equal(result.occurred_on, "2026-10-31");
      assert.equal(result.note, "Mercado en el éxito");
    }
  });
}

for (const [phrase, today, expected] of [
  ["hoy", TODAY, TODAY],
  ["ayer", TODAY, "2026-11-06"],
  ["anteayer", TODAY, "2026-11-05"],
  ["antier", TODAY, "2026-11-05"],
  ["el lunes", "2026-11-09", "2026-11-02"],
  ["el lunes", TODAY, "2026-11-02"],
  ["el martes", TODAY, "2026-11-03"],
  ["el miércoles", TODAY, "2026-11-04"],
  ["el jueves", TODAY, "2026-11-05"],
  ["el viernes", TODAY, "2026-11-06"],
  ["el sábado", TODAY, "2026-10-31"],
  ["el domingo", TODAY, "2026-11-01"],
  ["el 3", TODAY, "2026-11-03"],
  ["el 31", TODAY, "2026-10-31"],
  ["el 8", TODAY, "2026-10-08"],
  ["el 7", TODAY, TODAY],
  ["el 3 de noviembre", TODAY, "2026-11-03"],
  ["3/11", TODAY, "2026-11-03"],
  ["el 8 de noviembre", TODAY, "2025-11-08"],
  ["8/11", TODAY, "2025-11-08"],
  ["el 31 de diciembre", TODAY, "2025-12-31"],
  ["ayer", "2028-03-01", "2028-02-29"],
  ["ayer", "2027-01-01", "2026-12-31"],
  ["antier", "2027-01-01", "2026-12-30"],
  ["ayer", "2100-03-01", "2100-02-28"],
  ["el 29 de febrero", "2028-03-01", "2028-02-29"],
  ["el 31", "2026-03-01", "2026-01-31"],
  ["el 31", "2027-01-01", "2026-12-31"],
] as const) {
  test(`civil date: ${phrase} relative to ${today}`, () => {
    const result = parse(`${phrase} almuerzo 18000`, today);
    assert.equal(result.occurred_on, expected);
    assert.equal(result.amount, "18000");
    assert.equal(result.note, "Almuerzo");
    assert.equal(result.confidence.date, true);
    assert.ok(result.occurred_on <= today);
  });
}

for (const phrase of [
  "el 0",
  "el 32",
  "31/11",
  "3/13",
  "el 31 de abril",
  "el 29 de febrero",
]) {
  test(`impossible date does not become money: ${phrase}`, () => {
    const result = parse(phrase);
    assert.equal(result.occurred_on, TODAY);
    assert.equal(result.confidence.date, false);
    assert.equal(result.amount, null);
  });
}

test("all date fragments are removed; the first one determines the date", () => {
  const result = parse("hoy almuerzo 18000 ayer");
  assert.equal(result.occurred_on, TODAY);
  assert.equal(result.note, "Almuerzo");
});

for (const trigger of [
  "salario",
  "sueldo",
  "nómina",
  "nomina",
  "quincena",
  "pago de",
  "me pagaron",
  "ingreso",
  "recibí",
  "recibi",
  "venta",
  "vendí",
  "prima",
  "freelance",
  "regalo",
  "reembolso",
  "intereses",
  "transferencia recibida",
]) {
  test(`explicit income: ${trigger}`, () => {
    const result = parse(`${trigger} 18000`);
    assert.equal(result.type, "income");
    assert.equal(result.confidence.type, true);
  });
}

test("categories use accents, complete words and the detected movement type", () => {
  assert.equal(parse("ALIMENTACION 18000").category_id, "food");
  assert.equal(parse("CAFÉ 18000").category_id, "food");
  assert.equal(parse("cafe\u0301 18000").note, "Café");
  assert.equal(parse("pago de internet 18000").category_id, "other-income");
  assert.equal(
    parseQuickEntry(
      "salario 18000",
      categories.filter((c) => c.movement_type === "expense"),
      TODAY,
    ).category_id,
    null,
  );
  assert.equal(parseQuickEntry("uber 18000", [], TODAY).category_id, null);
  assert.equal(parse("paraguas 18000").category_id, "other-expense");
  assert.equal(parse("ventana 18000").type, "expense");
  assert.equal(parse("mi d1 18000").amount, "18000");
  assert.equal(parse("mi d1 18000").category_id, "food");
});

for (const [category, words] of [
  [
    "food",
    [
      "almuerzo",
      "desayuno",
      "cena",
      "comida",
      "mercado",
      "restaurante",
      "café",
      "tinto",
      "onces",
      "domicilio",
      "rappi",
      "panadería",
      "pizza",
      "hamburguesa",
      "frutas",
      "supermercado",
      "éxito",
      "d1",
      "ara",
      "olímpica",
    ],
  ],
  [
    "transport",
    [
      "bus",
      "transmilenio",
      "sitp",
      "taxi",
      "uber",
      "didi",
      "cabify",
      "gasolina",
      "peaje",
      "parqueadero",
      "metro",
      "pasaje",
      "moto",
    ],
  ],
  [
    "services",
    [
      "luz",
      "agua",
      "gas",
      "internet",
      "celular",
      "plan",
      "arriendo",
      "administración",
      "netflix",
      "spotify",
      "energía",
      "factura",
    ],
  ],
  ["salary", ["salario", "sueldo", "nómina", "quincena", "prima"]],
  ["other-income", ["venta", "freelance", "regalo", "reembolso", "intereses"]],
] as const) {
  test(`system dictionary resolves ${category} keywords`, () => {
    for (const word of words) {
      const income = category === "salary" || category === "other-income";
      const result = parse(`${word} 18000`);
      assert.equal(result.type, income ? "income" : "expense", word);
      assert.equal(result.category_id, category, word);
      assert.equal(result.confidence.category, true, word);
    }
  });
}

test("private category names take precedence and require a full name", () => {
  const privateCategories: QuickEntryCategory[] = [
    ...categories,
    { id: "pets", name: "Mascotas", movement_type: "expense" },
    { id: "health", name: "Salud dental", movement_type: "expense" },
  ];
  assert.equal(
    parseQuickEntry("mascotas comida 18000", privateCategories, TODAY)
      .category_id,
    "pets",
  );
  assert.equal(
    parseQuickEntry("mascotascosas 18000", privateCategories, TODAY)
      .category_id,
    "other-expense",
  );
  assert.equal(
    parseQuickEntry("salud dental 18000", privateCategories, TODAY).category_id,
    "health",
  );
  assert.equal(
    parseQuickEntry("salud 18000", privateCategories, TODAY).category_id,
    "other-expense",
  );
});

test("fallback is available only with valid money and has low category confidence", () => {
  const fallback = parse("libro 18000");
  assert.equal(fallback.category_id, "other-expense");
  assert.equal(fallback.confidence.category, false);
  assert.equal(parse("libro").category_id, null);
  assert.equal(parse("café").category_id, "food");
  assert.equal(parse("café").amount, null);
});

test("quincena alone identifies salary income", () => {
  const result = parse("quincena 1.250.000");
  assert.equal(result.type, "income");
  assert.equal(result.amount, "1250000");
  assert.equal(result.category_id, "salary");
  assert.equal(result.confidence.type, true);
  assert.equal(result.confidence.category, true);
});

test("income with money falls back to Otros ingresos with low confidence", () => {
  const result = parse("me debían 200 mil y me pagaron");
  assert.equal(result.type, "income");
  assert.equal(result.amount, "200000");
  assert.equal(result.category_id, "other-income");
  assert.equal(result.confidence.category, false);
  assert.equal(result.confidence.type, true);
  assert.equal(
    result.explanation,
    "Ingreso de 200.000 pesos en Otros ingresos, hoy.",
  );
  assert.equal(parse("me pagaron").category_id, null);
  assert.equal(parse("me pagaron 0").category_id, null);
  assert.equal(
    parseQuickEntry(
      "me pagaron 200 mil",
      categories.filter((category) => category.id !== "other-income"),
      TODAY,
    ).category_id,
    null,
  );
});

test("spelled amounts leave a clean note without leading articles or prepositions", () => {
  const result = parse("cincuenta mil de mercado");
  assert.equal(result.amount, "50000");
  assert.equal(result.note, "Mercado");
  assert.equal(result.category_id, "food");
  assert.equal(
    parse(
      "de en por para el la del al mercado 18000 en de por para el la del al",
    ).note,
    "Mercado",
  );
  assert.equal(parse("de 18000 al").note, "");
  assert.equal(parse("mercado en el éxito 18000").note, "Mercado en el éxito");
});

for (const word of ["de", "en", "por", "para", "el", "la", "del", "al"]) {
  test(`notes remove standalone ${word} at both edges`, () => {
    assert.equal(
      parse(`${word.toUpperCase()} mercado 18000 ${word}`).note,
      "Mercado",
    );
    assert.equal(
      parse(`${word}mercado 18000`).note,
      `${word[0].toUpperCase()}${word.slice(1)}mercado`,
    );
  });
}

test("notes remove currency, dates, dangling prepositions and extra spaces", () => {
  assert.equal(
    parse("  café   $ 18 000 pesos ayer en de por para  ").note,
    "Café",
  );
  assert.equal(parse("café $18000 COP hoy").note, "Café");
  assert.equal(parse("café 18000, ayer.").note, "Café");
  assert.equal(
    parse("me pagaron 1 palo por el freelance").note,
    "Me pagaron por el freelance",
  );
  assert.equal(parse(`café ${"x".repeat(160)} 18000`).note.length, 140);
  assert.equal(parse("hoy $18000").note, "");
});

test("explanations include exact grouped pesos and decimal centavos", () => {
  assert.equal(
    parse("salario 2,5 millones").explanation,
    "Ingreso de 2.500.000 pesos en Salario, hoy.",
  );
  assert.equal(
    parse("uber 12500.5").explanation,
    "Gasto de 12.500,50 pesos en Transporte, hoy.",
  );
  assert.equal(
    parseQuickEntry("18000", [], TODAY).explanation,
    "Gasto de 18.000 pesos, hoy.",
  );
  assert.equal(
    parse("café").explanation,
    "No encontré un monto. Escríbelo, por ejemplo: almuerzo 18 mil.",
  );
});

for (const [phrase, today, label] of [
  ["hoy", TODAY, "hoy"],
  ["ayer", TODAY, "ayer"],
  ["anteayer", TODAY, "antier"],
  ["antier", TODAY, "antier"],
  ["el viernes", TODAY, "el viernes 6 de noviembre"],
  ["el miércoles", TODAY, "el miércoles 4 de noviembre"],
  ["el sábado", TODAY, "el sábado 31 de octubre"],
  ["el 3 de noviembre", TODAY, "el martes 3 de noviembre"],
  ["el 31 de diciembre", TODAY, "el 31 de diciembre de 2025"],
  ["31/12", TODAY, "el 31 de diciembre de 2025"],
  ["ayer", "2027-01-01", "ayer"],
  ["el 31", "2027-01-01", "el 31 de diciembre de 2026"],
  ["el 29 de febrero", "2028-03-01", "el martes 29 de febrero"],
] as const) {
  test(`explanations use a human Spanish date: ${phrase} relative to ${today}`, () => {
    assert.equal(
      parse(`almuerzo 18000 ${phrase}`, today).explanation,
      `Gasto de 18.000 pesos en Alimentación, ${label}.`,
    );
  });
}

test("empty input and default confidence are stable", () => {
  assert.deepEqual(parse(""), parse("   "));
  assert.deepEqual(parse("   "), {
    type: "expense",
    amount: null,
    occurred_on: TODAY,
    category_id: null,
    note: "",
    confidence: { amount: false, date: false, category: false, type: false },
    explanation:
      "No encontré un monto. Escríbelo, por ejemplo: almuerzo 18 mil.",
  });
});

test("default day is Bogota today; injected inputs are not mutated", () => {
  const before = bogotaToday();
  const result = parseQuickEntry("almuerzo 18000", categories);
  assert.ok([before, bogotaToday()].includes(result.occurred_on));
  const frozen = Object.freeze(
    categories.map((category) => Object.freeze({ ...category })),
  );
  const snapshot = JSON.stringify(frozen);
  assert.deepEqual(
    parseQuickEntry(
      "almuerzo 18 mil ayer",
      frozen as unknown as QuickEntryCategory[],
      TODAY,
    ),
    parse("almuerzo 18 mil ayer"),
  );
  assert.equal(JSON.stringify(frozen), snapshot);
});
