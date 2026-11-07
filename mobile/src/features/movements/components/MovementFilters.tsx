import { ScrollView, View } from "react-native";
import { MonthSwitcher } from "../../../shared/ui/MonthSwitcher";
import { SegmentedControl } from "../../../shared/ui/SegmentedControl";
import { CategoryChip } from "../../../shared/ui/CategoryChip";
import { Banner } from "../../../shared/ui/Banner";
import { AppButton } from "../../../shared/ui/AppButton";
import type { MovementType } from "../types";
import type { useMovementList } from "./useMovementList";
export function MovementFilters({
  list: f,
}: {
  list: ReturnType<typeof useMovementList>;
}) {
  return (
    <View style={{ gap: 16 }}>
      <MonthSwitcher
        month={f.month}
        onChange={f.setMonth}
        disabled={f.archiving}
      />
      <SegmentedControl
        label="Filtrar tipo"
        value={f.type ?? "all"}
        options={[
          { value: "all", label: "Todos" },
          { value: "expense", label: "Gastos" },
          { value: "income", label: "Ingresos" },
        ]}
        disabled={f.archiving}
        onChange={(value) =>
          f.setType(value === "all" ? undefined : (value as MovementType))
        }
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingRight: 20 }}
      >
        <CategoryChip
          name="Todas"
          accessibilityLabel="Todas las categorías"
          selected={!f.category}
          onPress={() => f.setCategory(undefined)}
          disabled={f.archiving}
        />
        {(f.categories.data ?? [])
          .filter((c) => !f.type || c.movement_type === f.type)
          .map((c) => (
            <CategoryChip
              key={c.id}
              name={c.name}
              isSystem={c.is_system}
              accessibilityLabel={`Filtrar ${c.movement_type === "expense" ? "gasto" : "ingreso"}: ${c.name}${c.is_system ? "" : " (personal)"}`}
              selected={f.category === c.id}
              disabled={f.archiving}
              onPress={() => f.setCategory(c.id)}
            />
          ))}
      </ScrollView>
      <Banner message={f.categories.isFetching ? "Cargando categorías…" : ""} />
      {f.categories.error ? (
        <>
          <Banner
            tone="error"
            message="No se pudieron cargar las categorías."
          />
          <AppButton
            title="Reintentar categorías"
            onPress={() => {
              void f.categories.refetch();
            }}
          />
        </>
      ) : null}
    </View>
  );
}
