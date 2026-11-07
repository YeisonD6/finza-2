import { AppText } from "../../../shared/ui/AppText";
import { View } from "react-native";
import { useEffect, useState } from "react";
import { TextField } from "../../../shared/ui/TextField";
import { SegmentedControl } from "../../../shared/ui/SegmentedControl";
import { bogotaToday } from "../domain";
import { previousDay } from "../../../shared/formatting/dates";
import type { useMovementDraft } from "./useMovementDraft";
export function AccountingDateField({
  draft: f,
}: {
  draft: ReturnType<typeof useMovementDraft>;
}) {
  const today = bogotaToday(),
    yesterday = previousDay(today);
  const [other, setOther] = useState(f.date !== today && f.date !== yesterday);
  useEffect(() => {
    setOther(f.date !== today && f.date !== yesterday);
  }, [f.date, today, yesterday]);
  return (
    <View style={{ gap: 8, flexShrink: 0 }}>
      <AppText variant="label">Fecha contable</AppText>
      <SegmentedControl
        label="Fecha contable"
        value={other ? "other" : f.date === today ? "today" : "yesterday"}
        options={[
          { value: "today", label: "Hoy" },
          { value: "yesterday", label: "Ayer" },
          { value: "other", label: "Otra fecha" },
        ]}
        disabled={f.busy}
        onChange={(value) => {
          f.change();
          setOther(value === "other");
          if (value !== "other")
            f.setDate(value === "today" ? today : yesterday);
        }}
      />
      {other || f.fields.occurred_on ? (
        <TextField
          ref={f.dateRef}
          label="Fecha contable (YYYY-MM-DD)"
          accessibilityHint="Fecha del movimiento, hasta hoy en Colombia."
          value={f.date}
          onChangeText={(value) => {
            f.change();
            f.setDate(value);
          }}
          error={f.fields.occurred_on}
          maxLength={10}
          editable={!f.busy}
          autoCorrect={false}
        />
      ) : null}
    </View>
  );
}
