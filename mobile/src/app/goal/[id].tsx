import { useLocalSearchParams } from "expo-router";
import { GoalDetailScreen } from "../../features/goals/GoalDetailScreen";
import { PrivateScreen } from "../../shared/ui/PrivateScreen";
export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PrivateScreen>
      <GoalDetailScreen key={id} id={id} />
    </PrivateScreen>
  );
}
