import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, radii, shadows } from "../theme/tokens";

// Native uses translucent layers and a specular edge. Web adds background blur.
export const glassStyle: ViewStyle = {
  backgroundColor: "rgba(255,255,255,0.82)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.94)",
  borderBottomColor: "rgba(138,179,162,0.35)",
  borderRadius: radii.lg,
  ...shadows.card,
  ...Platform.select({
    web: {
      backdropFilter: "blur(22px) saturate(135%)",
      WebkitBackdropFilter: "blur(22px) saturate(135%)",
    } as ViewStyle,
  }),
};

export function GlassSurface({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[glassStyle, style]}>
      <View
        pointerEvents="none"
        aria-hidden
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radii.lg, overflow: "hidden" },
        ]}
      >
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 20,
            right: 20,
            height: 1,
            backgroundColor: colors.surface,
          }}
        />
      </View>
      {children}
    </View>
  );
}
