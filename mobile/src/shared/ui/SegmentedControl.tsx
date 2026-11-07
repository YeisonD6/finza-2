import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { AppText } from "./AppText";
import { DecorativeIcon } from "./DecorativeIcon";
import { tapLight } from "../theme/haptics";
import { fontFamily } from "../theme/fonts";
import { colors, radii, shadows } from "../theme/tokens";

/**
 * Lighter than a row of solid buttons: a sage track with the chosen segment raised in
 * white. The choice never relies on fill alone — it carries a forest border (10.6:1),
 * a check mark and bold text.
 */
export function SegmentedControl<T extends string>({
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
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: colors.sage100,
        borderRadius: radii.control,
        padding: 4,
        gap: 4,
      }}
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
            style={({ pressed }) => [
              {
                flexGrow: 1,
                flexBasis: 80,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingHorizontal: 12,
                borderRadius: radii.md,
                borderWidth: selected || focused === option.value ? 1.5 : 0,
                borderColor: colors.forest700,
                backgroundColor: selected
                  ? colors.surface
                  : pressed
                    ? "rgba(30,70,52,0.06)"
                    : colors.transparent,
                opacity: disabled ? 0.6 : 1,
              },
              selected && shadows.card,
            ]}
          >
            {selected ? (
              <DecorativeIcon
                icon={Check}
                size={16}
                strokeWidth={2.25}
                color={colors.forest700}
              />
            ) : null}
            <AppText
              variant="label"
              style={{
                color: selected ? colors.forest700 : colors.inkMuted,
                fontFamily: selected ? fontFamily.heading : undefined,
                fontWeight: selected ? "700" : "600",
                textAlign: "center",
                flexShrink: 1,
              }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
