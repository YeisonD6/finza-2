import { StyleSheet } from "react-native";

export const colors = {
  background: "#FFFFFF",
  text: "#14233D",
  muted: "#506078",
  error: "#991B1B",
  pressed: "#243D60",
  success: "#166534",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, flexShrink: 1 },
  label: { fontSize: 18, color: colors.text, flexShrink: 1 },
  body: { fontSize: 16, color: colors.text, flexShrink: 1 },
  input: {
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  inputFocused: { borderColor: colors.text, borderWidth: 2 },
  button: {
    backgroundColor: colors.text,
    padding: 11,
    borderWidth: 3,
    borderColor: colors.text,
    borderRadius: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: colors.pressed,
    borderColor: colors.pressed,
  },
  buttonDisabled: { backgroundColor: colors.muted, borderColor: colors.muted },
  buttonFocused: { borderColor: colors.background },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    textAlign: "center",
    flexShrink: 1,
  },
  error: { color: colors.error, fontSize: 17 },
  success: { color: colors.success, fontSize: 17 },
});
