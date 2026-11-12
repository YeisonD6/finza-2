import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { View } from "react-native";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import type { DashboardSummary } from "../api";
import { AppText } from "../../../shared/ui/AppText";
import { AmountText } from "../../../shared/ui/AmountText";
import { colors, radii } from "../../../shared/theme/tokens";
import { formatCOP, amountLabel } from "../../../shared/formatting/money";
import { monthName, shiftMonth } from "../../../shared/formatting/dates";
import { cents } from "./CategorySpending";

/** Whole-percent share of income already spent, exact on decimal strings; null without income. */
export function spentShare(income: string, expense: string): number | null {
  const base = cents(income);
  if (base <= 0n) return null;
  return Number((cents(expense) * 100n + base / 2n) / base);
}
export function SummaryHeader({ data }: { data: DashboardSummary }) {
  const { delta, percent, reason } = data.comparison;
  const share = spentShare(data.income, data.expense);
  const Direction =
    delta === null || delta === "0.00"
      ? Minus
      : delta.startsWith("-")
        ? TrendingDown
        : TrendingUp;
  const comparison =
    delta === null
      ? "Sin datos del mes anterior"
      : `${formatCOP(delta.replace(/^-/, ""))} ${delta === "0.00" ? "sin cambio frente a" : delta.startsWith("-") ? "menos que" : "más que"} ${monthName(shiftMonth(data.month, -1))}${reason === "comparable" && percent !== null ? ` (${percent.replace(/^-/, "").replace(".", ",").replace(/,00$/, "")} %)` : ""}`;
  return (
    <>
      <AppText variant="label" style={{ color: colors.onForestMuted }}>
        Flujo neto del mes
      </AppText>
      <AmountText
        value={data.net}
        variant="display"
        accessibilityLabel={`Flujo neto del mes: ${amountLabel(data.net)}`}
        style={{ color: colors.onForest }}
        suffix={
          <AppText variant="label" style={{ color: colors.onForestMuted }}>
            {" "}
            COP
          </AppText>
        }
      />
      {data.net.startsWith("-") ? (
        <AppText style={{ color: colors.onForest }}>
          Flujo negativo: los gastos superan los ingresos.
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          alignSelf: "flex-start",
          maxWidth: "100%",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: colors.forestGlass,
        }}
      >
        {delta !== null ? (
          <DecorativeIcon
            icon={Direction}
            color={colors.onForest}
            size={18}
            strokeWidth={2}
          />
        ) : null}
        <AppText
          variant="label"
          style={{
            color: delta === null ? colors.onForestMuted : colors.onForest,
            flexShrink: 1,
          }}
        >
          {comparison}
        </AppText>
      </View>
      {reason === "zero_baseline" || reason === "negative_baseline" ? (
        <AppText variant="caption" style={{ color: colors.onForestMuted }}>
          {reason === "zero_baseline"
            ? "El flujo anterior fue cero."
            : "El flujo anterior fue negativo."}{" "}
          Se muestra la diferencia absoluta; no se calcula porcentaje.
        </AppText>
      ) : null}
      <AppText variant="caption" style={{ color: colors.onForestMuted }}>
        Se compara con el mes calendario completo anterior.
      </AppText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 4,
        }}
      >
        {[
          { name: "Ingresos", value: data.income, icon: ArrowDownLeft },
          { name: "Gastos", value: data.expense, icon: ArrowUpRight },
        ].map((item) => (
          <View
            key={item.name}
            style={{
              flex: 1,
              flexBasis: 120,
              padding: 14,
              gap: 6,
              borderRadius: radii.control,
              backgroundColor: colors.forestGlass,
              borderWidth: 1,
              borderColor: colors.forestGlassStrong,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <DecorativeIcon
                icon={item.icon}
                size={16}
                strokeWidth={2}
                color={colors.onForestMuted}
              />
              <AppText variant="label" style={{ color: colors.onForestMuted }}>
                {item.name}
              </AppText>
            </View>
            <AmountText
              value={item.value}
              variant="subhead"
              accessibilityLabel={`${item.name}: ${amountLabel(item.value)}`}
              style={{ color: colors.onForest }}
            />
          </View>
        ))}
      </View>
      {share !== null ? (
        <View style={{ gap: 8 }}>
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.forestGlass,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.min(share, 100)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor: share > 100 ? colors.cheek : colors.mint,
              }}
            />
          </View>
          <AppText variant="caption" style={{ color: colors.onForestMuted }}>
            {share > 100
              ? `Gastaste el ${share} % de tus ingresos: más de lo que entró.`
              : `Gastaste el ${share} % de tus ingresos del mes.`}
          </AppText>
        </View>
      ) : null}
    </>
  );
}
