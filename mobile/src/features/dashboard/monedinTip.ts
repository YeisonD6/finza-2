import type { DashboardSummary } from "./api";
import type { Budget } from "../budgets/components/BudgetProgress";
import { formatCOP } from "../../shared/formatting/money";
export type MonedinTip = {
  message: string;
  action: string;
  destination: "/budgets" | "/(tabs)/goals";
};
/** Deterministic priority: highest percent exceeded, then warning, then improving net.
 * Ties use category id. An empty month keeps only its existing empty-state mascot.
 */
export function monedinTip(
  data: DashboardSummary,
  budgets: Budget[],
): MonedinTip | null {
  if (!data.recent_movements.length) return null;
  const sorted = [...budgets].sort(
    (a, b) =>
      Number(b.percent) - Number(a.percent) ||
      a.category_id.localeCompare(b.category_id),
  );
  const exceeded = sorted.find((b) => b.status === "exceeded");
  if (exceeded)
    return {
      message: `Te pasaste ${formatCOP(exceeded.remaining.replace(/^-/, ""))} en ${exceeded.category_name}. ¿Ajustamos el presupuesto?`,
      action: "Revisar",
      destination: "/budgets",
    };
  const warning = sorted.find((b) => b.status === "warning");
  if (warning)
    return {
      message: `Vas al ${warning.percent.replace(".", ",")} % de ${warning.category_name}. Te quedan ${formatCOP(warning.remaining)}.`,
      action: "Revisar",
      destination: "/budgets",
    };
  const positive = (value: string | null) =>
    !!value && !value.startsWith("-") && /[1-9]/.test(value);
  if (
    positive(data.net) &&
    data.comparison.reason === "comparable" &&
    positive(data.comparison.delta)
  )
    return {
      message: "¡Vas mejor que el mes pasado! Considera aportar a una meta.",
      action: "Ver metas",
      destination: "/(tabs)/goals",
    };
  return null;
}
