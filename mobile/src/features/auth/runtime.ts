import Constants from "expo-constants";
import { Platform } from "react-native";
import { resolveApiUrl } from "./apiUrl";
import { AuthClient } from "./client";
import { storage } from "./storage";
const KEY = "finza.refresh";
// Expo Go reports the Metro host; the web dev view does not, so it uses the page's own host.
const metroHost =
  Constants.expoConfig?.hostUri ??
  (Platform.OS === "web" && typeof location !== "undefined"
    ? location.host
    : undefined);
export const auth = new AuthClient(
  resolveApiUrl({
    envUrl: process.env.EXPO_PUBLIC_API_URL,
    envPort: process.env.EXPO_PUBLIC_API_PORT,
    hostUri: metroHost,
    dev: __DEV__,
  }),
  {
    get: () => storage.get(KEY),
    set: (value) => storage.set(KEY, value),
    remove: () => storage.remove(KEY),
  },
);
