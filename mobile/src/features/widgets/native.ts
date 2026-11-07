import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import type { WidgetSnapshot } from "./snapshot";

type FinzaWidgetsModule = {
  isSupported(): boolean;
  publish(json: string): void;
  getHideAmounts(): boolean;
  setHideAmounts(hidden: boolean): void;
};

// Present only in native builds that include modules/finza-widgets (not in Expo Go,
// web or Jest), so every call degrades to a no-op instead of throwing.
const native =
  Platform.OS === "web"
    ? null
    : requireOptionalNativeModule<FinzaWidgetsModule>("FinzaWidgets");

function supported() {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

/** False on web, Expo Go, Jest, and iOS builds without the App Group configured. */
export const widgetsAvailable = supported();

export function publishSnapshot(snapshot: WidgetSnapshot) {
  try {
    native?.publish(JSON.stringify(snapshot));
  } catch {
    // A widget refresh must never break the app.
  }
}

export function getHideAmounts(): boolean {
  try {
    return native?.getHideAmounts() ?? false;
  } catch {
    return false;
  }
}

export function setHideAmounts(hidden: boolean) {
  try {
    native?.setHideAmounts(hidden);
  } catch {
    // Ignored: the widget keeps its previous setting.
  }
}
