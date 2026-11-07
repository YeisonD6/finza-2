import type { ReactNode } from "react";
import { Redirect } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../../core/store";
export function PrivateScreen({ children }: { children: ReactNode }) {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  if (loading) return null;
  return profile ? children : <Redirect href="/(auth)/login" />;
}
