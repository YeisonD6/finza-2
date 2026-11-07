import { StyleSheet } from "react-native";
import { colors as palette, typography, radii, spacing } from "../theme/tokens";
import { fontFamily } from "../theme/fonts";
export const colors = {
  background: palette.surface,
  text: palette.ink,
  muted: palette.inkMuted,
  error: palette.danger,
  pressed: palette.forest900,
  success: palette.forest600,
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ground },
  content: { padding: spacing.xl, gap: spacing.lg, flexGrow: 1 },
  title: {
    ...typography.title,
    fontFamily: fontFamily.title,
    color: palette.ink,
    flexShrink: 0,
  },
  label: {
    ...typography.label,
    fontFamily: fontFamily.label,
    color: palette.ink,
    flexShrink: 0,
  },
  body: {
    ...typography.body,
    fontFamily: fontFamily.body,
    color: palette.ink,
    flexShrink: 0,
  },
  input: {
    ...typography.body,
    fontFamily: fontFamily.body,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: palette.ink,
    backgroundColor: palette.surface,
    minHeight: 56,
  },
  inputError: { borderColor: palette.danger, borderWidth: 2 },
  inputFocused: { borderColor: palette.forest700, borderWidth: 2 },
  button: {
    minHeight: 52,
    minWidth: 48,
    borderWidth: 2,
    borderColor: palette.transparent,
    borderRadius: radii.control,
    padding: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonFocused: { borderColor: palette.ink },
  error: {
    ...typography.body,
    fontFamily: fontFamily.body,
    color: palette.danger,
  },
  success: {
    ...typography.body,
    fontFamily: fontFamily.body,
    color: palette.forest600,
  },
});
