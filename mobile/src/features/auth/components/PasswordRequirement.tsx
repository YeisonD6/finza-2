import { View } from "react-native";
import { CircleCheck, Circle } from "lucide-react-native";
import { AppText } from "../../../shared/ui/AppText";
import { DecorativeIcon } from "../../../shared/ui/DecorativeIcon";
import { colors, useThemeRefresh } from "../../../shared/theme/tokens";

/** Live requirement: icon shape and text change, not only color. */
export function PasswordRequirement({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  useThemeRefresh();
  const Icon = met ? CircleCheck : Circle;
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
      accessible
      accessibilityLabel={`${label}: ${met ? "cumplido" : "pendiente"}`}
      accessibilityLiveRegion="polite"
    >
      <DecorativeIcon
        icon={Icon}
        size={16}
        strokeWidth={2}
        color={met ? colors.forest600 : colors.inkSubtle}
      />
      <AppText
        variant="caption"
        style={{ color: met ? colors.forest600 : colors.inkMuted }}
      >
        {label}
      </AppText>
    </View>
  );
}
