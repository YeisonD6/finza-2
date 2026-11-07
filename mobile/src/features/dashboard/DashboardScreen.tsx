import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { DashboardInsights } from "./components/DashboardInsights";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Screen } from "../../shared/ui/Screen";
import { Banner } from "../../shared/ui/Banner";
import { Card } from "../../shared/ui/Card";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { MovementRow } from "../../shared/ui/MovementRow";
import { EmptyState } from "../../shared/ui/EmptyState";
import { announce } from "../../shared/accessibility/announcements";
import { formatCOP } from "../movements/domain";
import { monthName } from "../../shared/formatting/dates";
import { colors, radii } from "../../shared/theme/tokens";
import type { Category, Movement } from "../movements/types";
import { useDashboardQuery } from "./api";
import { SummaryHeader } from "./components/SummaryHeader";
import { MonthTransition } from "./components/MonthTransition";
export function DashboardScreen({
  month,
  onMonthChange,
  onRegister,
  onOpenMovements,
  onProfile,
  email,
  categories = [],
  onEdit,
  silentInitialSummary = false,
  firstMovement = false,
  active = true,
}: {
  month: string;
  onMonthChange(month: string): void;
  onRegister(): void;
  onOpenMovements(): void;
  onProfile(): void;
  email: string;
  categories?: Category[];
  onEdit?(record: Movement): void;
  silentInitialSummary?: boolean;
  firstMovement?: boolean;
  active?: boolean;
}) {
  const skipSummary = useRef(silentInitialSummary),
    silenced = useRef(false);
  const query = useDashboardQuery(month);
  // Never show the preceding query's data under a new month, or stale data after an error.
  const data = query.isError ? undefined : query.currentData;
  useEffect(() => {
    if (silentInitialSummary && !silenced.current) {
      skipSummary.current = true;
      silenced.current = true;
    }
    if (!silentInitialSummary) silenced.current = false;
  }, [silentInitialSummary]);
  useEffect(() => {
    if (!active) return;
    if (data && !query.isFetching) {
      if (skipSummary.current) {
        skipSummary.current = false;
        return;
      }
      announce(
        `Inicio ${data.month}. Flujo neto del mes: ${formatCOP(data.net)}.`,
      );
    }
  }, [data, query.isFetching, query.isError, active]);
  const headerContent = (heading: ReactNode) => (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 24, gap: 20 }}
    >
      <View
        style={{
          backgroundColor: colors.forest700,
          borderBottomLeftRadius: radii.xl,
          borderBottomRightRadius: radii.xl,
          paddingHorizontal: 20,
          paddingVertical: 12,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {heading}
          <AppButton
            title={email.slice(0, 1).toUpperCase()}
            accessibilityLabel={`Abrir perfil de ${email}`}
            onPress={onProfile}
            variant="secondary"
            style={{ borderRadius: radii.pill }}
          />
        </View>
        <MonthSwitcher month={month} onChange={onMonthChange} inverse />
        <MonthTransition month={month}>
          {data ? <SummaryHeader data={data} /> : null}
          {query.isFetching ? (
            <View style={{ gap: 8 }}>
              <ActivityIndicator color={colors.onForest} />
              <AppText style={{ color: colors.onForest }}>Cargando…</AppText>
            </View>
          ) : null}
        </MonthTransition>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 20 }}>
        <Banner
          message={
            silentInitialSummary
              ? firstMovement
                ? `¡Primer movimiento de ${monthName(month)}!`
                : "Movimiento guardado"
              : ""
          }
          tone="success"
          announce={false}
          celebrate={firstMovement && !!data?.recent_movements.length}
        />
        {query.isError ? (
          <>
            <Banner
              message="No se pudo cargar el dashboard. Reintenta con conexión."
              tone="error"
            />
            <AppButton
              title="Reintentar"
              onPress={() => {
                void query.refetch();
              }}
            />
          </>
        ) : null}
        {data ? (
          <>
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <AppText variant="heading" accessibilityRole="header">
                  Últimos movimientos
                </AppText>
                <AppButton
                  title="Ver todos"
                  variant="ghost"
                  onPress={onOpenMovements}
                />
              </View>
              {data.recent_movements.length === 0 ? (
                <EmptyState
                  active={active}
                  title={`Aún no hay movimientos en ${monthName(month)}`}
                  message="Registra tu primer movimiento."
                  action="Registrar el primero"
                  onAction={onRegister}
                />
              ) : (
                data.recent_movements.slice(0, 5).map((row, index) => {
                  const category = categories.find(
                    (c) => c.id === row.category_id,
                  );
                  return (
                    <MovementRow
                      key={row.id}
                      movement={row}
                      category={category?.name}
                      isSystem={category?.is_system}
                      index={index}
                      onPress={onEdit ? () => onEdit(row) : undefined}
                    />
                  );
                })
              )}
            </Card>
            <DashboardInsights
              data={data}
              categories={categories}
              allowMascot={!firstMovement}
            />
          </>
        ) : null}
        <AppButton
          title="Actualizar resumen"
          variant="ghost"
          busy={query.isFetching}
          onPress={() => {
            void query.refetch();
          }}
        />
      </View>
    </ScrollView>
  );
  return (
    <Screen
      title="FINZA"
      titleVariant="label"
      variant="forest"
      active={active}
      focusKey={month}
    >
      {headerContent}
    </Screen>
  );
}
