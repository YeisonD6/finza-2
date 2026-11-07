import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
async function safe(run: () => Promise<void>) {
  if (Platform.OS === "web") return;
  try {
    await run();
  } catch {
    /* Feedback must never block an action. */
  }
}
export const tapLight = () =>
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const success = () =>
  safe(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
export const error = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
