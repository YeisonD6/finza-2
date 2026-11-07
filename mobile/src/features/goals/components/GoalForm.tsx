import { useState } from "react";
import { usePreventRemove } from "expo-router";
import { useCreateGoalMutation, useUpdateGoalMutation } from "../api";
import { validTargetDate, type Goal } from "../domain";
import { normalizeAmount } from "../../movements/domain";
import { useFormFeedback } from "../../../shared/forms/useFormFeedback";
import { Screen } from "../../../shared/ui/Screen";
import { TextField } from "../../../shared/ui/TextField";
import { AmountField } from "../../../shared/ui/AmountField";
import { AppButton } from "../../../shared/ui/AppButton";
import { Banner } from "../../../shared/ui/Banner";
import { TargetDateField } from "./TargetDateField";
import { announce } from "../../../shared/accessibility/announcements";
export function GoalForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Goal;
  onSaved(goal: Goal): void;
  onCancel(): void;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [amount, setAmount] = useState(
      initial?.target_amount.replace(".", ",") ?? "",
    ),
    [date, setDate] = useState(initial?.target_date ?? "");
  const [create] = useCreateGoalMutation(),
    [update] = useUpdateGoalMutation();
  const f = useFormFeedback();
  const disablePrevention = usePreventRemove(f.busy, () => {});
  function submit() {
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length > 60)
      errors.name = "El nombre debe tener entre 1 y 60 caracteres";
    let canonical = "";
    try {
      canonical = normalizeAmount(amount);
    } catch (e) {
      errors.target_amount = (e as Error).message;
    }
    if (date && !validTargetDate(date))
      errors.target_date =
        "Ingresa una fecha válida desde hoy hasta 9998-12-31";
    if (Object.keys(errors).length) {
      f.fail(errors);
      return;
    }
    void f.run(async () => {
      const body = {
        name: name.trim(),
        target_amount: canonical,
        target_date: date || null,
      };
      const goal = initial
        ? await update({ id: initial.id, changes: body }).unwrap()
        : await create({ ...body, currency: "COP" }).unwrap();
      announce(initial ? "Meta actualizada" : "Meta creada");
      disablePrevention();
      onSaved(goal);
    });
  }
  return (
    <Screen
      title={initial ? "Editar meta" : "Nueva meta"}
      variant="modal"
      onBack={onCancel}
      backDisabled={f.busy}
      footer={
        <AppButton
          title={initial ? "Guardar cambios" : "Crear meta"}
          busy={f.busy}
          onPress={submit}
        />
      }
    >
      <TextField
        ref={(node) => {
          f.refs.current.name = node;
        }}
        label="Nombre de la meta"
        value={name}
        onChangeText={(v) => {
          f.clear();
          setName(v);
        }}
        error={f.fields.name}
        maxLength={60}
        editable={!f.busy}
      />
      <AmountField
        ref={(node) => {
          f.refs.current.target_amount = node;
        }}
        value={amount}
        onChangeText={(v) => {
          f.clear();
          setAmount(v);
        }}
        error={f.fields.target_amount}
        editable={!f.busy}
      />
      <TargetDateField
        value={date}
        onChange={(v) => {
          f.clear();
          setDate(v);
        }}
        error={f.fields.target_date}
        inputRef={(node) => {
          f.refs.current.target_date = node;
        }}
        disabled={f.busy}
      />
      <Banner message={f.message} tone="error" announce={false} />
    </Screen>
  );
}
