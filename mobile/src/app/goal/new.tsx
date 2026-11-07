import { router } from "expo-router";
import { GoalForm } from "../../features/goals/components/GoalForm";
import { PrivateScreen } from "../../shared/ui/PrivateScreen";
export default function NewGoal() {
  return (
    <PrivateScreen>
      <GoalForm
        onCancel={() => router.back()}
        onSaved={(goal) =>
          router.replace({ pathname: "/goal/[id]", params: { id: goal.id } })
        }
      />
    </PrivateScreen>
  );
}
