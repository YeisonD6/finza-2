import { router } from "expo-router";
import { useIsFocused } from "expo-router";
import { MovementsScreen } from "../../features/movements/MovementsScreen";
import { useFinancial } from "../../features/dashboard/FinancialProvider";
export default function Movements() {
  const financial = useFinancial();
  const active = useIsFocused();
  return (
    <MovementsScreen
      key={financial.month}
      initialMonth={financial.month}
      active={active}
      onEdit={(row) =>
        router.push({ pathname: "/movement/[id]", params: { id: row.id } })
      }
    />
  );
}
