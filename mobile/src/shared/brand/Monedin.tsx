import { useEffect, useRef, type ReactNode } from "react";
import { Image, View } from "react-native";
import Animated, {
  Easing,
  SensorType,
  cancelAnimation,
  useAnimatedSensor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { curves, durations, getColorScheme } from "../theme/tokens";
import { useReducedMotion } from "../theme/motion";
import { success } from "../theme/haptics";

const sizes = { sm: 56, md: 120, hero: 200 } as const;
/** monedin@3x.png is 761 × 768; the eyes below are measured on that file. */
const SOURCE = { width: 761, height: 768 };
const EYES = [
  { x: 253, y: 319, width: 42, height: 52 },
  { x: 461, y: 318, width: 50, height: 52 },
];
/** Fur around the eyes, sampled from the artwork, so a closed lid reads as skin. */
const FACE = "#D7C6BC";
const easeOut = Easing.bezier(...curves.easeOut);
const breathe = Easing.inOut(Easing.sin);
const springy = { damping: 14, stiffness: 160 };

/**
 * Monedin as a 2.5D rig over the original artwork (no redrawn mascot): the body
 * breathes from its feet, the lids blink over the painted eyes, a contact shadow
 * answers the breath, and on larger sizes the figure leans with the phone (gravity
 * sensor, read on the UI thread). Reduce Motion leaves it still; «appear» only fades.
 */
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
  const side = sizes[size];
  const live = !reduced && motion !== "none";
  const breath = useSharedValue(0);
  const lid = useSharedValue(0);
  const enter = useSharedValue(motion === "appear" ? 0 : 1);
  const hop = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const celebrated = useRef(false);
  const appeared = useRef(false);

  useEffect(() => {
    if (motion === "celebrate" && !celebrated.current) {
      celebrated.current = true;
      if (haptic) void success();
    }
  }, [motion, haptic]);

  useEffect(() => {
    if (motion !== "appear") {
      enter.value = 1;
      return;
    }
    if (appeared.current) return;
    appeared.current = true;
    enter.value = withTiming(1, {
      duration: reduced ? 200 : durations.entrance,
      easing: easeOut,
    });
  }, [motion, reduced, enter]);

  useEffect(() => {
    breath.value = 0;
    lid.value = 0;
    hop.value = 0;
    wiggle.value = 0;
    if (!live) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (motion === "idle") {
      breath.value = withRepeat(
        withTiming(1, { duration: durations.breath, easing: breathe }),
        -1,
        true,
      );
      // Irregular blinks feel alive; a strict interval reads as a machine.
      const blink = () => {
        const close = withTiming(1, { duration: 70 });
        const open = withTiming(0, { duration: 110 });
        lid.value =
          Math.random() < 0.2
            ? withSequence(close, open, close, open)
            : withSequence(close, open);
        timer = setTimeout(blink, 2800 + Math.random() * 2600);
      };
      timer = setTimeout(blink, 1200 + Math.random() * 1200);
    }
    if (motion === "celebrate") {
      hop.value = withSequence(withSpring(1, springy), withSpring(0, springy));
      wiggle.value = withSequence(
        withTiming(-1, { duration: 120, easing: easeOut }),
        withTiming(1, { duration: 160, easing: easeOut }),
        withTiming(0, { duration: 140, easing: easeOut }),
      );
    }
    return () => {
      if (timer) clearTimeout(timer);
      cancelAnimation(breath);
      cancelAnimation(lid);
      cancelAnimation(hop);
      cancelAnimation(wiggle);
    };
  }, [live, motion, breath, lid, hop, wiggle]);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: -breath.value * side * 0.012 - hop.value * 12 },
      { rotate: `${wiggle.value * 6}deg` },
      { scaleX: 1 - breath.value * 0.006 },
      { scaleY: 1 + breath.value * 0.014 },
      {
        scale: motion === "appear" && !reduced ? 0.94 + enter.value * 0.06 : 1,
      },
    ],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: enter.value * (1 - breath.value * 0.18 - hop.value * 0.45),
    transform: [{ scaleX: 1 - breath.value * 0.05 - hop.value * 0.25 }],
  }));
  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: lid.value }],
  }));

  const scale = side / SOURCE.height;
  const offsetX = (side - SOURCE.width * scale) / 2;
  const figure = (
    <Animated.View
      style={[
        { width: side, height: side, transformOrigin: "50% 92%" },
        bodyStyle,
      ]}
    >
      <Image
        source={require("../../../assets/brand/monedin.png")}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ width: side, height: side }}
        resizeMode="contain"
      />
      {live && motion === "idle"
        ? EYES.map((eye, index) => (
            <Animated.View
              key={index}
              testID="monedin-lid"
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: offsetX + (eye.x - 4) * scale,
                  top: (eye.y - 5) * scale,
                  width: (eye.width + 8) * scale,
                  height: (eye.height + 9) * scale,
                  borderRadius: (eye.width + 8) * scale,
                  backgroundColor: FACE,
                  transformOrigin: "50% 0%",
                },
                lidStyle,
              ]}
            />
          ))
        : null}
    </Animated.View>
  );
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: side, height: side }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: side * 0.24,
            right: side * 0.24,
            bottom: side * 0.03,
            height: side * 0.07,
            borderRadius: side,
            backgroundColor:
              getColorScheme() === "dark"
                ? "rgba(0,0,0,0.5)"
                : "rgba(20,52,38,0.16)",
          },
          shadowStyle,
        ]}
      />
      {live && motion === "idle" && size !== "sm" ? (
        <Lean depth={size === "hero" ? 8 : 5}>{figure}</Lean>
      ) : (
        figure
      )}
    </View>
  );
}

/**
 * Leans the figure with the phone. Gravity is read and smoothed on the UI thread, so
 * the JS thread never sees sensor events; mounted only while Monedin is idle and
 * motion is allowed, which also stops the sensor otherwise.
 */
function Lean({ depth, children }: { depth: number; children: ReactNode }) {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, { interval: 32 });
  const soft = { damping: 20, stiffness: 90 };
  // One derived value per axis: a spring only animates when it is the returned value.
  const leanY = useDerivedValue(() =>
    withSpring(
      Math.max(-depth, Math.min(depth, -gravity.sensor.value.x * 0.9)),
      soft,
    ),
  );
  // Phones are usually held ~30° from vertical (z ≈ 5 m/s²); lean from there.
  const leanX = useDerivedValue(() =>
    withSpring(
      Math.max(-depth, Math.min(depth, (gravity.sensor.value.z - 5) * 0.6)),
      soft,
    ),
  );
  const style = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateX: `${leanX.value}deg` },
      { rotateY: `${leanY.value}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ transformOrigin: "50% 92%" }, style]}>
      {children}
    </Animated.View>
  );
}
