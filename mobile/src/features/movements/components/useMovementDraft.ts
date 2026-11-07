import { useEffect, useRef, useState, type ElementRef } from "react";
import { Alert, Text, TextInput } from "react-native";
import * as Crypto from "expo-crypto";
import {
  announce,
  focusAccessibility,
  useDeferredFocus,
} from "../../../shared/accessibility/announcements";
import { success, error as errorHaptic } from "../../../shared/theme/haptics";
import {
  useArchiveMovementMutation,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateMovementMutation,
  useEditMovementMutation,
} from "../api";
import {
  bogotaToday,
  normalizeAmount,
  validAccountingDate,
  formatCOP,
} from "../domain";
import type { Movement, MovementType } from "../types";
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

export function useMovementDraft({
  initial,
  initialType,
  onSaved,
  onAccountingMonth,
}: {
  initial?: Movement;
  /** Preselected type for a new movement (e.g. from a widget shortcut). */
  initialType?: MovementType;
  onSaved(record: Movement): void;
  onAccountingMonth?(month: string): void;
}) {
  const {
    data: categories = [],
    isLoading,
    error: categoryError,
    refetch,
  } = useCategoriesQuery();
  const [create] = useCreateMovementMutation();
  const [edit] = useEditMovementMutation();
  const [archive] = useArchiveMovementMutation();
  const [addCategory] = useCreateCategoryMutation();
  const [type, setType] = useState<MovementType>(
    initial?.type ?? initialType ?? "expense",
  );
  const [amount, setAmount] = useState(initial?.amount.replace(".", ",") ?? "");
  const [date, setDate] = useState(initial?.occurred_on ?? bogotaToday());
  const [category, setCategory] = useState(initial?.category_id ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [operation, setOperation] = useState<
    "save" | "category" | "archive" | null
  >(null);
  const busy = operation !== null;
  useEffect(() => {
    onAccountingMonth?.(date.slice(0, 7));
  }, [date, onAccountingMonth]);
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
      void errorHaptic();
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
      void success();
      announce("Movimiento guardado");
      onSaved(result);
    } catch (e) {
      const details = errorDetails(e);
      setFields(details.field_errors ?? {});
      setMessage(details.message);
      void errorHaptic();
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
      void errorHaptic();
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
      void errorHaptic();
      setCategoryNameError(message);
      requestFocus(() => categoryNameRef.current?.focus());
      announce(message);
    } finally {
      locked.current = false;
      setOperation(null);
    }
  }

  function confirmArchive(onArchived: () => void) {
    if (!initial || locked.current) return;
    Alert.alert(
      "Archivar movimiento",
      `¿Archivar ${formatCOP(initial.amount)} del ${initial.occurred_on}? No aparecerá en tus movimientos activos.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Archivar",
          style: "destructive",
          onPress: async () => {
            if (locked.current) return;
            locked.current = true;
            setOperation("archive");
            setMessage("");
            try {
              await archive(initial.id).unwrap();
              announce("Movimiento archivado");
              onArchived();
            } catch {
              const message =
                "No se pudo archivar. Revisa tu conexión y reintenta.";
              setMessage(message);
              announce(message);
              void errorHaptic();
            } finally {
              locked.current = false;
              setOperation(null);
            }
          },
        },
      ],
    );
  }
  return {
    type,
    setType,
    amount,
    setAmount,
    date,
    setDate,
    category,
    setCategory,
    note,
    setNote,
    newCategory,
    setNewCategory,
    fields,
    message,
    operation,
    busy,
    amountRef,
    dateRef,
    categoryRef,
    categoryNameRef,
    noteRef,
    categoryNameError,
    setCategoryNameError,
    change,
    submit,
    saveCategory,
    categories,
    isLoading,
    categoryError,
    refetch,
    confirmArchive,
  };
}
