import { View, type ViewProps } from "react-native";
import { colors, radii, shadows, spacing } from "../theme/tokens";
export function Card({ style, ...props }: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.xl,
          gap: spacing.md,
        },
        shadows.card,
        style,
      ]}
    />
  );
}
