import { useState } from "react";
import { usePreventRemove } from "expo-router";
import { useUpsertBudgetMutation, useDeleteBudgetMutation } from "../api";
import { normalizeAmount } from "../../movements/domain";
import { useFormFeedback } from "../../../shared/forms/useFormFeedback";
import { Screen } from "../../../shared/ui/Screen";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { AmountField } from "../../../shared/ui/AmountField";
import { Banner } from "../../../shared/ui/Banner";
import { confirmAction } from "../../../shared/ui/confirmAction";
import { announce } from "../../../shared/accessibility/announcements";
export function BudgetEditor({
  categoryId,
  name,
  limit,
  onClose,
}: {
  categoryId: string;
  name: string;
  limit?: string;
  onClose(): void;
}) {
  const [amount, setAmount] = useState(limit?.replace(".", ",") ?? "");
  const [save] = useUpsertBudgetMutation(),
    [remove] = useDeleteBudgetMutation();
  const f = useFormFeedback();
  const disablePrevention = usePreventRemove(f.busy, () => {});
  function submit() {
    let value: string;
    try {
      value = normalizeAmount(amount);
    } catch (e) {
      f.fail({ amount: (e as Error).message });
      return;
    }
    void f.run(async () => {
      await save({
        categoryId,
        body: { amount: value, currency: "COP" },
      }).unwrap();
      announce("Presupuesto guardado");
      disablePrevention();
      onClose();
    });
  }
  return (
    <Screen
      title={`Presupuesto de ${name}`}
      variant="modal"
      onBack={onClose}
      backDisabled={f.busy}
      footer={<AppButton title="Guardar" busy={f.busy} onPress={submit} />}
    >
      <AppText>Este límite se aplica a todos los meses.</AppText>
      <AmountField
        ref={(node) => {
          f.refs.current.amount = node;
        }}
        value={amount}
        onChangeText={(value) => {
          f.clear();
          setAmount(value);
        }}
        error={f.fields.amount}
        editable={!f.busy}
      />
      <Banner message={f.message} tone="error" announce={false} />
      {limit ? (
        <AppButton
          title="Quitar presupuesto"
          variant="danger"
          disabled={f.busy}
          onPress={() =>
            confirmAction(
              "Quitar presupuesto",
              `¿Quitar el límite mensual de ${name}?`,
              "Quitar",
              () => {
                void f.run(async () => {
                  await remove(categoryId).unwrap();
                  announce("Presupuesto eliminado");
                  disablePrevention();
                  onClose();
                });
              },
            )
          }
        />
      ) : null}
    </Screen>
  );
}
