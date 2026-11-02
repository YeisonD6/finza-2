import { forwardRef, ElementRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";

export function AppButton({
  title,
  onPress,
  busy = false,
  disabled = false,
  selected,
}: {
  title: string;
  onPress(): void;
  busy?: boolean;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy, selected }}
      disabled={disabled || busy}
      onPress={() => {
        onPress();
      }}
      style={styles.button}
    >
      <Text style={styles.buttonText}>
        {busy ? "Procesando…" : title}
        {selected ? " ✓ Seleccionado" : ""}
      </Text>
    </Pressable>
  );
}

export const FormField = forwardRef<
  ElementRef<typeof TextInput>,
  TextInputProps & { label: string; error?: string }
>(function FormField({ label, error, ...props }, ref) {
  return (
    <>
      <Text nativeID={label} style={styles.label}>
        {label}
      </Text>
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={label}
        accessibilityLabelledBy={label}
        accessibilityHint={error || props.accessibilityHint}
        style={styles.input}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
});

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: "700", color: "#14233D" },
  label: { fontSize: 18, color: "#14233D" },
  input: {
    borderWidth: 1,
    borderColor: "#506078",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: "#14233D",
    minHeight: 48,
  },
  button: {
    backgroundColor: "#14233D",
    padding: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, textAlign: "center" },
  error: { color: "#991B1B", fontSize: 17 },
});
