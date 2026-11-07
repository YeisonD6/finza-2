import { Redirect, Stack, usePathname } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
export default function AuthLayout() {
  const pathname = usePathname();
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  if (loading) return null;
  if (profile && pathname !== "/onboarding") return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
