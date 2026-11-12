import { useEffect, useRef } from "react";
import { FlatList, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Screen } from "../../shared/ui/Screen";
import { Banner } from "../../shared/ui/Banner";
import { MovementRow } from "../../shared/ui/MovementRow";
import { SwipeToArchive } from "../../shared/ui/SwipeToArchive";
import { EmptyState } from "../../shared/ui/EmptyState";
import { SkeletonList } from "../../shared/ui/Skeleton";
import { monthName, dayLabel } from "../../shared/formatting/dates";
import { useMovementList } from "./components/useMovementList";
import { MovementFilters } from "./components/MovementFilters";
import type { Movement } from "./types";
import { groupByDay, type DayGroup } from "./domain";
import { formatCOP } from "../../shared/formatting/money";
import {
  colors,
  radii,
  shadows,
  useThemeRefresh,
} from "../../shared/theme/tokens";
import { useTabBarSpace } from "../../shared/ui/TabBar";
export function MovementsScreen({
  initialMonth,
  onEdit,
  active = true,
}: {
  initialMonth?: string;
  onEdit(record: Movement): void;
  active?: boolean;
}) {
  // The list only re-renders rows when its data changes; the scheme makes a theme
  // change count too.
  const scheme = useThemeRefresh();
  const f = useMovementList(initialMonth, active);
  const tabSpace = useTabBarSpace();
  const list = useRef<FlatList<DayGroup>>(null);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [f.month, f.type, f.category, f.q]);
  const category = f.categories.data?.find((c) => c.id === f.category);
  const filtered = !!(f.type || f.category || f.q);
  const groups = groupByDay(f.rows);
  const offsets = groups.map((_, i) =>
    groups.slice(0, i).reduce((sum, g) => sum + g.rows.length, 0),
  );
  const empty = f.q
    ? `No encontramos «${f.q}» en ${monthName(f.month)}`
    : filtered
      ? `No hay ${f.type === "expense" ? "gastos" : f.type === "income" ? "ingresos" : "movimientos"}${category ? ` de ${category.name}` : ""} en ${monthName(f.month)}`
      : `Aún no hay movimientos en ${monthName(f.month)}`;
  return (
    <Screen
      title="Movimientos"
      scroll={false}
      active={active}
      focusKey={`${f.month}|${f.type}|${f.category}|${f.q}`}
    >
      {(heading) => (
        // Swipe-to-archive needs a gesture root above it; nesting under the app's
        // root is supported and keeps the screen self-contained (and testable).
        <GestureHandlerRootView style={{ flex: 1 }}>
          <FlatList
            ref={list}
            data={groups}
            extraData={scheme}
            keyExtractor={(group) => group.day}
            contentContainerStyle={{
              padding: 20,
              gap: 16,
              paddingBottom: 20 + tabSpace,
            }}
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
                {/* First load only: a refetch behind visible rows stays silent. */}
                {f.query.isFetching && f.rows.length === 0 ? (
                  <SkeletonList rows={4} label="Cargando movimientos…" />
                ) : null}
                {f.query.error ? (
                  <>
                    <Banner
                      message="No se pudieron cargar los movimientos."
                      tone="error"
                    />
                    <AppButton
                      title="Reintentar movimientos"
                      onPress={f.retry}
                    />
                  </>
                ) : null}
              </View>
            }
            renderItem={({ item: group, index: groupIndex }) => (
              <View style={{ gap: 8 }}>
                <View
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${dayLabel(group.day)}. Balance del día: ${formatCOP(group.net)}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    paddingHorizontal: 4,
                    gap: 12,
                  }}
                >
                  <AppText variant="label" style={{ color: colors.inkMuted }}>
                    {dayLabel(group.day)}
                  </AppText>
                  <AppText
                    variant="label"
                    style={{
                      color: group.net.startsWith("-")
                        ? colors.expense
                        : colors.forest600,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {group.net.startsWith("-") ? "" : "+"}
                    {formatCOP(group.net)}
                  </AppText>
                </View>
                <View
                  style={[
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.lg,
                      paddingHorizontal: 16,
                    },
                    shadows.card,
                  ]}
                >
                  {group.rows.map((item, i) => {
                    const category = f.categories.data?.find(
                      (c) => c.id === item.category_id,
                    );
                    return (
                      <SwipeToArchive
                        key={item.id}
                        disabled={f.archiving}
                        onArchive={() => f.confirmArchive(item)}
                      >
                        {(guard) => (
                          <MovementRow
                            movement={item}
                            category={category?.name}
                            isSystem={category?.is_system}
                            index={offsets[groupIndex] + i}
                            disabled={f.archiving}
                            showDate={false}
                            last={i === group.rows.length - 1}
                            onPress={guard(() => onEdit(item))}
                            onArchive={() => f.confirmArchive(item)}
                          />
                        )}
                      </SwipeToArchive>
                    );
                  })}
                </View>
              </View>
            )}
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
        </GestureHandlerRootView>
      )}
    </Screen>
  );
}
