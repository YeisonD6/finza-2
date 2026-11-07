import { useIsFocused } from "expo-router";
import { GoalsScreen } from "../../features/goals/GoalsScreen";
export default function Goals() {
  return <GoalsScreen active={useIsFocused()} />;
}
