import { ElementRef, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Text,
  View,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";
import { MovementForm } from "./MovementForm";
import {
  useArchiveMovementMutation,
  useCategoriesQuery,
  useMovementsQuery,
} from "./api";
import { bogotaToday, formatCOP, validMonth } from "./domain";
import type { Movement, MovementType } from "./types";

export function MovementsScreen({
  email,
  onLogout,
  logoutBusy,
  profileError,
  onRetryProfile,
}: {
  email: string;
  onLogout(): void;
  logoutBusy: boolean;
  profileError?: boolean;
  onRetryProfile?(): void;
}) {
  const [month, setMonth] = useState(bogotaToday().slice(0, 7));
  const [inputMonth, setInputMonth] = useState(month);
  const [type, setType] = useState<MovementType | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [form, setForm] = useState<Movement | "new" | null>(null);
  const heading = useRef<ElementRef<typeof Text>>(null);
  useEffect(() => {
    if (!form) {
      const handle = findNodeHandle(heading.current);
      if (typeof handle === "number")
        AccessibilityInfo.setAccessibilityFocus(handle);
    }
  }, [form]);
  const [message, setMessage] = useState("");
  const [archiving, setArchiving] = useState(false);
  const archiveLock = useRef(false);
  const [archive] = useArchiveMovementMutation();
  const query = useMovementsQuery({
    month,
    type,
    category_id: category,
    cursor: cursors[cursors.length - 1],
  });
  const { data: categories = [] } = useCategoriesQuery();
  const resetPage = () => setCursors([undefined]);

  function confirmArchive(row: Movement) {
    Alert.alert(
      "Archivar movimiento",
      `¿Archivar ${formatCOP(row.amount)} del ${row.occurred_on}? No aparecerá en tus movimientos activos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          style: "destructive",
          onPress: async () => {
            if (archiveLock.current) return;
            archiveLock.current = true;
            setArchiving(true);
            try {
              await archive(row.id).unwrap();
              resetPage();
              setMessage("Movimiento archivado");
              AccessibilityInfo.announceForAccessibility(
                "Movimiento archivado",
              );
            } catch {
              setMessage(
                "No se pudo archivar. Revisa tu conexión y reintenta.",
              );
            } finally {
              archiveLock.current = false;
              setArchiving(false);
            }
          },
        },
      ],
    );
  }

  if (form)
    return (
      <MovementForm
        initial={form === "new" ? undefined : form}
        onCancel={() => setForm(null)}
        onSaved={(saved) => {
          setForm(null);
          setMonth(saved.occurred_on.slice(0, 7));
          setInputMonth(saved.occurred_on.slice(0, 7));
          setType(undefined);
          setCategory(undefined);
          resetPage();
          setMessage("Movimiento guardado.");
        }}
      />
    );
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={query.currentData?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text ref={heading} accessibilityRole="header" style={styles.title}>
              Movimientos
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
            <Text style={styles.label}>
              Consulta tus ingresos y gastos registrados en pesos colombianos.
            </Text>
            <AppButton
              title="Registrar movimiento"
              onPress={() => setForm("new")}
              disabled={archiving}
            />
            <FormField
              label="Mes (YYYY-MM)"
              value={inputMonth}
              onChangeText={setInputMonth}
              maxLength={7}
              autoCorrect={false}
            />
            <AppButton
              title="Aplicar mes"
              onPress={() => {
                if (!validMonth(inputMonth)) {
                  setMessage("Ingresa un mes válido YYYY-MM");
                  return;
                }
                setMonth(inputMonth);
                resetPage();
                setMessage("");
              }}
            />
            <Text style={styles.label}>Filtrar tipo</Text>
            {[undefined, "expense", "income"].map((kind) => (
              <AppButton
                key={kind ?? "all"}
                title={
                  kind === "expense"
                    ? "Solo gastos"
                    : kind === "income"
                      ? "Solo ingresos"
                      : "Todos los tipos"
                }
                selected={type === kind}
                onPress={() => {
                  setType(kind as MovementType | undefined);
                  setCategory(undefined);
                  resetPage();
                }}
              />
            ))}
            <Text style={styles.label}>Filtrar categoría</Text>
            <AppButton
              title="Todas las categorías"
              selected={!category}
              onPress={() => {
                setCategory(undefined);
                resetPage();
              }}
            />
            {categories
              .filter((c) => !type || c.movement_type === type)
              .map((c) => (
                <AppButton
                  key={c.id}
                  title={`Filtrar ${c.movement_type === "expense" ? "gasto" : "ingreso"}: ${c.name}${c.is_system ? "" : " (personal)"}`}
                  selected={category === c.id}
                  onPress={() => {
                    setCategory(c.id);
                    resetPage();
                  }}
                />
              ))}
            {message ? (
              <Text accessibilityRole="alert" style={styles.label}>
                {message}
              </Text>
            ) : null}
            {query.isFetching ? (
              <Text accessibilityLiveRegion="polite">
                Cargando movimientos…
              </Text>
            ) : null}
            {query.error ? (
              <>
                <Text accessibilityRole="alert" style={styles.error}>
                  No se pudieron cargar los movimientos.
                </Text>
                <AppButton
                  title="Reintentar movimientos"
                  onPress={() => {
                    void query.refetch();
                  }}
                />
              </>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              gap: 12,
              borderTopWidth: 1,
              borderColor: "#506078",
              paddingTop: 16,
            }}
          >
            <Text style={styles.label}>
              {item.type === "expense" ? "Gasto" : "Ingreso"}:{" "}
              {formatCOP(item.amount)}, {item.occurred_on}.{" "}
              {categories.find((c) => c.id === item.category_id)?.name ??
                "Categoría"}
            </Text>
            {item.note ? <Text style={styles.label}>{item.note}</Text> : null}
            <AppButton
              title={`Editar ${item.type === "expense" ? "gasto" : "ingreso"} de ${formatCOP(item.amount)} del ${item.occurred_on}`}
              disabled={archiving}
              onPress={() => setForm(item)}
            />
            <AppButton
              title={`Archivar movimiento de ${formatCOP(item.amount)} del ${item.occurred_on}`}
              disabled={archiving}
              onPress={() => confirmArchive(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          !query.isFetching && !query.error ? (
            <Text style={styles.label}>
              No hay movimientos para estos filtros. Registra tu primer
              movimiento.
            </Text>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: 16 }}>
            {cursors.length > 1 ? (
              <AppButton
                title="Página anterior"
                onPress={() => setCursors((v) => v.slice(0, -1))}
              />
            ) : null}
            {query.currentData?.next_cursor ? (
              <AppButton
                title="Página siguiente"
                disabled={query.isFetching}
                onPress={() =>
                  setCursors((v) => [...v, query.currentData!.next_cursor!])
                }
              />
            ) : null}
            <AppButton
              title="Cerrar sesión"
              onPress={onLogout}
              busy={logoutBusy}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}
