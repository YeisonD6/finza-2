import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../../shared/theme/tokens";

/**
 * Static growth rings in the corner of the Inicio header: the same «Brote» motif as the
 * welcome hero, quieter and without motion because Inicio is seen many times a day.
 */
export function HeroRings() {
  const size = 320;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: "absolute", top: -120, right: -130 }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {[0.38, 0.58, 0.78, 0.98].map((r, index) => (
          <Circle
            key={r}
            cx={50}
            cy={50}
            r={r * 49}
            fill="none"
            stroke={colors.mint}
            strokeOpacity={0.16 - index * 0.03}
            strokeWidth={0.6}
          />
        ))}
      </Svg>
    </View>
  );
}
