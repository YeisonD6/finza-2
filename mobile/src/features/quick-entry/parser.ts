import { bogotaToday } from "../movements/domain";

export type QuickEntryCategory = {
  id: string;
  name: string;
  movement_type: "income" | "expense";
};

export type QuickEntrySuggestion = {
  type: "income" | "expense";
  amount: string | null;
  occurred_on: string;
  category_id: string | null;
  note: string;
  confidence: {
    amount: boolean;
    date: boolean;
    category: boolean;
    type: boolean;
  };
  explanation: string;
};

type Fragment = { start: number; end: number };
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, phrase: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegex(phrase).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}_])`,
    "u",
  ).test(text);

const KEYWORDS: Record<string, string[]> = {
  alimentacion: [
    "almuerzo",
    "desayuno",
    "cena",
    "comida",
    "mercado",
    "restaurante",
    "cafe",
    "tinto",
    "onces",
    "domicilio",
    "rappi",
    "panaderia",
    "pizza",
    "hamburguesa",
    "frutas",
    "supermercado",
    "exito",
    "d1",
    "ara",
    "olimpica",
  ],
  transporte: [
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
  servicios: [
    "luz",
    "agua",
    "gas",
    "internet",
    "celular",
    "plan",
    "arriendo",
    "administracion",
    "netflix",
    "spotify",
    "energia",
    "factura",
  ],
  salario: ["salario", "sueldo", "nomina", "quincena", "prima"],
  "otros ingresos": ["venta", "freelance", "regalo", "reembolso", "intereses"],
};
const INCOME = [
  ...KEYWORDS.salario,
  ...KEYWORDS["otros ingresos"],
  "pago de",
  "me pagaron",
  "ingreso",
  "recibi",
  "vendi",
  "transferencia recibida",
];
const WORD_NUMBERS: Record<string, string> = {
  un: "1",
  uno: "1",
  una: "1",
  dos: "2",
  tres: "3",
  cuatro: "4",
  cinco: "5",
  seis: "6",
  siete: "7",
  ocho: "8",
  nueve: "9",
  diez: "10",
  once: "11",
  doce: "12",
  trece: "13",
  catorce: "14",
  quince: "15",
  dieciseis: "16",
  diecisiete: "17",
  dieciocho: "18",
  diecinueve: "19",
  veinte: "20",
  treinta: "30",
  cuarenta: "40",
  cincuenta: "50",
  sesenta: "60",
  setenta: "70",
  ochenta: "80",
  noventa: "90",
};

/** A single separator with three trailing digits is grouping only with a nonzero 1–3 digit head.
 * Thus 1.234 is 1234, while 12500.123 is invalid, never rounded or truncated. */
function decimalParts(
  raw: string,
): { integer: string; fraction: string } | null {
  const value = raw.replace(/[ \t\u00a0]/g, " ");
  const plain = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value);
  if (plain) return { integer: plain[1], fraction: plain[2] ?? "" };
  for (const separator of [".", ",", " "]) {
    const group = escapeRegex(separator);
    const decimal = separator === "," ? "\\." : ",";
    const grouped = new RegExp(
      `^([1-9]\\d{0,2}(?:${group}\\d{3})+)(?:${decimal}(\\d{1,2}))?$`,
    ).exec(value);
    if (grouped)
      return {
        integer: grouped[1].split(separator).join(""),
        fraction: grouped[2] ?? "",
      };
  }
  return null;
}

function canonicalAmount(raw: string, multiplier: bigint): string | null {
  if (raw.startsWith("-")) return null;
  const parts = decimalParts(raw.replace(/^\+/, ""));
  if (!parts) return null;
  // Reject oversized inputs before BigInt conversion; arbitrary leading zeroes are harmless.
  const integer = parts.integer.replace(/^0+/, "") || "0";
  if (integer.length > 15) return null;
  const cents =
    (BigInt(integer) * 100n + BigInt(parts.fraction.padEnd(2, "0"))) *
    multiplier;
  if (cents <= 0n || cents > 99999999999999999n) return null;
  const whole = (cents / 100n).toString();
  return parts.fraction && (multiplier === 1n || cents % 100n !== 0n)
    ? `${whole}.${(cents % 100n).toString().padStart(2, "0")}`
    : whole;
}

function findAmount(text: string): {
  amount: string | null;
  fragment?: Fragment;
} {
  const words = Object.keys(WORD_NUMBERS).join("|");
  const suffix = "(?:millones|millon|palos?|mil|k|m)";
  const numeric = `[+-]?\\s*(?:\\$\\s*)?[+-]?\\d+(?:(?:[.,]+\\d+)|(?:[ \\t\\u00a0]\\d{3}(?!\\d)))*(?:[eE][+-]?\\d+)?(?:\\s*${suffix})?`;
  const spelled = `(?:${words})\\s+(?:mil|millones|millon|palos?)|mil`;
  const match = new RegExp(
    `(?<![\\p{L}\\p{N}_./,])(?:${numeric}|${spelled})(?![\\p{L}\\p{N}_])`,
    "u",
  ).exec(text);
  if (!match) return { amount: null };
  const token = match[0]
    .trim()
    .replace(/\$\s*/g, "")
    .replace(/^[+-]\s+(?=\d)/, (sign) => sign.trim());
  const ending = new RegExp(`\\s*(${suffix})$`).exec(token);
  const unit = ending?.[1];
  const multiplier =
    unit === "mil" || unit === "k" ? 1000n : unit ? 1000000n : 1n;
  const coefficient = ending ? token.slice(0, ending.index).trim() : token;
  const raw =
    token === "mil" ? "1" : (WORD_NUMBERS[coefficient] ?? coefficient);
  return {
    amount: canonicalAmount(raw, multiplier),
    fragment: { start: match.index, end: match.index + match[0].length },
  };
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];
const DATE_PATTERN = new RegExp(
  `\\b(?:anteayer|antier|ayer|hoy|el\\s+(?:${WEEKDAYS.join("|")})|el\\s+\\d{1,2}(?:\\s+de\\s+(?:${MONTHS.join("|")}))?|\\d{1,2}/\\d{1,2})\\b`,
  "g",
);

function civilDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}
function dateString(date: Date): string {
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function humanDate(date: string, today: string): string {
  const [year, month, day] = date.split("-").map((part) => parseInt(part, 10));
  const calendarDate = `${day} de ${MONTHS[month - 1]}`;
  if (date.slice(0, 4) !== today.slice(0, 4)) {
    return `el ${calendarDate} de ${year}`;
  }
  const weekday = WEEKDAYS[civilDate(year, month, day).getUTCDay()]
    .replace("miercoles", "miércoles")
    .replace("sabado", "sábado");
  return `el ${weekday} ${calendarDate}`;
}
function validCivil(year: number, month: number, day: number): boolean {
  const date = civilDate(year, month, day);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function resolveDate(phrase: string, today: string): string | null {
  // These numbers describe a civil calendar, never money.
  const [year, month, day] = today.split("-").map((part) => parseInt(part, 10));
  const current = civilDate(year, month, day);
  const relative = { hoy: 0, ayer: 1, anteayer: 2, antier: 2 }[phrase];
  if (relative !== undefined) {
    current.setUTCDate(day - relative);
    return dateString(current);
  }
  const weekday = WEEKDAYS.indexOf(phrase.replace(/^el\s+/, ""));
  if (weekday >= 0) {
    current.setUTCDate(day - ((current.getUTCDay() - weekday + 7) % 7 || 7));
    return dateString(current);
  }
  const explicit =
    /^(?:el\s+)?(\d{1,2})(?:\s+de\s+([a-z]+)|\/(\d{1,2}))?$/.exec(phrase);
  if (!explicit) return null;
  const targetDay = parseInt(explicit[1], 10);
  if (targetDay < 1 || targetDay > 31) return null;
  if (!explicit[2] && !explicit[3]) {
    // A bare day means its latest valid occurrence, including in a previous month.
    for (let offset = 0; offset < 12; offset++) {
      const candidateMonth = civilDate(year, month - offset, 1);
      const y = candidateMonth.getUTCFullYear();
      const m = candidateMonth.getUTCMonth() + 1;
      if (validCivil(y, m, targetDay)) {
        const candidate = dateString(civilDate(y, m, targetDay));
        if (candidate <= today) return candidate;
      }
    }
    return null;
  }
  const targetMonth = explicit[2]
    ? MONTHS.indexOf(explicit[2]) + 1
    : parseInt(explicit[3], 10);
  const candidate = dateString(civilDate(year, targetMonth, targetDay));
  const targetYear = candidate > today ? year - 1 : year;
  return validCivil(targetYear, targetMonth, targetDay)
    ? dateString(civilDate(targetYear, targetMonth, targetDay))
    : null;
}

function blankFragments(text: string, fragments: Fragment[]): string {
  // Preserve offsets so normalized matches can also remove the original accented text.
  for (const fragment of [...fragments].sort((a, b) => b.start - a.start)) {
    text =
      text.slice(0, fragment.start) +
      " ".repeat(fragment.end - fragment.start) +
      text.slice(fragment.end);
  }
  return text;
}

/** Local deterministic suggestions only; the caller must confirm them in the form.
 * `today`, when supplied, must be a valid YYYY-MM-DD civil date. */
export function parseQuickEntry(
  text: string,
  categories: QuickEntryCategory[],
  today: string = bogotaToday(),
): QuickEntrySuggestion {
  const original = text.normalize("NFC");
  const normalized = fold(original);
  const dates = [...normalized.matchAll(new RegExp(DATE_PATTERN))];
  const dateFragments = dates.map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));
  const detectedDate = dates.length ? resolveDate(dates[0][0], today) : null;
  const occurred_on = detectedDate ?? today;
  const { amount, fragment } = findAmount(
    blankFragments(normalized, dateFragments),
  );
  const explicitIncome = INCOME.some((word) => contains(normalized, word));
  const type = explicitIncome ? "income" : "expense";
  const compatible = categories.filter(
    (category) => category.movement_type === type,
  );
  // An explicit category name takes precedence over keyword inference.
  const category =
    compatible.find(
      (item) =>
        item.name.trim() && contains(normalized, fold(item.name.trim())),
    ) ??
    compatible.find((item) =>
      KEYWORDS[fold(item.name.trim())]?.some((word) =>
        contains(normalized, word),
      ),
    );
  const fallback = amount
    ? compatible.find(
        (item) =>
          fold(item.name.trim()) ===
          (type === "income" ? "otros ingresos" : "otros gastos"),
      )
    : undefined;
  const selected = category ?? fallback;
  let note = blankFragments(original, [
    ...dateFragments,
    ...(fragment ? [fragment] : []),
  ])
    .replace(/\$/g, " ")
    .replace(/\b(?:pesos?|cop)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s,;:.!?¡¿-]+|[\s,;:.!?¡¿-]+$/g, "");
  while (/^(?:de|en|por|para|el|la|del|al)(?:\s|$)/i.test(note)) {
    note = note
      .replace(/^(?:de|en|por|para|el|la|del|al)(?:\s|$)/i, "")
      .trim()
      .replace(/^[,;:.!?¡¿-]+/, "")
      .trim();
  }
  while (/(?:^|\s)(?:en|de|por|para|el|la|del|al)$/i.test(note)) {
    note = note
      .replace(/(?:^|\s)(?:en|de|por|para|el|la|del|al)$/i, "")
      .trim()
      .replace(/[,;:.!?-]+$/, "")
      .trim();
  }
  note = Array.from(note.replace(/\p{L}/u, (letter) => letter.toUpperCase()))
    .slice(0, 140)
    .join("");
  const dateLabel = detectedDate
    ? /^(?:hoy|ayer|anteayer|antier)$/.test(dates[0][0])
      ? dates[0][0].replace("anteayer", "antier")
      : humanDate(occurred_on, today)
    : "hoy";
  const formatted = amount
    ?.replace(/^(\d+)/, (integer) =>
      integer.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
    )
    .replace(/\.(\d{2})$/, ",$1");
  return {
    type,
    amount,
    occurred_on,
    category_id: selected?.id ?? null,
    note,
    confidence: {
      amount: amount !== null,
      date: detectedDate !== null,
      category: !!category,
      type: explicitIncome,
    },
    explanation: amount
      ? `${type === "income" ? "Ingreso" : "Gasto"} de ${formatted} pesos${selected ? ` en ${selected.name}` : ""}, ${dateLabel}.`
      : "No encontré un monto. Escríbelo, por ejemplo: almuerzo 18 mil.",
  };
}
