import { View } from "react-native";
import type { components } from "../../../shared/api/schema";
import { AppText } from "../../../shared/ui/AppText";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { SproutProgress } from "../../../shared/ui/SproutProgress";
import { categoryIcon } from "../../../shared/ui/categoryIcon";
import { categoryTone } from "../../../shared/ui/categoryTheme";
import { formatCOP } from "../../../shared/formatting/money";
import { colors, radii, useThemeRefresh } from "../../../shared/theme/tokens";
export type Budget = components["schemas"]["BudgetStatus"];
export function budgetState(budget: Budget) {
  return budget.status === "exceeded"
    ? `Excedido por ${formatCOP(budget.remaining.replace(/^-/, ""))}`
    : budget.status === "warning"
      ? "Cerca del límite"
      : "Al día";
}
const statusColor = (budget: Budget) =>
  budget.status === "exceeded"
    ? colors.expense
    : budget.status === "warning"
      ? colors.warning
      : colors.forest600;
const percentText = (value: string) => `${Math.round(Number(value))} %`;
export function BudgetProgress({ budget }: { budget: Budget }) {
  useThemeRefresh();
  const tone = categoryTone(budget.category_name, true, budget.category_id);
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            icon={categoryIcon(budget.category_name, true)}
            size={20}
            color={tone.ink}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subhead">{budget.category_name}</AppText>
          <AppText
            variant="caption"
            style={{ color: colors.inkMuted, fontVariant: ["tabular-nums"] }}
          >
            {formatCOP(budget.spent)} de {formatCOP(budget.limit)}
          </AppText>
        </View>
        <AppText
          variant="label"
          accessible={false}
          importantForAccessibility="no"
          style={{
            color: statusColor(budget),
            fontVariant: ["tabular-nums"],
          }}
        >
          {percentText(budget.percent)}
        </AppText>
      </View>
      <SproutProgress
        value={Number(budget.percent)}
        text={`${budget.category_name}: ${budgetState(budget)}`}
        caption={budgetState(budget)}
        captionColor={statusColor(budget)}
      />
    </>
  );
}
