import { useEffect, useRef } from "react";
import { Animated, Image } from "react-native";
import { durations, easeInOut, useReducedMotion } from "../theme/motion";
import { success } from "../theme/haptics";
const sizes = { sm: 56, md: 120, auth: 156, hero: 200 } as const;
export function Monedin({
  size = "md",
  motion = "none",
  haptic = true,
}: {
  size?: keyof typeof sizes;
  motion?: "none" | "idle" | "appear" | "celebrate";
  haptic?: boolean;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const celebrated = useRef(false);
  useEffect(() => {
    value.setValue(0);
    if (motion === "celebrate" && !celebrated.current) {
      celebrated.current = true;
      if (haptic) void success();
    }
    if (reduced || motion === "none") return;
    const animation =
      motion === "idle"
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(value, {
                toValue: 1,
                duration: durations.idleCycle / 2,
                easing: easeInOut,
                isInteraction: false,
                useNativeDriver: true,
              }),
              Animated.timing(value, {
                toValue: 0,
                duration: durations.idleCycle / 2,
                easing: easeInOut,
                isInteraction: false,
                useNativeDriver: true,
              }),
            ]),
          )
        : motion === "appear"
          ? Animated.spring(value, {
              toValue: 1,
              damping: 14,
              stiffness: 160,
              useNativeDriver: true,
            })
          : Animated.sequence([
              Animated.spring(value, {
                toValue: 1,
                damping: 14,
                stiffness: 160,
                useNativeDriver: true,
              }),
              Animated.spring(value, {
                toValue: 0,
                damping: 14,
                stiffness: 160,
                useNativeDriver: true,
              }),
            ]);
    animation.start();
    return () => animation.stop();
  }, [motion, reduced, value, haptic]);
  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: sizes[size],
        height: sizes[size],
        opacity: motion === "appear" && !reduced ? value : 1,
        transform: reduced
          ? []
          : motion === "appear"
            ? [
                {
                  scale: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ]
            : [
                {
                  translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, motion === "celebrate" ? -12 : -7],
                  }),
                },
                {
                  rotate: value.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [
                      "0deg",
                      motion === "celebrate" ? "-6deg" : "0deg",
                      motion === "celebrate" ? "6deg" : "0deg",
                    ],
                  }),
                },
              ],
      }}
    >
      <Image
        source={require("../../../assets/brand/monedin.png")}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ width: sizes[size], height: sizes[size] }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
