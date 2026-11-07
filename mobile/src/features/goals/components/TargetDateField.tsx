import { View } from "react-native";
import { useRef, type Ref, type ElementRef } from "react";
import { TextInput } from "react-native";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { TextField } from "../../../shared/ui/TextField";
import { targetAfter } from "../domain";
export function TargetDateField({
  value,
  onChange,
  error,
  inputRef,
  disabled,
}: {
  value: string;
  onChange(value: string): void;
  error?: string;
  inputRef: Ref<ElementRef<typeof TextInput>>;
  disabled: boolean;
}) {
  const local = useRef<ElementRef<typeof TextInput>>(null);
  return (
    <>
      <AppText variant="label">Fecha objetivo (opcional)</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          { title: "En 3 meses", months: 3 },
          { title: "En 6 meses", months: 6 },
          { title: "En 1 año", months: 12 },
        ].map((item) => (
          <AppButton
            key={item.title}
            title={item.title}
            variant="secondary"
            selected={value === targetAfter(item.months)}
            disabled={disabled}
            onPress={() => onChange(targetAfter(item.months))}
          />
        ))}
        <AppButton
          title="Sin fecha"
          variant="secondary"
          selected={!value}
          disabled={disabled}
          onPress={() => onChange("")}
        />
        <AppButton
          title="Otra"
          variant="secondary"
          disabled={disabled}
          onPress={() => {
            local.current?.focus();
          }}
        />
      </View>
      <TextField
        ref={(node) => {
          local.current = node;
          if (typeof inputRef === "function") inputRef(node);
          else if (inputRef) inputRef.current = node;
        }}
        label="Fecha objetivo (YYYY-MM-DD)"
        hint="Opcional; hoy o una fecha posterior en Colombia."
        value={value}
        onChangeText={onChange}
        error={error}
        maxLength={10}
        autoCorrect={false}
        editable={!disabled}
      />
    </>
  );
}
