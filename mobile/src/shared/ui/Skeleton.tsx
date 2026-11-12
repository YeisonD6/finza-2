import { useEffect, useRef } from "react";
import { Animated, View, type DimensionValue } from "react-native";
import { colors, radii, useThemeRefresh } from "../theme/tokens";
import { durations, easeInOut, useReducedMotion } from "../theme/motion";

/**
 * Placeholder shaped like the content that is on its way, so the layout does not
 * jump when data lands. A slow opacity pulse says "working" without a spinner;
 * with Reduce Motion it stays still. Screen readers hear one «Cargando…» for the
 * whole group (see SkeletonGroup), never each block.
 */
export function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = radii.sm,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}) {
  useThemeRefresh();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    if (reduced) {
      opacity.setValue(0.7);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: durations.skeleton,
          easing: easeInOut,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: durations.skeleton,
          easing: easeInOut,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [reduced, opacity]);
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.sage100,
        opacity,
      }}
    />
  );
}

/** Wraps blocks so assistive tech announces a single loading state. */
export function SkeletonGroup({
  label = "Cargando…",
  children,
  gap = 12,
}: {
  label?: string;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ gap }}
    >
      {children}
    </View>
  );
}

/** A list row: category disc, two text lines and the amount on the right. */
function SkeletonRow() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <SkeletonBlock width={40} height={40} radius={20} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="55%" height={14} />
        <SkeletonBlock width="35%" height={12} />
      </View>
      <SkeletonBlock width={72} height={14} />
    </View>
  );
}

export function SkeletonList({
  rows = 3,
  label,
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <SkeletonGroup label={label} gap={20}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </SkeletonGroup>
  );
}

/** The Inicio hero while the month loads: caption, big figure, two small lines. */
export function SkeletonSummary({ label }: { label?: string }) {
  return (
    <SkeletonGroup label={label} gap={12}>
      <SkeletonBlock width={120} height={12} />
      <SkeletonBlock width="70%" height={44} radius={radii.md} />
      <SkeletonBlock width="50%" height={12} />
      <SkeletonBlock width="45%" height={12} />
    </SkeletonGroup>
  );
}
