import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  colors,
  onColorScheme,
  radii,
  shadows,
  useThemeRefresh,
} from "../theme/tokens";
import { useReduceTransparency } from "./Glass";

// Native uses translucent layers and a specular edge. Web adds background blur.
function buildGlassStyle(): ViewStyle {
  return {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomColor: colors.border,
    borderRadius: radii.lg,
    ...shadows.card,
    ...Platform.select({
      web: {
        backdropFilter: "blur(22px) saturate(135%)",
        WebkitBackdropFilter: "blur(22px) saturate(135%)",
      } as ViewStyle,
    }),
  };
}
export const glassStyle = buildGlassStyle();
onColorScheme(() => Object.assign(glassStyle, buildGlassStyle()));

export function GlassSurface({ children, style, ...props }: ViewProps) {
  useThemeRefresh();
  const reduce = useReduceTransparency();
  const radius = StyleSheet.flatten(style)?.borderRadius ?? radii.lg;
  return (
    <View
      {...props}
      style={[glassStyle, style, reduce && { backgroundColor: colors.surface }]}
    >
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, overflow: "hidden" },
        ]}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: colors.glassBorder,
          }}
        />
      </View>
      {children}
    </View>
  );
}
