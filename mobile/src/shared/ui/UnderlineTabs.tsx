import { useState } from "react";
import { Pressable, View } from "react-native";
import { AppText } from "./AppText";
import { tapLight } from "../theme/haptics";
import { fontFamily } from "../theme/fonts";
import { colors } from "../theme/tokens";

/**
 * Two or three words, the chosen one in ink with a 2 px underline. Quieter than a
 * segmented track; the choice is carried by underline and weight, never by colour alone.
 */
export function UnderlineTabs<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(value: T): void;
  disabled?: boolean;
  label: string;
}) {
  const [focused, setFocused] = useState<T | null>(null);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onFocus={() => setFocused(option.value)}
            onBlur={() => setFocused(null)}
            onPress={() => {
              if (selected) return;
              void tapLight();
              onChange(option.value);
            }}
            style={({ pressed }) => ({
              minHeight: 44,
              minWidth: 48,
              paddingHorizontal: 10,
              justifyContent: "center",
              borderRadius: 12,
              borderWidth: 2,
              borderColor:
                focused === option.value ? colors.accent : colors.transparent,
              opacity: disabled ? 0.6 : pressed ? 0.7 : 1,
            })}
          >
            <AppText
              style={{
                fontSize: 17,
                lineHeight: 24,
                fontFamily: selected ? fontFamily.heading : fontFamily.body,
                fontWeight: selected ? "700" : "500",
                color: selected ? colors.ink : colors.inkMuted,
                textAlign: "center",
              }}
            >
              {option.label}
            </AppText>
            <View
              style={{
                height: 2,
                borderRadius: 1,
                marginTop: 2,
                backgroundColor: selected ? colors.ink : colors.transparent,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
