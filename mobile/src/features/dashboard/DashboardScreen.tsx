import { ElementRef, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ScrollView,
  Text,
  TextInput,
  View,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";
import { formatCOP, validMonth } from "../movements/domain";
import { useDashboardQuery } from "./api";

export type AccountControls = {
  email: string;
  onLogout(): void;
  logoutBusy: boolean;
  profileError?: boolean;
  onRetryProfile?(): void;
};

function direction(value: string): string {
  return value === "0.00"
    ? "Sin cambio"
    : value.startsWith("-")
      ? "Disminución"
      : "Aumento";
}

export function DashboardScreen({
  month,
  onMonthChange,
  onRegister,
  onOpenMovements,
  email,
  onLogout,
  logoutBusy,
  profileError,
  onRetryProfile,
}: AccountControls & {
  month: string;
  onMonthChange(month: string): void;
  onRegister(): void;
  onOpenMovements(): void;
}) {
  const [inputMonth, setInputMonth] = useState(month);
  const [monthError, setMonthError] = useState("");
  const heading = useRef<ElementRef<typeof Text>>(null);
  const monthField = useRef<ElementRef<typeof TextInput>>(null);
  const query = useDashboardQuery(month);
  // currentData prevents the preceding month's figures appearing under a new month.
  // An error hides stale figures, so an unsuccessful refresh cannot look current.
  const data = query.isError ? undefined : query.currentData;
  useEffect(() => {
    setInputMonth(month);
  }, [month]);
  useEffect(() => {
    const handle = findNodeHandle(heading.current);
    if (typeof handle === "number")
      AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);
  useEffect(() => {
    if (query.isError)
      AccessibilityInfo.announceForAccessibility(
        "No se pudo cargar el dashboard. Reintenta con conexión.",
      );
    else if (data && !query.isFetching)
      AccessibilityInfo.announceForAccessibility(
        `Dashboard ${data.month}. Flujo neto del mes: ${formatCOP(data.net)}.`,
      );
  }, [data, query.isFetching, query.isError]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text ref={heading} accessibilityRole="header" style={styles.title}>
          Dashboard financiero
        </Text>
        <Text style={styles.label}>{email}</Text>
        {profileError ? (
          <>
            <Text accessibilityRole="alert">
              No se pudo actualizar tu perfil.
            </Text>
            <AppButton
              title="Reintentar perfil"
              onPress={() => onRetryProfile?.()}
            />
          </>
        ) : null}
        <FormField
          ref={monthField}
          label="Mes del dashboard (YYYY-MM)"
          value={inputMonth}
          onChangeText={setInputMonth}
          maxLength={7}
          autoCorrect={false}
          error={monthError}
          accessibilityHint="Mes contable de Bogotá, por ejemplo 2024-02"
        />
        <AppButton
          title="Consultar mes"
          onPress={() => {
            if (!validMonth(inputMonth)) {
              const message =
                "Ingresa un mes válido YYYY-MM (1900-01 a 9998-12)";
              setMonthError(message);
              monthField.current?.focus();
              AccessibilityInfo.announceForAccessibility(message);
              return;
            }
            setMonthError("");
            onMonthChange(inputMonth);
          }}
        />
        <Text accessibilityRole="header" style={styles.label}>
          Resumen de {month} en COP
        </Text>
        {query.isFetching ? (
          <Text accessibilityLiveRegion="polite">Cargando dashboard…</Text>
        ) : null}
        {query.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            No se pudo cargar el dashboard. Reintenta con conexión.
          </Text>
        ) : null}
        <AppButton
          title={
            query.isError ? "Reintentar dashboard" : "Actualizar dashboard"
          }
          onPress={() => {
            void query.refetch();
          }}
          busy={query.isFetching}
        />
        {data ? (
          <>
            <Text style={styles.label}>Ingresos: {formatCOP(data.income)}</Text>
            <Text style={styles.label}>Gastos: {formatCOP(data.expense)}</Text>
            <Text style={styles.title}>
              Flujo neto del mes: {formatCOP(data.net)}
            </Text>
            {data.net.startsWith("-") ? (
              <Text style={styles.label}>
                Flujo negativo: los gastos superan los ingresos.
              </Text>
            ) : null}
            <Text>
              El flujo neto es la diferencia entre ingresos y gastos registrados
              en este mes.
            </Text>
            <Text accessibilityRole="header" style={styles.label}>
              Comparación mensual
            </Text>
            <Text>
              Se compara con el mes calendario completo anterior, aunque el mes
              consultado esté incompleto.
            </Text>
            {data.comparison.delta !== null ? (
              <Text style={styles.label}>
                {direction(data.comparison.delta)} del flujo neto:{" "}
                {formatCOP(data.comparison.delta)}
              </Text>
            ) : null}
            {data.comparison.reason === "comparable" &&
            data.comparison.percent !== null ? (
              <Text style={styles.label}>
                Variación del flujo neto:{" "}
                {data.comparison.percent.replace(".", ",")}%
              </Text>
            ) : (
              <Text>
                {data.comparison.reason === "zero_baseline"
                  ? "El flujo anterior fue cero. Se muestra la diferencia absoluta; no se calcula porcentaje."
                  : data.comparison.reason === "negative_baseline"
                    ? "El flujo anterior fue negativo. Se muestra la diferencia absoluta; no se calcula porcentaje."
                    : "Sin movimientos activos en el mes anterior. No hay datos para comparar."}
              </Text>
            )}
          </>
        ) : null}
        <AppButton title="Registrar movimiento" onPress={onRegister} />
        {data ? (
          <>
            <Text accessibilityRole="header" style={styles.label}>
              Últimos cinco movimientos activos de {month}
            </Text>
            {data.recent_movements.length === 0 ? (
              <Text>
                No hay movimientos activos en este mes. Registra tu primer
                movimiento.
              </Text>
            ) : (
              data.recent_movements.map((row) => (
                <View key={row.id} accessible style={{ gap: 4 }}>
                  <Text style={styles.label}>
                    {row.type === "income" ? "Ingreso" : "Gasto"}:{" "}
                    {formatCOP(row.amount)}
                  </Text>
                  <Text>Fecha contable: {row.occurred_on}</Text>
                  {row.note ? <Text>{row.note}</Text> : null}
                </View>
              ))
            )}
          </>
        ) : null}
        <AppButton title="Ver movimientos" onPress={onOpenMovements} />
        <AppButton title="Cerrar sesión" onPress={onLogout} busy={logoutBusy} />
      </ScrollView>
    </SafeAreaView>
  );
}
