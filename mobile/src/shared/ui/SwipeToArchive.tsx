import { useEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { Archive } from "lucide-react-native";
import { AppText } from "./AppText";
import { DecorativeIcon } from "./DecorativeIcon";
import { tapLight } from "../theme/haptics";
import { useReducedMotion } from "../theme/motion";
import { colors, curves } from "../theme/tokens";

/** Distance (pt) past which letting go asks to archive. */
export const ARCHIVE_THRESHOLD = 96;
const settle = { damping: 22, stiffness: 260, mass: 0.9 };
const easeOut = Easing.bezier(...curves.easeOut);

/**
 * Swipe a row left to archive it (Week 10). The row follows the finger with
 * resistance past the threshold; crossing it gives a light tap and fills the reveal;
 * letting go beyond it asks for confirmation (`onArchive`), short of it springs back.
 * Vertical scrolling wins over small horizontal drift. The same action stays
 * available without the gesture: the row's «Archivar» accessibility action and the
 * edit screen.
 */
export function SwipeToArchive({
  onArchive,
  disabled = false,
  testID,
  children,
}: {
  onArchive(): void;
  disabled?: boolean;
  /** Names the pan gesture for Gesture Handler's test utilities. */
  testID?: string;
  /**
   * The row. As a function it receives `guard`, which wraps the row's own press so a
   * swipe's release is never also read as a tap (web keeps the JS press alive).
   */
  children:
    ReactNode | ((guard: (press: () => void) => () => void) => ReactNode);
}) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const armed = useSharedValue(false);
  const [revealing, setRevealing] = useState(false);
  const archive = useRef(onArchive);
  archive.current = onArchive;
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(settleTimer.current), []);
  const swipedAt = useRef(0);
  const crossed = () => void tapLight();
  const begin = () => {
    clearTimeout(settleTimer.current);
    swipedAt.current = Date.now();
    setRevealing(true);
  };
  const guard = (press: () => void) => () => {
    if (Date.now() - swipedAt.current > 400) press();
  };
  const release = (commit: boolean) => {
    // Keep the reveal (and the row untappable) until the row is back, so the
    // release never lands as a tap on the row underneath.
    swipedAt.current = Date.now();
    settleTimer.current = setTimeout(() => setRevealing(false), 260);
    if (commit) archive.current();
  };
  const pan = usePanGesture({
    testID,
    enabled: !disabled,
    // Leftward only, and only once the finger clearly moves sideways.
    activeOffsetX: [-14, 10000],
    failOffsetY: [-12, 12],
    onActivate: () => {
      "worklet";
      scheduleOnRN(begin);
    },
    onUpdate: (event) => {
      "worklet";
      const raw = Math.min(0, event.translationX);
      // Rubber band beyond the threshold so the row never leaves the screen.
      const over = -raw - ARCHIVE_THRESHOLD;
      offset.value = over > 0 ? -ARCHIVE_THRESHOLD - over * 0.35 : raw;
      const now = -offset.value >= ARCHIVE_THRESHOLD;
      if (now !== armed.value) {
        armed.value = now;
        if (now) scheduleOnRN(crossed);
      }
    },
    onDeactivate: (event) => {
      "worklet";
      // A quick flick counts even if it ends just short of the threshold.
      const commit =
        !event.canceled &&
        (armed.value ||
          (event.velocityX < -900 && -offset.value > ARCHIVE_THRESHOLD / 2));
      armed.value = false;
      offset.value = reduced
        ? withTiming(0, { duration: 150, easing: easeOut })
        : withSpring(0, settle);
      scheduleOnRN(release, commit);
    },
  });
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  const revealStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, -offset.value / ARCHIVE_THRESHOLD);
    return {
      opacity: progress,
      transform: [{ scale: 0.85 + progress * 0.15 }],
    };
  });
  return (
    <View>
      {revealing ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 0,
            right: 0,
            borderRadius: 16,
            backgroundColor: colors.dangerFill,
            alignItems: "flex-end",
            justifyContent: "center",
            paddingRight: 20,
          }}
        >
          <Animated.View
            style={[
              { flexDirection: "row", alignItems: "center", gap: 8 },
              revealStyle,
            ]}
          >
            <DecorativeIcon
              icon={Archive}
              size={20}
              strokeWidth={2}
              color={colors.onForest}
            />
            <AppText variant="label" style={{ color: colors.onForest }}>
              Archivar
            </AppText>
          </Animated.View>
        </View>
      ) : null}
      <GestureDetector gesture={pan}>
        <Animated.View
          pointerEvents={revealing ? "none" : "auto"}
          style={[
            // Opaque while moving so the reveal never shows through the row.
            revealing && { backgroundColor: colors.surface },
            rowStyle,
          ]}
        >
          {typeof children === "function" ? children(guard) : children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
