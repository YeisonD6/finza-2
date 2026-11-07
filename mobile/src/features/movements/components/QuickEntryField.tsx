import { useState } from "react";
import { TextField } from "../../../shared/ui/TextField";
import { AppButton } from "../../../shared/ui/AppButton";
import { Banner } from "../../../shared/ui/Banner";
import { parseQuickEntry } from "../../quick-entry/parser";
import { announce } from "../../../shared/accessibility/announcements";
import type { useMovementDraft } from "./useMovementDraft";
export function QuickEntryField({
  draft: f,
}: {
  draft: ReturnType<typeof useMovementDraft>;
}) {
  const [text, setText] = useState(""),
    [explanation, setExplanation] = useState("");
  function interpret() {
    if (f.busy) return;
    const result = parseQuickEntry(text, f.categories);
    f.change();
    f.setType(result.type);
    f.setAmount(result.amount?.replace(".", ",") ?? "");
    f.setDate(result.occurred_on);
    f.setCategory(result.category_id ?? "");
    f.setNote(result.note);
    setExplanation(result.explanation);
    announce(result.explanation);
    f.amountRef.current?.focus();
  }
  return (
    <>
      <TextField
        label="Escribe o dicta tu movimiento"
        placeholder="Ej.: almuerzo 18 mil ayer"
        hint="Rellena el formulario para que lo revises antes de guardar"
        value={text}
        onChangeText={setText}
        editable={!f.busy}
        returnKeyType="done"
        onSubmitEditing={interpret}
      />
      <AppButton
        title="Interpretar"
        variant="secondary"
        disabled={f.busy || f.isLoading || !!f.categoryError}
        onPress={interpret}
      />
      <Banner message={explanation} announce={false} />
    </>
  );
}
