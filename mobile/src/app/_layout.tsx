import { useEffect, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import { store, type RootState } from "../core/store";
import { useAppFonts } from "../shared/theme/fonts";
import { applyColorScheme, colors } from "../shared/theme/tokens";
import { SessionProvider } from "../features/auth/SessionProvider";
import { FinancialProvider } from "../features/dashboard/FinancialProvider";
import { useWidgetSync } from "../features/widgets/useWidgetSync";
void SplashScreen.preventAutoHideAsync().catch(() => {});
/**
 * Follows the system light/dark setting. The palette is swapped in place and the
 * subtree remounts under a new key so every inline style re-reads it.
 */
function ThemeRoot({ children }: { children: ReactNode }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  applyColorScheme(scheme);
  return (
    <View key={scheme} style={{ flex: 1, backgroundColor: colors.ground }}>
      {children}
    </View>
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
