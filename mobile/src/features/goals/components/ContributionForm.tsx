import { useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { usePreventRemove } from "expo-router";
import { useAddContributionMutation } from "../api";
import {
  bogotaToday,
  normalizeAmount,
  validAccountingDate,
} from "../../movements/domain";
import { useFormFeedback } from "../../../shared/forms/useFormFeedback";
import { Screen } from "../../../shared/ui/Screen";
import { AmountField } from "../../../shared/ui/AmountField";
import { TextField } from "../../../shared/ui/TextField";
import { AppButton } from "../../../shared/ui/AppButton";
import { Banner } from "../../../shared/ui/Banner";
import { ContributionDateField } from "./ContributionDateField";
import { announce } from "../../../shared/accessibility/announcements";
export function ContributionForm({
  goalId,
  onSaved,
  onCancel,
}: {
  goalId: string;
  onSaved(): void;
  onCancel(): void;
}) {
  const [amount, setAmount] = useState(""),
    [date, setDate] = useState(bogotaToday()),
    [note, setNote] = useState("");
  const [add] = useAddContributionMutation();
  const f = useFormFeedback();
  const disablePrevention = usePreventRemove(f.busy, () => {});
  const key = useRef("");
  if (!key.current) key.current = Crypto.randomUUID();
  const change = () => {
    key.current = Crypto.randomUUID();
    f.clear();
  };
  function submit() {
    const errors: Record<string, string> = {};
    let canonical = "";
    try {
      canonical = normalizeAmount(amount);
    } catch (e) {
      errors.amount = (e as Error).message;
    }
    if (!validAccountingDate(date))
      errors.occurred_on =
        "Ingresa una fecha válida entre 1900-01-01 y hoy en Colombia";
    if (note.length > 140) errors.note = "La nota admite máximo 140 caracteres";
    if (Object.keys(errors).length) {
      f.fail(errors);
      return;
    }
    void f.run(async () => {
      await add({
        goalId,
        body: {
          amount: canonical,
          currency: "COP",
          occurred_on: date,
          note,
          client_request_id: key.current,
        },
      }).unwrap();
      announce("Aporte guardado");
      disablePrevention();
      onSaved();
    });
  }
  return (
    <Screen
      title="Aportar a tu meta"
      variant="modal"
      onBack={onCancel}
      backDisabled={f.busy}
      footer={
        <AppButton title="Guardar aporte" busy={f.busy} onPress={submit} />
      }
    >
      <AmountField
        ref={(node) => {
          f.refs.current.amount = node;
        }}
        value={amount}
        onChangeText={(v) => {
          change();
          setAmount(v);
        }}
        error={f.fields.amount}
        editable={!f.busy}
      />
      <ContributionDateField
        value={date}
        onChange={(v) => {
          change();
          setDate(v);
        }}
        error={f.fields.occurred_on}
        inputRef={(node) => {
          f.refs.current.occurred_on = node;
        }}
        disabled={f.busy}
      />
      <TextField
        ref={(node) => {
          f.refs.current.note = node;
        }}
        label="Nota del aporte (opcional)"
        value={note}
        onChangeText={(v) => {
          change();
          setNote(v);
        }}
        maxLength={140}
        error={f.fields.note}
        editable={!f.busy}
        multiline
      />
      <Banner message={f.message} tone="error" announce={false} />
    </Screen>
  );
}
