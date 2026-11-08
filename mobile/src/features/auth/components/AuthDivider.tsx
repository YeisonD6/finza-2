import { View } from "react-native";
import { AppText } from "../../../shared/ui/AppText";
import { colors, useThemeRefresh } from "../../../shared/theme/tokens";

export function AuthDivider({ label }: { label: string }) {
  useThemeRefresh();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <AppText variant="caption" style={{ color: colors.inkMuted }}>
        {label}
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
