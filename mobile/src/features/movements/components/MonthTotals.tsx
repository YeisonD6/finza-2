import { View } from "react-native";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import { useDashboardQuery } from "../../dashboard/api";
import { AppText } from "../../../shared/ui/AppText";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { amountLabel, formatCOP } from "../../../shared/formatting/money";
import { monthName } from "../../../shared/formatting/dates";
import { colors, radii, shadows } from "../../../shared/theme/tokens";

/**
 * Month totals above the list. Comes from the dashboard summary (shared cache with
 * Inicio), so it is exact for the whole month even while the list is paginated or filtered.
 */
export function MonthTotals({ month }: { month: string }) {
  const query = useDashboardQuery(month);
  const data = query.isError ? undefined : query.currentData;
  if (!data || data.month !== month) return null;
  const items = [
    {
      name: "Ingresos",
      value: data.income,
      icon: ArrowDownLeft,
      tone: "income" as const,
      color: colors.forest600,
      tint: colors.sage100,
    },
    {
      name: "Gastos",
      value: data.expense,
      icon: ArrowUpRight,
      tone: "expense" as const,
      color: colors.expense,
      tint: colors.expenseTint,
    },
  ];
  return (
    <View
      accessible
      accessibilityLabel={`Totales de ${monthName(month)}. ${items.map((item) => `${item.name}: ${amountLabel(item.value)}`).join(". ")}`}
      style={[
        {
          flexDirection: "row",
          flexWrap: "wrap",
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: 16,
          gap: 16,
        },
        shadows.card,
      ]}
    >
      {items.map((item) => (
        <View
          key={item.name}
          style={{
            flex: 1,
            flexBasis: 130,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: item.tint,
            }}
          >
            <DecorativeIcon
              icon={item.icon}
              size={18}
              strokeWidth={2}
              color={item.color}
            />
          </View>
          <View style={{ flexShrink: 1, gap: 0 }}>
            <AppText variant="caption" style={{ color: colors.inkMuted }}>
              {item.name}
            </AppText>
            <AppText
              variant="label"
              style={{ color: item.color, fontVariant: ["tabular-nums"] }}
            >
              {/^0*(\.0+)?$/.test(item.value)
                ? ""
                : item.tone === "income"
                  ? "+"
                  : "−"}
              {formatCOP(item.value)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
