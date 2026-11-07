import type { components } from "../../../shared/api/schema";
import { AppText } from "../../../shared/ui/AppText";
import { SproutProgress } from "../../../shared/ui/SproutProgress";
import { formatCOP } from "../../../shared/formatting/money";
export type Budget = components["schemas"]["BudgetStatus"];
export function budgetState(budget: Budget) {
  return budget.status === "exceeded"
    ? `Excedido por ${formatCOP(budget.remaining.replace(/^-/, ""))}`
    : budget.status === "warning"
      ? "Cerca del límite"
      : "Al día";
}
export function BudgetProgress({ budget }: { budget: Budget }) {
  return (
    <>
      <AppText variant="subhead">{budget.category_name}</AppText>
      <AppText style={{ fontVariant: ["tabular-nums"] }}>
        {formatCOP(budget.spent)} de {formatCOP(budget.limit)}
      </AppText>
      <SproutProgress
        value={Number(budget.percent)}
        text={`${budget.category_name}: ${budgetState(budget)}`}
      />
    </>
  );
}
