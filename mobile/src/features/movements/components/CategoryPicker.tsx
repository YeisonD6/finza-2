import { useState } from "react";
import { View } from "react-native";
import { AppText } from "../../../shared/ui/AppText";
import { AppButton } from "../../../shared/ui/AppButton";
import { CategoryChip } from "../../../shared/ui/CategoryChip";
import { TextField } from "../../../shared/ui/TextField";
import { Banner } from "../../../shared/ui/Banner";
import type { useMovementDraft } from "./useMovementDraft";
export function CategoryPicker({
  draft: f,
}: {
  draft: ReturnType<typeof useMovementDraft>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <View style={{ gap: 8, flexShrink: 0 }}>
      <AppText
        ref={f.categoryRef}
        variant="label"
        accessibilityRole="header"
        accessibilityLabel={
          f.fields.category_id
            ? `Categoría. Error: ${f.fields.category_id}`
            : "Categoría"
        }
      >
        Categoría
      </AppText>
      <Banner message={f.isLoading ? "Cargando categorías…" : ""} />
      {f.categoryError ? (
        <>
          <Banner
            message="No se pudieron cargar las categorías."
            tone="error"
          />
          <AppButton
            title="Reintentar categorías"
            onPress={() => {
              void f.refetch();
            }}
          />
        </>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {f.categories
          .filter((c) => c.movement_type === f.type)
          .map((c) => (
            <CategoryChip
              key={c.id}
              name={c.is_system ? c.name : `Personal: ${c.name}`}
              isSystem={c.is_system}
              selected={f.category === c.id}
              accessibilityHint={
                f.fields.category_id
                  ? `Error: ${f.fields.category_id}`
                  : undefined
              }
              disabled={f.busy}
              onPress={() => {
                f.change();
                f.setCategory(c.id);
              }}
            />
          ))}
        <AppButton
          title="+ Nueva categoría"
          variant="secondary"
          disabled={f.busy}
          onPress={() => setAdding(!adding)}
        />
      </View>
      {f.fields.category_id ? (
        <AppText accessibilityRole="alert">{f.fields.category_id}</AppText>
      ) : null}
      {adding ? (
        <>
          <TextField
            ref={f.categoryNameRef}
            label="Nueva categoría (opcional)"
            value={f.newCategory}
            onChangeText={(value) => {
              f.setNewCategory(value);
              f.setCategoryNameError("");
            }}
            error={f.categoryNameError}
            maxLength={60}
            editable={!f.busy}
          />
          <AppButton
            title="Agregar categoría"
            onPress={f.saveCategory}
            disabled={f.busy && f.operation !== "category"}
            busy={f.operation === "category"}
          />
        </>
      ) : null}
    </View>
  );
}
