import { forwardRef, useState, type ElementRef } from "react";
import { TextInput, View } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { FormField } from "../../../shared/ui/AuthControls";
import { IconButton } from "../../../shared/ui/IconButton";
import { PasswordRequirement } from "./PasswordRequirement";

export const passwordProblem = (value: string, confirm: string) =>
  value.length < 12
    ? "La contraseña necesita al menos 12 caracteres"
    : value.length > 128
      ? "La contraseña admite hasta 128 caracteres"
      : value !== confirm
        ? "Las contraseñas no coinciden"
        : null;

/** New password + confirmation with live requirements (shape and text, not only color). */
export const NewPasswordFields = forwardRef<
  ElementRef<typeof TextInput>,
  {
    value: string;
    confirm: string;
    onChange(value: string): void;
    onConfirm(value: string): void;
    error?: string;
    disabled?: boolean;
    onSubmit(): void;
    label?: string;
  }
>(function NewPasswordFields(
  {
    value,
    confirm,
    onChange,
    onConfirm,
    error,
    disabled,
    onSubmit,
    label = "Contraseña nueva",
  },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <FormField
        ref={ref}
        label={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!disabled}
        error={error}
        trailing={
          <IconButton
            icon={show ? EyeOff : Eye}
            accessibilityLabel={
              show ? "Ocultar contraseñas" : "Mostrar contraseñas"
            }
            onPress={() => setShow(!show)}
            disabled={disabled}
            accessibilityState={{ checked: show }}
          />
        }
      />
      <FormField
        label="Repite la contraseña"
        value={confirm}
        onChangeText={onConfirm}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        editable={!disabled}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <View style={{ gap: 6 }}>
        <PasswordRequirement
          met={value.length >= 12}
          label="Al menos 12 caracteres"
        />
        <PasswordRequirement
          met={value.length > 0 && value === confirm}
          label="Ambas contraseñas coinciden"
        />
      </View>
    </View>
  );
});
