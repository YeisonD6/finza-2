import { useSelector } from "react-redux";
import { router } from "expo-router";
import { useIsFocused } from "expo-router";
import type { RootState } from "../../core/store";
import { DashboardScreen } from "../../features/dashboard/DashboardScreen";
import { useFinancial } from "../../features/dashboard/FinancialProvider";
import { useCategoriesQuery } from "../../features/movements/api";
export default function Home() {
  const profile = useSelector((s: RootState) => s.auth.profile);
  const financial = useFinancial();
  const categories = useCategoriesQuery();
  const active = useIsFocused();
  return (
    <DashboardScreen
      email={profile?.email ?? ""}
      emailUnconfirmed={profile?.email_verified === false}
      month={financial.month}
      categories={categories.data}
      onMonthChange={financial.setMonth}
      silentInitialSummary={!!financial.saved}
      firstMovement={financial.saved?.first}
      active={active}
      onRegister={() => {
        financial.clearSaved();
        router.push("/movement/new");
      }}
      onOpenMovements={() => {
        financial.clearSaved();
        router.navigate("/(tabs)/movements");
      }}
      onProfile={() => router.navigate("/(tabs)/profile")}
      onEdit={(row) =>
        router.push({ pathname: "/movement/[id]", params: { id: row.id } })
      }
    />
  );
}
