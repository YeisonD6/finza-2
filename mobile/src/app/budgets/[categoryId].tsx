import { router, useLocalSearchParams } from "expo-router";
import { useBudgetsQuery } from "../../features/budgets/api";
import { useCategoriesQuery } from "../../features/movements/api";
import { BudgetEditor } from "../../features/budgets/components/BudgetEditor";
import { Screen } from "../../shared/ui/Screen";
import { AppText } from "../../shared/ui/AppText";
import { QueryState } from "../../shared/ui/QueryState";
import { PrivateScreen } from "../../shared/ui/PrivateScreen";
function Editor() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const budgets = useBudgetsQuery(),
    categories = useCategoriesQuery();
  const category = categories.currentData?.find(
    (c) => c.id === categoryId && c.movement_type === "expense",
  );
  if (
    budgets.isError ||
    categories.isError ||
    !budgets.currentData ||
    !categories.currentData
  )
    return (
      <Screen title="Presupuesto" onBack={() => router.back()}>
        <QueryState
          loading
          error={budgets.isError || categories.isError}
          retry={() => {
            void budgets.refetch();
            void categories.refetch();
          }}
        />
      </Screen>
    );
  if (!category)
    return (
      <Screen title="Presupuesto" onBack={() => router.back()}>
        <AppText>La categoría no está disponible.</AppText>
      </Screen>
    );
  return (
    <BudgetEditor
      categoryId={categoryId}
      name={category.name}
      limit={
        budgets.currentData.items.find((b) => b.category_id === categoryId)
          ?.limit
      }
      onClose={() => router.back()}
    />
  );
}
export default function BudgetRoute() {
  return (
    <PrivateScreen>
      <Editor />
    </PrivateScreen>
  );
}
