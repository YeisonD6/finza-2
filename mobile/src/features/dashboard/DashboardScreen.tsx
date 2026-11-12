import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { AppText } from "../../shared/ui/AppText";
import { AppButton } from "../../shared/ui/AppButton";
import { Screen } from "../../shared/ui/Screen";
import { Banner } from "../../shared/ui/Banner";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { MovementRow } from "../../shared/ui/MovementRow";
import { EmptyState } from "../../shared/ui/EmptyState";
import { SkeletonSummary } from "../../shared/ui/Skeleton";
import { useTabBarSpace } from "../../shared/ui/TabBar";
import { announce } from "../../shared/accessibility/announcements";
import { formatCOP } from "../movements/domain";
import { monthName } from "../../shared/formatting/dates";
import { colors, useThemeRefresh } from "../../shared/theme/tokens";
import type { Category, Movement } from "../movements/types";
import { useDashboardQuery } from "./api";
import { SummaryHeader } from "./components/SummaryHeader";
import { MonthTransition } from "./components/MonthTransition";
import { MonthlySpendCard } from "./components/MonthlyTrend";
import { VerifyEmailBanner } from "../auth/components/VerifyEmailBanner";
import { router } from "expo-router";
/**
 * Inicio (v4, «Vidrio de bosque»): one large figure, one chart and the last three
 * movements. Budgets, goals, categories and Monedin's tips live in Análisis, one tap
 * away, so the first screen answers a single question: how is my month going?
 */
export function DashboardScreen({
  month,
  onMonthChange,
  onRegister,
  onOpenMovements,
  onProfile,
  onOpenInsights = () => router.push("/insights"),
  email,
  categories = [],
  onEdit,
  silentInitialSummary = false,
  firstMovement = false,
  active = true,
  emailUnconfirmed = false,
}: {
  month: string;
  onMonthChange(month: string): void;
  onRegister(): void;
  onOpenMovements(): void;
  onProfile(): void;
  onOpenInsights?(): void;
  email: string;
  categories?: Category[];
  onEdit?(record: Movement): void;
  silentInitialSummary?: boolean;
  firstMovement?: boolean;
  active?: boolean;
  /** Shows the confirm-your-email reminder (never blocks the dashboard). */
  emailUnconfirmed?: boolean;
}) {
  useThemeRefresh();
  const tabSpace = useTabBarSpace();
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
  const content = (heading: ReactNode) => (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      // Pull to refresh replaces the old «Actualizar resumen» button; every
      // mutation already invalidates this query, so it is rarely needed.
      refreshControl={
        <RefreshControl
          refreshing={!!data && query.isFetching}
          onRefresh={() => {
            void query.refetch();
          }}
          tintColor={colors.accent}
          colors={[colors.forest700]}
        />
      }
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: Math.max(tabSpace, 24),
        gap: 28,
      }}
    >
      <View style={{ gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {heading}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir perfil de ${email}`}
            onPress={onProfile}
            hitSlop={4}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.glass,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AppText
              variant="subhead"
              style={{ color: colors.accent, fontWeight: "800" }}
            >
              {email.slice(0, 1).toUpperCase()}
            </AppText>
          </Pressable>
        </View>
        <MonthSwitcher month={month} onChange={onMonthChange} />
      </View>
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
      <MonthTransition month={month}>
        {data ? <SummaryHeader data={data} /> : null}
        {!data && query.isFetching ? <SkeletonSummary /> : null}
      </MonthTransition>
      {/* After the figure, not above it: the month's number is what Inicio is for. */}
      {emailUnconfirmed ? <VerifyEmailBanner email={email} /> : null}
      {query.isError ? (
        <View style={{ gap: 12 }}>
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
        </View>
      ) : null}
      {data ? (
        <>
          <MonthlySpendCard month={data.month} onOpen={onOpenInsights} />
          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <AppText
                variant="subhead"
                accessibilityRole="header"
                style={{ flex: 1 }}
              >
                Recientes
              </AppText>
              <AppButton
                title="Ver todos"
                variant="ghost"
                size="sm"
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
              data.recent_movements.slice(0, 3).map((row, index, rows) => {
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
                    last={index === rows.length - 1}
                    onPress={onEdit ? () => onEdit(row) : undefined}
                  />
                );
              })
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
  return (
    <Screen title="FINZA" titleVariant="label" active={active} focusKey={month}>
      {(heading: ReactNode) => content(heading)}
    </Screen>
  );
}
