import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useId } from "react";
import { Monedin } from "./Monedin";

/** A quiet contact shadow grounds the floating character without a luminous halo. */
export function MonedinHero({ compact = false }: { compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const width = compact ? 170 : 210;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height: compact ? 128 : 178,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <Svg
        width={width}
        height="100%"
        viewBox="0 0 210 178"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id={`${id}shadow`}>
            <Stop offset="0" stopColor="#1D5344" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#1D5344" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="105" cy="157" rx="58" ry="10" fill={`url(#${id}shadow)`} />
      </Svg>
      <Monedin size={compact ? "md" : "auth"} motion="idle" haptic={false} />
    </View>
  );
}
