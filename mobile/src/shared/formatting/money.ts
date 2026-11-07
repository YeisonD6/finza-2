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
