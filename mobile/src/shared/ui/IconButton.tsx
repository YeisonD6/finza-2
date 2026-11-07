import { DecorativeIcon } from "./DecorativeIcon";
import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react-native";
import { AppButton } from "./AppButton";
import { colors } from "../theme/tokens";
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  color = colors.forest700,
  style,
  ...props
}: Omit<ComponentProps<typeof AppButton>, "title" | "icon"> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  color?: string;
}) {
  return (
    <AppButton
      variant="ghost"
      {...props}
      style={(state) => [
        { width: 48, height: 48, padding: 0 },
        typeof style === "function" ? style(state) : style,
      ]}
      title=""
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      icon={
        <DecorativeIcon
          icon={Icon}
          size={24}
          strokeWidth={1.75}
          color={color}
        />
      }
    />
  );
}
