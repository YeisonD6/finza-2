import { View } from "react-native";
import Svg, { Circle, G, Rect } from "react-native-svg";
import type { components } from "../../../shared/api/schema";
import type { Category } from "../../movements/types";
import { AppText } from "../../../shared/ui/AppText";
import { Card } from "../../../shared/ui/Card";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { categoryIcon } from "../../../shared/ui/categoryIcon";
import {
  formatCOP,
  sumAmounts,
  percentText,
} from "../../../shared/formatting/money";
import { categoryTone } from "../../../shared/ui/categoryTheme";
import { colors, radii, useThemeRefresh } from "../../../shared/theme/tokens";
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
const SIZE = 132;
const STROKE = 18;
/** Part-of-whole ring. Purely visual: the same figures are listed as text below it. */
function Donut({
  slices,
}: {
  slices: { key: string; share: number; color: string }[];
}) {
  useThemeRefresh();
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((acc, slice) => acc + slice.share, 0) || 1;
  const gap = slices.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Start at 12 o'clock. An SVG transform string (not rotation/origin) so web gets valid DOM. */}
        <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {slices.map((slice) => {
            const length = (slice.share / total) * circumference;
            const visible = Math.max(length - gap, 1);
            const node = (
              <Circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                stroke={slice.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${visible} ${circumference - visible}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return node;
          })}
        </G>
      </Svg>
    </View>
  );
}
export function CategorySpending({
  items,
  categories = [],
}: {
  items: Expense[];
  categories?: Category[];
}) {
  useThemeRefresh();
  const bars = categoryBars(items);
  if (!bars.length) return null;
  const summary = `Gasto por categoría: ${bars.map((item) => `${item.name} ${formatCOP(item.total).replace("$ ", "")} pesos, ${percentText(item.share_percent)} por ciento`).join("; ")}`;
  const rows = bars.map((item) => {
    const isSystem =
      categories.find((c) => c.id === item.category_id)?.is_system ?? true;
    return {
      ...item,
      isSystem,
      tone: categoryTone(item.name, isSystem, item.category_id),
    };
  });
  const total = sumAmounts(bars.map((item) => item.total));
  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        Gasto por categoría
      </AppText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Donut
          slices={rows.map((row) => ({
            key: row.category_id,
            share: Number(row.share_percent),
            color: row.tone.chart,
          }))}
        />
        <View style={{ flex: 1, minWidth: 140, gap: 4 }}>
          <AppText variant="label" style={{ color: colors.inkMuted }}>
            Total gastado
          </AppText>
          <AppText variant="heading" style={{ fontVariant: ["tabular-nums"] }}>
            {formatCOP(total)}
          </AppText>
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            {rows.length === 1
              ? "En 1 categoría"
              : `En ${rows.length} categorías · la mayor es ${rows[0].name}`}
          </AppText>
        </View>
      </View>
      <View accessible accessibilityLabel={summary} style={{ gap: 16 }}>
        {rows.map((item) => (
          <View key={item.category_id} style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: item.tone.tint,
                }}
              >
                <DecorativeIcon
                  icon={categoryIcon(item.name, item.isSystem)}
                  size={18}
                  color={item.tone.ink}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="subhead">{item.name}</AppText>
                <AppText
                  variant="caption"
                  style={{
                    color: colors.inkMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {formatCOP(item.total)} · {percentText(item.share_percent)} %
                </AppText>
              </View>
            </View>
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Svg
                height={6}
                width="100%"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
              >
                <Rect width={100} height={6} rx={3} fill={colors.track} />
                <Rect
                  testID={`category-bar-${item.category_id}`}
                  width={item.width}
                  height={6}
                  rx={3}
                  fill={item.tone.chart}
                />
              </Svg>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}
