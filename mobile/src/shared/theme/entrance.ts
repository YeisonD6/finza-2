import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { durations } from "./tokens";
import { easeOut, useReducedMotion } from "./motion";

/**
 * One authored entrance per screen: blocks rise 12 dp and fade in with a 40 ms
 * stagger, ending fully visible. Reduce Motion keeps only a short fade.
 * Use the returned style factory on up to ~6 top-level blocks.
 */
export function useEntrance(count: number, { delay = 0 } = {}) {
  const reduced = useReducedMotion();
  const values = useRef(
    Array.from({ length: count }, () => new Animated.Value(0)),
  ).current;
  useEffect(() => {
    const animations = values.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: reduced ? 150 : durations.entrance,
        delay: delay + (reduced ? 0 : index * durations.stagger),
        easing: easeOut,
        useNativeDriver: true,
      }),
    );
    const all = Animated.parallel(animations);
    all.start();
    return () => all.stop();
  }, [values, reduced, delay]);
  return (index: number) => {
    const value = values[Math.min(index, values.length - 1)];
    return {
      opacity: value,
      transform: reduced
        ? []
        : [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
    };
  };
}
