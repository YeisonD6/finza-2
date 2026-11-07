import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "../core/store";
import { hasOnboarded } from "../features/auth/storage";
export default function Index() {
  const { profile, loading } = useSelector((s: RootState) => s.auth);
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void hasOnboarded().then((value) => {
      if (live) setSeen(value);
    });
    return () => {
      live = false;
    };
  }, []);
  if (loading || seen === null) return null;
  return (
    <Redirect
      href={profile ? "/(tabs)" : seen ? "/(auth)/login" : "/(auth)/welcome"}
    />
  );
}
