import { View } from "react-native";
import { CircleCheck, Sprout } from "lucide-react-native";
import type { Goal } from "../domain";
import { targetDateLabel } from "../domain";
import { AppText } from "../../../shared/ui/AppText";
import { SproutProgress } from "../../../shared/ui/SproutProgress";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { formatCOP } from "../../../shared/formatting/money";
import { colors, radii, useThemeRefresh } from "../../../shared/theme/tokens";

export const goalPercentText = (value: string) =>
  value.replace(".", ",").replace(/,00$/, "");

function Stat({ label, value }: { label: string; value: string }) {
  useThemeRefresh();
  return (
    <View style={{ flexGrow: 1, flexBasis: 90, gap: 2 }}>
      <AppText variant="caption" style={{ color: colors.inkMuted }}>
        {label}
      </AppText>
      <AppText variant="label" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </AppText>
    </View>
  );
}

/** Goal summary: name, deadline, percent, sprout bar and the three figures that matter. */
export function GoalProgress({ goal }: { goal: Goal }) {
  useThemeRefresh();
  const completed = goal.status === "completed";
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.control,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: completed ? colors.forest700 : colors.sage100,
          }}
        >
          <DecorativeIcon
            icon={completed ? CircleCheck : Sprout}
            size={22}
            color={completed ? colors.onForest : colors.accent}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="subhead" style={{ fontWeight: "700" }}>
            {goal.name}
          </AppText>
          <AppText variant="caption" style={{ color: colors.inkMuted }}>
            {completed
              ? "Completada"
              : goal.target_date
                ? `Para ${targetDateLabel(goal.target_date)}`
                : "Sin fecha límite"}
          </AppText>
        </View>
        <AppText
          variant="subhead"
          accessible={false}
          importantForAccessibility="no"
          style={{
            color: colors.forest600,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
          }}
        >
          {goalPercentText(goal.percent)} %
        </AppText>
      </View>
      <SproutProgress
        kind="goal"
        value={Number(goal.percent)}
        text={`${goal.percent.replace(".", ",")} % · ${completed ? "Completada" : "En progreso"}`}
        caption={completed ? "¡Lo lograste!" : "En progreso"}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <Stat label="Ahorrado" value={formatCOP(goal.saved_amount)} />
        <Stat label="Meta" value={formatCOP(goal.target_amount)} />
        {completed ? null : (
          <Stat label="Faltan" value={formatCOP(goal.remaining)} />
        )}
      </View>
    </>
  );
}
