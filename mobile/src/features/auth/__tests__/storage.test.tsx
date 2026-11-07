jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
}));
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { storage, hasOnboarded, markOnboarded } from "../storage";
import {
  announce,
  focusAccessibility,
} from "../../../shared/accessibility/announcements";
import { tapLight, success, error } from "../../../shared/theme/haptics";
afterEach(() => jest.restoreAllMocks());
test("web session and onboarding use memory, never native secure store or browser persistence", async () => {
  jest.replaceProperty(Platform, "OS", "web");
  await storage.set("finza.refresh", "private-token");
  expect(await storage.get("finza.refresh")).toBe("private-token");
  await markOnboarded();
  expect(await hasOnboarded()).toBe(true);
  await storage.remove("finza.refresh");
  expect(await storage.get("finza.refresh")).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  expect(() => {
    announce("Guardado");
    focusAccessibility(null);
  }).not.toThrow();
  await expect(tapLight()).resolves.toBeUndefined();
  await expect(success()).resolves.toBeUndefined();
  await expect(error()).resolves.toBeUndefined();
});
test("native secure storage retains errors for refresh credentials, but onboarding is tolerant", async () => {
  jest.replaceProperty(Platform, "OS", "android");
  jest
    .mocked(SecureStore.setItemAsync)
    .mockRejectedValue(new Error("vault unavailable"));
  jest
    .mocked(SecureStore.getItemAsync)
    .mockRejectedValue(new Error("vault unavailable"));
  await expect(storage.set("finza.refresh", "token")).rejects.toThrow(
    "vault unavailable",
  );
  await expect(markOnboarded()).resolves.toBeUndefined();
  expect(await hasOnboarded()).toBe(false);
});
