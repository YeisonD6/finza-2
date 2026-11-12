import { formatCOP as exactCOP } from "../../features/movements/domain";
/** Presentation only, reuses the string formatter and never converts money to a number. */
export function formatCOP(value: string) {
  const absolute = exactCOP(value.replace(/^-/, ""))
    .replace(",00 COP", "")
    .replace(" COP", "");
  return `${value.startsWith("-") ? "−" : ""}${absolute}`;
}
export function amountLabel(
  value: string,
  tone: "neutral" | "income" | "expense" | "auto" = "neutral",
) {
  const negative = value.startsWith("-");
  const kind = tone === "auto" ? (negative ? "expense" : "income") : tone;
  const absolute = value.replace(/^-/, "");
  return `${kind === "expense" ? "Gasto" : kind === "income" ? "Ingreso" : "Monto"} de ${kind === "expense" || negative ? "menos " : kind === "income" ? "más " : ""}${exactCOP(absolute).replace(" COP", " pesos colombianos")}`;
}

/** Exact sum of decimal strings ("1250.50"), returned in the same format. */
export function sumAmounts(values: string[]) {
  const total = values.reduce((acc, value) => {
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
    const cents =
      BigInt(whole || "0") * 100n + BigInt((fraction + "00").slice(0, 2));
    return acc + (negative ? -cents : cents);
  }, 0n);
  const negative = total < 0n;
  const abs = negative ? -total : total;
  return `${negative ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

/**
 * A decimal percent string from the API ("32.50", "-7.10") in Spanish form without
 * noise: "32,5", "-7,1", "40". Trailing zeros carry no information for the reader.
 */
export const percentText = (value: string) =>
  value
    .replace(".", ",")
    .replace(/(,\d*?)0+$/, "$1")
    .replace(/,$/, "");
