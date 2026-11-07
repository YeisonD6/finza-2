import { View } from "react-native";
import { router } from "expo-router";
import type { DashboardSummary } from "../api";
import type { Category } from "../../movements/types";
import { useBudgetsQuery } from "../../budgets/api";
import { BudgetProgress } from "../../budgets/components/BudgetProgress";
import { monedinTip } from "../monedinTip";
import { CategorySpending } from "./CategorySpending";
import { GoalsGlance } from "./GoalsGlance";
import { MonthlyTrend } from "./MonthlyTrend";
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
      {tip ? (
        <Card style={{ backgroundColor: colors.cream }}>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Monedin size="sm" />
            <AppText style={{ flex: 1, color: colors.creamInk }}>
              {tip.message}
            </AppText>
          </View>
          <AppButton
            title={tip.action}
            variant="ghost"
            onPress={() => router.push(tip.destination)}
          />
        </Card>
      ) : null}
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
              .map((b, index) => (
                <View
                  key={b.category_id}
                  style={{
                    gap: 8,
                    paddingTop: index ? 16 : 0,
                    borderTopWidth: index ? 1 : 0,
                    borderTopColor: colors.border,
                  }}
                >
                  <BudgetProgress budget={b} />
                </View>
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
      <GoalsGlance />
      <MonthlyTrend month={data.month} />
      <CategorySpending
        items={data.expense_by_category ?? []}
        categories={categories}
      />
    </>
  );
}
