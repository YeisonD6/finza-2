import type { LucideIcon, LucideProps } from "lucide-react-native";
import { Platform, View } from "react-native";
/** The SVG receives no native-only accessibility prop on web. */
export function DecorativeIcon({
  icon: Icon,
  ...props
}: LucideProps & { icon: LucideIcon }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden={true}
    >
      <Icon
        size={24}
        strokeWidth={1.75}
        {...props}
        {...(Platform.OS === "web" ? {} : { accessible: false })}
      />
    </View>
  );
}
