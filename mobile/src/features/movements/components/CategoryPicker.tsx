import { useState } from "react";
import { ScrollView, View } from "react-native";
import { spacing } from "../../../shared/theme/tokens";
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
      {/* One scrolling row bled to the screen edges keeps the sheet short. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ marginHorizontal: -spacing.xl, flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          gap: 8,
          alignItems: "center",
        }}
      >
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
          accessibilityState={{ expanded: adding }}
          onPress={() => setAdding(!adding)}
        />
      </ScrollView>
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
