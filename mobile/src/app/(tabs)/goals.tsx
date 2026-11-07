import { useIsFocused } from "expo-router";
import { Screen } from "../../shared/ui/Screen";
import { EmptyState } from "../../shared/ui/EmptyState";
export default function Goals() {
  const active = useIsFocused();
  return (
    <Screen title="Metas" active={active}>
      <EmptyState
        active={active}
        title="Tus metas empiezan aquí"
        message="Un lugar para cultivar lo que quieres lograr."
      />
    </Screen>
  );
}
