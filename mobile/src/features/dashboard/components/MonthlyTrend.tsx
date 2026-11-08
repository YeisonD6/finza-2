import { View } from "react-native";
import { useDashboardQuery, type DashboardSummary } from "../api";
import { AppText } from "../../../shared/ui/AppText";
import { Card } from "../../../shared/ui/Card";
import { AppButton } from "../../../shared/ui/AppButton";
import { formatCOP } from "../../../shared/formatting/money";
import {
  monthLabel,
  monthName,
  shiftMonth,
} from "../../../shared/formatting/dates";
import { colors, useThemeRefresh } from "../../../shared/theme/tokens";

const CHART_HEIGHT = 112;
const toCents = (value: string) =>
  BigInt(value.replace("-", "").replace(".", ""));

/** Six fixed calls (never a loop) so hook order is stable; RTK Query shares the cache. */
function useSixMonths(month: string) {
  const at = (offset: number) => shiftMonth(month, offset);
  return [
    useDashboardQuery(at(-5)),
    useDashboardQuery(at(-4)),
    useDashboardQuery(at(-3)),
    useDashboardQuery(at(-2)),
    useDashboardQuery(at(-1)),
    useDashboardQuery(month),
  ].map((query, index) => ({
    month: at(index - 5),
    data: query.isError ? undefined : query.currentData,
  }));
}

/** Bar heights on one shared scale, exact on decimal strings until the final ratio. */
export function trendBars(
  rows: Pick<DashboardSummary, "income" | "expense">[],
) {
  const max = rows.reduce((top, row) => {
    const a = toCents(row.income);
    const b = toCents(row.expense);
    return a > top ? (b > a ? b : a) : b > top ? b : top;
  }, 0n);
  const ratio = (value: string) =>
    max ? Number((toCents(value) * 10000n) / max) / 10000 : 0;
  return rows.map((row) => ({
    income: ratio(row.income),
    expense: ratio(row.expense),
  }));
}

/**
 * Income vs expense for the six months ending at the month on screen. Paired bars on a
 * shared scale; the figures are spoken as text, so the chart itself is decorative.
 */
export function MonthlyTrend({ month }: { month: string }) {
  useThemeRefresh();
  const months = useSixMonths(month);
  if (months.some((item) => !item.data)) return null;
  const rows = months.map((item) => item.data as DashboardSummary);
  if (
    rows.every(
      (row) => toCents(row.income) === 0n && toCents(row.expense) === 0n,
    )
  )
    return null;
  const bars = trendBars(rows);
  const summary = `Evolución de los últimos 6 meses. ${months
    .map(
      (item, index) =>
        `${monthLabel(item.month)}: ingresos ${formatCOP(rows[index].income)}, gastos ${formatCOP(rows[index].expense)}`,
    )
    .join(". ")}`;
  return (
    <Card>
      <View style={{ gap: 2 }}>
        <AppText variant="heading" accessibilityRole="header">
          Evolución
        </AppText>
        <AppText variant="caption" style={{ color: colors.inkMuted }}>
          Ingresos y gastos de los últimos 6 meses
        </AppText>
      </View>
      <View style={{ flexDirection: "row", gap: 16 }}>
        {[
          ["Ingresos", colors.forest600],
          ["Gastos", colors.expense],
        ].map(([name, color]) => (
          <View
            key={name}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: color,
              }}
            />
            <AppText variant="caption" style={{ color: colors.inkMuted }}>
              {name}
            </AppText>
          </View>
        ))}
      </View>
      <View accessible accessibilityLabel={summary}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: CHART_HEIGHT,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          {bars.map((bar, index) => {
            return (
              <View
                key={months[index].month}
                testID={`trend-${months[index].month}`}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 3,
                }}
              >
                {[
                  [bar.income, colors.forest600],
                  [bar.expense, colors.expense],
                ].map(([share, color], i) => (
                  <View
                    key={i}
                    style={{
                      width: 10,
                      height: Math.max(
                        2,
                        (share as number) * (CHART_HEIGHT - 8),
                      ),
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      backgroundColor: color as string,
                    }}
                  />
                ))}
              </View>
            );
          })}
        </View>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ flexDirection: "row", marginTop: 6 }}
        >
          {months.map((item, index) => {
            const current = index === months.length - 1;
            return (
              <AppText
                key={item.month}
                variant="caption"
                style={{
                  flex: 1,
                  textAlign: "center",
                  color: current ? colors.ink : colors.inkMuted,
                  fontWeight: current ? "700" : "500",
                }}
              >
                {monthName(item.month).slice(0, 3)}
              </AppText>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

/**
 * Inicio's only chart: spending per month for the last six months, current month in
 * the accent colour. The figures are spoken as one summary, so the bars are decorative.
 */
export function MonthlySpendCard({
  month,
  onOpen,
}: {
  month: string;
  onOpen(): void;
}) {
  useThemeRefresh();
  const months = useSixMonths(month);
  // The card (and its «Ver análisis», the only way into Análisis from Inicio) always
  // renders; the bars only when all six months are loaded and something was spent.
  const ready = months.every((item) => item.data);
  const rows = ready ? months.map((item) => item.data as DashboardSummary) : [];
  const max = rows.reduce(
    (top, row) => (toCents(row.expense) > top ? toCents(row.expense) : top),
    0n,
  );
  const summary = `Gasto de los últimos 6 meses. ${rows
    .map(
      (row, index) =>
        `${monthLabel(months[index].month)}: ${formatCOP(row.expense)}`,
    )
    .join(". ")}`;
  return (
    <Card style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <AppText variant="subhead" accessibilityRole="header">
          Gasto por mes
        </AppText>
        <AppButton
          title="Ver análisis"
          variant="ghost"
          size="sm"
          onPress={onOpen}
        />
      </View>
      {ready && max === 0n ? (
        <AppText style={{ color: colors.inkMuted }}>
          Aún no hay gastos en los últimos seis meses.
        </AppText>
      ) : null}
      {ready && max > 0n ? (
        <View
          accessible
          accessibilityLabel={summary}
          style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}
        >
          {rows.map((row, index) => {
            const current = index === rows.length - 1;
            const share = Number((toCents(row.expense) * 1000n) / max) / 1000;
            return (
              <View
                key={months[index].month}
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                style={{ flex: 1, alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    height: 72,
                    width: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <View
                    testID={`spend-${months[index].month}`}
                    style={{
                      height: Math.max(4, share * 72),
                      borderRadius: 8,
                      backgroundColor: current
                        ? colors.accent
                        : colors.borderStrong,
                    }}
                  />
                </View>
                <AppText
                  variant="caption"
                  style={{
                    color: current ? colors.ink : colors.inkMuted,
                    fontWeight: current ? "700" : "500",
                  }}
                >
                  {monthName(months[index].month).slice(0, 3)}
                </AppText>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
