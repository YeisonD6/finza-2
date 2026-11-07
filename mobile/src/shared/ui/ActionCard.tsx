import { useState, type ReactNode } from "react";
import { Pressable } from "react-native";
import { Card } from "./Card";
import { colors, radii } from "../theme/tokens";
import { tapLight } from "../theme/haptics";
/** A single focus target with a complete spoken summary and a visible action. */
export function ActionCard({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress(): void;
  children: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={() => {
        void tapLight();
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: radii.lg,
        borderWidth: 2,
        borderColor: focused ? colors.forest700 : colors.transparent,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Card>{children}</Card>
    </Pressable>
  );
}
