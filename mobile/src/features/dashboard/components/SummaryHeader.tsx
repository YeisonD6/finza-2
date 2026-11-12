import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { View } from "react-native";
import { ArrowDown, ArrowUp } from "lucide-react-native";
import type { DashboardSummary } from "../api";
import { AppText } from "../../../shared/ui/AppText";
import { AmountText } from "../../../shared/ui/AmountText";
import { colors, radii, useThemeRefresh } from "../../../shared/theme/tokens";
import {
  formatCOP,
  amountLabel,
  percentText,
} from "../../../shared/formatting/money";
import { monthName, shiftMonth } from "../../../shared/formatting/dates";
import { cents } from "./CategorySpending";

/** Whole-percent share of income already spent, exact on decimal strings; null without income. */
export function spentShare(income: string, expense: string): number | null {
  const base = cents(income);
  if (base <= 0n) return null;
  return Number((cents(expense) * 100n + base / 2n) / base);
}
/**
 * Inicio's hero, kept to one idea: the net flow as the single large figure, income and
 * expense as one quiet line, and the comparison as a caption. The explanations that
 * used to sit on screen travel in the spoken label instead.
 */
export function SummaryHeader({ data }: { data: DashboardSummary }) {
  useThemeRefresh();
  const { delta, percent, reason } = data.comparison;
  const comparison =
    delta === null
      ? "Sin datos del mes anterior"
      : `${formatCOP(delta.replace(/^-/, ""))} ${delta === "0.00" ? "sin cambio frente a" : delta.startsWith("-") ? "menos que" : "más que"} ${monthName(shiftMonth(data.month, -1))}${reason === "comparable" && percent !== null ? ` (${percentText(percent.replace(/^-/, ""))} %)` : ""}`;
  const baseline =
    reason === "zero_baseline"
      ? " El flujo anterior fue cero; se muestra la diferencia absoluta, sin porcentaje."
      : reason === "negative_baseline"
        ? " El flujo anterior fue negativo; se muestra la diferencia absoluta, sin porcentaje."
        : "";
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label" style={{ color: colors.inkMuted }}>
        Flujo neto del mes
      </AppText>
      <AmountText
        value={data.net}
        variant="amount"
        accessibilityLabel={`Flujo neto del mes: ${amountLabel(data.net)}`}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.6}
      />
      {data.net.startsWith("-") ? (
        <AppText variant="caption" style={{ color: colors.expense }}>
          Flujo negativo: los gastos superan los ingresos.
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: 20,
          rowGap: 4,
          marginTop: 4,
        }}
      >
        {[
          {
            name: "Ingresos",
            value: data.income,
            icon: ArrowUp,
            color: colors.forest600,
          },
          {
            name: "Gastos",
            value: data.expense,
            icon: ArrowDown,
            color: colors.expense,
          },
        ].map((item) => (
          <View
            key={item.name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
              padding: 10,
              borderRadius: radii.control,
              backgroundColor: colors.glass,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}
          >
            <DecorativeIcon
              icon={item.icon}
              size={16}
              strokeWidth={2.5}
              color={item.color}
            />
            <AppText variant="label" style={{ color: colors.inkMuted }}>
              {item.name}
            </AppText>
            <AmountText
              value={item.value}
              variant="label"
              accessibilityLabel={`${item.name}: ${amountLabel(item.value)}`}
            />
          </View>
        ))}
      </View>
      <AppText
        variant="caption"
        accessibilityLabel={`${comparison}.${baseline} Se compara con el mes calendario completo anterior.`}
        style={{ color: colors.inkMuted }}
      >
        {comparison}
        {/* Why there is no percentage stays visible: it is part of the figure's meaning. */}
        {baseline}
      </AppText>
    </View>
  );
}
