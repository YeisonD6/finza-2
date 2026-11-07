import { useEffect, useRef, type ReactNode } from "react";
import { Animated } from "react-native";
import {
  durations,
  easeOut,
  useReducedMotion,
} from "../../../shared/theme/motion";
export function MonthTransition({
  month,
  children,
}: {
  month: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: reduced ? durations.reducedMonth : durations.month,
      easing: easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [month, reduced, value]);
  return (
    <Animated.View
      style={{
        gap: 8,
        opacity: value,
        transform: reduced
          ? []
          : [
              {
                translateY: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
      }}
    >
      {children}
    </Animated.View>
  );
}
