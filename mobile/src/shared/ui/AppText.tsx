import { forwardRef, type ElementRef } from "react";
import { Text, type TextProps } from "react-native";
import { colors, typography, useThemeRefresh } from "../theme/tokens";
import { fontFamily } from "../theme/fonts";
export type TextVariant = keyof typeof typography;
export const AppText = forwardRef<
  ElementRef<typeof Text>,
  TextProps & { variant?: TextVariant }
>(function AppText({ variant = "body", style, ...props }, ref) {
  useThemeRefresh();
  return (
    <Text
      {...props}
      ref={ref}
      allowFontScaling
      style={[
        typography[variant],
        { fontFamily: fontFamily[variant], color: colors.ink, flexShrink: 0 },
        style,
      ]}
    />
  );
});
