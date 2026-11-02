/** Presentation only: all authoritative money/date validation happens on the API. */
export function normalizeAmount(value: string): string {
  const raw = value.trim();
  if (!/^[0-9]{1,15}([.,][0-9]{1,2})?$/.test(raw))
    throw new Error(
      "Ingresa un monto positivo sin separadores de miles y con máximo dos decimales",
    );
  const [integer, fraction = ""] = raw.replace(",", ".").split(".");
  const result = `${integer.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
  if (result === "0.00") throw new Error("El monto debe ser mayor que $0");
  return result;
}

export function formatCOP(value: string): string {
  const [integer, fraction = "00"] = value.split(".");
  return `$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction.padEnd(2, "0")} COP`;
}

export function bogotaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validAccountingDate(value: string): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > bogotaToday()
  )
    return false;
  const [year, month, day] = value.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

export const validMonth = (value: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
  value >= "1900-01" &&
  value <= "9998-12";
