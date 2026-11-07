import { useState, type Ref, type ElementRef } from "react";
import { TextInput } from "react-native";
import { SegmentedControl } from "../../../shared/ui/SegmentedControl";
import { TextField } from "../../../shared/ui/TextField";
import { bogotaToday } from "../../movements/domain";
import { previousDay } from "../../../shared/formatting/dates";
export function ContributionDateField({
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
  const [other, setOther] = useState(false);
  const today = bogotaToday(),
    yesterday = previousDay(today);
  return (
    <>
      <SegmentedControl
        label="Fecha del aporte"
        value={other ? "other" : value === today ? "today" : "yesterday"}
        options={[
          { value: "today", label: "Hoy" },
          { value: "yesterday", label: "Ayer" },
          { value: "other", label: "Otra fecha" },
        ]}
        disabled={disabled}
        onChange={(v) => {
          setOther(v === "other");
          if (v !== "other") onChange(v === "today" ? today : yesterday);
        }}
      />
      {other || error ? (
        <TextField
          ref={inputRef}
          label="Fecha del aporte (YYYY-MM-DD)"
          value={value}
          onChangeText={onChange}
          error={error}
          maxLength={10}
          editable={!disabled}
          autoCorrect={false}
        />
      ) : null}
    </>
  );
}
