import { useState } from "react";
import { Pressable, Text, type PressableProps } from "react-native";
import { styles } from "./styles";

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
  ...props
}: Omit<PressableProps, "children" | "onPress"> & {
  title: string;
  onPress(): void;
  busy?: boolean;
  selected?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const working = busy || accessibilityState?.busy === true;
  const active = selected ?? accessibilityState?.selected;
  const blocked = disabled || working || accessibilityState?.disabled === true;
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
        if (!blocked) onPress();
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={(state) => [
        styles.button,
        state.pressed && styles.buttonPressed,
        blocked && styles.buttonDisabled,
        focused && styles.buttonFocused,
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          focused && { textDecorationLine: "underline" },
        ]}
      >
        {working ? "Procesando…" : title}
        {active ? " ✓ Seleccionado" : ""}
      </Text>
    </Pressable>
  );
}
