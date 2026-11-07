import { ActionCard } from "../../shared/ui/ActionCard";
import { View } from "react-native";
import { formatCOP, sumAmounts } from "../../shared/formatting/money";
import { colors, radii } from "../../shared/theme/tokens";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { categoryIcon } from "../../shared/ui/categoryIcon";
import { categoryTone } from "../../shared/ui/categoryTheme";
import type { Budget } from "./components/BudgetProgress";
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
const toCents = (value: string) => BigInt(value.replace(".", ""));
/** Month total across budgets, plus how many need attention. Exact on decimal strings. */
export function budgetsOverview(items: Budget[]) {
  const spent = sumAmounts(items.map((b) => b.spent));
  const limit = sumAmounts(items.map((b) => b.limit));
  const base = toCents(limit);
  return {
    spent,
    limit,
    percent: base > 0n ? Number((toCents(spent) * 100n) / base) : 0,
    exceeded: items.filter((b) => b.status === "exceeded").length,
    warning: items.filter((b) => b.status === "warning").length,
  };
}
function BudgetsSummary({ items }: { items: Budget[] }) {
  const o = budgetsOverview(items);
  const alerts = [
    o.exceeded ? `${o.exceeded} excedido${o.exceeded > 1 ? "s" : ""}` : null,
    o.warning ? `${o.warning} cerca del límite` : null,
  ].filter(Boolean);
  const status = alerts.length ? alerts.join(" · ") : "Todos al día";
  return (
    <View
      accessible
      accessibilityLabel={`Gastado en categorías con presupuesto: ${formatCOP(o.spent)} de ${formatCOP(o.limit)}. ${status}.`}
      style={{
        backgroundColor: colors.forest700,
        borderRadius: radii.lg,
        padding: 20,
        gap: 6,
      }}
    >
      <AppText variant="label" style={{ color: colors.onForestMuted }}>
        Gastado con presupuesto
      </AppText>
      <AppText
        variant="title"
        style={{ color: colors.onForest, fontVariant: ["tabular-nums"] }}
      >
        {formatCOP(o.spent)}
      </AppText>
      <AppText style={{ color: colors.onForestMuted }}>
        de {formatCOP(o.limit)} · {status}
      </AppText>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{
          height: 6,
          borderRadius: 3,
          marginTop: 8,
          backgroundColor: colors.forestGlassStrong,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(o.percent, 100)}%`,
            height: 6,
            borderRadius: 3,
            backgroundColor: o.percent > 100 ? colors.cheek : colors.mint,
          }}
        />
      </View>
    </View>
  );
}
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
            <>
              <BudgetsSummary items={data.items} />
              {data.items.map((b) => (
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
              ))}
            </>
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
          {remaining?.length ? (
            <Card style={{ paddingVertical: 8, gap: 0 }}>
              {remaining.map((c, index) => {
                const tone = categoryTone(c.name, c.is_system, c.id);
                return (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      paddingVertical: 10,
                      borderTopWidth: index ? 1 : 0,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radii.md,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: tone.tint,
                      }}
                    >
                      <DecorativeIcon
                        icon={categoryIcon(c.name, c.is_system)}
                        size={20}
                        color={tone.ink}
                      />
                    </View>
                    <AppText
                      variant="subhead"
                      style={{ flex: 1, minWidth: 120 }}
                    >
                      {c.name}
                    </AppText>
                    <AppButton
                      title="Definir"
                      accessibilityLabel={`Definir presupuesto de ${c.name}`}
                      variant="secondary"
                      size="sm"
                      onPress={() => open(c.id)}
                      style={{ paddingHorizontal: 16 }}
                    />
                  </View>
                );
              })}
            </Card>
          ) : null}
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
