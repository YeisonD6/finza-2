import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import { store, type RootState } from "../core/store";
import { useAppFonts } from "../shared/theme/fonts";
import {
  applyColorScheme,
  colors,
  useThemeRefresh,
} from "../shared/theme/tokens";
import { SessionProvider } from "../features/auth/SessionProvider";
import { FinancialProvider } from "../features/dashboard/FinancialProvider";
import { useWidgetSync } from "../features/widgets/useWidgetSync";
void SplashScreen.preventAutoHideAsync().catch(() => {});
/**
 * Follows the system light/dark setting. The palette is swapped in place and every
 * component that reads it re-renders through `useThemeRefresh`, so a theme change
 * keeps navigation, open forms and the selected month. The first render applies the
 * scheme right away; later changes go through a layout effect so no component is
 * updated while another one renders.
 */
function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const first = useRef(true);
  if (first.current) {
    first.current = false;
    applyColorScheme(scheme);
  }
  useLayoutEffect(() => {
    applyColorScheme(scheme);
  }, [scheme]);
  useThemeRefresh();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ground }}>
      {children}
    </GestureHandlerRootView>
  );
}
function Navigation() {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  const [fonts, error] = useAppFonts();
  useWidgetSync();
  useEffect(() => {
    if ((fonts || error) && !loading)
      void SplashScreen.hideAsync().catch(() => {});
  }, [fonts, error, loading]);
  if ((!fonts && !error) || loading) return null;
  return (
    <ThemeRoot>
      <FinancialProvider key={profile?.id ?? "guest"}>
        {/* Status-bar icons follow the scheme: dark on Niebla, light on Bosque nocturno. */}
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="movement/new"
            options={{ presentation: "modal", gestureEnabled: false }}
          />
          <Stack.Screen
            name="movement/[id]"
            options={{ presentation: "modal", gestureEnabled: false }}
          />
          <Stack.Screen
            name="goal/new"
            options={{ presentation: "modal", gestureEnabled: false }}
          />
          <Stack.Screen
            name="budgets/[categoryId]"
            options={{ presentation: "modal", gestureEnabled: false }}
          />
        </Stack>
      </FinancialProvider>
    </ThemeRoot>
  );
}
export default function RootLayout() {
  return (
    <Provider store={store}>
      <SessionProvider>
        <Navigation />
      </SessionProvider>
    </Provider>
  );
}
