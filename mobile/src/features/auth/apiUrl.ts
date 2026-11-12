/**
 * Where the app finds the FINZA API.
 *
 * An explicit EXPO_PUBLIC_API_URL always wins. When it is unset or "auto" and
 * the app was loaded from a dev server (Expo Go), the API is assumed to run on
 * the same computer as Metro, so its address follows the network the computer
 * is on today: a new Wi-Fi or hotspot no longer leaves the phone calling a
 * stale IP. Outside development the Android-emulator address stays the
 * fallback, as before.
 */
export const EMULATOR_API_URL = "http://10.0.2.2:8000";

export function resolveApiUrl({
  envUrl,
  envPort,
  hostUri,
  dev,
}: {
  envUrl?: string;
  envPort?: string;
  hostUri?: string | null;
  dev: boolean;
}): string {
  const explicit = envUrl?.trim();
  if (explicit && explicit !== "auto") return explicit.replace(/\/+$/, "");
  const host = dev && hostUri ? hostUri.replace(/:\d+$/, "") : "";
  if (!host) return EMULATOR_API_URL;
  return `http://${host}:${envPort?.trim() || "8000"}`;
}
