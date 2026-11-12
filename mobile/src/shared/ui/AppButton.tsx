import { DecorativeIcon } from "./DecorativeIcon";
import { useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  type PressableProps,
} from "react-native";
import { Check } from "lucide-react-native";
import { AppText } from "./AppText";
import { styles } from "./styles";
import { colors, useThemeRefresh } from "../theme/tokens";
import { durations, easeOut, useReducedMotion } from "../theme/motion";
import { tapLight } from "../theme/haptics";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function AppButton({
  title,
  onPress,
  busy = false,
  disabled = false,
  selected,
  accessibilityState,
  style,
  onFocus,
  onBlur,
  variant = "primary",
  icon,
  dangerGhost = false,
  size = "md",
  ...props
}: Omit<PressableProps, "children" | "onPress"> & {
  title: string;
  onPress(): void;
  busy?: boolean;
  selected?: boolean;
  variant?: ButtonVariant;
  icon?: ReactNode;
  dangerGhost?: boolean;
  size?: "sm" | "md";
}) {
  useThemeRefresh();
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const working = busy || accessibilityState?.busy === true,
    active = selected ?? accessibilityState?.selected,
    blocked = disabled || working || accessibilityState?.disabled === true;
  const solid =
    active || variant === "primary" || (variant === "danger" && !dangerGhost);
  function animate(toValue: number, duration: number) {
    if (!reduced)
      Animated.timing(scale, {
        toValue,
        duration,
        easing: easeOut,
        useNativeDriver: true,
      }).start();
  }
  return (
    <Pressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? "button"}
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{
        ...accessibilityState,
        disabled: blocked,
        busy: working,
        selected: active,
      }}
      disabled={blocked}
      onPress={() => {
        if (!blocked) {
          void tapLight();
          onPress();
        }
      }}
      onPressIn={(e) => {
        animate(0.97, durations.press);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1, durations.release);
        props.onPressOut?.(e);
      }}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={(state) => [
        styles.button,
        {
          padding: size === "sm" ? 8 : 12,
          backgroundColor: active
            ? colors.forest700
            : variant === "danger"
              ? dangerGhost
                ? colors.transparent
                : colors.dangerFill
              : variant === "primary"
                ? state.pressed
                  ? colors.forest900
                  : colors.forest700
                : variant === "secondary"
                  ? colors.sage100
                  : colors.transparent,
          // Busy keeps full strength: the spinner says "working", not "unavailable".
          opacity: blocked && !working ? 0.6 : 1,
        },
        focused && styles.buttonFocused,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flexShrink: 1,
          transform: [{ scale: reduced ? 1 : scale }],
        }}
      >
        {working ? (
          <ActivityIndicator
            size="small"
            color={solid ? colors.onForest : colors.accent}
          />
        ) : active ? (
          <DecorativeIcon
            icon={Check}
            size={16}
            strokeWidth={2}
            color={colors.onForest}
          />
        ) : (
          icon
        )}
        {title || working ? (
          <AppText
            variant="label"
            style={{
              color: solid
                ? colors.onForest
                : variant === "danger"
                  ? colors.danger
                  : colors.accent,
              flexShrink: 1,
              textAlign: "center",
              textDecorationLine: focused ? "underline" : "none",
            }}
          >
            {title || "Procesando…"}
          </AppText>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
