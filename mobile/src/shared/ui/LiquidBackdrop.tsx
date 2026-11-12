import { useEffect, useId, useRef, useState } from "react";
import { Animated, AppState, Easing, StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useReducedMotion } from "../theme/motion";

/** Two continuous currents, animated on the native thread without re-rendering the form. */
export function LiquidBackdrop({
  dark = false,
  active = true,
}: {
  dark?: boolean;
  active?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const phase = useRef(new Animated.Value(0)).current;
  const [foreground, setForeground] = useState(
    AppState.currentState !== "background",
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    phase.setValue(0);
    if (reduced || !active || !foreground) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [phase, reduced, active, foreground]);
  return (
    <View
      pointerEvents="none"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}
    >
      <Svg
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 400 850"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`${id}base`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={dark ? "#102F29" : "#E4F4EB"} />
            <Stop offset="0.55" stopColor={dark ? "#1A5245" : "#F6FAF5"} />
            <Stop offset="1" stopColor={dark ? "#0C2926" : "#DAEEE8"} />
          </LinearGradient>
          <RadialGradient id={`${id}light`} cx="0.9" cy="0.2" rx="0.9" ry="0.7">
            <Stop
              offset="0"
              stopColor={dark ? "#85D9B6" : "#FFFFFF"}
              stopOpacity={dark ? 0.28 : 0.9}
            />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="400" height="850" fill={`url(#${id}base)`} />
        <Rect width="400" height="850" fill={`url(#${id}light)`} />
      </Svg>
      {[0, 1].map((layer) => (
        <Animated.View
          key={layer}
          style={[
            StyleSheet.absoluteFill,
            {
              top: -65,
              bottom: -65,
              left: -70,
              right: -70,
              opacity: dark ? 0.36 : 0.52,
              transform: [
                {
                  translateX: phase.interpolate({
                    inputRange: [0, 1],
                    outputRange: layer ? [20, -20] : [-18, 18],
                  }),
                },
                {
                  translateY: phase.interpolate({
                    inputRange: [0, 1],
                    outputRange: layer ? [16, -16] : [-12, 12],
                  }),
                },
                {
                  rotate: phase.interpolate({
                    inputRange: [0, 1],
                    outputRange: layer ? ["-5deg", "4deg"] : ["3deg", "-4deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 500 1000"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient
                id={`${id}wave${layer}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <Stop
                  offset="0"
                  stopColor={dark ? "#A6EAD1" : "#9DD7C1"}
                  stopOpacity="0.05"
                />
                <Stop
                  offset="0.5"
                  stopColor={dark ? "#72C4AC" : "#B3E1D4"}
                  stopOpacity="0.55"
                />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.08" />
              </LinearGradient>
            </Defs>
            <Path
              d={
                layer
                  ? "M-80 150 C420 50 80 470 430 520 S300 850 600 980 L600 1100 L-80 1100Z"
                  : "M560 50 C60 160 620 350 180 550 S420 800 -60 1000 L-80 1100 L560 1100Z"
              }
              fill={`url(#${id}wave${layer})`}
              stroke={dark ? "#C1F2DB" : "#FFFFFF"}
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <Path
              d={
                layer
                  ? "M-80 175 C390 75 60 500 420 545 S270 875 580 1000"
                  : "M560 75 C90 185 640 375 200 575 S440 825 -40 1025"
              }
              fill="none"
              stroke={dark ? "#C1F2DB" : "#FFFFFF"}
              strokeOpacity="0.24"
              strokeWidth="1"
            />
          </Svg>
        </Animated.View>
      ))}
    </View>
  );
}
