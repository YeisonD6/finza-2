import { View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import type { components } from "../../../shared/api/schema";
import type { Category } from "../../movements/types";
import { AppText } from "../../../shared/ui/AppText";
import { Card } from "../../../shared/ui/Card";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { categoryIcon } from "../../../shared/ui/categoryIcon";
import { formatCOP } from "../../../shared/formatting/money";
import { colors } from "../../../shared/theme/tokens";
type Expense = components["schemas"]["ExpenseByCategory"];
/** Integer cents stay exact even at the API maximum. Only the final pixel ratio is numeric. */
export const cents = (value: string) => BigInt(value.replace(".", ""));
export function categoryBars(items: Expense[]) {
  const sorted = [...items].sort((a, b) =>
    cents(a.total) === cents(b.total)
      ? a.name.localeCompare(b.name)
      : cents(a.total) > cents(b.total)
        ? -1
        : 1,
  );
  const max = sorted.length ? cents(sorted[0].total) : 0n;
  return sorted.map((item) => ({
    ...item,
    width: max ? Number((cents(item.total) * 10000n) / max) / 100 : 0,
  }));
}
export function CategorySpending({
  items,
  categories = [],
}: {
  items: Expense[];
  categories?: Category[];
}) {
  const bars = categoryBars(items);
  if (!bars.length) return null;
  const summary = `Gasto por categoría: ${bars.map((item) => `${item.name} ${formatCOP(item.total).replace("$ ", "")} pesos, ${item.share_percent.replace(".", ",")} por ciento`).join("; ")}`;
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Gasto por categoría
      </AppText>
      <View accessible accessibilityLabel={summary} style={{ gap: 20 }}>
        {bars.map((item) => (
          <View key={item.category_id} style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              <DecorativeIcon
                icon={categoryIcon(
                  item.name,
                  categories.find((c) => c.id === item.category_id)
                    ?.is_system ?? true,
                )}
                color={colors.forest700}
              />
              <AppText variant="subhead" style={{ flex: 1 }}>
                {item.name}
              </AppText>
            </View>
            <AppText style={{ fontVariant: ["tabular-nums"] }}>
              {formatCOP(item.total)} · {item.share_percent.replace(".", ",")} %
            </AppText>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Svg
                height={10}
                width="100%"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <Rect width={100} height={10} rx={3} fill={colors.track} />
                <Rect
                  testID={`category-bar-${item.category_id}`}
                  width={item.width}
                  height={10}
                  rx={3}
                  fill={colors.progress}
                />
              </Svg>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
