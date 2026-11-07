import { Alert, Platform } from "react-native";
export function confirmAction(
  title: string,
  message: string,
  action: string,
  onConfirm: () => void,
) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: action, style: "destructive", onPress: onConfirm },
  ]);
}
