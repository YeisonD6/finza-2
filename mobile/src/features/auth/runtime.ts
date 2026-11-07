import { AuthClient } from "./client";
import { storage } from "./storage";
const KEY = "finza.refresh";
export const auth = new AuthClient(
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000",
  {
    get: () => storage.get(KEY),
    set: (value) => storage.set(KEY, value),
    remove: () => storage.remove(KEY),
  },
);
