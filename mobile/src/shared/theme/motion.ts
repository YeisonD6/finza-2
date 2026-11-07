import { useEffect, useState } from "react";
import { AccessibilityInfo, Easing } from "react-native";
import { curves } from "./tokens";
export { durations } from "./tokens";
export const easeOut = Easing.bezier(...curves.easeOut);
export const easeInOut = Easing.bezier(...curves.easeInOut);
export function useReducedMotion() {
  // Start static until the system preference is known.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let live = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReduced(value);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live && !changed) setReduced(value);
      })
      .catch(() => {});
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  return reduced;
}
