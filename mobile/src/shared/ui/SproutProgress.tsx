import { useEffect, useRef, useState } from "react";
import { Animated, View, Platform } from "react-native";
import Svg, { Path } from "react-native-svg";
import { AppText } from "./AppText";
import { colors, useThemeRefresh } from "../theme/tokens";
import { durations, easeOut, useReducedMotion } from "../theme/motion";
export function SproutProgress({
  value,
  text,
  delay = 0,
  kind = "budget",
  caption,
  captionColor,
}: {
  value: number;
  /** Spoken value (and visible caption unless `caption` is given). */
  text?: string;
  /** Shorter visible caption when the surrounding row already names the item. */
  caption?: string;
  captionColor?: string;
  delay?: number;
  kind?: "budget" | "goal";
}) {
  useThemeRefresh();
  const now = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const status =
    value > 100 ? "Excedido" : value >= 80 ? "Cerca del límite" : "Al día";
  const color =
    kind === "goal"
      ? colors.progress
      : value > 100
        ? colors.expense
        : value >= 80
          ? colors.warning
          : colors.progress;
  const reduced = useReducedMotion(),
    scale = useRef(new Animated.Value(now / 100)).current,
    leaf = useRef(new Animated.Value(1)).current;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (reduced) {
      scale.setValue(now / 100);
      leaf.setValue(1);
      return;
    }
    scale.setValue(0);
    leaf.setValue(0);
    const animation = Animated.sequence([
      Animated.delay(delay * durations.stagger),
      Animated.timing(scale, {
        toValue: now / 100,
        duration: durations.progress,
        easing: easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(leaf, {
        toValue: 1,
        duration: durations.sprout,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [now, reduced, scale, leaf, delay]);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now,
        text: text ?? `${value} %. ${status}`,
      }}
      style={{ gap: 8, paddingTop: 20 }}
    >
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 8, borderRadius: 999, backgroundColor: colors.track }}
      >
        <Animated.View
          testID="sprout-progress-fill"
          style={{
            height: 8,
            width: "100%",
            borderRadius: 999,
            backgroundColor: color,
            transform: [
              {
                translateX: scale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-width / 2, 0],
                }),
              },
              { scaleX: scale },
            ],
          }}
        />
        {now > 0 ? (
          <Animated.View
            style={{
              position: "absolute",
              left: `${now}%`,
              top: -21,
              marginLeft: -14,
              opacity: leaf,
            }}
          >
            <Svg
              width={28}
              height={28}
              viewBox="0 0 28 28"
              {...(Platform.OS === "web"
                ? { "aria-hidden": true }
                : { accessible: false })}
            >
              <Path
                d="M14 26V12M14 17C4 17 3 10 4 5C12 5 16 10 14 17ZM14 13C14 5 19 2 25 3C25 11 21 15 14 13Z"
                stroke={colors.accent}
                strokeWidth={1.75}
                fill={colors.sage100}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </View>
      <AppText
        variant="caption"
        style={captionColor ? { color: captionColor } : undefined}
      >
        {caption ?? text ?? status}
      </AppText>
    </View>
  );
}
