import { DecorativeIcon } from "./DecorativeIcon";
import { createContext, useContext, useState } from "react";
import { Pressable, View } from "react-native";
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
import { GlassSurface } from "./Glass";
import { fontFamily } from "../theme/fonts";
import { colors, useThemeRefresh } from "../theme/tokens";
export const tabItems = [
  { name: "index", label: "Inicio", icon: House },
  { name: "movements", label: "Movimientos", icon: ArrowLeftRight },
  { name: "goals", label: "Metas", icon: Sprout },
  { name: "profile", label: "Perfil", icon: UserRound },
] as const;
const BAR_HEIGHT = 64;
/** Bottom space a tab screen leaves so its last row clears the floating bar. */
export function tabBarSpace(bottomInset: number) {
  return BAR_HEIGHT + Math.max(bottomInset, 12) + 28;
}
export const TabBarSpaceContext = createContext(0);
export function useTabBarSpace() {
  return useContext(TabBarSpaceContext);
}
/**
 * Floating glass bar. Only the selected tab shows its label (icon + word in a tinted
 * pill), so the state never depends on colour alone; the others are icons with
 * spoken names. Registering sits in the middle as the single primary action.
 */
export function TabBar({
  active,
  onTab,
  onRegister,
}: {
  active: string;
  onTab(name: string): void;
  onRegister(): void;
}) {
  useThemeRefresh();
  const [focused, setFocused] = useState("");
  const inset = useSafeAreaInsets();
  function tab({ name, label, icon: Icon }: (typeof tabItems)[number]) {
    const selected = active === name;
    return (
      <Pressable
        key={name}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused("")}
        accessibilityLabel={label}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onTab(name)}
        style={({ pressed }) => ({
          minWidth: 48,
          minHeight: 48,
          flexGrow: selected ? 0 : 1,
          flexShrink: selected ? 1 : 0,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            height: 44,
            paddingHorizontal: selected ? 14 : 10,
            // Half the height: Android drops oversized radii when the fill changes.
            borderRadius: 22,
            borderWidth: 2,
            borderColor: focused === name ? colors.accent : colors.transparent,
            backgroundColor: selected ? colors.sage100 : colors.transparent,
            maxWidth: "100%",
          }}
        >
          <DecorativeIcon
            icon={Icon}
            size={22}
            strokeWidth={selected ? 2.25 : 1.75}
            color={selected ? colors.accent : colors.inkMuted}
          />
          {selected ? (
            <AppText
              variant="caption"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.3}
              style={{
                flexShrink: 1,
                color: colors.accent,
                fontSize: 12,
                lineHeight: 16,
                letterSpacing: -0.2,
                fontFamily: fontFamily.heading,
                fontWeight: "700",
              }}
            >
              {label}
            </AppText>
          ) : null}
        </View>
      </Pressable>
    );
  }
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: Math.max(inset.bottom, 12),
        borderRadius: BAR_HEIGHT / 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 8,
      }}
    >
      <GlassSurface
        style={{
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
        }}
      >
        {tabItems.slice(0, 2).map(tab)}
        <IconButton
          icon={Plus}
          accessibilityLabel="Registrar movimiento"
          variant="primary"
          color={colors.onForest}
          onPress={onRegister}
          style={{ borderRadius: 24, marginHorizontal: 2 }}
        />
        {tabItems.slice(2).map(tab)}
      </GlassSurface>
    </View>
  );
}
