import { forwardRef, type ElementRef } from "react";
import { TextInput } from "react-native";
import { FormField, type FormFieldProps } from "./FormField";

/** Preserve text; normalize decimal strings on submit, never via Number. */
export const AmountInput = forwardRef<
  ElementRef<typeof TextInput>,
  Omit<FormFieldProps, "label">
>(function AmountInput(props, ref) {
  return (
    <FormField
      ref={ref}
      label="Monto en pesos colombianos (COP)"
      hint="Mayor que cero. Usa coma o punto decimal, sin separadores de miles."
      keyboardType="decimal-pad"
      maxLength={32}
      {...props}
    />
  );
});
