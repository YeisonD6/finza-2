import { Redirect, router } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
import { TabBar } from "../../shared/ui/TabBar";
import { useFinancial } from "../../features/dashboard/FinancialProvider";
export default function TabLayout() {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  const financial = useFinancial();
  if (loading) return null;
  if (!profile) return <Redirect href="/(auth)/login" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: "none" }}
      tabBar={({ state, emitter, navigateToTab }) => (
        <TabBar
          active={state.routes[state.index].name}
          onRegister={() => {
            financial.clearSaved();
            router.push("/movement/new");
          }}
          onTab={(name) => {
            financial.clearSaved();
            const route = state.routes.find((r) => r.name === name);
            if (!route) return;
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="movements" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
