import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { View } from "react-native";
import { TrendingUp, TrendingDown, Minus } from "lucide-react-native";
import type { DashboardSummary } from "../api";
import { AppText } from "../../../shared/ui/AppText";
import { AmountText } from "../../../shared/ui/AmountText";
import { colors, radii } from "../../../shared/theme/tokens";
import { formatCOP, amountLabel } from "../../../shared/formatting/money";
import { monthName, shiftMonth } from "../../../shared/formatting/dates";
export function SummaryHeader({ data }: { data: DashboardSummary }) {
  const { delta, percent, reason } = data.comparison;
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
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {delta !== null ? (
          <DecorativeIcon
            icon={Direction}
            color={colors.onForest}
            size={24}
            strokeWidth={1.75}
          />
        ) : null}
        <AppText
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {[
          { name: "Ingresos", value: data.income },
          { name: "Gastos", value: data.expense },
        ].map((item) => (
          <View
            key={item.name}
            style={{
              flex: 1,
              flexBasis: 120,
              padding: 12,
              gap: 8,
              borderRadius: radii.md,
              backgroundColor: colors.forestGlass,
            }}
          >
            <AppText variant="label" style={{ color: colors.onForestMuted }}>
              {item.name}
            </AppText>
            <AmountText
              value={item.value}
              variant="subhead"
              accessibilityLabel={`${item.name}: ${amountLabel(item.value)}`}
              style={{ color: colors.onForest }}
            />
          </View>
        ))}
      </View>
    </>
  );
}
