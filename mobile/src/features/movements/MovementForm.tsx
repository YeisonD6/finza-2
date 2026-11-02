import { ElementRef, useRef, useState } from "react";
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  findNodeHandle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateMovementMutation,
  useEditMovementMutation,
} from "./api";
import { bogotaToday, normalizeAmount, validAccountingDate } from "./domain";
import type { Movement, MovementType } from "./types";

function errorDetails(error: unknown): {
  message: string;
  field_errors?: Record<string, string>;
} {
  return (
    (
      error as {
        data?: { message: string; field_errors?: Record<string, string> };
      }
    )?.data ?? {
      message: "No se pudo guardar. Revisa tu conexión y reintenta.",
    }
  );
}

export function MovementForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Movement;
  onSaved(record: Movement): void;
  onCancel(): void;
}) {
  const {
    data: categories = [],
    isLoading,
    error: categoryError,
    refetch,
  } = useCategoriesQuery();
  const [create] = useCreateMovementMutation();
  const [edit] = useEditMovementMutation();
  const [addCategory] = useCreateCategoryMutation();
  const [type, setType] = useState<MovementType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial?.amount.replace(".", ",") ?? "");
  const [date, setDate] = useState(initial?.occurred_on ?? bogotaToday());
  const [category, setCategory] = useState(initial?.category_id ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const key = useRef("");
  if (!key.current) key.current = Crypto.randomUUID();
  const amountRef = useRef<ElementRef<typeof TextInput>>(null);
  const dateRef = useRef<ElementRef<typeof TextInput>>(null);
  const categoryRef = useRef<ElementRef<typeof Text>>(null);
  const change = () => {
    key.current = Crypto.randomUUID();
    setFields({});
    setMessage("");
  };

  async function submit() {
    if (locked.current) return;
    const errors: Record<string, string> = {};
    let canonical = "";
    try {
      canonical = normalizeAmount(amount);
    } catch (e) {
      errors.amount = (e as Error).message;
    }
    if (!validAccountingDate(date))
      errors.occurred_on =
        "Ingresa una fecha válida entre 1900-01-01 y hoy en Colombia";
    if (!category) errors.category_id = "Selecciona una categoría";
    if (note.length > 500) errors.note = "La nota admite máximo 500 caracteres";
    setFields(errors);
    setMessage("");
    if (Object.keys(errors).length) {
      if (errors.amount) amountRef.current?.focus();
      else if (errors.occurred_on) dateRef.current?.focus();
      else if (errors.category_id) {
        const handle = findNodeHandle(categoryRef.current);
        if (typeof handle === "number")
          AccessibilityInfo.setAccessibilityFocus(handle);
      }
      AccessibilityInfo.announceForAccessibility(Object.values(errors)[0]);
      return;
    }
    locked.current = true;
    setBusy(true);
    const payload = {
      type,
      amount: canonical,
      currency: "COP" as const,
      category_id: category,
      occurred_on: date,
      note,
    };
    try {
      const result = initial
        ? await edit({ id: initial.id, changes: payload }).unwrap()
        : await create({ ...payload, client_request_id: key.current }).unwrap();
      AccessibilityInfo.announceForAccessibility("Movimiento guardado");
      onSaved(result);
    } catch (e) {
      const details = errorDetails(e);
      setFields(details.field_errors ?? {});
      setMessage(details.message);
      AccessibilityInfo.announceForAccessibility(details.message);
      if (details.field_errors?.amount) amountRef.current?.focus();
      else if (details.field_errors?.occurred_on) dateRef.current?.focus();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function saveCategory() {
    if (locked.current) return;
    if (!newCategory.trim() || newCategory.trim().length > 60) {
      setMessage("El nombre de categoría debe tener entre 1 y 60 caracteres");
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      const result = await addCategory({
        name: newCategory.trim(),
        movement_type: type,
      }).unwrap();
      change();
      setCategory(result.id);
      setNewCategory("");
      AccessibilityInfo.announceForAccessibility(
        "Categoría creada y seleccionada",
      );
    } catch (e) {
      setMessage(errorDetails(e).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text accessibilityRole="header" style={styles.title}>
            {initial ? "Editar movimiento" : "Registrar movimiento"}
          </Text>
          <Text style={styles.label}>Tipo de movimiento</Text>
          {(["expense", "income"] as const).map((kind) => (
            <AppButton
              key={kind}
              title={kind === "expense" ? "Gasto" : "Ingreso"}
              selected={type === kind}
              disabled={busy}
              onPress={() => {
                change();
                setType(kind);
                setCategory("");
              }}
            />
          ))}
          <FormField
            ref={amountRef}
            label="Monto en pesos colombianos (COP)"
            accessibilityHint="Mayor que cero. Usa coma o punto decimal, sin separadores de miles."
            value={amount}
            onChangeText={(v) => {
              change();
              setAmount(v);
            }}
            error={fields.amount}
            keyboardType="decimal-pad"
            maxLength={32}
            editable={!busy}
          />
          <FormField
            ref={dateRef}
            label="Fecha contable (YYYY-MM-DD)"
            accessibilityHint="Fecha del movimiento, hasta hoy en Colombia."
            value={date}
            onChangeText={(v) => {
              change();
              setDate(v);
            }}
            error={fields.occurred_on}
            maxLength={10}
            editable={!busy}
            autoCorrect={false}
          />
          <Text
            ref={categoryRef}
            accessibilityRole="header"
            style={styles.label}
          >
            Categoría
          </Text>
          {isLoading ? (
            <Text accessibilityLiveRegion="polite">Cargando categorías…</Text>
          ) : null}
          {categoryError ? (
            <>
              <Text accessibilityRole="alert">
                No se pudieron cargar las categorías.
              </Text>
              <AppButton
                title="Reintentar categorías"
                onPress={() => {
                  void refetch();
                }}
              />
            </>
          ) : null}
          {categories
            .filter((c) => c.movement_type === type)
            .map((c) => (
              <AppButton
                key={c.id}
                title={c.is_system ? c.name : `Personal: ${c.name}`}
                selected={category === c.id}
                disabled={busy}
                onPress={() => {
                  change();
                  setCategory(c.id);
                }}
              />
            ))}
          {fields.category_id ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {fields.category_id}
            </Text>
          ) : null}
          <FormField
            label="Nueva categoría (opcional)"
            value={newCategory}
            onChangeText={setNewCategory}
            maxLength={60}
            editable={!busy}
          />
          <AppButton
            title="Agregar categoría"
            onPress={saveCategory}
            disabled={busy}
          />
          <FormField
            label="Nota (opcional)"
            value={note}
            onChangeText={(v) => {
              change();
              setNote(v);
            }}
            error={fields.note}
            multiline
            maxLength={500}
            editable={!busy}
          />
          {message ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {message}
            </Text>
          ) : null}
          <AppButton title="Guardar movimiento" busy={busy} onPress={submit} />
          <AppButton title="Cancelar" disabled={busy} onPress={onCancel} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
