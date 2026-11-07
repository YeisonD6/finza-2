import { BudgetsScreen } from "../../features/budgets/BudgetsScreen";
import { PrivateScreen } from "../../shared/ui/PrivateScreen";
export default function Budgets() {
  return (
    <PrivateScreen>
      <BudgetsScreen />
    </PrivateScreen>
  );
}
