import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useGoalsQuery } from "../../goals/api";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { Card } from "../../../shared/ui/Card";
import { SproutProgress } from "../../../shared/ui/SproutProgress";
import { formatCOP } from "../../../shared/formatting/money";
import { colors } from "../../../shared/theme/tokens";

const percentText = (value: string) =>
  value.replace(".", ",").replace(/,00$/, "");

/** Active goals closest to completion, so the dashboard shows what is about to be reached. */
export function GoalsGlance() {
  const query = useGoalsQuery();
  const goals = query.isError ? undefined : query.currentData;
  if (!Array.isArray(goals)) return null;
  const active = goals
    .filter((goal) => goal.status === "active")
    .sort((a, b) => Number(b.percent) - Number(a.percent))
    .slice(0, 2);
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <AppText variant="heading" accessibilityRole="header">
          Tus metas
        </AppText>
        {active.length ? (
          <AppButton
            title="Ver todas"
            accessibilityLabel="Ver todas las metas"
            variant="ghost"
            size="sm"
            onPress={() => router.navigate("/(tabs)/goals")}
          />
        ) : null}
      </View>
      {active.length === 0 ? (
        <AppButton
          title={
            goals.length
              ? "Crea una meta nueva para seguir ahorrando"
              : "Crea tu primera meta de ahorro"
          }
          variant="ghost"
          onPress={() => router.push("/goal/new")}
        />
      ) : (
        active.map((goal, index) => (
          <Pressable
            key={goal.id}
            accessibilityRole="button"
            accessibilityLabel={`${goal.name}: ${formatCOP(goal.saved_amount)} de ${formatCOP(goal.target_amount)}, ${percentText(goal.percent)} por ciento`}
            accessibilityHint="Abre el detalle de la meta"
            onPress={() =>
              router.push({ pathname: "/goal/[id]", params: { id: goal.id } })
            }
            style={({ pressed }) => ({
              gap: 8,
              paddingTop: index ? 16 : 0,
              borderTopWidth: index ? 1 : 0,
              borderTopColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ gap: 2 }}>
              <AppText variant="subhead">{goal.name}</AppText>
              <AppText
                variant="label"
                style={{
                  color: colors.inkMuted,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatCOP(goal.saved_amount)} de{" "}
                {formatCOP(goal.target_amount)}
              </AppText>
            </View>
            <View
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <SproutProgress
                kind="goal"
                value={Number(goal.percent)}
                text={`${percentText(goal.percent)} % · faltan ${formatCOP(goal.remaining)}`}
              />
            </View>
          </Pressable>
        ))
      )}
    </Card>
  );
}
