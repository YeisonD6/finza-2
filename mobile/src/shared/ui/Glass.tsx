import { useEffect, useId, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { colors, getColorScheme, useThemeRefresh } from "../theme/tokens";

/** iOS «Reducir transparencia»; Android and web report false. */
export function useReduceTransparency() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    const listener = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      (value) => setReduced(value),
    );
    void AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => {});
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

/**
 * Frosted surface for things that float over scrolling content (tab bar, sheets).
 * iOS and web blur what is behind it; Android, where a live blur needs a captured
 * target, uses a denser tinted fill instead. With «Reducir transparencia» it is solid.
 */
export function GlassSurface({
  children,
  style,
  ...props
}: ViewProps & { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  useThemeRefresh();
  const reduce = useReduceTransparency();
  const blur = Platform.OS !== "android" && !reduce;
  return (
    <View
      {...props}
      style={[
        {
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: reduce
            ? colors.surface
            : blur
              ? colors.transparent
              : colors.glassStrong,
        },
        style,
      ]}
    >
      {blur ? (
        <>
          <BlurView
            intensity={40}
            tint={getColorScheme() === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass }]}
          />
        </>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Soft light behind the content so glass and cards read as layers instead of flat
 * boxes. Purely decorative and static: it never moves, so Reduce Motion is unaffected.
 */
export function AmbientGlow({
  size = 540,
  top = -230,
  right = -240,
  color = colors.glowA,
}: {
  size?: number;
  top?: number;
  right?: number;
  color?: string;
}) {
  useThemeRefresh();
  const id = `glow${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const opacity = getColorScheme() === "dark" ? 0.55 : 1;
  return (
    // A clip layer the size of the screen: the glow hangs past the edge, and
    // without it web counts that overflow as scrollable width (the page could
    // slide sideways when focus moved).
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      <View
        style={{ position: "absolute", top, right, width: size, height: size }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={opacity} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2}
            fill={`url(#${id})`}
          />
        </Svg>
      </View>
    </View>
  );
}
