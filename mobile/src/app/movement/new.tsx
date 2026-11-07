import { useLocalSearchParams } from "expo-router";
import { MovementModal } from "../../features/movements/components/MovementModal";
export default function NewMovement() {
  // finza://movement/new?type=income — used by the widget shortcuts.
  const { type } = useLocalSearchParams<{ type?: string }>();
  return (
    <MovementModal
      initialType={type === "income" || type === "expense" ? type : undefined}
    />
  );
}
