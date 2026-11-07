import { useEffect } from "react";
import { Screen } from "../../shared/ui/Screen";
import { AppButton } from "../../shared/ui/AppButton";
import { AmountField } from "../../shared/ui/AmountField";
import { TextField } from "../../shared/ui/TextField";
import { Banner } from "../../shared/ui/Banner";
import { SegmentedControl } from "../../shared/ui/SegmentedControl";
import { CategoryPicker } from "./components/CategoryPicker";
import { AccountingDateField } from "./components/AccountingDateField";
import { useMovementDraft } from "./components/useMovementDraft";
import type { Movement } from "./types";
export function MovementForm({
  initial,
  onSaved,
  onCancel,
  onArchived,
  onAccountingMonth,
  onBusyChange,
}: {
  initial?: Movement;
  onSaved(record: Movement): void;
  onCancel(): void;
  onArchived?(): void;
  onAccountingMonth?(month: string): void;
  onBusyChange?(busy: boolean): void;
}) {
  const f = useMovementDraft({ initial, onSaved, onAccountingMonth });
  useEffect(() => {
    onBusyChange?.(f.busy);
  }, [f.busy, onBusyChange]);
  return (
    <Screen
      title={initial ? "Editar movimiento" : "Registrar movimiento"}
      variant="modal"
      onBack={onCancel}
      backLabel="Cerrar sin guardar"
      backDisabled={f.busy}
      footer={
        <>
          <AppButton
            title={f.type === "expense" ? "Guardar gasto" : "Guardar ingreso"}
            busy={f.operation === "save"}
            disabled={f.busy && f.operation !== "save"}
            onPress={f.submit}
          />
          {initial ? (
            <AppButton
              title="Archivar movimiento"
              variant="danger"
              dangerGhost
              busy={f.operation === "archive"}
              disabled={f.busy && f.operation !== "archive"}
              onPress={() => f.confirmArchive(onArchived ?? onCancel)}
            />
          ) : null}
        </>
      }
    >
      <SegmentedControl
        label="Tipo de movimiento"
        value={f.type}
        options={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Ingreso" },
        ]}
        disabled={f.busy}
        onChange={(value) => {
          f.change();
          f.setType(value);
          f.setCategory("");
        }}
      />
      <AmountField
        ref={f.amountRef}
        value={f.amount}
        onChangeText={(value) => {
          f.change();
          f.setAmount(value);
        }}
        error={f.fields.amount}
        editable={!f.busy}
      />
      <CategoryPicker draft={f} />
      <AccountingDateField draft={f} />
      <TextField
        ref={f.noteRef}
        label="Nota (opcional)"
        value={f.note}
        onChangeText={(value) => {
          f.change();
          f.setNote(value);
        }}
        error={f.fields.note}
        multiline
        maxLength={500}
        editable={!f.busy}
      />
      <Banner message={f.message} tone="error" announce={false} />
    </Screen>
  );
}
