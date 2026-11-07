import { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  House,
  ArrowLeftRight,
  Plus,
  Sprout,
  UserRound,
} from "lucide-react-native";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { fontFamily } from "../theme/fonts";
import { colors, radii, shadows } from "../theme/tokens";
export const tabItems = [
  { name: "index", label: "Inicio", icon: House },
  { name: "movements", label: "Movimientos", icon: ArrowLeftRight },
  { name: "goals", label: "Metas", icon: Sprout },
  { name: "profile", label: "Perfil", icon: UserRound },
] as const;
export function TabBar({
  active,
  onTab,
  onRegister,
}: {
  active: string;
  onTab(name: string): void;
  onRegister(): void;
}) {
  const [focused, setFocused] = useState("");
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.2;
  const inset = useSafeAreaInsets();
  function tabs(items: readonly (typeof tabItems)[number][]) {
    return (
      <View style={{ flex: 1, flexDirection: largeText ? "column" : "row" }}>
        {items.map(({ name, label, icon: Icon }) => (
          <Pressable
            key={name}
            onFocus={() => setFocused(name)}
            onBlur={() => setFocused("")}
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === name }}
            onPress={() => onTab(name)}
            style={({ pressed }) => ({
              minWidth: 48,
              minHeight: 48,
              padding: 4,
              flexGrow: largeText ? 0 : 1,
              flexBasis: largeText ? "auto" : 0,
              flexShrink: 0,
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.7 : 1,
              borderWidth: 2,
              borderColor:
                focused === name ? colors.forest700 : colors.transparent,
            })}
          >
            <View
              style={{
                width: 64,
                height: 32,
                // Half the height: Android drops oversized radii (999) when the fill changes.
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor:
                  active === name ? colors.sage100 : colors.transparent,
              }}
            >
              <Icon
                size={20}
                strokeWidth={active === name ? 2 : 1.75}
                color={active === name ? colors.forest700 : colors.inkMuted}
                accessible={false}
              />
            </View>
            <AppText
              variant="caption"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{
                textAlign: "center",
                color: active === name ? colors.forest700 : colors.inkMuted,
                fontSize: 12,
                lineHeight: 16,
                alignSelf: "stretch",
                fontFamily:
                  active === name ? fontFamily.heading : fontFamily.caption,
                fontWeight: active === name ? "700" : "500",
              }}
            >
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: Math.max(inset.bottom, 8),
        paddingHorizontal: 4,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderColor: colors.border,
      }}
    >
      {tabs(tabItems.slice(0, 2))}
      <IconButton
        icon={Plus}
        accessibilityLabel="Registrar movimiento"
        variant="primary"
        color={colors.onForest}
        onPress={onRegister}
        style={[{ borderRadius: radii.pill, margin: 4 }, shadows.floating]}
      />
      {tabs(tabItems.slice(2))}
    </View>
  );
}
