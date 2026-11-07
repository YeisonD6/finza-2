import { ActionCard } from "../../shared/ui/ActionCard";
import { formatCOP } from "../../shared/formatting/money";
import { colors } from "../../shared/theme/tokens";
import { useState } from "react";
import { router } from "expo-router";
import { useBudgetsQuery } from "./api";
import { useCategoriesQuery } from "../movements/api";
import { bogotaToday } from "../movements/domain";
import { BudgetProgress, budgetState } from "./components/BudgetProgress";
import { Screen } from "../../shared/ui/Screen";
import { AppText } from "../../shared/ui/AppText";
import { Card } from "../../shared/ui/Card";
import { AppButton } from "../../shared/ui/AppButton";
import { EmptyState } from "../../shared/ui/EmptyState";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { QueryState } from "../../shared/ui/QueryState";
export function BudgetsScreen() {
  const [month, setMonth] = useState(bogotaToday().slice(0, 7));
  const query = useBudgetsQuery(month),
    categories = useCategoriesQuery();
  const data = query.isError ? undefined : query.currentData;
  const remaining = categories.isError
    ? []
    : categories.currentData?.filter(
        (c) =>
          c.movement_type === "expense" &&
          !data?.items.some((b) => b.category_id === c.id),
      );
  const open = (id: string) =>
    router.push({
      pathname: "/budgets/[categoryId]",
      params: { categoryId: id },
    });
  return (
    <Screen
      title="Presupuestos"
      onBack={() => router.back()}
      backLabel="Volver"
    >
      <MonthSwitcher month={month} onChange={setMonth} />
      <AppText>Límites mensuales que se repiten cada mes.</AppText>
      <QueryState
        loading={!data && query.isFetching}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      />
      {data ? (
        <>
          {!data.items.length ? (
            <EmptyState title="Define cuánto quieres gastar por categoría y te aviso cuando te acerques al límite." />
          ) : (
            data.items.map((b) => (
              <ActionCard
                key={b.category_id}
                label={`Editar ${b.category_name}. ${formatCOP(b.spent)} de ${formatCOP(b.limit)}. ${budgetState(b)}`}
                onPress={() => open(b.category_id)}
              >
                <BudgetProgress budget={b} />
                <AppText variant="label" style={{ color: colors.forest700 }}>
                  Editar presupuesto
                </AppText>
              </ActionCard>
            ))
          )}
          <AppText variant="heading" accessibilityRole="header">
            Categorías sin presupuesto
          </AppText>
          <QueryState
            loading={categories.isFetching && !categories.currentData}
            error={categories.isError}
            retry={() => {
              void categories.refetch();
            }}
          />
          {remaining?.map((c) => (
            <Card key={c.id}>
              <AppText variant="subhead">{c.name}</AppText>
              <AppButton
                title="Definir"
                accessibilityLabel={`Definir presupuesto de ${c.name}`}
                variant="secondary"
                onPress={() => open(c.id)}
              />
            </Card>
          ))}
          {remaining?.length === 0 &&
          categories.currentData &&
          !categories.isError ? (
            <AppText>Todas tus categorías de gasto tienen presupuesto.</AppText>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
