import { router } from "expo-router";
import type { DashboardSummary } from "../api";
import type { Category } from "../../movements/types";
import { useBudgetsQuery } from "../../budgets/api";
import { BudgetProgress } from "../../budgets/components/BudgetProgress";
import { monedinTip } from "../monedinTip";
import { CategorySpending } from "./CategorySpending";
import { Card } from "../../../shared/ui/Card";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { QueryState } from "../../../shared/ui/QueryState";
import { Monedin } from "../../../shared/brand/Monedin";
import { colors } from "../../../shared/theme/tokens";
export function DashboardInsights({
  data,
  categories,
  allowMascot = true,
}: {
  data: DashboardSummary;
  categories: Category[];
  allowMascot?: boolean;
}) {
  const query = useBudgetsQuery(data.month);
  const budgets = query.isError ? undefined : query.currentData?.items;
  const tip = budgets && allowMascot ? monedinTip(data, budgets) : null;
  return (
    <>
      <Card>
        <AppText variant="heading" accessibilityRole="header">
          Presupuestos del mes
        </AppText>
        <QueryState
          loading={!budgets && query.isFetching}
          error={query.isError}
          retry={() => {
            void query.refetch();
          }}
        />
        {budgets?.length ? (
          <>
            {[...budgets]
              .sort((a, b) => Number(b.percent) - Number(a.percent))
              .slice(0, 3)
              .map((b) => (
                <Card key={b.category_id}>
                  <BudgetProgress budget={b} />
                </Card>
              ))}
            <AppButton
              title="Ver todos"
              accessibilityLabel="Ver todos los presupuestos"
              variant="ghost"
              onPress={() => router.push("/budgets")}
            />
          </>
        ) : budgets ? (
          <AppButton
            title="Crea un presupuesto para controlar tus gastos"
            variant="ghost"
            onPress={() => router.push("/budgets")}
          />
        ) : null}
      </Card>
      <CategorySpending
        items={data.expense_by_category ?? []}
        categories={categories}
      />
      {tip ? (
        <Card style={{ backgroundColor: colors.cream }}>
          <Monedin size="sm" />
          <AppText>{tip.message}</AppText>
          <AppButton
            title={tip.action}
            variant="ghost"
            onPress={() => router.push(tip.destination)}
          />
        </Card>
      ) : null}
    </>
  );
}
