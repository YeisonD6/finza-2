import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider, useSelector } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import { store, type RootState } from "../core/store";
import { useAppFonts } from "../shared/theme/fonts";
import { SessionProvider } from "../features/auth/SessionProvider";
import { FinancialProvider } from "../features/dashboard/FinancialProvider";
import { useWidgetSync } from "../features/widgets/useWidgetSync";
void SplashScreen.preventAutoHideAsync().catch(() => {});
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
    <FinancialProvider key={profile?.id ?? "guest"}>
      {/* FINZA is a light-only UI: dark icons on paper even when the phone is in dark mode.
          Forest screens (welcome, Inicio) push "light" while they are visible. */}
      <StatusBar style="dark" />
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
