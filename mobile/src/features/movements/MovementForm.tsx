import { ElementRef, useRef, useState } from "react";
import { Text, TextInput } from "react-native";
import * as Crypto from "expo-crypto";
import { AppButton, FormField, styles } from "../../shared/ui/AuthControls";
import { AmountInput } from "../../shared/ui/AmountInput";
import { Screen } from "../../shared/ui/Screen";
import { Feedback } from "../../shared/ui/Feedback";
import {
  announce,
  focusAccessibility,
  useDeferredFocus,
} from "../../shared/accessibility/announcements";
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
  const [operation, setOperation] = useState<"save" | "category" | null>(null);
  const busy = operation !== null;
  const requestFocus = useDeferredFocus(busy);
  const locked = useRef(false);
  const key = useRef("");
  if (!key.current) key.current = Crypto.randomUUID();
  const amountRef = useRef<ElementRef<typeof TextInput>>(null);
  const dateRef = useRef<ElementRef<typeof TextInput>>(null);
  const categoryRef = useRef<ElementRef<typeof Text>>(null);
  const categoryNameRef = useRef<ElementRef<typeof TextInput>>(null);
  const noteRef = useRef<ElementRef<typeof TextInput>>(null);
  const [categoryNameError, setCategoryNameError] = useState("");
  function focusError(errors: Record<string, string>) {
    requestFocus(() => {
      if (errors.amount) amountRef.current?.focus();
      else if (errors.occurred_on) dateRef.current?.focus();
      else if (errors.category_id) focusAccessibility(categoryRef.current);
      else if (errors.note) noteRef.current?.focus();
    });
  }
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
      focusError(errors);
      announce(Object.values(errors)[0]);
      return;
    }
    locked.current = true;
    setOperation("save");
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
      announce("Movimiento guardado");
      onSaved(result);
    } catch (e) {
      const details = errorDetails(e);
      setFields(details.field_errors ?? {});
      setMessage(details.message);
      announce(details.message);
      focusError(details.field_errors ?? {});
    } finally {
      locked.current = false;
      setOperation(null);
    }
  }

  async function saveCategory() {
    if (locked.current) return;
    if (!newCategory.trim() || newCategory.trim().length > 60) {
      const message =
        "El nombre de categoría debe tener entre 1 y 60 caracteres";
      setCategoryNameError(message);
      requestFocus(() => categoryNameRef.current?.focus());
      announce(message);
      return;
    }
    locked.current = true;
    setOperation("category");
    setCategoryNameError("");
    setMessage("");
    try {
      const result = await addCategory({
        name: newCategory.trim(),
        movement_type: type,
      }).unwrap();
      change();
      setCategory(result.id);
      setNewCategory("");
      announce("Categoría creada y seleccionada");
    } catch (e) {
      const message = errorDetails(e).message;
      setCategoryNameError(message);
      requestFocus(() => categoryNameRef.current?.focus());
      announce(message);
    } finally {
      locked.current = false;
      setOperation(null);
    }
  }

  return (
    <Screen
      title={initial ? "Editar movimiento" : "Registrar movimiento"}
      onBack={onCancel}
      backLabel="Cancelar"
      backDisabled={busy}
    >
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
      <AmountInput
        ref={amountRef}
        value={amount}
        onChangeText={(v) => {
          change();
          setAmount(v);
        }}
        error={fields.amount}
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
        accessibilityLabel={
          fields.category_id
            ? `Categoría. Error: ${fields.category_id}`
            : "Categoría"
        }
        style={styles.label}
      >
        Categoría
      </Text>
      <Feedback message={isLoading ? "Cargando categorías…" : ""} />
      {categoryError ? (
        <>
          <Feedback
            message="No se pudieron cargar las categorías."
            tone="error"
          />
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
            accessibilityHint={
              fields.category_id ? `Error: ${fields.category_id}` : undefined
            }
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
        ref={categoryNameRef}
        label="Nueva categoría (opcional)"
        value={newCategory}
        onChangeText={(value) => {
          setNewCategory(value);
          setCategoryNameError("");
        }}
        error={categoryNameError}
        maxLength={60}
        editable={!busy}
      />
      <AppButton
        title="Agregar categoría"
        onPress={saveCategory}
        disabled={busy && operation !== "category"}
        busy={operation === "category"}
      />
      <FormField
        ref={noteRef}
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
      <Feedback message={message} tone="error" announce={false} />
      <AppButton
        title="Guardar movimiento"
        busy={operation === "save"}
        disabled={operation === "category"}
        onPress={submit}
      />
    </Screen>
  );
}
