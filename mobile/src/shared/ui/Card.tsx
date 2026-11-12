import { type ViewProps } from "react-native";
import { spacing } from "../theme/tokens";
import { GlassSurface } from "./GlassSurface";
export function Card({ style, ...props }: ViewProps) {
  return (
    <GlassSurface
      {...props}
      style={[
        {
          padding: spacing.xl,
          gap: spacing.md,
        },
        style,
      ]}
    />
  );
}
