import { useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Screen } from "../../shared/ui/Screen";
import { Banner } from "../../shared/ui/Banner";
import { MovementRow } from "../../shared/ui/MovementRow";
import { EmptyState } from "../../shared/ui/EmptyState";
import { monthName, dayLabel } from "../../shared/formatting/dates";
import { useMovementList } from "./components/useMovementList";
import { MovementFilters } from "./components/MovementFilters";
import type { Movement } from "./types";
export function MovementsScreen({
  initialMonth,
  onEdit,
  active = true,
}: {
  initialMonth?: string;
  onEdit(record: Movement): void;
  active?: boolean;
}) {
  const f = useMovementList(initialMonth, active);
  const list = useRef<FlatList<Movement>>(null);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [f.month, f.type, f.category]);
  const category = f.categories.data?.find((c) => c.id === f.category);
  const filtered = !!(f.type || f.category);
  const empty = filtered
    ? `No hay ${f.type === "expense" ? "gastos" : f.type === "income" ? "ingresos" : "movimientos"}${category ? ` de ${category.name}` : ""} en ${monthName(f.month)}`
    : `Aún no hay movimientos en ${monthName(f.month)}`;
  return (
    <Screen
      title="Movimientos"
      scroll={false}
      active={active}
      focusKey={`${f.month}|${f.type}|${f.category}`}
    >
      {(heading) => (
        <FlatList
          ref={list}
          data={f.rows}
          keyExtractor={(row) => row.id}
          contentContainerStyle={{ padding: 20, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={{ gap: 16 }}>
              {heading}
              <MovementFilters list={f} />
              <Banner
                message={f.message}
                tone={f.failed ? "error" : "success"}
                announce={f.failed}
              />
              <Banner
                message={f.query.isFetching ? "Cargando movimientos…" : ""}
              />
              {f.query.error ? (
                <>
                  <Banner
                    message="No se pudieron cargar los movimientos."
                    tone="error"
                  />
                  <AppButton title="Reintentar movimientos" onPress={f.retry} />
                </>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => {
            const category = f.categories.data?.find(
              (c) => c.id === item.category_id,
            );
            return (
              <View>
                {index === 0 ||
                f.rows[index - 1].occurred_on !== item.occurred_on ? (
                  <AppText accessibilityRole="header" variant="caption">
                    {dayLabel(item.occurred_on)}
                  </AppText>
                ) : null}
                <MovementRow
                  movement={item}
                  category={category?.name}
                  isSystem={category?.is_system}
                  index={index}
                  disabled={f.archiving}
                  onPress={() => onEdit(item)}
                  onArchive={() => f.confirmArchive(item)}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            !f.query.isFetching && !f.query.error ? (
              <EmptyState
                active={active}
                title={empty}
                action={filtered ? "Quitar filtros" : undefined}
                onAction={f.clearFilters}
              />
            ) : undefined
          }
          ListFooterComponent={
            !f.query.error && f.query.currentData?.next_cursor ? (
              <AppButton
                title="Cargar más"
                busy={f.query.isFetching}
                disabled={f.archiving}
                onPress={f.loadMore}
              />
            ) : undefined
          }
        />
      )}
    </Screen>
  );
}
