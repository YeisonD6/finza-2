import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import { AppText } from "./AppText";
import { DecorativeIcon } from "./DecorativeIcon";
import { tapLight } from "../theme/haptics";
import { fontFamily } from "../theme/fonts";
import { colors, radii, shadows, useThemeRefresh } from "../theme/tokens";

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
  quiet = false,
}: {
  /** Separate glass pills with no track, for secondary choices (Registrar's date). */
  quiet?: boolean;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange(value: T): void;
  disabled?: boolean;
  label: string;
}) {
  useThemeRefresh();
  const [focused, setFocused] = useState<T | null>(null);
  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: quiet ? colors.transparent : colors.sage100,
        borderRadius: radii.control,
        padding: quiet ? 0 : 4,
        gap: quiet ? 8 : 4,
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
                flexGrow: quiet ? 0 : 1,
                flexBasis: quiet ? "auto" : 80,
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingHorizontal: quiet ? 16 : 12,
                borderRadius: quiet ? 22 : radii.md,
                borderWidth:
                  selected || focused === option.value ? 1.5 : quiet ? 1 : 0,
                borderColor:
                  selected || focused === option.value
                    ? colors.accent
                    : colors.glassBorder,
                backgroundColor: selected
                  ? quiet
                    ? colors.sage100
                    : colors.surface
                  : pressed
                    ? colors.sage100
                    : quiet
                      ? colors.glass
                      : colors.transparent,
                opacity: disabled ? 0.6 : 1,
              },
              selected && !quiet && shadows.card,
            ]}
          >
            {selected ? (
              <DecorativeIcon
                icon={Check}
                size={16}
                strokeWidth={2.25}
                color={colors.accent}
              />
            ) : null}
            <AppText
              variant="label"
              style={{
                color: selected ? colors.accent : colors.inkMuted,
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
