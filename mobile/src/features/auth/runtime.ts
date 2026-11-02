import * as SecureStore from "expo-secure-store";
import { AuthClient } from "./client";

const KEY = "finza.refresh";
export const auth = new AuthClient(
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000",
  {
    get: () => SecureStore.getItemAsync(KEY),
    set: (value) =>
      SecureStore.setItemAsync(KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    remove: () => SecureStore.deleteItemAsync(KEY),
  },
);
