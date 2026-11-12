import { router } from "expo-router";
import { AppText } from "../shared/ui/AppText";
import { Screen } from "../shared/ui/Screen";
import { QueryState } from "../shared/ui/QueryState";
import { useFinancial } from "../features/dashboard/FinancialProvider";
import { useDashboardQuery } from "../features/dashboard/api";
import { useCategoriesQuery } from "../features/movements/api";
import { DashboardInsights } from "../features/dashboard/components/DashboardInsights";
import { spentShare } from "../features/dashboard/components/SummaryHeader";
import { monthLabel } from "../shared/formatting/dates";
import { colors, useThemeRefresh } from "../shared/theme/tokens";
import { PrivateScreen } from "../shared/ui/PrivateScreen";
/** Everything Inicio leaves out to stay minimal: tips, budgets, goals, trend, categories. */
function InsightsScreen() {
  useThemeRefresh();
  const financial = useFinancial();
  const categories = useCategoriesQuery();
  const query = useDashboardQuery(financial.month);
  const data = query.isError ? undefined : query.currentData;
  const share = data ? spentShare(data.income, data.expense) : null;
  return (
    <Screen title="Análisis" onBack={() => router.back()}>
      <AppText style={{ color: colors.inkMuted }}>
        {monthLabel(financial.month)}
        {share !== null
          ? share > 100
            ? ` · Gastaste el ${share} % de tus ingresos: más de lo que entró.`
            : ` · Gastaste el ${share} % de tus ingresos del mes.`
          : ""}
      </AppText>
      <QueryState
        loading={!data && query.isFetching}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      />
      {data ? (
        <DashboardInsights data={data} categories={categories.data ?? []} />
      ) : null}
    </Screen>
  );
}

/** Private: without a session this opens sign-in instead of failing requests. */
export default function Insights() {
  return (
    <PrivateScreen>
      <InsightsScreen />
    </PrivateScreen>
  );
}
