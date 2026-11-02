import { Text } from "react-native";
import { useAnnouncement } from "../accessibility/announcements";
import { styles } from "./styles";

export function Feedback({
  message,
  tone = "status",
  announce = true,
}: {
  message: string;
  tone?: "error" | "success" | "status";
  announce?: boolean;
}) {
  useAnnouncement(announce ? message : "");
  if (!message) return null;
  return (
    <Text
      accessibilityRole={tone === "error" ? "alert" : "text"}
      style={
        tone === "error"
          ? styles.error
          : tone === "success"
            ? styles.success
            : styles.body
      }
    >
      {message}
    </Text>
  );
}
