import { View, type ViewProps } from "react-native";
import {
  colors,
  radii,
  shadows,
  spacing,
  useThemeRefresh,
} from "../theme/tokens";
export function Card({ style, ...props }: ViewProps) {
  useThemeRefresh();
  return (
    <View
      {...props}
      style={[
        {
          // Frosted fill over the ambient light; no live blur needed for static cards.
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
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
