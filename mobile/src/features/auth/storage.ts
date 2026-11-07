import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
// Web is a development preview only: no refresh token or onboarding flag persists in the browser.
const memory = new Map<string, string>();
export const storage = {
  get: (key: string): Promise<string | null> =>
    Platform.OS === "web"
      ? Promise.resolve(memory.get(key) ?? null)
      : SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      memory.set(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  remove: (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      memory.delete(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};
export const hasOnboarded = () =>
  storage
    .get("finza.onboarded")
    .then((value) => value === "true")
    .catch(() => false);
export const markOnboarded = () =>
  storage.set("finza.onboarded", "true").catch(() => {});
