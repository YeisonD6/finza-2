import { View } from "react-native";
import { AppButton } from "./AppButton";
import { colors, radii } from "../theme/tokens";
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
  return (
    <View
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: colors.sage100,
        borderRadius: radii.md,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => (
        <AppButton
          key={option.value}
          title={option.label}
          accessibilityRole="tab"
          selected={option.value === value}
          variant={option.value === value ? "primary" : "ghost"}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={{ flexGrow: 1, flexBasis: 80 }}
        />
      ))}
    </View>
  );
}
