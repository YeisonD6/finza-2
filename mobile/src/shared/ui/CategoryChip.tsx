import type { ComponentProps } from "react";
import { AppButton } from "./AppButton";
import { categoryIcon } from "./categoryIcon";
import { colors } from "../theme/tokens";
export function CategoryChip({
  name,
  isSystem = true,
  selected,
  ...props
}: Omit<ComponentProps<typeof AppButton>, "title" | "icon"> & {
  name: string;
  isSystem?: boolean;
}) {
  const Icon = categoryIcon(name, isSystem);
  return (
    <AppButton
      {...props}
      title={name}
      selected={selected}
      accessibilityRole="radio"
      variant={selected ? "primary" : "secondary"}
      icon={
        <Icon
          size={20}
          strokeWidth={1.75}
          color={selected ? colors.onForest : colors.forest700}
          accessible={false}
        />
      }
    />
  );
}
