import { View } from "react-native";
import { Monedin } from "../brand/Monedin";
import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { colors } from "../theme/tokens";
export function EmptyState({
  title,
  message,
  action,
  onAction,
  active = true,
}: {
  title: string;
  message?: string;
  action?: string;
  onAction?(): void;
  active?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 24, gap: 16 }}>
      <Monedin size="md" motion={active ? "idle" : "none"} />
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      {message ? (
        <AppText style={{ textAlign: "center", color: colors.inkMuted }}>
          {message}
        </AppText>
      ) : null}
      {action && onAction ? (
        <AppButton title={action} onPress={onAction} />
      ) : null}
    </View>
  );
}
