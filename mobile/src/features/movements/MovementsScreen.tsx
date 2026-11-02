import { ElementRef, useEffect, useRef, useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";
import { Screen } from "../../shared/ui/Screen";
import { Feedback } from "../../shared/ui/Feedback";
import { announce } from "../../shared/accessibility/announcements";
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
  initialMonth,
  initialForm = false,
  onBack,
  onCreated,
}: {
  email: string;
  onLogout(): void;
  logoutBusy: boolean;
  profileError?: boolean;
  onRetryProfile?(): void;
  initialMonth?: string;
  initialForm?: boolean;
  onBack?(): void;
  onCreated?(record: Movement): void;
}) {
  const [month, setMonth] = useState(initialMonth ?? bogotaToday().slice(0, 7));
  const [inputMonth, setInputMonth] = useState(month);
  const [type, setType] = useState<MovementType | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [form, setForm] = useState<Movement | "new" | null>(
    initialForm ? "new" : null,
  );
  const list = useRef<FlatList<Movement>>(null);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [month, type, category, cursors.length, form]);
  const monthField = useRef<ElementRef<typeof TextInput>>(null);
  const [monthError, setMonthError] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const archiveLock = useRef(false);
  const [archive] = useArchiveMovementMutation();
  const query = useMovementsQuery({
    month,
    type,
    category_id: category,
    cursor: cursors[cursors.length - 1],
  });
  const {
    data: categories = [],
    error: categoriesError,
    isFetching: loadingCategories,
    refetch: retryCategories,
  } = useCategoriesQuery();
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
            setMessage("");
            try {
              await archive(row.id).unwrap();
              resetPage();
              setMessage("Movimiento archivado");
              setMessageError(false);
              announce("Movimiento archivado");
            } catch {
              setMessageError(true);
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
        onCancel={() => (initialForm && onBack ? onBack() : setForm(null))}
        onSaved={(saved) => {
          if (initialForm && onCreated) {
            onCreated(saved);
            return;
          }
          setForm(null);
          setMonth(saved.occurred_on.slice(0, 7));
          setInputMonth(saved.occurred_on.slice(0, 7));
          setType(undefined);
          setCategory(undefined);
          resetPage();
          setMessage("Movimiento guardado.");
          setMessageError(false);
        }}
      />
    );
  return (
    <Screen
      title="Movimientos"
      scroll={false}
      onBack={onBack}
      backLabel="Volver al dashboard"
      backDisabled={archiving}
      focusKey={`${month}|${type}|${category}|${cursors.length}`}
    >
      {(heading) => (
        <FlatList
          ref={list}
          data={query.error ? [] : (query.currentData?.items ?? [])}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={{ gap: 16 }}>
              {heading}
              <Text style={styles.label}>{email}</Text>
              {profileError ? (
                <>
                  <Feedback
                    message="No se pudo actualizar tu perfil."
                    tone="error"
                  />
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
                ref={monthField}
                label="Mes (YYYY-MM)"
                value={inputMonth}
                onChangeText={setInputMonth}
                maxLength={7}
                autoCorrect={false}
                error={monthError}
              />
              <AppButton
                title="Aplicar mes"
                onPress={() => {
                  if (!validMonth(inputMonth)) {
                    const error = "Ingresa un mes válido YYYY-MM";
                    setMonthError(error);
                    monthField.current?.focus();
                    announce(error);
                    return;
                  }
                  setMonth(inputMonth);
                  setMonthError("");
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
              <Feedback
                message={loadingCategories ? "Cargando categorías…" : ""}
              />
              {categoriesError ? (
                <>
                  <Feedback
                    message="No se pudieron cargar las categorías."
                    tone="error"
                  />
                  <AppButton
                    title="Reintentar categorías"
                    onPress={() => {
                      void retryCategories();
                    }}
                  />
                </>
              ) : null}
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
              <Feedback
                message={message}
                tone={messageError ? "error" : "success"}
                announce={messageError}
              />
              <Feedback
                message={query.isFetching ? "Cargando movimientos…" : ""}
              />
              {query.error ? (
                <>
                  <Feedback
                    message="No se pudieron cargar los movimientos."
                    tone="error"
                  />
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
          renderItem={({ item, index }) => (
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
                accessibilityLabel={`Editar ${item.type === "expense" ? "gasto" : "ingreso"} de ${formatCOP(item.amount)} del ${item.occurred_on}. Movimiento ${index + 1} de esta página`}
                disabled={archiving}
                onPress={() => setForm(item)}
              />
              <AppButton
                title={`Archivar movimiento de ${formatCOP(item.amount)} del ${item.occurred_on}`}
                accessibilityLabel={`Archivar movimiento de ${formatCOP(item.amount)} del ${item.occurred_on}. Movimiento ${index + 1} de esta página`}
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
              <Text style={styles.body}>Página {cursors.length}</Text>
              {cursors.length > 1 ? (
                <AppButton
                  title="Página anterior"
                  disabled={query.isFetching || archiving}
                  onPress={() => setCursors((v) => v.slice(0, -1))}
                />
              ) : null}
              {!query.error && query.currentData?.next_cursor ? (
                <AppButton
                  title="Página siguiente"
                  disabled={query.isFetching || archiving}
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
      )}
    </Screen>
  );
}
