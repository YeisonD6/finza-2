import { DecorativeIcon } from "./DecorativeIcon";
import type { ComponentProps } from "react";
import { AppButton } from "./AppButton";
import { categoryIcon } from "./categoryIcon";
import { categoryTone } from "./categoryTheme";
import { colors } from "../theme/tokens";
export function CategoryChip({
  name,
  isSystem = true,
  selected,
  style,
  ...props
}: Omit<ComponentProps<typeof AppButton>, "title" | "icon"> & {
  name: string;
  isSystem?: boolean;
}) {
  const Icon = categoryIcon(name, isSystem);
  const tone = categoryTone(name, isSystem);
  return (
    <AppButton
      {...props}
      title={name}
      selected={selected}
      accessibilityRole="radio"
      variant={selected ? "primary" : "secondary"}
      style={(state) => [
        selected
          ? null
          : {
              backgroundColor: state.pressed ? tone.tint : colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            },
        typeof style === "function" ? style(state) : style,
      ]}
      icon={
        <DecorativeIcon
          icon={Icon}
          size={20}
          strokeWidth={1.75}
          color={selected ? colors.onForest : tone.ink}
        />
      }
    />
  );
}
