import Constants from "expo-constants";
import { resolveApiUrl } from "./apiUrl";
import { AuthClient } from "./client";
import { storage } from "./storage";
const KEY = "finza.refresh";
export const auth = new AuthClient(
  resolveApiUrl({
    envUrl: process.env.EXPO_PUBLIC_API_URL,
    envPort: process.env.EXPO_PUBLIC_API_PORT,
    hostUri: Constants.expoConfig?.hostUri,
    dev: __DEV__,
  }),
  {
    get: () => storage.get(KEY),
    set: (value) => storage.set(KEY, value),
    remove: () => storage.remove(KEY),
  },
);
