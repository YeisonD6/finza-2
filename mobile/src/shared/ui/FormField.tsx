import { forwardRef, useId, useState, type ElementRef } from "react";
import { Text, TextInput, type TextInputProps } from "react-native";
import { styles } from "./styles";

export type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};
export const FormField = forwardRef<
  ElementRef<typeof TextInput>,
  FormFieldProps
>(function FormField(
  {
    label,
    error,
    hint,
    accessibilityHint,
    accessibilityState,
    style,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const labelId = `field-${id}-label`;
  return (
    <>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      {hint ? <Text style={styles.body}>{hint}</Text> : null}
      <TextInput
        {...props}
        ref={ref}
        accessibilityLabel={props.accessibilityLabel ?? label}
        editable={
          props.editable !== false && accessibilityState?.disabled !== true
        }
        accessibilityLabelledBy={labelId}
        accessibilityHint={
          [hint, accessibilityHint, error ? `Error: ${error}` : undefined]
            .filter(Boolean)
            .join(". ") || undefined
        }
        accessibilityState={{
          ...accessibilityState,
          disabled:
            props.editable === false || accessibilityState?.disabled === true,
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
      />
      {error ? (
        <Text
          nativeID={`field-${id}-error`}
          accessibilityRole="alert"
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </>
  );
});
