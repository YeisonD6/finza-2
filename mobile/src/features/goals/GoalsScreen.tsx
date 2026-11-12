import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useGoalsQuery } from "./api";
import type { Goal } from "./domain";
import { GoalProgress, goalPercentText } from "./components/GoalProgress";
import { Plus } from "lucide-react-native";
import { DecorativeIcon } from "../../shared/ui/DecorativeIcon";
import { AppText } from "../../shared/ui/AppText";
import { Card } from "../../shared/ui/Card";
import { EmptyState } from "../../shared/ui/EmptyState";
import { QueryState } from "../../shared/ui/QueryState";
import { Screen } from "../../shared/ui/Screen";
import { formatCOP, sumAmounts } from "../../shared/formatting/money";
import {
  colors,
  radii,
  shadows,
  useThemeRefresh,
} from "../../shared/theme/tokens";

/** Saved vs target across active goals, as exact decimal strings. */
export function goalsTotals(goals: Goal[]) {
  const active = goals.filter((goal) => goal.status === "active");
  return {
    active: active.length,
    completed: goals.length - active.length,
    saved: sumAmounts(active.map((goal) => goal.saved_amount)),
    target: sumAmounts(active.map((goal) => goal.target_amount)),
  };
}

function GoalsSummary({
  goals,
  onCreate,
}: {
  goals: Goal[];
  onCreate(): void;
}) {
  useThemeRefresh();
  const totals = goalsTotals(goals);
  const target = sumCents(totals.target);
  const share =
    target > 0n ? Number((sumCents(totals.saved) * 1000n) / target) / 10 : 0;
  const parts = [
    totals.active === 1 ? "1 meta activa" : `${totals.active} metas activas`,
    totals.completed
      ? totals.completed === 1
        ? "1 cumplida"
        : `${totals.completed} cumplidas`
      : null,
  ].filter(Boolean);
  return (
    <View
      style={{
        backgroundColor: colors.forest700,
        borderRadius: radii.lg,
        padding: 20,
        gap: 16,
        overflow: "hidden",
      }}
    >
      <View
        accessible
        accessibilityLabel={`Ahorrado en tus metas: ${formatCOP(totals.saved)} de ${formatCOP(totals.target)}. ${parts.join(", ")}.`}
        style={{ gap: 6 }}
      >
        <AppText variant="label" style={{ color: colors.onForestMuted }}>
          Ahorrado en tus metas
        </AppText>
        <AppText
          variant="title"
          style={{ color: colors.onForest, fontVariant: ["tabular-nums"] }}
        >
          {formatCOP(totals.saved)}
        </AppText>
        <AppText style={{ color: colors.onForestMuted }}>
          de {formatCOP(totals.target)} · {parts.join(" · ")}
        </AppText>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{
            height: 6,
            borderRadius: 3,
            marginTop: 6,
            backgroundColor: colors.forestGlassStrong,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.min(share, 100)}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.mint,
            }}
          />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva meta"
        onPress={onCreate}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          minHeight: 48,
          borderRadius: radii.control,
          backgroundColor: pressed ? colors.mint : colors.onForest,
        })}
      >
        <DecorativeIcon
          icon={Plus}
          size={20}
          strokeWidth={2}
          color={colors.forest700}
        />
        <AppText variant="label" style={{ color: colors.forest700 }}>
          Nueva meta
        </AppText>
      </Pressable>
    </View>
  );
}
const sumCents = (value: string) => BigInt(value.replace(".", ""));

export function GoalsScreen({ active = true }: { active?: boolean }) {
  const query = useGoalsQuery();
  const goals = query.isError ? undefined : query.currentData;
  const create = () => router.push("/goal/new");
  // Active goals first, closest to completion on top; completed ones at the end.
  const sorted = goals
    ? [...goals].sort((a, b) =>
        a.status === b.status
          ? Number(b.percent) - Number(a.percent)
          : a.status === "active"
            ? -1
            : 1,
      )
    : undefined;
  return (
    <Screen title="Metas" active={active}>
      <QueryState
        loading={!goals && query.isFetching}
        error={query.isError}
        retry={() => {
          void query.refetch();
        }}
      />
      {sorted ? (
        sorted.length ? (
          <>
            <GoalsSummary goals={sorted} onCreate={create} />
            {sorted.map((goal) => (
              <Pressable
                key={goal.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${goal.name}: ${formatCOP(goal.saved_amount)} de ${formatCOP(goal.target_amount)}, ${goalPercentText(goal.percent)} por ciento`}
                onPress={() =>
                  router.push({
                    pathname: "/goal/[id]",
                    params: { id: goal.id },
                  })
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Card style={shadows.card}>
                  <View
                    importantForAccessibility="no-hide-descendants"
                    accessibilityElementsHidden
                    style={{ gap: 12 }}
                  >
                    <GoalProgress goal={goal} />
                  </View>
                </Card>
              </Pressable>
            ))}
          </>
        ) : (
          <EmptyState
            active={active}
            title="Ahorrar es más fácil con un objetivo. ¿Para qué quieres ahorrar?"
            action="Crear mi primera meta"
            onAction={create}
          />
        )
      ) : null}
    </Screen>
  );
}
