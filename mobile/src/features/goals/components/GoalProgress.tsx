import { View } from "react-native";
import { CircleCheck } from "lucide-react-native";
import type { Goal } from "../domain";
import { targetDateLabel } from "../domain";
import { AppText } from "../../../shared/ui/AppText";
import { SproutProgress } from "../../../shared/ui/SproutProgress";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { formatCOP } from "../../../shared/formatting/money";
import { colors } from "../../../shared/theme/tokens";
export function GoalProgress({ goal }: { goal: Goal }) {
  const completed = goal.status === "completed";
  return (
    <>
      <AppText variant="heading">{goal.name}</AppText>
      <AppText style={{ fontVariant: ["tabular-nums"] }}>
        {formatCOP(goal.saved_amount)} de {formatCOP(goal.target_amount)}
      </AppText>
      <SproutProgress
        kind="goal"
        value={Number(goal.percent)}
        text={`${goal.percent.replace(".", ",")} % · ${completed ? "Completada" : "En progreso"}`}
      />
      {completed ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <DecorativeIcon icon={CircleCheck} color={colors.forest700} />
          <AppText>Completada</AppText>
        </View>
      ) : (
        <AppText>Faltan {formatCOP(goal.remaining)}</AppText>
      )}
      {goal.target_date ? (
        <AppText>Para {targetDateLabel(goal.target_date)}</AppText>
      ) : null}
    </>
  );
}
